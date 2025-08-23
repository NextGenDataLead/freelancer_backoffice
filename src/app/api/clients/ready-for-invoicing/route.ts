import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import type { ClientInvoicingSummary } from '@/lib/types/financial'

// Query schema for filtering clients ready for invoicing
const ReadyForInvoicingQuerySchema = z.object({
  filter: z.enum(['all', 'ready', 'overdue', 'weekly', 'monthly']).optional().default('ready'),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  include_zero_hours: z.coerce.boolean().optional().default(false)
})

/**
 * GET /api/clients/ready-for-invoicing
 * Retrieves clients that are ready for invoicing based on their configuration and unbilled time
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
    const validatedQuery = ReadyForInvoicingQuerySchema.parse(queryParams)

    // Build query using the client_invoicing_summary view
    let query = supabaseAdmin
      .from('client_invoicing_summary')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_supplier', false) // Only clients, not suppliers
      .order('overdue_for_invoicing', { ascending: false })
      .order('days_since_last_invoice', { ascending: false })
      .order('unbilled_amount', { ascending: false })
      .limit(validatedQuery.limit)

    // Apply filters based on the filter parameter
    switch (validatedQuery.filter) {
      case 'ready':
        query = query.eq('ready_for_invoicing', true)
        break
      case 'overdue':
        query = query.eq('overdue_for_invoicing', true)
        break
      case 'weekly':
        query = query.eq('invoicing_frequency', 'weekly')
        break
      case 'monthly':
        query = query.eq('invoicing_frequency', 'monthly')
        break
      case 'all':
        // No additional filter
        break
    }

    // Optionally exclude clients with zero unbilled hours
    if (!validatedQuery.include_zero_hours) {
      query = query.gt('unbilled_hours', 0)
    }

    const { data: clients, error } = await query

    if (error) {
      console.error('Error fetching clients ready for invoicing:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate summary statistics
    const totalClients = clients?.length || 0
    const readyClients = clients?.filter(c => c.ready_for_invoicing).length || 0
    const overdueClients = clients?.filter(c => c.overdue_for_invoicing).length || 0
    const totalUnbilledHours = clients?.reduce((sum, c) => sum + (c.unbilled_hours || 0), 0) || 0
    const totalUnbilledAmount = clients?.reduce((sum, c) => sum + (c.unbilled_amount || 0), 0) || 0

    const response = createApiResponse(
      {
        clients: clients || [],
        summary: {
          total_clients: totalClients,
          ready_for_invoicing: readyClients,
          overdue_for_invoicing: overdueClients,
          total_unbilled_hours: totalUnbilledHours,
          total_unbilled_amount: totalUnbilledAmount
        },
        filter: validatedQuery.filter
      },
      'Clients ready for invoicing retrieved successfully'
    )

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Ready for invoicing clients fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}