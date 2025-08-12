/**
 * Account Cleanup Utilities
 * Handles complete account deletion from both Clerk and Supabase
 * GDPR Article 17 compliant implementation
 * 
 * Based on research findings:
 * - Clerk deletion does NOT automatically clean up Supabase
 * - Must handle both systems independently with proper error recovery
 * - Order of operations is critical for foreign key constraints
 */

import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { performSoftDeletion, SoftDeletionResult } from './soft-deletion'

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

interface DeletionResult {
  success: boolean
  error?: string
  details?: {
    clerkDeleted: boolean
    supabaseDeleted: boolean
    partialFailure?: string[]
  }
}

export interface ModernDeletionResult {
  success: boolean
  method: 'soft_deletion' | 'hard_deletion'
  userAnonymized: boolean
  clerkAnonymized: boolean
  error?: string
  anonymizedUserId?: string
  originalEmail?: string
}

/**
 * Delete user account from Clerk authentication system
 * This only removes the user from Clerk - does NOT affect Supabase
 */
export async function deleteUserFromClerk(clerkUserId: string): Promise<boolean> {
  try {
    console.log(`Starting Clerk deletion for user: ${clerkUserId}`)
    const client = await clerkClient()
    await client.users.deleteUser(clerkUserId)
    console.log(`✅ Successfully deleted user from Clerk: ${clerkUserId}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to delete user from Clerk (${clerkUserId}):`, error)
    return false
  }
}

/**
 * Delete user data from Supabase with proper cascade handling
 * Order of operations is critical to avoid foreign key constraint violations
 */
