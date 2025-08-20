import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { UpdateClientSchema } from '@/lib/validations/financial'
import type { UpdateClientRequest, Client, FinancialApiResponse } from '@/lib/types/financial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/clients/[id]
 * Retrieves a specific client by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

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

    // Fetch client with tenant isolation
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Error fetching client:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
    }

    const response: FinancialApiResponse<Client> = {
      data: client,
      success: true,
      message: 'Client fetched successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Client fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/clients/[id]
 * Updates a specific client by ID
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id
    const body = await request.json()

    // Validate request data
    const validatedData = UpdateClientSchema.parse({ ...body, id: clientId })

    // Get user's profile and tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
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
        error: 'Account deletion is pending. Cannot modify data.' 
      }, { status: 403 })
    }

    // First check if client exists and belongs to tenant
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing client:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
    }

    // Remove id from validated data for update
    const { id, ...updateData } = validatedData
    
    // Update client
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating client:', updateError)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    const response: FinancialApiResponse<Client> = {
      data: updatedClient,
      success: true,
      message: 'Client updated successfully'
    }

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Client update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/clients/[id]
 * Deletes a specific client by ID
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Get user's profile and tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile?.tenant_id) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if client exists and belongs to tenant
    const { data: existingClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing client:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
    }

    // Check if client has associated invoices or expenses (prevent deletion)
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('client_id', clientId)
      .limit(1)

    if (invoiceError) {
      console.error('Error checking client invoices:', invoiceError)
      return NextResponse.json({ error: 'Failed to check client dependencies' }, { status: 500 })
    }

    if (invoices && invoices.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete client with existing invoices. Archive the client instead or delete associated invoices first.' 
      }, { status: 409 })
    }

    const { data: expenses, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .select('id')
      .eq('supplier_id', clientId)
      .limit(1)

    if (expenseError) {
      console.error('Error checking client expenses:', expenseError)
      return NextResponse.json({ error: 'Failed to check client dependencies' }, { status: 500 })
    }

    if (expenses && expenses.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete client with existing expenses. Archive the client instead or delete associated expenses first.' 
      }, { status: 409 })
    }

    // Delete client
    const { error: deleteError } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting client:', deleteError)
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Client "${existingClient.name}" deleted successfully`
    })

  } catch (error) {
    console.error('Client deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}