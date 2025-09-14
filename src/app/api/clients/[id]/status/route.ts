import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * PATCH /api/clients/[id]/status
 * Updates client active status (enable/disable)
 */
export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: 401 })
    }

    const clientId = params.id
    const { active } = await request.json()

    if (typeof active !== 'boolean') {
      return NextResponse.json({ 
        error: 'Invalid request body. Expected { active: boolean }' 
      }, { status: 400 })
    }

    // Get user's profile and tenant_id
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.UserProfileNotFound, { 
        status: ApiErrors.UserProfileNotFound.status 
      })
    }

    // Update client active status
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ 
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating client status:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update client status' 
      }, { status: 500 })
    }

    if (!updatedClient) {
      return NextResponse.json({ 
        error: 'Client not found or access denied' 
      }, { status: 404 })
    }

    const response = createApiResponse(
      updatedClient, 
      `Client ${active ? 'enabled' : 'disabled'} successfully`
    )
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Client status update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}