import { NextResponse } from 'next/server'
import { UpdateInvoiceSchema, UpdateInvoiceStatusSchema } from '@/lib/validations/financial'
import type { Invoice, InvoiceWithItems, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createTransactionLog,
  isValidUUID,
  calculateInvoiceTotals
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/invoices/[id]
 * Retrieves a specific invoice with items and client data
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const invoiceId = params.id

    // Validate UUID format
    if (!isValidUUID(invoiceId)) {
      const validationError = ApiErrors.ValidationError('Invalid invoice ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Fetch invoice with items and client data
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*),
        client:clients!inner(
          id,
          company_name,
          email,
          phone,
          address,
          postal_code,
          city,
          country_code,
          vat_number,
          is_business,
          default_payment_terms
        )
      `)
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Error fetching invoice:', error)
      if (error.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Invoice')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(invoice, 'Invoice fetched successfully')
    return NextResponse.json(response)
  } catch (error) {
    console.error('Invoice fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * PUT /api/invoices/[id]
 * Updates a specific invoice and recalculates totals
 */
export async function PUT(request: Request, { params }: RouteParams) {
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

    const invoiceId = params.id
    const body = await request.json()

    // Validate request data
    const validatedData = UpdateInvoiceSchema.parse({ ...body, id: invoiceId })

    // Fetch existing invoice with items
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*),
        client:clients!inner(country_code, vat_number, is_business)
      `)
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing invoice:', fetchError)
      if (fetchError.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Invoice')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Check if invoice can be modified (only draft and sent invoices)
    if (!['draft', 'sent'].includes(existingInvoice.status)) {
      const conflictError = ApiErrors.Conflict('Cannot modify paid, overdue, or cancelled invoices')
      return NextResponse.json(conflictError, { status: conflictError.status })
    }

    // Prepare update data
    const updateData: Partial<Invoice> = {}
    
    if (validatedData.client_id) {
      // Verify client exists and belongs to tenant
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, country_code, vat_number, is_business')
        .eq('id', validatedData.client_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (clientError || !client) {
        const notFoundError = ApiErrors.NotFound('Client')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }

      updateData.client_id = validatedData.client_id

      // Recalculate VAT type if client changed
      let vatType: 'standard' | 'reverse_charge' | 'exempt' = 'standard'
      let vatRate = 0.21

      if (client.is_business && client.country_code !== 'NL' && client.vat_number) {
        vatType = 'reverse_charge'
        vatRate = 0
      } else if (client.country_code !== 'NL') {
        vatType = 'exempt'
        vatRate = 0
      }

      updateData.vat_type = vatType
      updateData.vat_rate = vatRate
    }

    if (validatedData.invoice_date) updateData.invoice_date = validatedData.invoice_date
    if (validatedData.due_date) updateData.due_date = validatedData.due_date
    if (validatedData.reference !== undefined) updateData.reference = validatedData.reference
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    // Handle items update if provided
    if (validatedData.items) {
      // Delete existing items
      await supabaseAdmin
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId)

      // Insert new items
      const itemsToInsert = validatedData.items.map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        line_total: (item.quantity || 1) * item.unit_price
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Error updating invoice items:', itemsError)
        return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
      }

      // Recalculate totals
      const vatRate = updateData.vat_rate !== undefined ? updateData.vat_rate : existingInvoice.vat_rate
      const { subtotal, vatAmount, totalAmount } = calculateInvoiceTotals(validatedData.items, vatRate)
      
      updateData.subtotal = subtotal
      updateData.vat_amount = vatAmount
      updateData.total_amount = totalAmount
    }

    // Update invoice
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        ...updateData,
        updated_at: getCurrentDate().toISOString()
      })
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        *,
        items:invoice_items(*),
        client:clients!inner(
          id,
          company_name,
          email,
          country_code,
          vat_number,
          is_business
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'invoice',
      invoiceId,
      'updated',
      profile.id,
      existingInvoice,
      updatedInvoice,
      request
    )

    const response = createApiResponse(updatedInvoice, 'Invoice updated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Invoice update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * DELETE /api/invoices/[id]
 * Deletes a specific invoice (only if in draft status)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const invoiceId = params.id

    // Validate UUID format
    if (!isValidUUID(invoiceId)) {
      const validationError = ApiErrors.ValidationError('Invalid invoice ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Fetch existing invoice
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing invoice:', fetchError)
      if (fetchError.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Invoice')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Only allow deletion of draft invoices
    if (existingInvoice.status !== 'draft') {
      const conflictError = ApiErrors.Conflict('Only draft invoices can be deleted. Sent, paid, or overdue invoices cannot be deleted.')
      return NextResponse.json(conflictError, { status: conflictError.status })
    }

    // First, unlink any associated time entries
    const { data: linkedTimeEntries, error: unlinkError } = await supabaseAdmin
      .from('time_entries')
      .update({
        invoiced: false,
        invoice_id: null,
        updated_at: getCurrentDate().toISOString()
      })
      .eq('invoice_id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .select('id, description, entry_date, hours')

    if (unlinkError) {
      console.error('Error unlinking time entries:', unlinkError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const unlinkedCount = linkedTimeEntries?.length || 0
    console.log(`Unlinked ${unlinkedCount} time entries from invoice ${existingInvoice.invoice_number}`)

    // Delete invoice (items will be deleted via CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'invoice',
      invoiceId,
      'deleted',
      profile.id,
      existingInvoice,
      null,
      request
    )

    return NextResponse.json({
      success: true,
      message: `Invoice ${existingInvoice.invoice_number} deleted successfully${unlinkedCount > 0 ? ` and ${unlinkedCount} time entries unlinked` : ''}`,
      unlinked_time_entries: unlinkedCount
    })

  } catch (error) {
    console.error('Invoice deletion error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
