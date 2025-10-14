import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/financial-client'
import type { ProjectStatus } from '@/lib/types'

/**
 * PATCH /api/projects/[id]/status
 * Updates the status of a project
 * Supports both legacy 'active' boolean and new 'status' enum
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = params
    const body = await request.json()

    // Get user's tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Verify project belongs to user's tenant
    const { data: existingProject, error: checkError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (checkError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Support both legacy 'active' boolean and new 'status' enum
    let updateData: { status?: ProjectStatus; active?: boolean } = {}

    if ('status' in body) {
      // New status enum system
      const validStatuses: ProjectStatus[] = ['prospect', 'active', 'on_hold', 'completed', 'cancelled']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      updateData.status = body.status
      // Sync active boolean for backward compatibility
      updateData.active = ['active', 'on_hold', 'prospect'].includes(body.status)
    } else if ('active' in body) {
      // Legacy boolean system - convert to status
      updateData.active = body.active
      updateData.status = body.active ? 'active' : 'completed'
    } else {
      return NextResponse.json({ error: 'Missing status or active field' }, { status: 400 })
    }

    // Update the project
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating project status:', updateError)
      return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedProject,
      success: true,
      message: 'Project status updated successfully'
    })

  } catch (error) {
    console.error('Project status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
