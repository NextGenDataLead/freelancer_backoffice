import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { 
  CreateClientSchema, 
  ClientsQuerySchema
} from '@/lib/validations/financial'
import type { 
  Client,
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

/**
 * GET /api/clients
 * Retrieves paginated list of clients for the current tenant
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = ClientsQuerySchema.parse(queryParams)
    
    // Get user's tenant_id from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile?.tenant_id) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Build query - include contacts
    let query = supabaseAdmin
      .from('clients')
      .select('*, contacts:client_contacts(*)', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (validatedQuery.search) {
      query = query.or(`company_name.ilike.%${validatedQuery.search}%,email.ilike.%${validatedQuery.search}%`)
    }

    if (validatedQuery.is_business !== undefined) {
      query = query.eq('is_business', validatedQuery.is_business)
    }

    if (validatedQuery.is_supplier !== undefined) {
      query = query.eq('is_supplier', validatedQuery.is_supplier)
    }

    if (validatedQuery.country_code) {
      query = query.eq('country_code', validatedQuery.country_code)
    }

    // Apply status filter (Enhancement #2)
    // Supports single status or array of statuses (e.g., ['active', 'on_hold'])
    if (validatedQuery.status && Array.isArray(validatedQuery.status) && validatedQuery.status.length > 0) {
      if (validatedQuery.status.length === 1) {
        query = query.eq('status', validatedQuery.status[0])
      } else {
        query = query.in('status', validatedQuery.status)
      }
    }

    // Apply pagination
    const from = (validatedQuery.page - 1) * validatedQuery.limit
    const to = from + validatedQuery.limit - 1
    
    query = query.range(from, to)

    const { data: clients, error, count } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response: PaginatedFinancialResponse<Client> = {
      data: clients || [],
      success: true,
      message: 'Clients fetched successfully',
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: count || 0,
        totalPages
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Clients fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/clients
 * Creates a new client for the current tenant
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validatedData = CreateClientSchema.parse(body)

    // Get user's profile and tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile?.tenant_id) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user can create data (not in grace period)
    const { data: canCreate, error: graceError } = await supabaseAdmin
      .rpc('can_create_data')

    if (graceError) {
      console.error('Error checking grace period:', graceError)
      return NextResponse.json({ error: 'Unable to verify account status' }, { status: 500 })
    }

    if (!canCreate) {
      return NextResponse.json({ 
        error: 'Account deletion is pending. Cannot create new data.' 
      }, { status: 403 })
    }

    // Extract contacts from validated data
    const { primaryContact, administrationContact, ...clientData } = validatedData

    // Create client and contacts in a transaction
    // First create the client
    const { data: newClient, error: createError } = await supabaseAdmin
      .from('clients')
      .insert({
        ...clientData,
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating client:', createError)
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Create primary contact
    const { error: primaryError } = await supabaseAdmin
      .from('client_contacts')
      .insert({
        tenant_id: profile.tenant_id,
        client_id: newClient.id,
        contact_type: 'primary',
        first_name: primaryContact.first_name,
        last_name: primaryContact.last_name,
        email: primaryContact.email,
        phone: primaryContact.phone
      })

    if (primaryError) {
      // Rollback: delete the client we just created
      await supabaseAdmin.from('clients').delete().eq('id', newClient.id)
      console.error('Error creating primary contact:', primaryError)
      return NextResponse.json({ error: 'Failed to create primary contact' }, { status: 500 })
    }

    // Create administration contact
    const { error: adminError } = await supabaseAdmin
      .from('client_contacts')
      .insert({
        tenant_id: profile.tenant_id,
        client_id: newClient.id,
        contact_type: 'administration',
        first_name: administrationContact.first_name,
        last_name: administrationContact.last_name,
        email: administrationContact.email,
        phone: administrationContact.phone
      })

    if (adminError) {
      // Rollback: delete the client and primary contact
      await supabaseAdmin.from('client_contacts').delete().eq('client_id', newClient.id)
      await supabaseAdmin.from('clients').delete().eq('id', newClient.id)
      console.error('Error creating administration contact:', adminError)
      return NextResponse.json({ error: 'Failed to create administration contact' }, { status: 500 })
    }

    // Fetch the complete client with contacts
    const { data: clientWithContacts } = await supabaseAdmin
      .from('clients')
      .select('*, contacts:client_contacts(*)')
      .eq('id', newClient.id)
      .single()

    return NextResponse.json({
      data: clientWithContacts || newClient,
      success: true,
      message: 'Client created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Client creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}