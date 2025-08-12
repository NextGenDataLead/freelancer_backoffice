'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore, useAuthUser } from '@/store/auth-store'
import { useNotificationActions } from '@/store/notifications-store'
import { useGracePeriodGuard } from '@/hooks/use-grace-period'
import { AvatarUpload } from './avatar-upload'
import { PreferencesSection } from './preferences-section'
import { 
  User, 
  Mail, 
  Calendar,
  Shield,
  Save,
  Loader2,
  AlertTriangle
} from 'lucide-react'

// Form validation schema
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileForm() {
  const { user, isLoaded } = useUser()
  const userProfile = useAuthUser() // Get user profile from Zustand store
  const { showSuccess, showError } = useNotificationActions()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()
  
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    }
  })

  // Load profile data from Supabase (single source of truth)
  React.useEffect(() => {
    if (!user || !isLoaded) return

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        
        if (response.ok) {
          const { profile } = await response.json()
          
          // Update form with Supabase data (single source of truth)
          setValue('firstName', profile.first_name || '')
          setValue('lastName', profile.last_name || '')
          setValue('email', profile.email || '')
        } else {
          console.log('Profile not found in Supabase, using Clerk data as fallback')
          setValue('firstName', user.firstName || '')
          setValue('lastName', user.lastName || '')
          setValue('email', user.primaryEmailAddress?.emailAddress || '')
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        // Fallback to Clerk data on error
        setValue('firstName', user.firstName || '')
        setValue('lastName', user.lastName || '')
        setValue('email', user.primaryEmailAddress?.emailAddress || '')
      }
    }

    loadProfile()
  }, [user, isLoaded, setValue])

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return

    // Check grace period before submitting
    if (preventAction('profile updates')) {
      return
    }

    setIsSubmitting(true)
    try {
      // Update Supabase profile (single source of truth)
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
        })
      })

      const result = await response.json()

      if (response.ok) {
        showSuccess('Profile Updated', result.message || 'Your profile has been updated successfully.')
      } else {
        throw new Error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      showError('Update Failed', error instanceof Error ? error.message : 'There was an error updating your profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-slate-600">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grace Period Warning */}
      {isInGracePeriod && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Profile updates are disabled during the account deletion grace period. 
            You can cancel the deletion request in Privacy Settings to restore full access.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Profile Information
          </CardTitle>
          <p className="text-sm text-slate-600">
            Update your basic profile information. Changes will be reflected across your account.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
            <AvatarUpload 
              currentUrl={user?.imageUrl}
              onUploadComplete={(url) => {
                showSuccess('Avatar updated', 'Your profile picture has been updated.')
              }}
            />
            <div className="mt-4 sm:mt-0">
              <h3 className="text-lg font-medium text-slate-900">
                {userProfile?.first_name && userProfile?.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : user?.fullName || 'Anonymous User'
                }
              </h3>
              <p className="text-slate-600">{userProfile?.email || user?.primaryEmailAddress?.emailAddress}</p>
              <div className="mt-2">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="mr-1 h-3 w-3" />
                  {userProfile?.role || 'Member'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label 
                  htmlFor="firstName" 
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register('firstName')}
                  disabled={isInGracePeriod}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
                    isInGracePeriod 
                      ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                      : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label 
                  htmlFor="lastName" 
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register('lastName')}
                  disabled={isInGracePeriod}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
                    isInGracePeriod 
                      ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                      : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email Address
                <Badge variant="outline" className="ml-2 text-xs">
                  Read-only
                </Badge>
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled
                  className="w-full px-3 py-2 pl-10 bg-slate-50 border border-slate-300 rounded-md shadow-sm text-slate-600 cursor-not-allowed"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Email changes must be made through your account settings.
              </p>
            </div>

            {/* Account Details */}
            {user && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Account Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Member since:</span>
                    <div className="flex items-center mt-1">
                      <Calendar className="mr-1 h-3 w-3 text-slate-400" />
                      <span className="text-slate-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <div className="mt-1">
                      <Badge variant="default">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={!isDirty || isSubmitting || isInGracePeriod}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* User Preferences */}
      <PreferencesSection />
    </div>
  )
}