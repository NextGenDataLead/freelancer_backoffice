import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

// Validation schema
const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
  hourly_rate: z.number().positive().nullable().optional(),
  active: z.boolean().optional()
})

/**
 * GET /api/projects/[id]
 * Retrieves a single project by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: 401 })
    }

    const projectId = params.id

    // Get user's profile and tenant_id
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.UserProfileNotFound, { 
        status: ApiErrors.UserProfileNotFound.status 
      })
    }

    // Fetch project with client information
    const { data: project, error } = await supabaseAdmin
      .from('projects')
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
      .eq('id', projectId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !project) {
      return NextResponse.json({ 
        error: 'Project not found or access denied' 
      }, { status: 404 })
    }

    const response = createApiResponse(project, 'Project fetched successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Project fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}

/**
 * PATCH /api/projects/[id]
 * Updates a project by ID
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
    const body = await request.json()
    
    // Validate request data
    const validatedData = UpdateProjectSchema.parse(body)

    // Get user's profile and tenant_id
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.UserProfileNotFound, { 
        status: ApiErrors.UserProfileNotFound.status 
      })
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        ...validatedData,
        updated_at: new Date(getCurrentDate().getTime()).toISOString()
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
      console.error('Error updating project:', updateError)
      
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json({ 
          error: 'Project name already exists for this client' 
        }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }

    if (!updatedProject) {
      return NextResponse.json({ 
        error: 'Project not found or access denied' 
      }, { status: 404 })
    }

    const response = createApiResponse(updatedProject, 'Project updated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Project update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: 401 })
    }

    const projectId = params.id

    // Get user's profile and tenant_id
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.UserProfileNotFound, { 
        status: ApiErrors.UserProfileNotFound.status 
      })
    }

    // Check if project has associated time entries
    const { data: timeEntries, error: timeEntriesError } = await supabaseAdmin
      .from('time_entries')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .or(`project_name.eq.${projectId}`) // Check both old project_name field
      .limit(1)

    if (timeEntriesError) {
      console.error('Error checking time entries:', timeEntriesError)
      return NextResponse.json({ error: 'Failed to check project dependencies' }, { status: 500 })
    }

    if (timeEntries && timeEntries.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete project with associated time entries. Disable it instead.' 
      }, { status: 409 })
    }

    // Delete project
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    const response = createApiResponse(null, 'Project deleted successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Project deletion error:', error)
    return NextResponse.json(ApiErrors.InternalError, { 
      status: ApiErrors.InternalError.status 
    })
  }
}
