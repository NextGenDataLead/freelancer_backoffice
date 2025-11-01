import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  isValidUUID
} from '@/lib/supabase/financial-client'
import {
  calculateDaysOverdue,
  determineReminderLevel,
  prepareTemplateVariables,
  renderTemplate,
  sendReminderEmail,
  getNextReminderInfo,
  isValidEmail
} from '@/lib/email/reminder-service'
import { getCurrentDate } from '@/lib/current-date'
import type {
  SendReminderRequest,
  SendReminderResponse,
  InvoiceWithClient,
  PaymentReminder,
  ReminderTemplate,
  ReminderLevel
} from '@/lib/types/financial'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/invoices/[id]/send-reminder
 * Send a payment reminder for an overdue invoice
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
    const body: Partial<SendReminderRequest> = await request.json()

    // Fetch invoice with client data and contacts
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          company_name,
          email,
          contacts:client_contacts(
            id,
            contact_type,
            first_name,
            last_name,
            email,
            phone
          )
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

    // Validate invoice status - can only send reminders for sent or overdue invoices
    if (!['sent', 'overdue'].includes(invoice.status)) {
      const conflictError = ApiErrors.Conflict(
        'Can only send reminders for sent or overdue invoices'
      )
      return NextResponse.json(conflictError, { status: conflictError.status })
    }

    // Extract administration contact for email address and greeting
    console.log('Invoice client contacts:', invoice.client.contacts)
    const adminContact = (invoice.client.contacts || []).find(
      (c: any) => c.contact_type === 'administration'
    )
    console.log('Admin contact found:', adminContact)

    // Use admin contact email if available, otherwise fall back to client email
    const recipientEmail = adminContact?.email || invoice.client.email

    // Validate recipient has email
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      const validationError = ApiErrors.ValidationError(
        'Client does not have a valid email address'
      )
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Calculate days overdue
    const daysOverdue = calculateDaysOverdue(invoice.due_date)

    // Get previous reminders to determine next level
    const { data: previousReminders } = await supabaseAdmin
      .from('payment_reminders')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('reminder_level', { ascending: false })
      .limit(1)

    const previousReminderLevel = previousReminders?.[0]?.reminder_level as ReminderLevel | undefined

    // Determine reminder level
    const reminderLevel = determineReminderLevel(daysOverdue, previousReminderLevel)

    // Check if this reminder level has already been sent
    const { data: allReminders } = await supabaseAdmin
      .from('payment_reminders')
      .select('reminder_level')
      .eq('invoice_id', invoiceId)

    const levelAlreadySent = allReminders?.some(r => r.reminder_level === reminderLevel)

    if (levelAlreadySent) {
      console.warn(`Reminder level ${reminderLevel} already sent for invoice ${invoiceId}`)
      // Allow resending but log it for audit purposes
      // In production, you might want to add a confirmation parameter from the frontend
    }

    // Get or use template
    let template: ReminderTemplate | undefined

    if (body.template_id) {
      // Use custom template
      const { data: customTemplate } = await supabaseAdmin
        .from('reminder_templates')
        .select('*')
        .eq('id', body.template_id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      template = customTemplate || undefined
    }

    if (!template) {
      // Get default template for this level
      const { data: defaultTemplate } = await supabaseAdmin
        .from('reminder_templates')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('reminder_level', reminderLevel)
        .eq('is_default', true)
        .single()

      template = defaultTemplate || undefined
    }

    if (!template) {
      // Seed default templates for this tenant if none exist
      await supabaseAdmin
        .rpc('seed_default_reminder_templates', { p_tenant_id: profile.tenant_id })

      // Try fetching again
      const { data: seededTemplate } = await supabaseAdmin
        .from('reminder_templates')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('reminder_level', reminderLevel)
        .eq('is_default', true)
        .single()

      template = seededTemplate || undefined
    }

    if (!template) {
      const internalError = ApiErrors.InternalError
      return NextResponse.json(
        { ...internalError, message: 'Could not load reminder template' },
        { status: internalError.status }
      )
    }

    // Use admin contact name for greeting
    const adminContactName = adminContact
      ? adminContact.first_name
      : 'Contactpersoon'
    console.log('Admin contact name:', adminContactName)

    // Prepare template variables
    // Build sender name with format: "Name from Company" or fallback to just name/email
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

    let senderName: string
    if (profile.business_name && fullName) {
      // Best case: "Imre Dekker from Your Business Name"
      senderName = `${fullName} from ${profile.business_name}`
    } else if (fullName) {
      // Fallback: Just the name
      senderName = fullName
    } else {
      // Last resort: Email address
      senderName = profile.email
    }

    const variables = prepareTemplateVariables(
      invoice as InvoiceWithClient,
      senderName,
      daysOverdue,
      adminContactName
    )
    console.log('Template variables:', variables)

    // Render email content
    const emailSubject = renderTemplate(template.subject, variables)
    let emailBody = renderTemplate(template.body, variables)
    console.log('Rendered email body:', emailBody.substring(0, 200))

    // Add personal note if provided
    if (body.personal_note) {
      emailBody = `${emailBody}\n\n---\nPersonal Note:\n${body.personal_note}`
    }

    // Send email
    const emailResult = await sendReminderEmail({
      to: recipientEmail,
      subject: emailSubject,
      body: emailBody,
      from: process.env.RESEND_FROM_EMAIL,
      replyTo: profile.email,
      ...(body.send_copy_to_sender && { cc: profile.email })
    })

    if (!emailResult.success) {
      console.error('Error sending reminder email:', emailResult.error)
      const internalError = ApiErrors.InternalError
      return NextResponse.json(
        { ...internalError, message: `Failed to send email: ${emailResult.error}` },
        { status: internalError.status }
      )
    }

    // Record reminder in database
    const { data: reminder, error: reminderError } = await supabaseAdmin
      .from('payment_reminders')
      .insert({
        tenant_id: profile.tenant_id,
        invoice_id: invoiceId,
        sent_by: profile.id,
        reminder_level: reminderLevel,
        sent_at: getCurrentDate().toISOString(),
        email_sent_to: recipientEmail,
        email_subject: emailSubject,
        email_body: emailBody,
        delivery_status: 'sent',
        notes: body.personal_note || null
      })
      .select()
      .single()

    if (reminderError || !reminder) {
      console.error('Error recording reminder:', reminderError)
      // Email was sent but couldn't record it - still return success
      // This is better than failing the whole operation
    }

    // Update invoice status based on reminder level
    // This provides better visibility into how many reminders have been sent
    const statusMap: Record<ReminderLevel, string> = {
      1: 'overdue_reminder_1',
      2: 'overdue_reminder_2',
      3: 'overdue_reminder_3'
    }

    const { error: statusUpdateError } = await supabaseAdmin
      .from('invoices')
      .update({ status: statusMap[reminderLevel] })
      .eq('id', invoiceId)

    if (statusUpdateError) {
      console.error('Error updating invoice status:', statusUpdateError)
      // Log error but don't fail the request since email was sent successfully
      // This ensures user gets confirmation even if status update fails
    }

    // Get next reminder info
    const nextReminderInfo = getNextReminderInfo(reminderLevel)

    const response: SendReminderResponse = {
      reminder: reminder as PaymentReminder,
      next_reminder_level: nextReminderInfo.nextLevel,
      days_until_next_reminder: nextReminderInfo.daysUntilNext
    }

    return NextResponse.json(
      createApiResponse(response, 'Payment reminder sent successfully'),
      { status: 200 }
    )

  } catch (error) {
    console.error('Send reminder error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
