'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key for server actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Complete the onboarding process by marking the user as onboarded in Supabase
 */
export async function completeOnboarding() {
  console.log('🔄 Starting onboarding completion...')
  
  const { userId } = await auth()
  console.log('User ID:', userId)

  if (!userId) {
    console.error('❌ No user ID found')
    throw new Error('User not authenticated')
  }

  try {
    console.log('🔄 Marking onboarding as complete in Supabase...')
    console.log('🔍 Looking for user with clerk_user_id:', userId)
    
    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, onboarding_complete')
      .eq('clerk_user_id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking profile:', checkError)
      throw new Error(`Profile check error: ${checkError.message}`)
    }

    let profileData

    if (existingProfile) {
      console.log('✅ Profile found, updating onboarding status:', existingProfile.id)
      
      // Update onboarding_complete to true
      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('clerk_user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to update onboarding status:', error)
        throw new Error(`Failed to complete onboarding: ${error.message}`)
      }

      profileData = data
    } else {
      console.log('⚠️ Profile not found during completion, creating now as fallback...')
      
      // Fallback: create profile now if it somehow doesn't exist
      const { clerkClient } = await import('@clerk/nextjs/server')
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(userId)
      
      if (!clerkUser) {
        throw new Error('User not found in Clerk')
      }
      
      const tenantId = clerkUser.publicMetadata.tenant_id as string || crypto.randomUUID()
      
      // First, create the tenant record (required for foreign key constraint)
      console.log('🏢 Fallback: Creating tenant record with ID:', tenantId)
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          id: tenantId,
          name: `${clerkUser.firstName || 'User'}'s Organization`,
          subdomain: null,
          settings: {},
          subscription_status: 'active',
          billing_email: clerkUser.primaryEmailAddress?.emailAddress,
          max_users: 10,
          max_storage_gb: 5
        }])
        .select()
        .single()

      if (tenantError && tenantError.code !== '23505') { // 23505 is unique constraint violation (tenant already exists)
        console.error('❌ Fallback: Failed to create tenant:', tenantError)
        throw new Error(`Failed to create tenant: ${tenantError.message}`)
      }
      
      if (tenantData) {
        console.log('✅ Fallback: Tenant created successfully:', tenantData.id)
      } else if (tenantError?.code === '23505') {
        console.log('ℹ️ Fallback: Tenant already exists:', tenantId)
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          clerk_user_id: userId,
          tenant_id: tenantId,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          first_name: clerkUser.firstName,
          last_name: clerkUser.lastName,
          avatar_url: clerkUser.imageUrl,
          role: (clerkUser.publicMetadata.role as 'owner' | 'admin' | 'member' | 'viewer') || 'owner',
          last_sign_in_at: new Date().toISOString(),
          is_active: true,
          preferences: {},
          onboarding_complete: true
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ Fallback profile creation failed:', error)
        throw new Error(`Failed to create profile: ${error.message}`)
      }
      
      console.log('✅ Fallback profile created with onboarding complete:', data.id)
      profileData = data
    }

    console.log('✅ Onboarding completed in Supabase:', profileData)
    
  } catch (error) {
    console.error('❌ Failed to complete onboarding:', error)
    console.error('❌ Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    })
    throw new Error(`Failed to complete onboarding: ${error?.message || 'Unknown error'}`)
  }
  
  // Redirect to dashboard directly - profile sync happens in onboarding page
  console.log('🔄 Redirecting to dashboard...')
  redirect('/dashboard')
}