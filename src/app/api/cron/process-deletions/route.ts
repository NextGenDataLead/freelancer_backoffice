/**
 * Background Deletion Job API
 * Processes expired account deletion requests automatically
 * 
 * This API route should be triggered by a cron service (Vercel Cron, GitHub Actions, etc.)
 * to automatically delete users whose grace period has expired.
 * 
 * Usage:
 * - Call this endpoint on a scheduled basis (e.g., daily)
 * - Can be triggered by external cron services
 * - Includes safety checks and comprehensive logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeAccountDeletion, validateUserForDeletion, executeModernAccountDeletion } from '@/lib/deletion/account-cleanup'
import { getCurrentDate } from '@/lib/current-date'

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

/**
 * GET /api/cron/process-deletions
 * Process all expired account deletion requests
 */
export async function GET(req: NextRequest) {
  const startTime = getCurrentDate()
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
    details: [] as any[]
  }

  try {
    // Verify this is a legitimate cron request (optional security)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron deletion request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 Starting automated deletion processing...')

    // Find all deletion requests where grace period has expired
    const now = getCurrentDate()
    const { data: expiredDeletions, error: fetchError } = await supabase
      .from('deletion_requests')
      .select(`
        id,
        user_id,
        scheduled_for,
        requested_at,
        metadata,
        profiles!inner(clerk_user_id)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch expired deletions:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch deletion requests',
        details: fetchError
      }, { status: 500 })
    }

    if (!expiredDeletions || expiredDeletions.length === 0) {
      console.log('✅ No expired deletion requests found')
      return NextResponse.json({
        success: true,
        message: 'No deletion requests to process',
        processed: 0
      })
    }

    console.log(`Found ${expiredDeletions.length} expired deletion requests`)

    // Process each expired deletion
    for (const deletion of expiredDeletions) {
      const { id: deletionId, user_id: dbUserId, metadata, profiles } = deletion
      const clerkUserId = profiles?.clerk_user_id

      if (!clerkUserId) {
        console.error(`No Clerk user ID found for deletion ${deletionId}`)
        results.skipped++
        results.errors.push(`Deletion ${deletionId}: Missing Clerk user ID`)
        continue
      }

      results.processed++
      const deletionStartTime = getCurrentDate()

      try {
        console.log(`Processing deletion ${deletionId} for user ${clerkUserId}`)

        // Optional: Validate before deletion
        const validation = await validateUserForDeletion(clerkUserId)
        if (!validation.canDelete && validation.issues) {
          console.warn(`Validation issues for ${clerkUserId}:`, validation.issues)
          // Continue anyway - these are warnings, not blockers for automated deletion
        }

        // Execute the deletion using modern soft deletion approach
        const deletionResult = await executeModernAccountDeletion(clerkUserId, deletion.metadata?.reason)

        if (deletionResult.success) {
          console.log(`✅ Successfully deleted user ${clerkUserId}`)
          results.successful++
          results.details.push({
            deletionId,
            clerkUserId,
            status: 'success',
            duration: getCurrentDate().getTime() - deletionStartTime.getTime()
          })
        } else {
          console.error(`❌ Failed to delete user ${clerkUserId}:`, deletionResult.error)
          results.failed++
          results.errors.push(`User ${clerkUserId}: ${deletionResult.error}`)
          results.details.push({
            deletionId,
            clerkUserId,
            status: 'failed',
            error: deletionResult.error,
            details: deletionResult.details,
            duration: getCurrentDate().getTime() - deletionStartTime.getTime()
          })
        }

      } catch (error) {
        console.error(`❌ Unexpected error processing deletion ${deletionId}:`, error)
        results.failed++
        results.errors.push(`Deletion ${deletionId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.details.push({
          deletionId,
          clerkUserId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: getCurrentDate().getTime() - deletionStartTime.getTime()
        })
      }

      // Add a small delay between deletions to avoid overwhelming systems
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Create summary audit log
    const totalDuration = getCurrentDate().getTime() - startTime.getTime()
    
    try {
      await supabase
        .from('gdpr_audit_logs')
        .insert({
          user_id: null, // System-wide operation
          action: 'batch_deletion_processed',
          timestamp: getCurrentDate().toISOString(),
          metadata: {
            batch_id: `batch_${startTime.getTime()}`,
            processed: results.processed,
            successful: results.successful,
            failed: results.failed,
            skipped: results.skipped,
            total_duration_ms: totalDuration,
            started_at: startTime.toISOString(),
            completed_at: getCurrentDate().toISOString(),
          },
        })
    } catch (auditError) {
      console.error('Failed to create batch audit log:', auditError)
    }

    // Log final results
    console.log(`🏁 Batch deletion completed:`)
    console.log(`   Processed: ${results.processed}`)
    console.log(`   Successful: ${results.successful}`)
    console.log(`   Failed: ${results.failed}`)
    console.log(`   Skipped: ${results.skipped}`)
    console.log(`   Duration: ${totalDuration}ms`)

    if (results.errors.length > 0) {
      console.error('Errors encountered:', results.errors)
    }

    return NextResponse.json({
      success: true,
      summary: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        duration: totalDuration,
        startTime: startTime.toISOString(),
        endTime: getCurrentDate().toISOString()
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
      details: results.details
    })

  } catch (error) {
    console.error('❌ Critical error in batch deletion processing:', error)
    
    // Try to create error audit log
    try {
      await supabase
        .from('gdpr_audit_logs')
        .insert({
          user_id: null,
          action: 'batch_deletion_error',
          timestamp: getCurrentDate().toISOString(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown critical error',
            started_at: startTime.toISOString(),
            failed_at: getCurrentDate().toISOString(),
          },
        })
    } catch (auditError) {
      console.error('Failed to create error audit log:', auditError)
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Critical error during batch processing',
      summary: results
    }, { status: 500 })
  }
}

/**
 * POST /api/cron/process-deletions
 * Manual trigger for deletion processing (for testing/admin use)
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Add admin authentication here
    const body = await req.json().catch(() => ({}))
    const { dryRun = false, maxDeletions = 10 } = body

    if (dryRun) {
      // Dry run mode - just show what would be deleted
      const now = getCurrentDate()
      const { data: expiredDeletions, error } = await supabase
        .from('deletion_requests')
        .select(`
          id,
          user_id,
          scheduled_for,
          requested_at,
          metadata,
          profiles!inner(clerk_user_id)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(maxDeletions)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch deletion requests' }, { status: 500 })
      }

      return NextResponse.json({
        dryRun: true,
        message: `Found ${expiredDeletions?.length || 0} expired deletion requests`,
        deletions: expiredDeletions?.map(d => ({
          deletionId: d.id,
          clerkUserId: d.profiles?.clerk_user_id,
          scheduledFor: d.scheduled_for,
          requestedAt: d.requested_at,
          reason: d.metadata?.reason
        })) || []
      })
    } else {
      // Execute the same logic as GET request
      return GET(req)
    }

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process request'
    }, { status: 500 })
  }
}