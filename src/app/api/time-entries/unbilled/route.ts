import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

// Query schema for unbilled time entries
const UnbilledTimeEntriesQuerySchema = z.object({
  client_id: z.string().uuid(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(100)
})

/**
 * GET /api/time-entries/unbilled
 * Retrieves unbilled, billable time entries for a specific client
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = UnbilledTimeEntriesQuerySchema.parse(queryParams)

    // Verify client exists and belongs to tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, company_name')
      .eq('id', validatedQuery.client_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (clientError || !client) {
      const notFoundError = ApiErrors.NotFound('Client')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Build query for unbilled time entries
    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        client:clients!client_id(
          id,
          name,
          company_name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('client_id', validatedQuery.client_id)
      .eq('billable', true)
      .eq('invoiced', false)
      .order('entry_date', { ascending: false })
      .limit(validatedQuery.limit)

    // Apply date filters if provided
    if (validatedQuery.date_from) {
      query = query.gte('entry_date', validatedQuery.date_from)
    }

    if (validatedQuery.date_to) {
      query = query.lte('entry_date', validatedQuery.date_to)
    }

    const { data: timeEntries, error } = await query

    if (error) {
      console.error('Error fetching unbilled time entries:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate summary statistics
    const totalEntries = timeEntries?.length || 0
    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0
    const totalAmount = timeEntries?.reduce((sum, entry) => {
      const hourlyRate = entry.hourly_rate || 0
      return sum + ((entry.hours || 0) * hourlyRate)
    }, 0) || 0

    // Group entries by date for better organization
    const entriesByDate = timeEntries?.reduce((groups: { [key: string]: any[] }, entry) => {
      const date = entry.entry_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
      return groups
    }, {}) || {}

    const response = createApiResponse(
      {
        client,
        time_entries: timeEntries || [],
        entries_by_date: entriesByDate,
        summary: {
          total_entries: totalEntries,
          total_hours: totalHours,
          total_amount: totalAmount,
          average_hourly_rate: totalHours > 0 ? (totalAmount / totalHours) : 0,
          date_range: {
            earliest: timeEntries && timeEntries.length > 0 
              ? timeEntries[timeEntries.length - 1].entry_date 
              : null,
            latest: timeEntries && timeEntries.length > 0 
              ? timeEntries[0].entry_date 
              : null
          }
        },
        filters: {
          client_id: validatedQuery.client_id,
          date_from: validatedQuery.date_from,
          date_to: validatedQuery.date_to
        }
      },
      'Unbilled time entries retrieved successfully'
    )

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Unbilled time entries fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * PUT /api/time-entries/unbilled
 * Bulk update time entries to mark them as invoiced
 */
export async function PUT(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()
    
    const updateSchema = z.object({
      time_entry_ids: z.array(z.string().uuid()).min(1),
      invoice_id: z.string().uuid().optional(),
      mark_as_invoiced: z.boolean().default(true)
    })

    const validatedData = updateSchema.parse(body)

    // Verify all time entries belong to the user's tenant
    const { data: timeEntries, error: verifyError } = await supabaseAdmin
      .from('time_entries')
      .select('id, invoiced, invoice_id')
      .in('id', validatedData.time_entry_ids)
      .eq('tenant_id', profile.tenant_id)

    if (verifyError || !timeEntries) {
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    if (timeEntries.length !== validatedData.time_entry_ids.length) {
      return NextResponse.json({
        success: false,
        message: 'Some time entries not found or do not belong to your tenant',
        status: 400
      }, { status: 400 })
    }

    // Check if any entries are already invoiced
    const alreadyInvoiced = timeEntries.filter(entry => entry.invoiced)
    if (alreadyInvoiced.length > 0) {
      return NextResponse.json({
        success: false,
        message: `${alreadyInvoiced.length} time entries are already invoiced`,
        already_invoiced_ids: alreadyInvoiced.map(e => e.id),
        status: 400
      }, { status: 400 })
    }

    // Update the time entries
    const updateData: any = {
      invoiced: validatedData.mark_as_invoiced,
      updated_at: new Date(getCurrentDate().getTime()).toISOString()
    }

    if (validatedData.invoice_id) {
      updateData.invoice_id = validatedData.invoice_id
    }

    const { data: updatedEntries, error: updateError } = await supabaseAdmin
      .from('time_entries')
      .update(updateData)
      .in('id', validatedData.time_entry_ids)
      .select()

    if (updateError) {
      console.error('Error updating time entries:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(
      {
        updated_entries: updatedEntries || [],
        updated_count: updatedEntries?.length || 0,
        marked_as_invoiced: validatedData.mark_as_invoiced,
        invoice_id: validatedData.invoice_id
      },
      `Successfully updated ${updatedEntries?.length || 0} time entries`
    )

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Time entries bulk update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
