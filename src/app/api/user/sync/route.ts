import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * POST /api/user/sync
 * Creates or updates user profile in Supabase
 * This compensates for third-party auth not working properly
 */
export async function POST() {
  try {
    const { userId, getToken } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the JWT token to validate it's working
    const token = await getToken({ template: 'supabase' })
    if (!token) {
      return NextResponse.json({ error: 'Failed to get JWT token' }, { status: 400 })
    }

    // Get user details from Clerk
    const clerkUser = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!clerkUser.ok) {
      return NextResponse.json({ error: 'Failed to fetch user from Clerk' }, { status: 400 })
    }

    const userData = await clerkUser.json()
    const email = userData.email_addresses?.[0]?.email_address || `${userId}@placeholder.local`

    // First, try to create user in Supabase auth.users using admin client
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: userData.image_url,
        clerk_user_id: userId,
        provider: 'clerk'
      },
      email_confirm: true // Skip email verification since user is already verified in Clerk
    })

    if (authUserError && !authUserError.message.includes('already registered')) {
      console.error('Error creating auth user:', authUserError)
      return NextResponse.json({ error: `Failed to create auth user: ${authUserError.message}` }, { status: 500 })
    }

    const supabaseUserId = authUser?.user?.id || (await supabaseAdmin.auth.admin.getUserByEmail(email)).data.user?.id

    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const now = new Date().toISOString()

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar_url: userData.image_url,
          last_sign_in_at: now,
          updated_at: now,
        })
        .eq('clerk_user_id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating profile:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        action: 'updated',
        profile: updatedProfile 
      })
    } else {
      // Create new profile
      let tenantId = userData.public_metadata?.tenant_id

      // Generate tenant_id if not exists
      if (!tenantId) {
        tenantId = crypto.randomUUID()
        
        // Update Clerk user metadata
        await fetch(`https://api.clerk.dev/v1/users/${userId}/metadata`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_metadata: {
              ...userData.public_metadata,
              tenant_id: tenantId,
              role: 'owner'
            }
          })
        })
      }

      // Create tenant if it doesn't exist
      const { data: existingTenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (!existingTenant) {
        const { error: tenantError } = await supabaseAdmin
          .from('tenants')
          .insert([{
            id: tenantId,
            name: `${userData.first_name || 'User'}'s Organization`,
            created_at: now,
            updated_at: now,
            subscription_status: 'active',
            max_users: 10,
            max_storage_gb: 5
          }])

        if (tenantError) {
          console.error('Error creating tenant:', tenantError)
          return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
        }
      }

      // Create new profile
      const newProfile = {
        clerk_user_id: userId,
        tenant_id: tenantId,
        email: email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: userData.image_url,
        role: (userData.public_metadata?.role as 'owner' | 'admin' | 'member' | 'viewer') || 'owner',
        last_sign_in_at: now,
        is_active: true,
        preferences: {},
      }

      const { data: insertedProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (insertError) {
        console.error('Error creating profile:', insertError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        action: 'created',
        profile: insertedProfile,
        authUser: authUser?.user ? { id: authUser.user.id, email: authUser.user.email } : null
      })
    }

  } catch (error) {
    console.error('User sync error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}