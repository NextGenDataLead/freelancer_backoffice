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
 * GET /api/admin/users
 * Lists all users in the tenant (admin only)
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's profile
    const { data: currentUserProfile, error: currentUserError } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (currentUserError) {
      return NextResponse.json({ error: 'Failed to verify current user' }, { status: 400 })
    }

    // Only admins and owners can list users
    const isAdmin = currentUserProfile.role === 'owner' || currentUserProfile.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 })
    }

    // Get all users in the same tenant
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        last_sign_in_at,
        onboarding_complete
      `)
      .eq('tenant_id', currentUserProfile.tenant_id)
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json({ 
        error: 'Failed to fetch users' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      users: users || [],
      total: users?.length || 0
    })

  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}