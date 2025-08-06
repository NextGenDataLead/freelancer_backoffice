'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SimpleAuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * Simplified AuthGuard that doesn't depend on Clerk
 * This is a temporary solution for testing purposes
 * Replace with proper Clerk AuthGuard once environment is configured
 */
export function SimpleAuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/sign-in' 
}: SimpleAuthGuardProps) {
  const router = useRouter()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    // Simulate checking authentication state
    // In a real app, this would check localStorage, cookies, or API
    const checkAuth = () => {
      // For demo purposes, assume user is signed in
      // You can modify this logic as needed
      const authStatus = typeof window !== 'undefined' 
        ? localStorage.getItem('demo-auth') === 'true' 
        : false
      
      setIsSignedIn(authStatus)
      setIsLoaded(true)
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (isLoaded && requireAuth && !isSignedIn) {
      router.push(redirectTo)
    }
  }, [isLoaded, isSignedIn, requireAuth, redirectTo, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requireAuth && !isSignedIn) {
    return null // Redirecting...
  }

  return <>{children}</>
}

/**
 * Demo authentication helper
 * For testing purposes only
 */
export const demoAuth = {
  signIn: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo-auth', 'true')
    }
  },
  signOut: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo-auth')
    }
  },
  isSignedIn: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('demo-auth') === 'true'
    }
    return false
  }
}