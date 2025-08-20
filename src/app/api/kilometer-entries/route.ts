import { NextResponse } from 'next/server'
import { 
  CreateKilometerEntrySchema,
  PaginationSchema
} from '@/lib/validations/financial'
import type { 
  KilometerEntry,
  KilometerEntryWithClient,
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

// Query schema for kilometer entries
const KilometerEntriesQuerySchema = PaginationSchema.extend({
  client_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  is_business: z.coerce.boolean().optional(),
  invoiced: z.coerce.boolean().optional()
})

/**
 * GET /api/kilometer-entries
 * Retrieves paginated list of kilometer entries for the current tenant
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
    
    const validatedQuery = KilometerEntriesQuerySchema.parse(queryParams)

    // Build query with optional client join
    let query = supabaseAdmin
      .from('kilometer_entries')
      .select(`
        *,
        client:clients(
          id,
          name,
          company_name,
          email,
          country_code
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

    if (validatedQuery.date_from) {
      query = query.gte('entry_date', validatedQuery.date_from)
    }

    if (validatedQuery.date_to) {
      query = query.lte('entry_date', validatedQuery.date_to)
    }

    if (validatedQuery.is_business !== undefined) {
      query = query.eq('is_business', validatedQuery.is_business)
    }

    if (validatedQuery.invoiced !== undefined) {
      query = query.eq('invoiced', validatedQuery.invoiced)
    }

    // Apply pagination
    const from = (validatedQuery.page - 1) * validatedQuery.limit
    const to = from + validatedQuery.limit - 1
    
    query = query.range(from, to)

    const { data: kilometerEntries, error, count } = await query

    if (error) {
      console.error('Error fetching kilometer entries:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response = createPaginatedResponse(
      kilometerEntries || [], 
      'Kilometer entries fetched successfully',
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

    console.error('Kilometer entries fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/kilometer-entries
 * Creates a new kilometer entry with automatic cost calculation
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
    const validatedData = CreateKilometerEntrySchema.parse(body)

    // Verify client exists and belongs to tenant (if provided)
    if (validatedData.client_id) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('id', validatedData.client_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (clientError || !client) {
        const notFoundError = ApiErrors.NotFound('Client')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
    }

    // Calculate total amount based on distance and rate
    const totalAmount = Math.round(validatedData.distance_km * validatedData.rate_per_km * 100) / 100

    // Create kilometer entry
    const { data: newKilometerEntry, error: createError } = await supabaseAdmin
      .from('kilometer_entries')
      .insert({
        ...validatedData,
        total_amount: totalAmount,
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select(`
        *,
        client:clients(
          id,
          name,
          company_name,
          email,
          country_code
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating kilometer entry:', createError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'kilometer_entry',
      newKilometerEntry.id,
      'created',
      profile.id,
      null,
      newKilometerEntry,
      request
    )

    const response = createApiResponse(newKilometerEntry, 'Kilometer entry created successfully')
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Kilometer entry creation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}