import { NextResponse } from 'next/server'
import { UpdateInvoiceStatusSchema } from '@/lib/validations/financial'
import type { Invoice, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createTransactionLog,
  isValidUUID
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * PATCH/PUT /api/invoices/[id]/status
 * Updates invoice status with business logic validation
 */
async function handleStatusUpdate(request: Request, { params }: RouteParams) {
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
    const validatedData = UpdateInvoiceStatusSchema.parse({ ...body, id: invoiceId })
    const newStatus = validatedData.status

    // Fetch existing invoice
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
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

    const currentStatus = existingInvoice.status

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['paid', 'partial', 'overdue', 'cancelled'],
      'partial': ['paid', 'overdue', 'cancelled'],
      'overdue': ['paid', 'partial', 'cancelled'],
      'overdue_reminder_1': ['paid', 'partial', 'cancelled'],
      'overdue_reminder_2': ['paid', 'partial', 'cancelled'],
      'overdue_reminder_3': ['paid', 'partial', 'cancelled'],
      'paid': [], // Cannot transition from paid
      'cancelled': ['draft'] // Can only restore to draft
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      const conflictError = ApiErrors.Conflict(
        `Invalid status transition: cannot change from "${currentStatus}" to "${newStatus}"`
      )
      return NextResponse.json(conflictError, { status: conflictError.status })
    }

    // Prepare update data with status-specific logic
    const updateData: Partial<Invoice & { sent_at?: string; paid_at?: string; paid_amount?: number }> = {
      status: newStatus
    }

    // Set timestamps and amounts based on status
    switch (newStatus) {
      case 'sent':
        updateData.sent_at = getCurrentDate().toISOString()
        break
      case 'paid':
        updateData.paid_at = getCurrentDate().toISOString()
        // When marking as paid, set paid_amount to total_amount
        updateData.paid_amount = parseFloat(existingInvoice.total_amount.toString())
        break
      case 'cancelled':
        // Clear payment/sent timestamps when cancelled
        updateData.sent_at = null
        updateData.paid_at = null
        break
      case 'draft':
        // Restore to draft - clear all timestamps and payments
        updateData.sent_at = null
        updateData.paid_at = null
        updateData.paid_amount = 0
        break
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
          name,
          company_name,
          email,
          country_code
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log for status change
    await createTransactionLog(
      profile.tenant_id,
      'invoice',
      invoiceId,
      'status_changed',
      profile.id,
      { status: currentStatus },
      { status: newStatus },
      request
    )

    // Return success message based on status
    let message = 'Invoice status updated successfully'
    switch (newStatus) {
      case 'sent':
        message = `Invoice ${existingInvoice.invoice_number} marked as sent`
        break
      case 'paid':
        message = `Invoice ${existingInvoice.invoice_number} marked as paid`
        break
      case 'overdue':
        message = `Invoice ${existingInvoice.invoice_number} marked as overdue`
        break
      case 'cancelled':
        message = `Invoice ${existingInvoice.invoice_number} cancelled`
        break
      case 'draft':
        message = `Invoice ${existingInvoice.invoice_number} restored to draft`
        break
    }

    const response = createApiResponse(updatedInvoice, message)
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Invoice status update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

// Export both PATCH and PUT methods (PUT for backward compatibility)
export const PATCH = handleStatusUpdate
export const PUT = handleStatusUpdate

/**
 * GET /api/invoices/[id]/status
 * Gets current invoice status and available transitions
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

    // Fetch invoice status
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, status, sent_at, paid_at, due_date')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Error fetching invoice status:', error)
      if (error.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Invoice')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Determine available transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['paid', 'partial', 'overdue', 'cancelled'],
      'partial': ['paid', 'overdue', 'cancelled'],
      'overdue': ['paid', 'partial', 'cancelled'],
      'overdue_reminder_1': ['paid', 'partial', 'cancelled'],
      'overdue_reminder_2': ['paid', 'partial', 'cancelled'],
      'overdue_reminder_3': ['paid', 'partial', 'cancelled'],
      'paid': [],
      'cancelled': ['draft']
    }

    const availableTransitions = validTransitions[invoice.status] || []

    // Check if invoice should be automatically marked as overdue
    const isOverdue = invoice.status === 'sent' && 
                     invoice.due_date && 
                     new Date(invoice.due_date) < getCurrentDate()

    const response = createApiResponse({
      current_status: invoice.status,
      available_transitions: availableTransitions,
      sent_at: invoice.sent_at,
      paid_at: invoice.paid_at,
      due_date: invoice.due_date,
      is_overdue: isOverdue,
      invoice_number: invoice.invoice_number
    }, 'Invoice status retrieved successfully')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Invoice status fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}