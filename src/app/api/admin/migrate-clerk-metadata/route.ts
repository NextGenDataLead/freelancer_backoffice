import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentDate } from '@/lib/current-date'

// Admin-only endpoint to migrate Clerk metadata to Supabase
// This implements Phase 2 of the data architecture migration plan

/**
 * POST /api/admin/migrate-clerk-metadata
 * Migrates user metadata from Clerk to Supabase for data architecture consolidation
 * 
 * Security: Admin-only endpoint (implement proper admin authentication)
 * Purpose: Move publicMetadata and relevant privateMetadata from Clerk to Supabase
 */
export async function POST(req: NextRequest) {
  try {
    // Admin authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role check here
    // For now, this is a development endpoint - add proper admin authentication
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const client = await clerkClient()
    let processedUsers = 0
    let migratedUsers = 0
    let errors: string[] = []

    // Get all users from Clerk (paginated)
    let hasMore = true
    let offset = 0
    const limit = 100

    while (hasMore) {
      try {
        const users = await client.users.getUserList({
          limit,
          offset,
        })

        if (users.data.length === 0) {
          hasMore = false
          break
        }

        // Process each user
        for (const clerkUser of users.data) {
          try {
            processedUsers++
            console.log(`Processing user ${processedUsers}: ${clerkUser.id}`)

            // Find corresponding Supabase profile
            const { data: profile, error: profileError } = await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('clerk_user_id', clerkUser.id)
              .single()

            if (profileError || !profile) {
              errors.push(`Profile not found for Clerk user ${clerkUser.id}`)
              continue
            }

            // Prepare migration data from Clerk metadata
            const updateData: any = {}
            let needsUpdate = false

            // Migrate username from Clerk if it exists and Supabase doesn't have it
            if (clerkUser.username && !profile.username) {
              updateData.username = clerkUser.username
              needsUpdate = true
            }

            // Migration logic for publicMetadata (if we need to preserve any)
            // Note: Most publicMetadata should already be in Supabase, but check for any missing data
            const publicMeta = clerkUser.publicMetadata as any
            if (publicMeta?.role && profile.role === 'member' && publicMeta.role !== 'member') {
              // Only update if current role is default and Clerk has a different role
              updateData.role = publicMeta.role
              needsUpdate = true
            }

            // Check for any other useful metadata to preserve
            if (clerkUser.firstName && !profile.first_name) {
              updateData.first_name = clerkUser.firstName
              needsUpdate = true
            }

            if (clerkUser.lastName && !profile.last_name) {
              updateData.last_name = clerkUser.lastName
              needsUpdate = true
            }

            // Update Supabase profile if there's data to migrate
            if (needsUpdate) {
              updateData.updated_at = new Date(getCurrentDate().getTime()).toISOString()

              const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', profile.id)

              if (updateError) {
                errors.push(`Failed to update profile for ${clerkUser.id}: ${updateError.message}`)
              } else {
                migratedUsers++
                console.log(`✅ Migrated metadata for user ${clerkUser.id}`)
              }
            }

          } catch (userError) {
            errors.push(`Error processing user ${clerkUser.id}: ${userError}`)
          }
        }

        offset += limit
        
        // Rate limiting to avoid API limits
        if (users.data.length === limit) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
        } else {
          hasMore = false
        }

      } catch (batchError) {
        errors.push(`Batch processing error at offset ${offset}: ${batchError}`)
        hasMore = false
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: processedUsers,
        successfulMigrations: migratedUsers,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Return first 10 errors to avoid huge response
      },
      message: `Migration completed. ${migratedUsers}/${processedUsers} users migrated successfully.`
    })

  } catch (error) {
    console.error('Metadata migration error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/migrate-clerk-metadata/status
 * Check migration status and provide overview of what would be migrated
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper admin role check

    const client = await clerkClient()
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get sample of users to analyze
    const users = await client.users.getUserList({ limit: 10 })
    let usersWithMetadata = 0
    let usersWithUsername = 0

    for (const user of users.data) {
      const hasMetadata = Object.keys(user.publicMetadata).length > 0 || 
                         Object.keys(user.privateMetadata).length > 0
      if (hasMetadata) usersWithMetadata++
      if (user.username) usersWithUsername++
    }

    return NextResponse.json({
      sampleSize: users.data.length,
      usersWithMetadata,
      usersWithUsername,
      estimatedMigrationNeeded: usersWithMetadata > 0 || usersWithUsername > 0,
      recommendation: usersWithMetadata > 0 ? 
        'Migration recommended to move metadata to Supabase' : 
        'No significant metadata migration needed'
    })

  } catch (error) {
    console.error('Migration status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    )
  }
}