export async function deleteUserFromSupabase(dbUserId: string): Promise<{
  success: boolean
  error?: string
  partialFailures?: string[]
}> {
  const partialFailures: string[] = []
  
  try {
    console.log(`Starting Supabase cleanup for user: ${dbUserId}`)

    // Step 1: Delete user-generated content first (no foreign key dependencies)
    console.log('Step 1: Deleting user-generated content...')
    try {
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', dbUserId)
      
      if (documentsError) {
        console.error('Failed to delete user documents:', documentsError)
        partialFailures.push('documents')
      } else {
        console.log('✅ Deleted user documents')
      }
    } catch (error) {
      console.error('Error deleting documents:', error)
      partialFailures.push('documents')
    }

    // Step 2: Delete notifications and events
    console.log('Step 2: Deleting notifications...')
    try {
      const { error: notificationEventsError } = await supabase
        .from('notification_events')
        .delete()
        .eq('user_id', dbUserId)

      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', dbUserId)

      if (notificationEventsError || notificationsError) {
        console.error('Failed to delete notifications:', { notificationEventsError, notificationsError })
        partialFailures.push('notifications')
      } else {
        console.log('✅ Deleted user notifications')
      }
    } catch (error) {
      console.error('Error deleting notifications:', error)
      partialFailures.push('notifications')
    }

    // Step 3: Remove from organization memberships (but preserve organizations)
    console.log('Step 3: Removing organization memberships...')
    try {
      const { error: membershipsError } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('user_id', dbUserId)

      if (membershipsError) {
        console.error('Failed to delete organization memberships:', membershipsError)
        partialFailures.push('organization_memberships')
      } else {
        console.log('✅ Removed organization memberships')
      }
    } catch (error) {
      console.error('Error deleting organization memberships:', error)
      partialFailures.push('organization_memberships')
    }

    // Step 4: Handle organizations where user is owner
    console.log('Step 4: Handling owned organizations...')
    try {
      // Get organizations owned by this user
      const { data: ownedOrgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, (organization_memberships(count))')
        .eq('owner_id', dbUserId)

      if (orgsError) {
        console.error('Failed to fetch owned organizations:', orgsError)
        partialFailures.push('organizations_fetch')
      } else if (ownedOrgs && ownedOrgs.length > 0) {
        for (const org of ownedOrgs) {
          // Check if organization has other members
          const { count: memberCount } = await supabase
            .from('organization_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)

          if (memberCount === 0) {
            // No other members - safe to delete organization
            const { error: deleteOrgError } = await supabase
              .from('organizations')
              .delete()
              .eq('id', org.id)

            if (deleteOrgError) {
              console.error(`Failed to delete empty organization ${org.id}:`, deleteOrgError)
              partialFailures.push(`organization_${org.id}`)
            } else {
              console.log(`✅ Deleted empty organization: ${org.name}`)
            }
          } else {
            // Has other members - need to transfer ownership or handle differently
            // For now, we'll leave the organization and log it as requiring manual intervention
            console.warn(`⚠️ Organization "${org.name}" (${org.id}) has ${memberCount} other members - requires manual ownership transfer`)
            partialFailures.push(`organization_transfer_needed_${org.id}`)
          }
        }
      } else {
        console.log('✅ No owned organizations to handle')
      }
    } catch (error) {
      console.error('Error handling owned organizations:', error)
      partialFailures.push('organizations')
    }

    // Step 5: Delete password reset tokens
    console.log('Step 5: Deleting password reset tokens...')
    try {
      const { error: tokensError } = await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', dbUserId)

      if (tokensError) {
        console.error('Failed to delete password reset tokens:', tokensError)
        partialFailures.push('password_reset_tokens')
      } else {
        console.log('✅ Deleted password reset tokens')
      }
    } catch (error) {
      console.error('Error deleting password reset tokens:', error)
      partialFailures.push('password_reset_tokens')
    }

    // Step 6: Delete tenant associations
    console.log('Step 6: Deleting tenant associations...')
    try {
      const { error: tenantsError } = await supabase
        .from('tenants')
        .delete()
        .eq('owner_id', dbUserId)

      if (tenantsError) {
        console.error('Failed to delete user tenants:', tenantsError)
        partialFailures.push('tenants')
      } else {
        console.log('✅ Deleted user tenants')
      }
    } catch (error) {
      console.error('Error deleting user tenants:', error)
      partialFailures.push('tenants')
    }

    // Step 7: Finally, delete the main profile
    // Note: We preserve deletion_requests and gdpr_audit_logs for compliance
    console.log('Step 7: Deleting main user profile...')
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', dbUserId)

      if (profileError) {
        console.error('❌ CRITICAL: Failed to delete user profile:', profileError)
        return {
          success: false,
          error: 'Failed to delete main user profile',
          partialFailures
        }
      } else {
        console.log('✅ Deleted main user profile')
      }
    } catch (error) {
      console.error('❌ CRITICAL: Error deleting user profile:', error)
      return {
        success: false,
        error: 'Critical error deleting user profile',
        partialFailures
      }
    }

    // Success!
    const success = partialFailures.length === 0
    console.log(`${success ? '✅' : '⚠️'} Supabase cleanup completed for user ${dbUserId}`)
    
    if (partialFailures.length > 0) {
      console.warn('Partial failures in:', partialFailures)
    }

    return {
      success,
      partialFailures: partialFailures.length > 0 ? partialFailures : undefined
    }

  } catch (error) {
    console.error('❌ Unexpected error during Supabase deletion:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      partialFailures
    }
  }
}

/**
 * Execute complete account deletion across both Clerk and Supabase
 * This is the main function that orchestrates the entire deletion process
 * 
 * @deprecated Use performSoftDeletion from soft-deletion.ts for GDPR-compliant anonymization
 * This function performs hard deletion and should be replaced with soft deletion
 */
export async function executeAccountDeletion(clerkUserId: string): Promise<DeletionResult> {
  let supabaseResult: { success: boolean; error?: string; partialFailures?: string[] } = { success: false }
  let clerkDeleted = false
  let dbUserId: string

  try {
    // Step 1: Get the user's profile to find database user ID
    console.log(`🚀 Starting account deletion for Clerk user: ${clerkUserId}`)
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      console.error('Failed to find user profile:', profileError)
      return {
        success: false,
        error: 'User profile not found in database',
        details: { clerkDeleted: false, supabaseDeleted: false }
      }
    }

    dbUserId = profile.id
    console.log(`Found database user ID: ${dbUserId}`)

    // Step 2: Create final GDPR audit log before deletion
    console.log('Creating final GDPR audit log...')
    try {
      await supabase
        .from('gdpr_audit_logs')
        .insert({
          user_id: dbUserId,
          action: 'deletion_executed',
          timestamp: new Date().toISOString(),
          metadata: {
            clerk_user_id: clerkUserId,
            deletion_method: 'automated_grace_period_expired',
            final_deletion: true,
            initiated_at: new Date().toISOString(),
          },
        })
      console.log('✅ Created final GDPR audit log')
    } catch (auditError) {
      console.error('Failed to create final audit log (continuing anyway):', auditError)
    }

    // Step 3: Delete from Supabase first (more complex, better error handling)
    console.log('🗂️ Starting Supabase deletion...')
    supabaseResult = await deleteUserFromSupabase(dbUserId)

    // Step 4: Delete from Clerk (simpler, but critical)
    console.log('👤 Starting Clerk deletion...')
    clerkDeleted = await deleteUserFromClerk(clerkUserId)

    // Step 5: Update deletion request status based on results
    const overallSuccess = supabaseResult.success && clerkDeleted
    const newStatus = overallSuccess ? 'completed' : 'failed'

    console.log('📝 Updating deletion request status...')
    try {
      await supabase
        .from('deletion_requests')
        .update({
          status: newStatus,
          completed_at: new Date().toISOString(),
          metadata: {
            clerk_deleted: clerkDeleted,
            supabase_deleted: supabaseResult.success,
            supabase_partial_failures: supabaseResult.partialFailures,
            final_completion_time: new Date().toISOString(),
          }
        })
        .eq('user_id', dbUserId)
        .eq('status', 'pending')
      
      console.log(`✅ Updated deletion request status to: ${newStatus}`)
    } catch (updateError) {
      console.error('Failed to update deletion request status:', updateError)
    }

    // Step 6: Final result
    if (overallSuccess) {
      console.log(`🎉 SUCCESS: Complete account deletion for ${clerkUserId}`)
      return {
        success: true,
        details: {
          clerkDeleted: true,
          supabaseDeleted: true,
        }
      }
    } else {
      const errorDetails = []
      if (!clerkDeleted) errorDetails.push('Clerk deletion failed')
      if (!supabaseResult.success) errorDetails.push('Supabase deletion failed')
      if (supabaseResult.partialFailures) errorDetails.push(`Supabase partial failures: ${supabaseResult.partialFailures.join(', ')}`)

      console.error(`❌ PARTIAL/COMPLETE FAILURE: ${errorDetails.join('; ')}`)
      return {
        success: false,
        error: errorDetails.join('; '),
        details: {
          clerkDeleted,
          supabaseDeleted: supabaseResult.success,
          partialFailure: supabaseResult.partialFailures,
        }
      }
    }

  } catch (error) {
    console.error('❌ Critical error during account deletion:', error)
    
    // Try to log the failure if we have dbUserId
    if (dbUserId) {
      try {
        await supabase
          .from('deletion_requests')
          .update({
            status: 'failed',
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown critical error',
              clerk_deleted: clerkDeleted,
              supabase_deleted: supabaseResult.success,
              failed_at: new Date().toISOString(),
            }
          })
          .eq('user_id', dbUserId)
          .eq('status', 'pending')
      } catch (updateError) {
        console.error('Failed to update deletion request with error status:', updateError)
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Critical error during deletion',
      details: {
        clerkDeleted,
        supabaseDeleted: supabaseResult.success,
      }
    }
  }
}

