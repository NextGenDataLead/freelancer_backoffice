import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  isValidUUID
} from '@/lib/supabase/financial-client'
import { getEmailProvider } from '@/lib/email/email-provider'
import { getCurrentDate } from '@/lib/current-date'
import type { InvoiceWithClient } from '@/lib/types/financial'

interface RouteParams {
  params: {
    id: string
  }
}

interface SendInvoiceEmailRequest {
  to?: string
  cc?: string
  subject?: string
  message?: string
  attachPDF?: boolean
}

/**
 * POST /api/invoices/[id]/send
 * Send invoice via email to client
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Validate UUID format
    if (!isValidUUID(invoiceId)) {
      const validationError = ApiErrors.ValidationError('Invalid invoice ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Parse request body
    const body: SendInvoiceEmailRequest = await request.json()

    // Fetch invoice with client data
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          name,
          company_name,
          email
        )
      `)
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError)
      const notFoundError = ApiErrors.NotFound('Invoice')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Get recipient email (from request body or client email)
    const recipientEmail = body.to || invoice.client?.email

    if (!recipientEmail) {
      const validationError = ApiErrors.ValidationError('No recipient email address provided')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      const validationError = ApiErrors.ValidationError('Invalid email address format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Get email provider
    const emailProvider = getEmailProvider()

    // Prepare email content
    const clientName = invoice.client?.company_name || invoice.client?.name || 'Valued Client'
    const subject = body.subject || `Invoice ${invoice.invoice_number} from ${profile.business_name || 'Our Company'}`

    const defaultMessage = `Dear ${clientName},

Please find attached invoice ${invoice.invoice_number} dated ${new Date(invoice.invoice_date).toLocaleDateString('nl-NL')}.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString('nl-NL')}
- Due Date: ${new Date(invoice.due_date).toLocaleDateString('nl-NL')}
- Total Amount: €${(invoice.total_amount_incl_vat || 0).toFixed(2)}

${invoice.payment_instructions || 'Please process payment at your earliest convenience.'}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
${profile.business_name || 'Your Company'}
`

    const emailBody = body.message || defaultMessage

    // Prepare HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1f2937;
      font-size: 24px;
    }
    .invoice-details {
      background-color: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 15px 20px;
      margin: 20px 0;
    }
    .invoice-details p {
      margin: 8px 0;
    }
    .invoice-details strong {
      color: #1f2937;
      font-weight: 600;
    }
    .total-amount {
      font-size: 20px;
      color: #2563eb;
      font-weight: 700;
    }
    .message {
      margin: 20px 0;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Invoice ${invoice.invoice_number}</h1>
    </div>

    <p>Dear ${clientName},</p>

    <p>Please find your invoice details below:</p>

    <div class="invoice-details">
      <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
      <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('nl-NL')}</p>
      <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('nl-NL')}</p>
      <p><strong>Total Amount:</strong> <span class="total-amount">€${(invoice.total_amount_incl_vat || 0).toFixed(2)}</span></p>
    </div>

    ${body.message ? `<div class="message">${body.message}</div>` : ''}

    <p>${invoice.payment_instructions || 'Please process payment at your earliest convenience.'}</p>

    <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

    <div class="footer">
      <p>Best regards,<br>${profile.business_name || 'Your Company'}</p>
      ${profile.email ? `<p>Email: ${profile.email}</p>` : ''}
      ${profile.phone ? `<p>Phone: ${profile.phone}</p>` : ''}
    </div>
  </div>
</body>
</html>
`

    // Send email
    const emailResult = await emailProvider.send({
      to: recipientEmail,
      subject,
      body: emailBody,
      html: htmlContent,
      cc: body.cc,
      replyTo: profile.email || undefined
    })

    if (!emailResult.success) {
      const errorResponse = ApiErrors.InternalError
      errorResponse.message = `Failed to send email: ${emailResult.error}`
      return NextResponse.json(errorResponse, { status: errorResponse.status })
    }

    // Update invoice status to 'sent' if it's still draft
    if (invoice.status === 'draft') {
      await supabaseAdmin
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: getCurrentDate().toISOString(),
          updated_at: getCurrentDate().toISOString()
        })
        .eq('id', invoiceId)
    }

    // Log email sent activity (optional - could add to audit log)
    console.log(`✅ Invoice ${invoice.invoice_number} sent to ${recipientEmail} (Email ID: ${emailResult.id})`)

    const response = createApiResponse(
      {
        invoice_id: invoiceId,
        email_id: emailResult.id,
        recipient: recipientEmail,
        sent_at: getCurrentDate().toISOString()
      },
      'Invoice sent successfully via email'
    )

    return NextResponse.json(response)

  } catch (error) {
    console.error('API error sending invoice:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
