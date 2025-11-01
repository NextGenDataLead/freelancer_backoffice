import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  isValidUUID
} from '@/lib/supabase/financial-client'
import { calculateDaysOverdue, canSendNextReminder } from '@/lib/email/reminder-service'
import type { PaymentReminder, ReminderLevel } from '@/lib/types/financial'

interface RouteParams {
  params: {
    id: string
  }
}

interface ReminderHistoryResponse {
  reminders: PaymentReminder[]
  nextReminderLevel?: ReminderLevel | null  // undefined = no badge, null = checkmark (all sent), number = badge with level
  canSendReminder: boolean
  daysOverdue: number
  message?: string
}

/**
 * GET /api/invoices/[id]/reminders
 * Get all payment reminders for a specific invoice
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

    // Verify invoice belongs to user's tenant and get due date + status
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, tenant_id, due_date, status')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError)
      const notFoundError = ApiErrors.NotFound('Invoice')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Fetch all reminders for history display and the most recent for timing checks
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('payment_reminders')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .order('sent_at', { ascending: false })

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const lastReminder = reminders?.[0]  // Most recent reminder for timing calculations

    // Calculate days overdue
    const daysOverdue = calculateDaysOverdue(invoice.due_date)

    // Determine next reminder level based on INVOICE STATUS with fallback to reminder history
    let nextReminderLevel: ReminderLevel | null | undefined = undefined
    let canSendReminder = true
    let message: string | undefined

    // Safety check: If we have reminders but status doesn't reflect it, use reminder history
    // This handles cases where status update failed after sending reminder
    const highestReminderLevel = lastReminder ? lastReminder.reminder_level as ReminderLevel : undefined
    const statusSuggestsNoReminders = ['sent', 'overdue'].includes(invoice.status)

    if (highestReminderLevel && statusSuggestsNoReminders) {
      // Status is out of sync with reminder history - use history as source of truth
      console.warn(`Invoice ${invoice.invoice_number} status (${invoice.status}) doesn't match reminder history (Level ${highestReminderLevel})`)

      if (highestReminderLevel >= 3) {
        // All reminders sent
        nextReminderLevel = null
        canSendReminder = false
        message = 'All reminder levels have been sent. Consider alternative collection methods.'
      } else {
        // Check if we can send the next level based on timing
        const proposedNextLevel = (highestReminderLevel + 1) as ReminderLevel
        const timeCheck = canSendNextReminder(lastReminder.sent_at, highestReminderLevel, proposedNextLevel)
        if (timeCheck.canSend) {
          nextReminderLevel = proposedNextLevel
          canSendReminder = true
        } else {
          canSendReminder = false
          message = `Please wait ${timeCheck.daysRemaining} more day(s) before sending Level ${proposedNextLevel} reminder. Last reminder was sent on ${new Date(lastReminder.sent_at).toLocaleDateString('nl-NL')}.`
        }
      }
    } else {
      // Status is in sync or no reminders sent yet - use normal status-based logic
      // Logic based on invoice status
      switch (invoice.status) {
      case 'paid':
      case 'cancelled':
        // No reminders for paid/cancelled invoices
        canSendReminder = false
        message = `Invoice has been ${invoice.status}. No further reminders needed.`
        break

      case 'sent':
        // Invoice sent but not overdue yet
        if (daysOverdue > 0) {
          // Should have been marked as overdue - show level 1
          nextReminderLevel = 1
          canSendReminder = true
        } else {
          // Not overdue yet
          canSendReminder = false
          message = 'Invoice is not yet overdue. Wait until after the due date to send the first reminder.'
        }
        break

      case 'overdue':
        // No reminders sent yet - can send level 1
        nextReminderLevel = 1
        canSendReminder = true
        break

      case 'overdue_reminder_1':
        // 1st reminder sent - can send 2nd after 7 days
        if (lastReminder) {
          const timeCheck = canSendNextReminder(lastReminder.sent_at, 1, 2)
          if (timeCheck.canSend) {
            nextReminderLevel = 2
            canSendReminder = true
          } else {
            canSendReminder = false
            message = `Please wait ${timeCheck.daysRemaining} more day(s) before sending Level 2 reminder. Last reminder was sent on ${new Date(lastReminder.sent_at).toLocaleDateString('nl-NL')}.`
          }
        }
        break

      case 'overdue_reminder_2':
        // 2nd reminder sent - can send 3rd after 7 days
        if (lastReminder) {
          const timeCheck = canSendNextReminder(lastReminder.sent_at, 2, 3)
          if (timeCheck.canSend) {
            nextReminderLevel = 3
            canSendReminder = true
          } else {
            canSendReminder = false
            message = `Please wait ${timeCheck.daysRemaining} more day(s) before sending Level 3 reminder. Last reminder was sent on ${new Date(lastReminder.sent_at).toLocaleDateString('nl-NL')}.`
          }
        }
        break

      case 'overdue_reminder_3':
        // All 3 reminders sent - show checkmark
        nextReminderLevel = null
        canSendReminder = false
        message = 'All reminder levels have been sent. Consider alternative collection methods.'
        break

      case 'partial':
        // Partially paid but still overdue - treat like regular overdue
        // Check the last reminder level from status if it exists
        if (lastReminder) {
          const lastLevel = lastReminder.reminder_level as ReminderLevel
          if (lastLevel >= 3) {
            nextReminderLevel = null
            canSendReminder = false
            message = 'All reminder levels have been sent.'
          } else {
            const proposedNextLevel = (lastLevel + 1) as ReminderLevel
            const timeCheck = canSendNextReminder(lastReminder.sent_at, lastLevel, proposedNextLevel)
            if (timeCheck.canSend) {
              nextReminderLevel = proposedNextLevel
              canSendReminder = true
            } else {
              canSendReminder = false
              message = `Please wait ${timeCheck.daysRemaining} more day(s) before sending next reminder.`
            }
          }
        } else {
          nextReminderLevel = 1
          canSendReminder = true
        }
        break

      default:
        // Unknown status
        canSendReminder = false
        break
      }
    }

    const response: ReminderHistoryResponse = {
      reminders: reminders || [],
      nextReminderLevel,
      canSendReminder,
      daysOverdue,
      message
    }

    return NextResponse.json(
      createApiResponse(response, 'Reminder history fetched successfully'),
      { status: 200 }
    )

  } catch (error) {
    console.error('Get reminders error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
