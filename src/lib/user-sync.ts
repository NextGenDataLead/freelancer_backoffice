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

    const syncUserProfile = async () => {
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
        // First, try to get existing profile by clerk_user_id
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('clerk_user_id', user.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found", which is expected for new users
          console.error('Error fetching user profile:', fetchError)
          return
        }

        const now = new Date().toISOString()

        if (existingProfile) {
          // Update existing profile
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              email: user.primaryEmailAddress?.emailAddress || '',
              first_name: user.firstName,
              last_name: user.lastName,
              avatar_url: user.imageUrl,
              last_sign_in_at: now,
              updated_at: now,
            })
            .eq('clerk_user_id', user.id)
            .select()
            .single()

          if (updateError) {
            console.error('Error updating user profile:', updateError)
          } else {
            setUserProfile(updatedProfile)
          }
        } else {
          // Profile doesn't exist - use server-side sync endpoint
          console.log('Profile not found, calling sync endpoint...')
          try {
            const response = await fetch('/api/user/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            })

            if (response.ok) {
              const result = await response.json()
              console.log('User sync successful:', result.action, result.profile?.id)
              setUserProfile(result.profile)
            } else {
              const error = await response.json()
              console.error('User sync failed:', error)
              
              // Fallback: try direct Supabase creation
              await createProfileFallback()
            }
          } catch (error) {
            console.error('Error calling sync endpoint:', error)
            // Fallback: try direct Supabase creation
            await createProfileFallback()
          }
        }

        // Fallback profile creation function
        async function createProfileFallback() {
          console.log('Attempting fallback profile creation...')
          const tenantId = user.publicMetadata.tenant_id as string
          
          if (tenantId) {
            // First, ensure the tenant exists
            const { data: existingTenant, error: tenantFetchError } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', tenantId)
              .single()
            
            if (tenantFetchError && tenantFetchError.code === 'PGRST116') {
              // Tenant doesn't exist, create it
              const { error: tenantInsertError } = await supabase
                .from('tenants')
                .insert([{
                  id: tenantId,
                  name: `${user.firstName || 'User'}'s Organization`,
                  created_at: now,
                  updated_at: now,
                  subscription_status: 'active',
                  max_users: 10,
                  max_storage_gb: 5
                }])
                
              if (tenantInsertError) {
                console.error('Error creating tenant:', tenantInsertError)
                return
              }
            }
          }
          
          const newProfile = {
            clerk_user_id: user.id,
            tenant_id: tenantId,
            email: user.primaryEmailAddress?.emailAddress || '',
            first_name: user.firstName,
            last_name: user.lastName,
            avatar_url: user.imageUrl,
            role: (user.publicMetadata.role as 'owner' | 'admin' | 'member' | 'viewer') || 'owner',
            last_sign_in_at: now,
            is_active: true,
            preferences: {},
          }

          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single()

          if (insertError) {
            console.error('Fallback profile creation failed:', insertError)
          } else {
            console.log('Fallback profile created successfully')
            setUserProfile(insertedProfile)
          }
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