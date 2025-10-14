import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/financial-client'
import type { ClientStatus } from '@/lib/types'

/**
 * PATCH /api/clients/[id]/status
 * Updates the status of a client
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

    const { id: clientId } = params
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

    // Verify client belongs to user's tenant
    const { data: existingClient, error: checkError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (checkError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Support both legacy 'active' boolean and new 'status' enum
    let updateData: { status?: ClientStatus; active?: boolean } = {}

    if ('status' in body) {
      // New status enum system
      const validStatuses: ClientStatus[] = ['prospect', 'active', 'on_hold', 'completed', 'deactivated']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      updateData.status = body.status
      // Sync active boolean for backward compatibility
      updateData.active = ['active', 'on_hold'].includes(body.status)
    } else if ('active' in body) {
      // Legacy boolean system - convert to status
      updateData.active = body.active
      updateData.status = body.active ? 'active' : 'deactivated'
    } else {
      return NextResponse.json({ error: 'Missing status or active field' }, { status: 400 })
    }

    // Update the client
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating client status:', updateError)
      return NextResponse.json({ error: 'Failed to update client status' }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedClient,
      success: true,
      message: 'Client status updated successfully'
    })

  } catch (error) {
    console.error('Client status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
