import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAuthStore } from '@/store/auth-store'
import { useUserProfile } from './use-user'

/**
 * Enhanced auth hook that integrates Clerk, React Query, and Zustand
 * Provides centralized auth state management with local storage persistence
 */
export const useAuth = () => {
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser()
  const { data: userProfile, isLoading: profileLoading } = useUserProfile()
  
  const {
    userProfile: storedProfile,
    isAuthenticated,
    isLoading,
    setUserProfile,
    setIsAuthenticated,
    setIsLoading,
    clearAuthState,
  } = useAuthStore()

  // Sync Clerk auth state with Zustand store
  useEffect(() => {
    if (!clerkLoaded) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)
    setIsAuthenticated(!!isSignedIn)

    if (!isSignedIn) {
      clearAuthState()
    }
  }, [clerkLoaded, isSignedIn, setIsAuthenticated, setIsLoading, clearAuthState])

  // Sync user profile from React Query to Zustand
  useEffect(() => {
    if (userProfile) {
      setUserProfile(userProfile)
    } else if (!profileLoading && isSignedIn) {
      // Profile should exist if user is signed in
      // If it doesn't, clear the stored profile
      setUserProfile(null)
    }
  }, [userProfile, profileLoading, isSignedIn, setUserProfile])

  // Determine loading state
  const loading = isLoading || profileLoading || !clerkLoaded

  return {
    // User data
    user,
    userProfile: storedProfile || userProfile,
    
    // Auth state
    isAuthenticated: isAuthenticated && !!user,
    isLoading: loading,
    isSignedIn,
    
    // Clerk specific
    clerkLoaded,
    
    // Actions
    clearAuthState,
  }
}

/**
 * Hook for auth state only (no user profile data)
 * Useful for components that only need to know auth status
 */
export const useAuthStatus = () => {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { isLoaded: clerkLoaded, isSignedIn } = useUser()
  
  return {
    isAuthenticated: isAuthenticated && isSignedIn,
    isLoading: isLoading || !clerkLoaded,
    isSignedIn,
  }
}