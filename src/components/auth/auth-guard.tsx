'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useUserProfile } from '@/hooks/use-user'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/sign-in' 
}: AuthGuardProps) {
  const { isLoaded, isSignedIn, user } = useUser()
  const { data: userProfile, isLoading: profileLoading } = useUserProfile()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && requireAuth && !isSignedIn) {
      router.push(redirectTo)
      return
    }

    // Check if user profile is inactive (soft deleted)
    if (isLoaded && isSignedIn && userProfile && !userProfile.is_active) {
      console.log('User account has been deleted/deactivated, redirecting to sign-in')
      // Force logout and redirect
      window.location.href = '/sign-in?message=account-deleted'
      return
    }
  }, [isLoaded, isSignedIn, requireAuth, redirectTo, router, userProfile])

  if (!isLoaded || (isSignedIn && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requireAuth && !isSignedIn) {
    return null // Redirecting...
  }

  // Block access for inactive/deleted users
  if (requireAuth && isSignedIn && userProfile && !userProfile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Account Deactivated</h2>
          <p className="text-slate-600">Your account has been deactivated. Please contact support if you believe this is an error.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}