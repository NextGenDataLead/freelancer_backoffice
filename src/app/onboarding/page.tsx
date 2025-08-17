'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { AuthGuard } from '@/components/auth/auth-guard'
import { CheckCircle, User, Building, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { completeOnboarding } from './actions'
import { createUserProfile } from './create-profile-action'
import { AccountPreparationLoading } from '@/components/ui/account-preparation-loading'
import { useState, useTransition, useEffect } from 'react'

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showLoading, setShowLoading] = useState(false)
  const [profileCreated, setProfileCreated] = useState(false)
  const [profileCreationAttempted, setProfileCreationAttempted] = useState(false)

  // Create profile immediately when page loads
  useEffect(() => {
    if (isLoaded && user && !profileCreationAttempted) {
      setProfileCreationAttempted(true)
      
      const createProfile = async () => {
        try {
          console.log('🔄 Auto-creating profile on onboarding page load for user:', user?.id)
          const result = await createUserProfile()
          console.log('✅ Profile creation result:', {
            action: result.action,
            profileId: result.profile?.id,
            userId: result.profile?.clerk_user_id
          })
          setProfileCreated(true)
        } catch (error) {
          console.error('❌ Profile creation failed on page load:', error)
          console.error('❌ Current user info:', {
            userId: user?.id,
            email: user?.primaryEmailAddress?.emailAddress,
            isLoaded
          })
          // Don't show error to user - just log it. User can still try the button.
        }
      }
      
      createProfile()
    }
  }, [isLoaded, user, profileCreationAttempted])

  const handleCompleteOnboarding = async () => {
    setError(null)
    setShowLoading(true)
    
    try {
      console.log('🔄 Starting onboarding completion...')
      
      // The server action now handles everything: profile creation + onboarding completion
      await completeOnboarding()
      console.log('✅ Onboarding completed successfully')
      
      // Set flag to indicate we're coming from onboarding
      sessionStorage.setItem('just-completed-onboarding', 'true')
      
      // Small delay to ensure everything is processed
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('🚀 Redirecting to dashboard!')
      router.push('/dashboard')
      
    } catch (err) {
      console.error('❌ Error in onboarding completion:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setShowLoading(false)
    }
  }


  // Show loading screen during onboarding completion
  if (showLoading) {
    return (
      <AccountPreparationLoading 
        onComplete={() => {
          // This will be called when countdown finishes, but redirect should happen earlier
          router.push('/dashboard')
        }}
        initialCount={20}
      />
    )
  }

  if (!isLoaded) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
                <p className="text-gray-600">
                  Please wait while we load your profile.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to SaaS Template!</h1>
            <p className="mt-2 text-lg text-gray-600">
              Your account has been created successfully.
            </p>
          </div>

          <div className="space-y-6">
            {/* User Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {user?.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt={user.firstName || 'User'} 
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <User className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : 'Welcome!'
                      }
                    </p>
                    <p className="text-sm text-gray-600">{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Your Organization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Your personal workspace has been created and is ready to use.
                </p>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ Profile synchronized
                  </p>
                  <p className="text-sm text-green-700">
                    ✅ Organization created  
                  </p>
                  <p className="text-sm text-green-700">
                    ✅ Ready to use
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Explore Dashboard</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      View analytics, manage settings, and access all features.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Customize Settings</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Personalize your account and notification preferences.
                    </p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={handleCompleteOnboarding}
                    size="lg" 
                    className="w-full" 
                    disabled={showLoading}
                  >
                    {showLoading ? 'Preparing your account...' : 'Continue to Dashboard'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {error && (
                    <p className="text-red-600 text-sm mt-2">{error}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skip for now option */}
          <div className="text-center mt-8">
            <Link 
              href="/dashboard" 
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip onboarding and go to dashboard →
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}