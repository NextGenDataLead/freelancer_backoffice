import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.log('API route called: /api/user/update-metadata')
    
    const { userId } = await auth()
    console.log('User ID from auth:', userId)
    
    if (!userId) {
      console.log('No user ID found, returning unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    const { tenant_id, role } = body
    
    console.log('Attempting to update user metadata for user:', userId)
    
    // Create Clerk client and update user's public metadata via Clerk's server-side API
    const client = await clerkClient()
    const result = await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        tenant_id,
        role
      }
    })
    
    console.log('Update result:', result)
    return NextResponse.json({ message: 'success' })
  } catch (error) {
    console.error('Error updating user metadata:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({ 
      error: 'Failed to update metadata',
      details: error.message 
    }, { status: 500 })
  }
}