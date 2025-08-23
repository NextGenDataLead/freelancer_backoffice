import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'

// Request schema for payment recording
const PaymentRecordingSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  payment_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid payment date'),
  payment_method: z.enum(['bank_transfer', 'credit_card', 'cash', 'paypal', 'other']).default('bank_transfer'),
  reference: z.string().optional(),
  notes: z.string().optional()
})

/**
 * POST /api/invoices/[id]/payments
 * Records a payment for an invoice
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const validatedData = PaymentRecordingSchema.parse(body)

    // Verify invoice exists and belongs to tenant
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, total_amount, status, paid_amount')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      const notFoundError = ApiErrors.NotFound('Invoice')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Check if invoice can receive payments
    if (invoice.status === 'draft' || invoice.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        message: 'Cannot record payment for draft or cancelled invoices',
        status: 400
      }, { status: 400 })
    }

    // Calculate current paid amount and new total
    const currentPaidAmount = parseFloat(invoice.paid_amount?.toString() || '0')
    const newPaymentAmount = validatedData.amount
    const totalAmount = parseFloat(invoice.total_amount.toString())
    const newPaidAmount = currentPaidAmount + newPaymentAmount

    // Validate payment doesn't exceed invoice total
    if (newPaidAmount > totalAmount) {
      return NextResponse.json({
        success: false,
        message: `Payment amount exceeds remaining balance. Remaining: €${(totalAmount - currentPaidAmount).toFixed(2)}`,
        status: 400
      }, { status: 400 })
    }

    // Record the payment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        tenant_id: profile.tenant_id,
        recorded_by: profile.id,
        amount: newPaymentAmount,
        payment_date: validatedData.payment_date,
        payment_method: validatedData.payment_method,
        reference: validatedData.reference,
        notes: validatedData.notes
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Update invoice paid amount and status
    const newStatus = newPaidAmount >= totalAmount ? 'paid' : 'sent'
    
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) {
      // Rollback payment record
      await supabaseAdmin
        .from('invoice_payments')
        .delete()
        .eq('id', payment.id)

      console.error('Error updating invoice status:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'invoice_payment',
      payment.id,
      'created',
      profile.id,
      null,
      {
        ...payment,
        invoice_id: invoiceId,
        new_status: newStatus,
        new_paid_amount: newPaidAmount
      },
      request
    )

    const response = createApiResponse(
      {
        ...payment,
        invoice: {
          id: invoiceId,
          new_status: newStatus,
          new_paid_amount: newPaidAmount,
          total_amount: totalAmount,
          remaining_balance: totalAmount - newPaidAmount
        }
      },
      'Payment recorded successfully'
    )

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Payment recording error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * GET /api/invoices/[id]/payments
 * Retrieves all payments for an invoice
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const invoiceId = params.id

    // Verify invoice exists and belongs to tenant
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      const notFoundError = ApiErrors.NotFound('Invoice')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Get all payments for this invoice
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('invoice_payments')
      .select(`
        *,
        recorded_by_profile:profiles!recorded_by(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(
      payments || [],
      'Payments retrieved successfully'
    )

    return NextResponse.json(response)

  } catch (error) {
    console.error('Payments fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}