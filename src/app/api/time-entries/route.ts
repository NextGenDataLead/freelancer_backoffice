import { NextResponse } from 'next/server'
import { 
  CreateTimeEntrySchema,
  PaginationSchema
} from '@/lib/validations/financial'
import type { 
  TimeEntry,
  TimeEntryWithClient,
  PaginatedFinancialResponse 
} from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createPaginatedResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'
import { z } from 'zod'

// Query schema for time entries
const TimeEntriesQuerySchema = PaginationSchema.extend({
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  billable: z.coerce.boolean().optional(),
  invoiced: z.coerce.boolean().optional(),
  project_name: z.string().optional()
})

/**
 * GET /api/time-entries
 * Retrieves paginated list of time entries for the current tenant
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
    
    const validatedQuery = TimeEntriesQuerySchema.parse(queryParams)

    // Build query with client and project joins
    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        client:clients(
          id,
          company_name,
          email,
          country_code,
          hourly_rate
        ),
        project:projects(
          id,
          name,
          description,
          hourly_rate,
          active
        ),
        invoice:invoices(
          id,
          invoice_number,
          status
        )
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('entry_date', { ascending: false })

    // Apply filters
    if (validatedQuery.client_id) {
      query = query.eq('client_id', validatedQuery.client_id)
    }

    if (validatedQuery.project_id) {
      query = query.eq('project_id', validatedQuery.project_id)
    }

    if (validatedQuery.date_from) {
      query = query.gte('entry_date', validatedQuery.date_from)
    }

    if (validatedQuery.date_to) {
      query = query.lte('entry_date', validatedQuery.date_to)
    }

    if (validatedQuery.billable !== undefined) {
      query = query.eq('billable', validatedQuery.billable)
    }

    if (validatedQuery.invoiced !== undefined) {
      query = query.eq('invoiced', validatedQuery.invoiced)
    }

    if (validatedQuery.project_name) {
      query = query.ilike('project_name', `%${validatedQuery.project_name}%`)
    }

    // Apply pagination
    const from = (validatedQuery.page - 1) * validatedQuery.limit
    const to = from + validatedQuery.limit - 1
    
    query = query.range(from, to)

    const { data: timeEntries, error, count } = await query

    if (error) {
      console.error('Error fetching time entries:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response = createPaginatedResponse(
      timeEntries || [], 
      'Time entries fetched successfully',
      {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: count || 0,
        totalPages
      }
    )

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Time entries fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/time-entries
 * Creates a new time entry
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Check if user can create data (not in grace period)
    const canCreate = await canUserCreateData()
    if (!canCreate) {
      return NextResponse.json(ApiErrors.GracePeriodActive, { status: ApiErrors.GracePeriodActive.status })
    }

    const body = await request.json()
    
    // Validate request data
    const validatedData = CreateTimeEntrySchema.parse(body)

    let clientId = validatedData.client_id
    let projectId = validatedData.project_id
    
    // If project is provided, get client from project and verify access
    if (projectId) {
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          hourly_rate,
          clients(
            id,
            company_name,
            hourly_rate
          )
        `)
        .eq('id', projectId)
        .eq('tenant_id', profile.tenant_id)
        .eq('active', true)
        .single()

      if (projectError || !project) {
        const notFoundError = ApiErrors.NotFound('Project')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      
      clientId = project.client_id // Get client from project
    } else if (clientId) {
      // Verify client exists and belongs to tenant
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, company_name, hourly_rate')
        .eq('id', clientId)
        .eq('tenant_id', profile.tenant_id)
        .eq('active', true)
        .single()

      if (clientError || !client) {
        const notFoundError = ApiErrors.NotFound('Client')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
    }

    // Calculate effective hourly rate using the database function
    let effectiveHourlyRate = validatedData.hourly_rate
    
    if (!effectiveHourlyRate && (clientId || projectId)) {
      const { data: calculatedRate } = await supabaseAdmin
        .rpc('calculate_effective_hourly_rate', {
          client_id_param: clientId,
          project_id_param: projectId,
          manual_rate_param: validatedData.hourly_rate
        })
      
      effectiveHourlyRate = calculatedRate
    }
    
    // If still no rate, try to get default from profile
    if (!effectiveHourlyRate) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('hourly_rate')
        .eq('id', profile.id)
        .single()
      
      effectiveHourlyRate = profileData?.hourly_rate || undefined
    }

    // Create time entry
    const { data: newTimeEntry, error: createError } = await supabaseAdmin
      .from('time_entries')
      .insert({
        ...validatedData,
        client_id: clientId,
        project_id: projectId,
        hourly_rate: validatedData.hourly_rate, // Keep original manual rate
        effective_hourly_rate: effectiveHourlyRate, // Store calculated rate
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select(`
        *,
        client:clients(
          id,
          company_name,
          email,
          country_code,
          hourly_rate
        ),
        project:projects(
          id,
          name,
          description,
          hourly_rate,
          active
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating time entry:', createError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'time_entry',
      newTimeEntry.id,
      'created',
      profile.id,
      null,
      newTimeEntry,
      request
    )

    const response = createApiResponse(newTimeEntry, 'Time entry created successfully')
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Time entry creation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}