import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * PATCH /api/projects/[id]/status
 * Updates project active status (enable/disable)
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

    const projectId = params.id
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

    // Update project active status
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ 
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        *,
        clients (
          id,
          name,
          company_name,
          is_business,
          hourly_rate as client_hourly_rate
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating project status:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update project status' 
      }, { status: 500 })
    }

    if (!updatedProject) {
      return NextResponse.json({ 
        error: 'Project not found or access denied' 
      }, { status: 404 })
    }

    const response = createApiResponse(
      updatedProject, 
      `Project ${active ? 'enabled' : 'disabled'} successfully`
    )
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Project status update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}