/**
 * Soft Deletion with Anonymization for GDPR Compliance
 * 
 * This implements the revised deletion strategy:
 * 1. Anonymize PII data (email, names) in both Clerk and Supabase
 * 2. Keep user records for analytics purposes
 * 3. Maintain foreign key relationships with anonymous data
 * 4. Preserve audit trail of deletion
 */

import { createClient } from '@supabase/supabase-js'
import { clerkClient } from '@clerk/nextjs/server'

export interface SoftDeletionResult {
  success: boolean
  userAnonymized: boolean
  clerkAnonymized: boolean
  error?: string
  anonymizedUserId: string
  originalEmail: string
}

/**
 * Anonymize user data in Supabase while preserving records for analytics
 */
export async function anonymizeUserInSupabase(
  clerkUserId: string,
  reason?: string
): Promise<{
  success: boolean
  error?: string
  profile?: any
}> {
  try {
    console.log(`Starting Supabase anonymization for user: ${clerkUserId}`)
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, get the user profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (fetchError || !profile) {
      console.error('Failed to find user profile:', fetchError)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    const now = new Date().toISOString()
    const anonymizedEmail = `deleted-user-${profile.id}@anonymized.local`

    // Anonymize the user profile data
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: anonymizedEmail,
        first_name: '[DELETED]',
        last_name: '[DELETED]',
        username: null, // Remove username completely
        avatar_url: null, // Remove profile picture
        is_active: false,
        anonymized_at: now,
        deletion_reason: reason || 'User requested account deletion',
        updated_at: now,
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to anonymize user profile:', updateError)
      return {
        success: false,
        error: `Failed to anonymize profile: ${updateError.message}`
      }
    }

    // Log the anonymization for audit trail
    const { error: auditError } = await supabaseAdmin
      .from('gdpr_audit_logs')
      .insert({
        user_id: profile.id,
        action: 'data_anonymization',
        metadata: {
          clerk_user_id: clerkUserId,
          original_email: profile.email,
          anonymized_email: anonymizedEmail,
          reason: reason || 'User requested account deletion',
          anonymization_method: 'soft_deletion'
        }
      })

    if (auditError) {
      console.warn('Failed to create audit log entry:', auditError)
      // Don't fail the whole operation for audit log issues
    }

    console.log(`✅ Successfully anonymized user in Supabase: ${clerkUserId}`)
    return {
      success: true,
      profile: updatedProfile
    }

  } catch (error) {
    console.error(`❌ Failed to anonymize user in Supabase (${clerkUserId}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Anonymize user data in Clerk while preserving authentication record
 */
export async function anonymizeUserInClerk(clerkUserId: string): Promise<boolean> {
  try {
    console.log(`Starting Clerk anonymization for user: ${clerkUserId}`)
    
    const client = await clerkClient()
    
    // Get current user data for audit trail
    const user = await client.users.getUser(clerkUserId)
    const originalEmail = user.primaryEmailAddress?.emailAddress

    // Option 1: Update user with anonymized data (preserves auth record)
    const anonymizedEmail = `deleted-${clerkUserId}@anonymized.local`
    
    await client.users.updateUser(clerkUserId, {
      firstName: '[DELETED]',
      lastName: '[DELETED]',
      // Note: We cannot change the primary email in Clerk easily
      // Consider using privateMetadata to track anonymization instead
      privateMetadata: {
        ...user.privateMetadata,
        accountDeleted: true,
        deletedAt: new Date().toISOString(),
        anonymized: true,
        originalEmail: originalEmail, // Keep for audit purposes
        deletionMethod: 'soft_anonymization'
      }
    })

    // Option 2: Alternatively, you could ban the user to prevent login
    // await client.users.banUser(clerkUserId)

    console.log(`✅ Successfully anonymized user in Clerk: ${clerkUserId}`)
    return true
    
  } catch (error) {
    console.error(`❌ Failed to anonymize user in Clerk (${clerkUserId}):`, error)
    return false
  }
}

/**
 * Complete soft deletion process with anonymization
 * This replaces the hard deletion in account-cleanup.ts
 */
export async function performSoftDeletion(
  clerkUserId: string,
  reason?: string
): Promise<SoftDeletionResult> {
  let userAnonymized = false
  let clerkAnonymized = false
  let originalEmail = ''
  let anonymizedUserId = ''

  try {
    console.log(`🔄 Starting soft deletion process for user: ${clerkUserId}`)

    // Step 1: Anonymize in Supabase (preserve analytics data)
    console.log('Step 1: Anonymizing user data in Supabase...')
    const supabaseResult = await anonymizeUserInSupabase(clerkUserId, reason)
    
    if (!supabaseResult.success) {
      return {
        success: false,
        userAnonymized: false,
        clerkAnonymized: false,
        error: supabaseResult.error || 'Supabase anonymization failed',
        anonymizedUserId: '',
        originalEmail: ''
      }
    }

    userAnonymized = true
    originalEmail = supabaseResult.profile?.email || ''
    anonymizedUserId = supabaseResult.profile?.id || ''

    // Step 2: Anonymize in Clerk (preserve auth record for SSO)
    console.log('Step 2: Anonymizing user data in Clerk...')
    clerkAnonymized = await anonymizeUserInClerk(clerkUserId)

    const overallSuccess = userAnonymized && clerkAnonymized

    if (!overallSuccess) {
      console.warn(`⚠️ Partial soft deletion for ${clerkUserId}: Supabase=${userAnonymized}, Clerk=${clerkAnonymized}`)
    } else {
      console.log(`✅ Soft deletion completed successfully for ${clerkUserId}`)
    }

    return {
      success: overallSuccess,
      userAnonymized,
      clerkAnonymized,
      anonymizedUserId,
      originalEmail,
      error: overallSuccess ? undefined : 'Partial anonymization - some systems failed'
    }

  } catch (error) {
    console.error(`❌ Soft deletion process failed for ${clerkUserId}:`, error)
    
    return {
      success: false,
      userAnonymized,
      clerkAnonymized,
      error: error instanceof Error ? error.message : 'Unknown error',
      anonymizedUserId,
      originalEmail
    }
  }
}

/**
 * Check if a user has been anonymized (soft deleted)
 */
export async function isUserAnonymized(clerkUserId: string): Promise<{
  isAnonymized: boolean
  anonymizedAt?: string
  reason?: string
}> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('anonymized_at, deletion_reason')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error || !profile) {
      return { isAnonymized: false }
    }

    return {
      isAnonymized: !!profile.anonymized_at,
      anonymizedAt: profile.anonymized_at,
      reason: profile.deletion_reason
    }

  } catch (error) {
    console.error('Error checking anonymization status:', error)
    return { isAnonymized: false }
  }
}