'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSupabaseClient } from '@/hooks/use-supabase-client'
import { useAuthStore } from '@/store/auth-store'

/**
 * User profile type matching existing Supabase profiles table
 */
export interface UserProfile {
  id: string // UUID primary key
  tenant_id: string | null
  clerk_user_id: string // Clerk user ID
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  is_active: boolean
  preferences: Record<string, any>
}

/**
 * Hook to sync Clerk user data with Supabase profiles table
 * This ensures user data is available in Supabase for RLS policies
 * Works with the existing multi-tenant architecture
 */
export function useUserSync() {
  const { user, isLoaded } = useUser()
  const { supabase, isAuthenticated } = useSupabaseClient()
  const { setUserProfile, setIsAuthenticated, setIsLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoaded) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)
    setIsAuthenticated(isAuthenticated && !!user)

    if (!user || !isAuthenticated) {
      setUserProfile(null)
      return
    }

    const syncUserProfile = async (retryCount = 0) => {
      // Check if we just completed onboarding and should wait a bit
      const justCompletedOnboarding = sessionStorage.getItem('just-completed-onboarding')
      if (justCompletedOnboarding && retryCount === 0) {
        console.log('🔄 UserSync: Just completed onboarding, waiting 2 seconds before sync...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      // Ensure user has tenant_id in public metadata
      if (!user.publicMetadata.tenant_id) {
        try {
          console.log('Setting tenant_id for new user')
          // Generate a UUID for tenant_id (in real app, this would be more sophisticated)
          const tenantId = crypto.randomUUID()
          
          // Update metadata via server-side API endpoint
          const response = await fetch('/api/user/update-metadata', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tenant_id: tenantId,
              role: 'owner'
            })
          })
          
          if (response.ok) {
            console.log('User metadata updated successfully')
            // Reload user to get updated metadata
            await user.reload()
          } else {
            console.error('Failed to update user metadata:', await response.text())
          }
        } catch (error) {
          console.error('Error updating user metadata:', error)
        }
      }
      try {
        console.log('🔍 UserSync: Checking for existing profile for user:', user.id)
        
        // First, try to get existing profile by clerk_user_id
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('clerk_user_id', user.id)
          .single()

        console.log('🔍 UserSync: Profile lookup result:', {
          found: !!existingProfile,
          error: fetchError?.message,
          errorCode: fetchError?.code,
          profileId: existingProfile?.id
        })

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found", which is expected for new users
          console.error('Error fetching user profile:', fetchError)
          return
        }

        const now = new Date().toISOString()

        if (existingProfile) {
          console.log('✅ UserSync: Profile found, updating with latest data')
          
          // Update existing profile - preserve first_name/last_name if they exist in Supabase (single source of truth)
          const updateData: any = {
            email: user.primaryEmailAddress?.emailAddress || '',
            avatar_url: user.imageUrl,
            last_sign_in_at: now,
            updated_at: now,
          }
          
          // Only update name fields from Clerk if they don't exist in Supabase
          // Supabase is the single source of truth for profile data
          if (!existingProfile.first_name && user.firstName) {
            updateData.first_name = user.firstName
          }
          if (!existingProfile.last_name && user.lastName) {
            updateData.last_name = user.lastName
          }

          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('clerk_user_id', user.id)
            .select()
            .single()

          if (updateError) {
            console.error('Error updating user profile:', updateError)
            // Still set the existing profile if update fails
            setUserProfile(existingProfile)
          } else {
            setUserProfile(updatedProfile)
          }
        } else {
          console.log('⚠️ UserSync: Profile not found - this should not happen with new flow')
          // Profile should already exist (created on onboarding page load)
          // Just set the profile to null and let the user know
          setUserProfile(null)
        }
      } catch (error) {
        console.error('Error syncing user profile:', error)
      }
    }

    syncUserProfile()
  }, [user, isLoaded, isAuthenticated, supabase, setUserProfile, setIsAuthenticated, setIsLoading])

  return {
    user,
    isLoaded,
    isAuthenticated: isAuthenticated && !!user,
  }
}