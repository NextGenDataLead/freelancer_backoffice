import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

// Schema for updating time entries
const UpdateTimeEntrySchema = z.object({
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  project_name: z.string().optional(),
  description: z.string().optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hours: z.number().positive().optional(),
  hourly_rate: z.number().min(0).optional(),
  billable: z.boolean().optional(),
  invoiced: z.boolean().optional()
})

/**
 * PUT /api/time-entries/[id]
 * Updates an existing time entry
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ID format
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({
        error: 'Invalid time entry ID format'
      }, { status: 400 })
    }

    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, {
        status: ApiErrors.Unauthorized.status
      })
    }

    const body = await request.json()
    const validatedData = UpdateTimeEntrySchema.parse(body)

    // First, verify the time entry exists and belongs to the user's tenant
    // Also fetch the related invoice if it exists
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        invoices (
          id,
          status,
          invoice_number
        )
      `)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json({
        error: 'Time entry not found or access denied'
      }, { status: 404 })
    }

    // Check if time entry is already invoiced (Gefactureerd status)
    if (existingEntry.invoiced || existingEntry.invoice_id) {
      const errorMessage = existingEntry.invoice_id && existingEntry.invoices
        ? `Tijdregistratie kan niet worden bewerkt: deze is reeds gefactureerd op factuur ${existingEntry.invoices.invoice_number}.`
        : 'Tijdregistratie kan niet worden bewerkt: deze is reeds gefactureerd.'

      return NextResponse.json({
        error: errorMessage,
        details: {
          invoice_id: existingEntry.invoice_id,
          invoice_number: existingEntry.invoices?.invoice_number,
          reason: 'ALREADY_INVOICED'
        }
      }, { status: 403 })
    }

    // If client_id is being updated, verify the client exists and belongs to tenant
    if (validatedData.client_id) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('id', validatedData.client_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (clientError || !client) {
        return NextResponse.json({
          error: 'Client not found or access denied'
        }, { status: 404 })
      }
    }

    // If project_id is being updated, verify the project exists and belongs to tenant
    if (validatedData.project_id) {
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .eq('id', validatedData.project_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (projectError || !project) {
        return NextResponse.json({
          error: 'Project not found or access denied'
        }, { status: 404 })
      }
    }

    // Update the time entry
    const { data: updatedEntry, error: updateError } = await supabaseAdmin
      .from('time_entries')
      .update({
        ...validatedData,
        updated_at: new Date(getCurrentDate().getTime()).toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        *,
        clients (
          id,
          name:company_name,
          company_name,
          is_business,
          hourly_rate
        ),
        projects (
          id,
          name,
          description,
          hourly_rate
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating time entry:', updateError)
      return NextResponse.json({
        error: 'Failed to update time entry'
      }, { status: 500 })
    }

    // Log the transaction
    await createTransactionLog({
      table_name: 'time_entries',
      record_id: id,
      action: 'UPDATE',
      old_values: existingEntry,
      new_values: updatedEntry,
      tenant_id: profile.tenant_id,
      user_id: profile.id
    })

    const response = createApiResponse(updatedEntry, 'Time entry updated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Time entry update error:', error)
    return NextResponse.json(ApiErrors.InternalError, {
      status: ApiErrors.InternalError.status
    })
  }
}

/**
 * DELETE /api/time-entries/[id]
 * Deletes a time entry
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ID format
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({
        error: 'Invalid time entry ID format'
      }, { status: 400 })
    }

    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, {
        status: ApiErrors.Unauthorized.status
      })
    }

    // First, verify the time entry exists and belongs to the user's tenant
    // Also fetch the related invoice if it exists
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        invoices (
          id,
          status,
          invoice_number
        )
      `)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json({
        error: 'Time entry not found or access denied'
      }, { status: 404 })
    }

    // Check if time entry is already invoiced (Gefactureerd status)
    if (existingEntry.invoiced || existingEntry.invoice_id) {
      const errorMessage = existingEntry.invoice_id && existingEntry.invoices
        ? `Tijdregistratie kan niet worden verwijderd: deze is reeds gefactureerd op factuur ${existingEntry.invoices.invoice_number}.`
        : 'Tijdregistratie kan niet worden verwijderd: deze is reeds gefactureerd.'

      return NextResponse.json({
        error: errorMessage,
        details: {
          invoice_id: existingEntry.invoice_id,
          invoice_number: existingEntry.invoices?.invoice_number,
          reason: 'ALREADY_INVOICED'
        }
      }, { status: 403 })
    }

    // Delete the time entry
    const { error: deleteError } = await supabaseAdmin
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting time entry:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete time entry'
      }, { status: 500 })
    }

    // Log the transaction
    await createTransactionLog({
      table_name: 'time_entries',
      record_id: id,
      action: 'DELETE',
      old_values: existingEntry,
      new_values: null,
      tenant_id: profile.tenant_id,
      user_id: profile.id
    })

    return NextResponse.json({
      success: true,
      message: 'Time entry deleted successfully'
    })

  } catch (error) {
    console.error('Time entry deletion error:', error)
    return NextResponse.json(ApiErrors.InternalError, {
      status: ApiErrors.InternalError.status
    })
  }
}
