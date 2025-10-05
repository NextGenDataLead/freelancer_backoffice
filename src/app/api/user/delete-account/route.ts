import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentDate } from '@/lib/current-date'

/**
 * POST /api/user/delete-account
 * Initiates account deletion with 30-day grace period
 * Complies with GDPR Article 17 (Right to Erasure)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { confirmationText, reason } = body

    // Verify confirmation text
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'Confirmation text does not match' },
        { status: 400 }
      )
    }

    // Calculate deletion date (30 days from now)
    const deletionDate = getCurrentDate()
    deletionDate.setDate(deletionDate.getDate() + 30)

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Store deletion request in Supabase database
    try {
      // First get the user's profile to get the database user_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError || !profile) {
        console.error('Failed to find user profile:', profileError)
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      const dbUserId = profile.id

      // Store deletion request in database
      const { error: deletionError } = await supabase
        .from('deletion_requests')
        .insert({
          user_id: dbUserId,
          requested_at: getCurrentDate().toISOString(),
          scheduled_for: deletionDate.toISOString(),
          status: 'pending',
          metadata: {
            reason: reason || 'No reason provided',
            clerk_user_id: userId,
            requested_via: 'privacy_dashboard',
          },
        })

      if (deletionError) {
        console.error('Failed to create deletion request:', deletionError)
        return NextResponse.json(
          { error: 'Failed to store deletion request' },
          { status: 500 }
        )
      }

      // Create GDPR audit log
      const { error: auditError } = await supabase
        .from('gdpr_audit_logs')
        .insert({
          user_id: dbUserId,
          action: 'deletion_requested',
          timestamp: getCurrentDate().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
          metadata: {
            scheduled_for: deletionDate.toISOString(),
            reason: reason || 'No reason provided',
            grace_period_days: 30,
          },
        })

      if (auditError) {
        console.error('Failed to create audit log:', auditError)
        // Don't fail the request for audit log errors, but log it
      }
    } catch (supabaseError) {
      console.error('Supabase deletion request error:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to process deletion request in database' },
        { status: 500 }
      )
    }

    // Also update Clerk metadata for backwards compatibility and cross-system tracking
    try {
      const client = await clerkClient()
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          accountDeletionRequested: true,
          deletionRequestedAt: getCurrentDate().toISOString(),
          scheduledDeletionAt: deletionDate.toISOString(),
          deletionReason: reason || 'No reason provided',
        },
      })
    } catch (clerkError) {
      console.error('Failed to update Clerk metadata:', clerkError)
      // Don't fail the request if Clerk update fails, as we have it in Supabase
    }

    // Create console audit log
    console.log(`Account deletion requested by user ${userId} at ${getCurrentDate().toISOString()}`, {
      reason,
      scheduledDeletion: deletionDate.toISOString(),
      gracePeriodDays: 30,
    })

    // TODO: Send confirmation email
    // TODO: Schedule background job for actual deletion

    return NextResponse.json({
      success: true,
      message: 'Account deletion has been scheduled',
      scheduledDeletionAt: deletionDate.toISOString(),
      gracePeriodDays: 30,
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/delete-account/cancel
 * Cancel pending account deletion during grace period
 */
