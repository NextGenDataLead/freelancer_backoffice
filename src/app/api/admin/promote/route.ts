import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * POST /api/admin/promote
 * Promotes a user to admin role
 * Only owners can promote other users to admin
 */
export async function POST(req: Request) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile
    const { data: currentUserProfile, error: currentUserError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('clerk_user_id', currentUserId)
      .single()

    if (currentUserError) {
      return NextResponse.json({ error: 'Failed to verify current user' }, { status: 400 })
    }

    // Only owners can promote users to admin
    if (currentUserProfile.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Access denied. Only owners can promote users to admin.' 
      }, { status: 403 })
    }

    const { email, role } = await req.json()

    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Email and role are required' 
      }, { status: 400 })
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, member, or viewer' 
      }, { status: 400 })
    }

    // Find user by email
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, first_name, last_name')
      .eq('email', email)
      .single()

    if (userError) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Prevent owners from being demoted
    if (userProfile.role === 'owner') {
      return NextResponse.json({ 
        error: 'Cannot change role of owner account' 
      }, { status: 400 })
    }

    // Update user role
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id)
      .select('id, email, role, first_name, last_name')
      .single()

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update user role' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `User ${email} has been promoted to ${role}`,
      user: updatedProfile
    })

  } catch (error) {
    console.error('Role promotion error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}