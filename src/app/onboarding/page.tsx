'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { AuthGuard } from '@/components/auth/auth-guard'
import { CheckCircle, User, Building, ArrowRight, Clock, Users, BarChart3, Sparkles, Target, TrendingUp, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { completeOnboarding } from './actions'
import { createUserProfile } from './create-profile-action'
import { AccountPreparationLoading } from '@/components/ui/account-preparation-loading'
import { UserButton } from '@clerk/nextjs'
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
        <div className="min-h-screen bg-background mobile-safe-area">
          <div className="flex items-center justify-center min-h-screen">
            <div className="mobile-card-glass max-w-md mx-auto">
              <div className="text-center p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mb-2">Loading...</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Please wait while we load your profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background mobile-safe-area">
        {/* Simplified Header - Only Avatar */}
        <div className="mobile-sticky-header mobile-glass-effect border-t-0 rounded-none border-x-0 z-50">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Left: Welcome Text */}
              <div className="flex items-center">
                <h1 className="text-lg sm:text-xl font-semibold">
                  Welcome, {user?.firstName || 'User'}
                </h1>
              </div>

              {/* Right: Just User Avatar */}
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
                userProfileMode="navigation"
                userProfileUrl="/dashboard/settings"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 mobile-scroll-smooth">
          {/* Welcome Hero Section */}
          <div className="mobile-card-glass text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 sm:p-4 bg-success/10 rounded-full">
                <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-success" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Welcome to Financial Hub!</h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Your professional financial dashboard is ready. Let's get you started with managing your business finances.
            </p>
          </div>

          {/* Responsive Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Profile Summary Card */}
              <div className="mobile-card-glass">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Your Profile
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    {user?.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt={user.firstName || 'User'} 
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base sm:text-lg font-semibold truncate">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : 'Welcome!'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Profile Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Setup Progress Card */}
              <div className="mobile-card-glass">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-success" />
                  Setup Progress
                </h2>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-success/5 to-green-500/5 border border-success/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm font-medium text-success">Profile synchronized</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gradient-to-r from-success/5 to-green-500/5 border border-success/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm font-medium text-success">Organization workspace created</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gradient-to-r from-success/5 to-green-500/5 border border-success/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <p className="text-sm font-medium text-success">Financial dashboard ready</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Quick Actions */}
            <div className="space-y-4 sm:space-y-6">
              {/* What's Next Card */}
              <div className="mobile-card-glass">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  What's Next?
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">Start Time Tracking</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">Log your first hours</p>
                      </div>
                    </div>
                  </div>
                  <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg flex-shrink-0">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">Add Your First Client</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">Create client profiles</p>
                      </div>
                    </div>
                  </div>
                  <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-accent/10 rounded-lg flex-shrink-0">
                        <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">Explore Dashboard</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">View analytics & reports</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Features Preview */}
              <div className="mobile-card-glass">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span className="hidden sm:inline">Features Available</span>
                  <span className="sm:hidden">Features</span>
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Euro className="h-3 w-3 text-primary" />
                      <p className="text-xs sm:text-sm font-medium text-primary">Financial Tracking</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Revenue, expenses & profitability</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-success/5 to-green-500/5 border border-success/20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-green-400" />
                      <p className="text-xs sm:text-sm font-medium text-green-400">Time Management</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Track billable hours & projects</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-accent/5 to-orange-500/5 border border-accent/20">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3 text-accent" />
                      <p className="text-xs sm:text-sm font-medium text-accent">Analytics & Reports</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Insights & business intelligence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mobile-card-glass text-center">
            <div className="max-w-lg mx-auto">
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Ready to Start?</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Your financial dashboard is fully configured and ready to help you manage your business.
              </p>
              <Button 
                onClick={handleCompleteOnboarding}
                size="lg" 
                className="w-full sm:w-auto px-8" 
                disabled={showLoading}
              >
                {showLoading ? 'Preparing your account...' : 'Continue to Dashboard'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {error && (
                <p className="text-destructive text-sm mt-2">{error}</p>
              )}
            </div>
          </div>

          {/* Mobile-optimized footer matching dashboard */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border/50">
            <div className="text-xs text-muted-foreground text-center space-y-2">
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">Setup completed</span>
                  <span className="sm:hidden">Ready</span>
                </div>
                <div className="h-3 w-px bg-border hidden sm:block"></div>
                <Link 
                  href="/dashboard" 
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Skip onboarding →
                </Link>
              </div>
              <p className="font-medium text-xs sm:text-sm">
                <span className="hidden sm:inline">Welcome to your Financial Dashboard</span>
                <span className="sm:hidden">Financial Dashboard</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}