export async function DELETE() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get user profile and check for pending deletion in Supabase
    let dbUserId: string
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError || !profile) {
        console.error('Failed to find user profile:', profileError)
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      dbUserId = profile.id

      // Check for pending deletion request
      const { data: deletionRequest, error: deletionError } = await supabase
        .from('deletion_requests')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('status', 'pending')
        .single()

      if (deletionError || !deletionRequest) {
        return NextResponse.json(
          { error: 'No pending deletion request found' },
          { status: 400 }
        )
      }

      // Cancel the deletion request in Supabase
      const { error: cancelError } = await supabase
        .from('deletion_requests')
        .update({
          status: 'cancelled',
          completed_at: getCurrentDate().toISOString(),
          metadata: {
            ...deletionRequest.metadata,
            cancelled_at: getCurrentDate().toISOString(),
            cancelled_via: 'privacy_dashboard',
          },
        })
        .eq('id', deletionRequest.id)

      console.log('DEBUG: Cancellation update result:', {
        deletionRequestId: deletionRequest.id,
        cancelError,
        newStatus: 'cancelled'
      })

      if (cancelError) {
        console.error('Failed to cancel deletion request:', cancelError)
        return NextResponse.json(
          { error: 'Failed to cancel deletion request' },
          { status: 500 }
        )
      }

      // Create GDPR audit log for cancellation
      const { error: auditError } = await supabase
        .from('gdpr_audit_logs')
        .insert({
          user_id: dbUserId,
          action: 'deletion_cancelled',
          timestamp: getCurrentDate().toISOString(),
          metadata: {
            original_scheduled_for: deletionRequest.scheduled_for,
            cancelled_at: getCurrentDate().toISOString(),
            days_remaining: Math.ceil(
              (new Date(deletionRequest.scheduled_for).getTime() - getCurrentDate().getTime()) / (1000 * 60 * 60 * 24)
            ),
          },
        })

      if (auditError) {
        console.error('Failed to create audit log:', auditError)
        // Don't fail the request for audit log errors
      }
    } catch (supabaseError) {
      console.error('Supabase cancellation error:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to cancel deletion request in database' },
        { status: 500 }
      )
    }

    // Also remove deletion metadata from Clerk for backwards compatibility
    try {
      const privateMetadata = user.privateMetadata as any
      const client = await clerkClient()
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...privateMetadata,
          accountDeletionRequested: false,
          deletionRequestedAt: null,
          scheduledDeletionAt: null,
          deletionReason: null,
          deletionCancelledAt: getCurrentDate().toISOString(),
        },
      })
    } catch (clerkError) {
      console.error('Failed to update Clerk metadata:', clerkError)
      // Don't fail the request if Clerk update fails, as we have it in Supabase
    }

    // Create audit log
    console.log(`Account deletion cancelled by user ${userId} at ${getCurrentDate().toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'Account deletion has been cancelled',
    })
  } catch (error) {
    console.error('Deletion cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel deletion' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/delete-account/status
 * Get current account deletion status
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (profileError || !profile) {
        console.error('Failed to find user profile:', profileError)
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      // Check for pending deletion request in Supabase
      const { data: deletionRequest, error: deletionError } = await supabase
        .from('deletion_requests')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .single()

      console.log('DEBUG: Deletion request check:', {
        userId: profile.id,
        deletionRequest,
        deletionError,
        errorCode: deletionError?.code
      })

      if (deletionError || !deletionRequest) {
        // No pending deletion request found
        console.log('DEBUG: No pending deletion found, returning false')
        return NextResponse.json({
          hasPendingDeletion: false,
        })
      }

      // Calculate days remaining
      const scheduledAt = new Date(deletionRequest.scheduled_for)
      const daysRemaining = Math.ceil((scheduledAt.getTime() - getCurrentDate().getTime()) / (1000 * 60 * 60 * 24))
      
      return NextResponse.json({
        hasPendingDeletion: true,
        scheduledDeletionAt: deletionRequest.scheduled_for,
        daysRemaining: Math.max(0, daysRemaining),
        canCancel: daysRemaining > 0,
        requestedAt: deletionRequest.requested_at,
        reason: deletionRequest.metadata?.reason,
      })
    } catch (supabaseError) {
      console.error('Supabase status check error:', supabaseError)
      
      // Fallback to Clerk metadata for backwards compatibility
      const privateMetadata = user.privateMetadata as any
      if (privateMetadata?.accountDeletionRequested) {
        const scheduledAt = new Date(privateMetadata.scheduledDeletionAt)
        const daysRemaining = Math.ceil((scheduledAt.getTime() - getCurrentDate().getTime()) / (1000 * 60 * 60 * 24))
        
        return NextResponse.json({
          hasPendingDeletion: true,
          scheduledDeletionAt: privateMetadata.scheduledDeletionAt,
          daysRemaining: Math.max(0, daysRemaining),
          canCancel: daysRemaining > 0,
          source: 'clerk_fallback',
        })
      }

      return NextResponse.json({
        hasPendingDeletion: false,
      })
    }
  } catch (error) {
    console.error('Deletion status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    )
  }
}