/**
 * Test function to check if a user can be safely deleted
 * Useful for validation before starting deletion process
 */
export async function validateUserForDeletion(clerkUserId: string): Promise<{
  canDelete: boolean
  issues?: string[]
  userInfo?: {
    dbUserId: string
    hasOrganizations: boolean
    hasDocuments: boolean
  }
}> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (profileError || !profile) {
      return {
        canDelete: false,
        issues: ['User profile not found in database']
      }
    }

    const dbUserId = profile.id
    const issues: string[] = []

    // Check for owned organizations with other members
    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_id', dbUserId)

    let hasOrganizations = false
    if (ownedOrgs && ownedOrgs.length > 0) {
      for (const org of ownedOrgs) {
        const { count } = await supabase
          .from('organization_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)

        if (count && count > 0) {
          hasOrganizations = true
          issues.push(`Organization "${org.name}" has ${count} members - requires ownership transfer`)
        }
      }
    }

    // Check for documents
    const { count: documentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUserId)

    const hasDocuments = (documentCount || 0) > 0

    return {
      canDelete: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
      userInfo: {
        dbUserId,
        hasOrganizations,
        hasDocuments
      }
    }
  } catch (error) {
    return {
      canDelete: false,
      issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

/**
 * Modern GDPR-compliant account deletion with anonymization
 * This is the recommended approach that preserves analytics data while removing PII
 * 
 * @param clerkUserId The Clerk user ID to delete/anonymize
 * @param reason Optional reason for deletion
 * @returns ModernDeletionResult with anonymization details
 */
export async function executeModernAccountDeletion(
  clerkUserId: string,
  reason?: string
): Promise<ModernDeletionResult> {
  try {
    console.log(`🔄 Starting modern account deletion (soft) for user: ${clerkUserId}`)
    
    // Use the soft deletion approach with anonymization
    const result = await performSoftDeletion(clerkUserId, reason)
    
    // Create audit log entry for the deletion process
    if (result.success && result.anonymizedUserId) {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await supabaseAdmin
          .from('gdpr_audit_logs')
          .insert({
            user_id: result.anonymizedUserId,
            action: 'deletion_completed',
            metadata: {
              method: 'soft_deletion_with_anonymization',
              clerk_user_id: clerkUserId,
              original_email: result.originalEmail,
              reason: reason || 'User requested account deletion',
              clerk_anonymized: result.clerkAnonymized,
              supabase_anonymized: result.userAnonymized
            }
          })
      } catch (auditError) {
        console.warn('Failed to create completion audit log:', auditError)
        // Don't fail the whole operation for audit issues
      }
    }

    return {
      success: result.success,
      method: 'soft_deletion',
      userAnonymized: result.userAnonymized,
      clerkAnonymized: result.clerkAnonymized,
      error: result.error,
      anonymizedUserId: result.anonymizedUserId,
      originalEmail: result.originalEmail
    }

  } catch (error) {
    console.error(`❌ Modern account deletion failed for ${clerkUserId}:`, error)
    
    return {
      success: false,
      method: 'soft_deletion',
      userAnonymized: false,
      clerkAnonymized: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}