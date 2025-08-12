/**
 * Route Guard Component
 * Protects routes and handles authentication redirects
 * Provides real-time route protection with loading states
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2, Shield, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/components/providers/auth-provider'

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
  allowedRoles?: string[]
}

export function RouteGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/sign-in',
  allowedRoles = []
}: RouteGuardProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const { isAuthenticated, isLoading, user, checkAuthStatus } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const [validationStatus, setValidationStatus] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [retryCount, setRetryCount] = useState(0)

  // Define protected and public routes
  const protectedRoutes = ['/dashboard', '/profile', '/settings', '/admin']
  const publicRoutes = ['/', '/sign-in', '/sign-up', '/forgot-password', '/about', '/contact', '/onboarding']
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/sign-') || pathname === '/'

  useEffect(() => {
    const validateAccess = async () => {
      // Still loading authentication state
      if (isLoading || !isLoaded) {
        setValidationStatus('checking')
        return
      }

      // If this is a public route, allow access without authentication
      if (isPublicRoute) {
        setValidationStatus('valid')
        return
      }

      // If this is a protected route and requireAuth is false (global setting), still allow
      if (!requireAuth) {
        setValidationStatus('valid')
        return
      }

      // If this is a protected route, validate authentication
      if (isProtectedRoute) {
        if (!isSignedIn || !isAuthenticated) {
          console.log('🚫 Access denied to protected route:', pathname)
          setValidationStatus('invalid')
          
          // Redirect to Clerk's hosted sign-in with return URL
          setTimeout(() => {
            const returnUrl = encodeURIComponent(`${window.location.origin}${pathname}`)
            window.location.href = `https://safe-starling-82.accounts.dev/sign-in?after_sign_in_url=${returnUrl}`
          }, 100)
          return
        }

        // Double-check auth status
        const isValid = await checkAuthStatus()
        if (!isValid) {
          console.log('🚫 Auth validation failed for route:', pathname)
          setValidationStatus('invalid')
          const returnUrl = encodeURIComponent(`${window.location.origin}${pathname}`)
          window.location.href = `https://safe-starling-82.accounts.dev/sign-in?after_sign_in_url=${returnUrl}&reason=session_expired`
          return
        }

        // Check role-based access
        if (allowedRoles.length > 0) {
          const userRoles = user?.publicMetadata?.roles as string[] || []
          const hasAccess = allowedRoles.some(role => userRoles.includes(role))
          
          if (!hasAccess) {
            console.log('🚫 Insufficient permissions for route:', pathname)
            setValidationStatus('invalid')
            router.push('/dashboard?error=insufficient_permissions')
            return
          }
        }
      }

      // All checks passed
      setValidationStatus('valid')
    }

    validateAccess()
  }, [
    isLoaded,
    isLoading,
    isSignedIn,
    isAuthenticated,
    pathname,
    requireAuth,
    user,
    allowedRoles,
    isPublicRoute,
    isProtectedRoute,
    checkAuthStatus
  ])

  // Retry mechanism for failed validations
  const handleRetry = async () => {
    if (retryCount >= 3) {
      router.push('/sign-in?error=max_retries_exceeded')
      return
    }

    setRetryCount(prev => prev + 1)
    setValidationStatus('checking')
    
    // Force re-check authentication
    const isValid = await checkAuthStatus()
    if (isValid) {
      setValidationStatus('valid')
    } else {
      setValidationStatus('invalid')
    }
  }

  // Show loading state
  if (validationStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Validating Access</h2>
            <p className="text-sm text-slate-600">Checking authentication status...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show access denied state
  if (validationStatus === 'invalid' && requireAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">Access Denied</h3>
                  <p className="text-sm">You need to be signed in to access this page.</p>
                </div>
                
                {retryCount < 3 && (
                  <Button 
                    onClick={handleRetry}
                    variant="outline" 
                    size="sm"
                    className="border-red-200 text-red-700 hover:bg-red-100"
                  >
                    Try Again ({3 - retryCount} attempts remaining)
                  </Button>
                )}
                
                <Button 
                  onClick={() => router.push(redirectTo)}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 ml-2"
                >
                  Sign In
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}