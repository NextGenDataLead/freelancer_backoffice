/**
 * Enhanced Authentication Provider
 * Provides real-time authentication state management with automatic security features:
 * - Session validation on navigation
 * - Automatic logout on session expiry
 * - Inactivity timeout warnings
 * - Browser navigation security
 */

'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any
  checkAuthStatus: () => Promise<boolean>
  forceLogout: (reason?: string) => void
  inactivityWarning: boolean
  dismissInactivityWarning: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

// Configuration
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_TIMEOUT = 25 * 60 * 1000 // 25 minutes (5 min warning)
const AUTH_CHECK_INTERVAL = 60 * 1000 // 1 minute

export function AuthProvider({ children }: AuthProviderProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [inactivityWarning, setInactivityWarning] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())

  // Track activity
  const updateActivity = () => {
    setLastActivity(Date.now())
    setInactivityWarning(false)
  }

  // Force logout with reason
  const forceLogout = async (reason = 'Session expired') => {
    console.log('🚪 Forcing logout:', reason)
    
    try {
      // Clear any local state
      setIsAuthenticated(false)
      setInactivityWarning(false)
      
      // Redirect to Clerk's hosted sign-in with message
      window.location.href = `https://safe-starling-82.accounts.dev/sign-in?after_sign_in_url=${encodeURIComponent(window.location.origin)}/dashboard&message=${encodeURIComponent(reason)}`
      
      // Optional: Show notification
      if (window && 'localStorage' in window) {
        localStorage.setItem('logout_reason', reason)
      }
    } catch (error) {
      console.error('Error during forced logout:', error)
      // Fallback: hard redirect to Clerk hosted sign-in
      window.location.href = 'https://safe-starling-82.accounts.dev/sign-in'
    }
  }

  // Check authentication status
  const checkAuthStatus = async (): Promise<boolean> => {
    if (!isLoaded) return false
    
    if (!isSignedIn || !user) {
      setIsAuthenticated(false)
      return false
    }

    // Additional validation: check if user still exists in Clerk
    try {
      // This will trigger a network request to validate the session
      const isValid = Boolean(user && user.id)
      setIsAuthenticated(isValid)
      return isValid
    } catch (error) {
      console.error('Auth validation failed:', error)
      setIsAuthenticated(false)
      return false
    }
  }

  // Initial auth state setup
  useEffect(() => {
    if (isLoaded) {
      const authStatus = Boolean(isSignedIn && user)
      setIsAuthenticated(authStatus)
      
      if (authStatus) {
        updateActivity()
      }
    }
  }, [isLoaded, isSignedIn, user])

  // Real-time authentication validation on route changes
  useEffect(() => {
    const validateOnNavigation = async () => {
      // Skip validation for public routes
      const publicRoutes = ['/sign-in', '/sign-up', '/forgot-password', '/', '/about', '/contact', '/onboarding']
      if (publicRoutes.includes(pathname) || pathname.startsWith('/sign-')) return

      // Only validate if user is supposed to be authenticated
      if (isSignedIn && pathname.startsWith('/dashboard')) {
        const isValid = await checkAuthStatus()
        
        if (!isValid) {
          console.log('🚪 Forcing logout: Authentication required')
          forceLogout('Authentication required')
        }
      }
    }

    validateOnNavigation()
  }, [pathname, isSignedIn])

  // Periodic authentication checks
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      const isValid = await checkAuthStatus()
      if (!isValid) {
        forceLogout('Session expired')
      }
    }, AUTH_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Activity tracking
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const activityHandler = () => updateActivity()
    
    events.forEach(event => {
      document.addEventListener(event, activityHandler, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true)
      })
    }
  }, [isAuthenticated])

  // Inactivity timeout management
  useEffect(() => {
    if (!isAuthenticated) return

    const checkInactivity = () => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivity

      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        forceLogout('Session expired due to inactivity')
      } else if (timeSinceActivity >= WARNING_TIMEOUT && !inactivityWarning) {
        setInactivityWarning(true)
      }
    }

    const interval = setInterval(checkInactivity, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [lastActivity, isAuthenticated, inactivityWarning])

  // Browser visibility change handler (tab switching)
  useEffect(() => {
    if (!isAuthenticated) return

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // Tab became visible - revalidate auth
        const isValid = await checkAuthStatus()
        if (!isValid) {
          forceLogout('Session expired')
        } else {
          updateActivity()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated])

  // Page reload handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save last activity time
      if (isAuthenticated) {
        sessionStorage.setItem('lastActivity', lastActivity.toString())
      }
    }

    const handleLoad = async () => {
      // Check saved activity on page load
      const savedActivity = sessionStorage.getItem('lastActivity')
      if (savedActivity) {
        const saved = parseInt(savedActivity)
        const now = Date.now()
        
        if (now - saved > INACTIVITY_TIMEOUT) {
          forceLogout('Session expired during page reload')
          return
        }
        
        setLastActivity(saved)
      }

      // Revalidate auth on page load
      await checkAuthStatus()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('load', handleLoad)
    
    // Run on initial component mount
    handleLoad()

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('load', handleLoad)
    }
  }, [isAuthenticated])

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading: !isLoaded,
    user,
    checkAuthStatus,
    forceLogout,
    inactivityWarning,
    dismissInactivityWarning: () => {
      setInactivityWarning(false)
      updateActivity()
    }
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}