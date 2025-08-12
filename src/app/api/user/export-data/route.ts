import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getCookieConsent } from '@/lib/gdpr/cookie-manager'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/user/export-data
 * Generates and returns comprehensive user data export in JSON format
 * Complies with GDPR Article 20 (Right to Data Portability)
 * 
 * Updated for revised data architecture:
 * - Minimal authentication data from Clerk
 * - Complete business data from Supabase (single source of truth)
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

    // Initialize Supabase client for data retrieval
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get comprehensive user profile from Supabase (single source of truth)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError) {
      console.error('Failed to fetch user profile for export:', profileError)
    }

    // Get user's deletion requests and GDPR audit logs
    const { data: deletionRequests } = await supabaseAdmin
      .from('deletion_requests')
      .select('*')
      .eq('user_id', profile?.id)

    const { data: gdprAuditLogs } = await supabaseAdmin
      .from('gdpr_audit_logs')
      .select('*')
      .eq('user_id', profile?.id)

    // Get user's notifications
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', profile?.id)

    // Generate comprehensive data export combining both systems
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportVersion: '2.0', // Updated for revised data architecture
        userId: user.id,
        gdprCompliance: true,
        dataArchitecture: 'clerk_auth_supabase_business',
      },
      authentication: {
        // Minimal Clerk authentication data only
        clerkUserId: user.id,
        primaryEmail: user.primaryEmailAddress?.emailAddress,
        emailVerified: user.primaryEmailAddress?.verification?.status === 'verified',
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        // Note: Metadata is being phased out in favor of Supabase storage
        hasPublicMetadata: Object.keys(user.publicMetadata || {}).length > 0,
        hasPrivateMetadata: Object.keys(user.privateMetadata || {}).length > 0,
      },
      profile: {
        // Complete profile data from Supabase (single source of truth)
        id: profile?.id,
        tenantId: profile?.tenant_id,
        email: profile?.email,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        username: profile?.username,
        avatarUrl: profile?.avatar_url,
        role: profile?.role,
        isActive: profile?.is_active,
        preferences: profile?.preferences || {},
        createdAt: profile?.created_at,
        updatedAt: profile?.updated_at,
        lastSignInAt: profile?.last_sign_in_at,
        // Anonymization status (for soft deletion)
        isAnonymized: !!profile?.anonymized_at,
        anonymizedAt: profile?.anonymized_at,
        deletionReason: profile?.deletion_reason,
      },
      privacy: {
        cookieConsent: getCookieConsent(),
        deletionRequests: deletionRequests || [],
        gdprAuditLogs: gdprAuditLogs || [],
      },
      communications: {
        notifications: notifications || [],
      },
      businessData: {
        // Note: Add other business-specific data as needed
        // All data should be from Supabase and respect RLS policies
        tenantId: profile?.tenant_id,
        organizationRole: profile?.role,
      },
    }

    // Create audit log entry in Supabase
    if (profile?.id) {
      try {
        await supabaseAdmin
          .from('gdpr_audit_logs')
          .insert({
            user_id: profile.id,
            action: 'data_export',
            metadata: {
              clerk_user_id: userId,
              export_version: '2.0',
              data_architecture: 'clerk_auth_supabase_business',
              sections_included: ['authentication', 'profile', 'privacy', 'communications', 'businessData']
            }
          })
      } catch (auditError) {
        console.error('Failed to create export audit log:', auditError)
        // Don't fail the export for audit log issues
      }
    }

    console.log(`Data export completed for user ${userId} at ${new Date().toISOString()}`)

    // Return the export data
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate data export' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/export-data/status
 * Check if user has pending export requests (for rate limiting)
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check for pending exports in database
    // For now, return available status
    return NextResponse.json({
      canExport: true,
      lastExportAt: null,
      cooldownPeriod: 0, // minutes until next export allowed
    })
  } catch (error) {
    console.error('Export status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check export status' },
      { status: 500 }
    )
  }
}