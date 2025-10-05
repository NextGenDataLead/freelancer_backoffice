import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentDate } from '@/lib/current-date'

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
 * GET /api/user/profile
 * Retrieves user profile from Supabase (single source of truth)
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile from Supabase
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/user/profile  
 * Updates user profile in Supabase (single source of truth)
 * Clerk remains for authentication only
 */
export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    console.log('Profile update - userId:', userId)
    
    if (!userId) {
      console.log('Profile update - No userId, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName } = body
    console.log('Profile update - received data:', { firstName, lastName })

    // Validate input
    if (!firstName || !lastName) {
      console.log('Profile update - Missing required fields')
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // First check if profile exists
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    console.log('Profile update - existing profile check:', { existingProfile: existingProfile?.id, fetchError })

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Profile update - Error fetching existing profile:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!existingProfile) {
      console.log('Profile update - No existing profile found, user may need to sync first')
      return NextResponse.json({ error: 'Profile not found. Please refresh the page to sync your profile.' }, { status: 404 })
    }

    // Update Supabase profile (single source of truth)
    const updateData = {
      first_name: firstName,
      last_name: lastName,
      updated_at: getCurrentDate().toISOString()
    }
    console.log('Profile update - updating with data:', updateData)

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    console.log('Profile update - result:', { updatedProfile: updatedProfile?.id, updateError })

    if (updateError) {
      console.error('Error updating Supabase profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    console.log('Profile update - success, returning profile:', updatedProfile)
    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}