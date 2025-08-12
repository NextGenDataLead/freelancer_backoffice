import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { executeModernAccountDeletion } from '@/lib/deletion/account-cleanup'

/**
 * POST /api/admin/test-soft-deletion
 * Testing endpoint for soft deletion functionality
 * 
 * IMPORTANT: This is for testing only - in production, deletion would be triggered
 * through the proper deletion request workflow with grace period
 */
export async function POST(req: NextRequest) {
  try {
    // Admin authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { clerkUserId, reason } = body

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Clerk User ID is required' }, { status: 400 })
    }

    console.log(`🧪 Testing soft deletion for user: ${clerkUserId}`)

    // Execute the modern soft deletion
    const result = await executeModernAccountDeletion(clerkUserId, reason)

    return NextResponse.json({
      success: true,
      testResult: result,
      message: 'Soft deletion test completed',
      note: 'This is a test endpoint - in production, deletion would go through proper workflow'
    })

  } catch (error) {
    console.error('Test soft deletion error:', error)
    return NextResponse.json(
      { 
        error: 'Test soft deletion failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}