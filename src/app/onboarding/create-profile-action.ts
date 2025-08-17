'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key for server actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Create user profile immediately when onboarding page loads
 * This ensures the profile exists before any other operations
 */
export async function createUserProfile() {
  console.log('🔄 Creating user profile on onboarding load...')
  
  const { userId } = await auth()
  console.log('🔍 Auth result - userId:', userId)
  
  if (!userId) {
    console.error('❌ No user ID found in auth()')
    throw new Error('User not authenticated')
  }

  try {
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, onboarding_complete')
      .eq('clerk_user_id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking existing profile:', checkError)
      throw new Error(`Profile check error: ${checkError.message}`)
    }

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile.id)
      return { success: true, action: 'existing', profile: existingProfile }
    }

    // Profile doesn't exist, create it
    console.log('🔄 Profile not found, creating new profile...')
    
    // Get user info from Clerk for profile creation
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    
    if (!clerkUser) {
      throw new Error('User not found in Clerk')
    }
    
    // Generate tenant_id if not exists
    const tenantId = clerkUser.publicMetadata.tenant_id as string || crypto.randomUUID()
    
    // Update Clerk metadata with tenant_id if it was generated
    if (!clerkUser.publicMetadata.tenant_id) {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          tenant_id: tenantId,
          role: 'owner'
        }
      })
    }
    
    // First, create the tenant record (required for foreign key constraint)
    console.log('🏢 Creating tenant record with ID:', tenantId)
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert([{
        id: tenantId,
        name: `${clerkUser.firstName || 'User'}'s Organization`,
        subdomain: null, // Will be set later if needed
        settings: {},
        subscription_status: 'active',
        billing_email: clerkUser.primaryEmailAddress?.emailAddress,
        max_users: 10,
        max_storage_gb: 5
      }])
      .select()
      .single()

    if (tenantError && tenantError.code !== '23505') { // 23505 is unique constraint violation (tenant already exists)
      console.error('❌ Failed to create tenant:', tenantError)
      throw new Error(`Failed to create tenant: ${tenantError.message}`)
    }
    
    if (tenantData) {
      console.log('✅ Tenant created successfully:', tenantData.id)
    } else if (tenantError?.code === '23505') {
      console.log('ℹ️ Tenant already exists:', tenantId)
    }
    
    // Now create the profile
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
        onboarding_complete: false // Will be set to true when user completes onboarding
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Profile creation error:', error)
      throw new Error(`Failed to create profile: ${error.message}`)
    }
    
    console.log('✅ Profile created successfully:', data.id)
    return { success: true, action: 'created', profile: data }
    
  } catch (error) {
    console.error('❌ Failed to create user profile:', error)
    throw new Error(`Failed to create profile: ${error?.message || 'Unknown error'}`)
  }
}