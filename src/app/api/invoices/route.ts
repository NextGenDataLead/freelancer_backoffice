import { NextResponse } from 'next/server'
import { 
  CreateInvoiceSchema, 
  InvoicesQuerySchema
} from '@/lib/validations/financial'
import type { 
  Invoice,
  InvoiceWithItems,
  PaginatedFinancialResponse 
} from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createPaginatedResponse,
  createTransactionLog,
  calculateInvoiceTotals
} from '@/lib/supabase/financial-client'

/**
 * GET /api/invoices
 * Retrieves paginated list of invoices for the current tenant
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
    
    const validatedQuery = InvoicesQuerySchema.parse(queryParams)

    // Build query with joins for client data
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          name,
          company_name,
          email,
          country_code,
          vat_number,
          is_business
        )
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status)
    }

    if (validatedQuery.client_id) {
      query = query.eq('client_id', validatedQuery.client_id)
    }

    if (validatedQuery.date_from) {
      query = query.gte('invoice_date', validatedQuery.date_from)
    }

    if (validatedQuery.date_to) {
      query = query.lte('invoice_date', validatedQuery.date_to)
    }

    // Apply pagination
    const from = (validatedQuery.page - 1) * validatedQuery.limit
    const to = from + validatedQuery.limit - 1
    
    query = query.range(from, to)

    const { data: invoices, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response = createPaginatedResponse(
      invoices || [], 
      'Invoices fetched successfully',
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

    console.error('Invoices fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/invoices
 * Creates a new invoice with items and automatic VAT calculations
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
    const validatedData = CreateInvoiceSchema.parse(body)

    // Verify client exists and belongs to tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, country_code, vat_number, is_business')
      .eq('id', validatedData.client_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (clientError || !client) {
      const notFoundError = ApiErrors.NotFound('Client')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Generate invoice number (simple sequential format)
    const { data: lastInvoice } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const currentYear = new Date().getFullYear()
    let nextNumber = 1

    if (lastInvoice?.invoice_number) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('-').pop() || '0')
      const lastYear = parseInt(lastInvoice.invoice_number.split('-')[0])
      
      if (lastYear === currentYear) {
        nextNumber = lastNumber + 1
      }
    }

    const invoiceNumber = `${currentYear}-${nextNumber.toString().padStart(3, '0')}`

    // Determine VAT type based on client location and business type
    let vatType: 'standard' | 'reverse_charge' | 'exempt' = 'standard'
    let vatRate = 0.21 // Default Dutch VAT rate

    if (client.is_business && client.country_code !== 'NL' && client.vat_number) {
      // EU B2B with VAT number = reverse charge
      vatType = 'reverse_charge'
      vatRate = 0
    } else if (client.country_code !== 'NL') {
      // Non-EU = exempt
      vatType = 'exempt'
      vatRate = 0
    }

    // Calculate totals
    const { subtotal, vatAmount, totalAmount } = calculateInvoiceTotals(
      validatedData.items,
      vatRate
    )

    // Start database transaction
    const { data: newInvoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        client_id: validatedData.client_id,
        invoice_number: invoiceNumber,
        invoice_date: validatedData.invoice_date,
        due_date: validatedData.due_date,
        reference: validatedData.reference,
        notes: validatedData.notes,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        vat_type: vatType,
        vat_rate: vatRate,
        status: 'draft'
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create invoice items
    const itemsToInsert = validatedData.items.map(item => ({
      invoice_id: newInvoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price
    }))

    const { data: invoiceItems, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .insert(itemsToInsert)
      .select()

    if (itemsError) {
      // Rollback invoice creation
      await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('id', newInvoice.id)

      console.error('Error creating invoice items:', itemsError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'invoice',
      newInvoice.id,
      'created',
      profile.id,
      null,
      { ...newInvoice, items: invoiceItems },
      request
    )

    // Return complete invoice with items and client
    const response = createApiResponse(
      {
        ...newInvoice,
        items: invoiceItems,
        client
      } as InvoiceWithItems,
      'Invoice created successfully'
    )

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Invoice creation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}