import Handlebars from 'handlebars'
import { getEmailProvider } from './email-provider'
import type {
  ReminderTemplate,
  ReminderTemplateVariables,
  InvoiceWithClient,
  ReminderLevel
} from '@/lib/types/financial'

/**
 * Render an email template with variables using Handlebars
 */
export function renderTemplate(
  templateContent: string,
  variables: ReminderTemplateVariables
): string {
  const template = Handlebars.compile(templateContent)
  return template(variables)
}

/**
 * Prepare template variables from invoice data
 */
export function prepareTemplateVariables(
  invoice: InvoiceWithClient,
  businessName: string,
  daysOverdue: number,
  adminContactName?: string
): ReminderTemplateVariables {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d)
  }

  return {
    client_name: invoice.client.company_name,
    admin_name: adminContactName || 'Contactpersoon', // Fallback to generic contact person if no admin contact
    invoice_number: invoice.invoice_number,
    invoice_date: formatDate(invoice.invoice_date),
    due_date: formatDate(invoice.due_date),
    days_overdue: daysOverdue,
    total_amount: formatCurrency(parseFloat(invoice.total_amount.toString())),
    business_name: businessName,
    payment_link: undefined // Can be added in future enhancement
  }
}

/**
 * Calculate the number of days an invoice is overdue
 */
export function calculateDaysOverdue(dueDate: Date | string): number {
  // Import getCurrentDate dynamically to respect hardcoded development dates
  const { getCurrentDate } = require('@/lib/current-date')

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const today = getCurrentDate() // Use getCurrentDate() instead of new Date() for dev date support
  const diffTime = today.getTime() - due.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Determine the appropriate reminder level based on previous reminders
 * Always starts with level 1 for first reminder, then escalates sequentially
 */
export function determineReminderLevel(
  daysOverdue: number,
  previousReminderLevel?: ReminderLevel
): ReminderLevel {
  // If there's a previous reminder, escalate to the next level
  if (previousReminderLevel) {
    return Math.min(3, previousReminderLevel + 1) as ReminderLevel
  }

  // First reminder - always start with level 1
  // This ensures consistent escalation: 1 -> 2 -> 3
  return 1
}

/**
 * Waiting period in days between reminder levels
 */
export const REMINDER_WAITING_PERIODS = {
  LEVEL_1_TO_2: 7, // Days to wait after Level 1 before allowing Level 2
  LEVEL_2_TO_3: 7, // Days to wait after Level 2 before allowing Level 3
} as const

/**
 * Get escalation details for next reminder
 */
export function getNextReminderInfo(currentLevel: ReminderLevel): {
  nextLevel?: ReminderLevel
  daysUntilNext: number
} {
  switch (currentLevel) {
    case 1:
      return { nextLevel: 2, daysUntilNext: REMINDER_WAITING_PERIODS.LEVEL_1_TO_2 }
    case 2:
      return { nextLevel: 3, daysUntilNext: REMINDER_WAITING_PERIODS.LEVEL_2_TO_3 }
    case 3:
      return { daysUntilNext: 0 } // Final notice - no next level
    default:
      return { daysUntilNext: 0 }
  }
}

/**
 * Check if enough time has passed to send the next reminder level
 */
export function canSendNextReminder(
  lastReminderSentAt: Date | string,
  lastReminderLevel: ReminderLevel,
  nextLevel: ReminderLevel
): { canSend: boolean; daysRemaining: number } {
  // Import getCurrentDate dynamically to respect hardcoded development dates
  const { getCurrentDate } = require('@/lib/current-date')

  const lastSent = typeof lastReminderSentAt === 'string' ? new Date(lastReminderSentAt) : lastReminderSentAt
  const today = getCurrentDate() // Use getCurrentDate() instead of new Date() for dev date support
  const daysSinceLastReminder = Math.floor((today.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24))

  let requiredWaitingPeriod: number
  if (lastReminderLevel === 1 && nextLevel === 2) {
    requiredWaitingPeriod = REMINDER_WAITING_PERIODS.LEVEL_1_TO_2
  } else if (lastReminderLevel === 2 && nextLevel === 3) {
    requiredWaitingPeriod = REMINDER_WAITING_PERIODS.LEVEL_2_TO_3
  } else {
    // Invalid transition or unknown case
    return { canSend: false, daysRemaining: 0 }
  }

  const canSend = daysSinceLastReminder >= requiredWaitingPeriod
  const daysRemaining = Math.max(0, requiredWaitingPeriod - daysSinceLastReminder)

  return { canSend, daysRemaining }
}

/**
 * Send a payment reminder email using configured email provider
 */
export async function sendReminderEmail(params: {
  to: string
  subject: string
  body: string
  from?: string
  replyTo?: string
  cc?: string
}): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const emailProvider = getEmailProvider()

    const result = await emailProvider.send({
      to: params.to,
      subject: params.subject,
      body: params.body,
      from: params.from,
      replyTo: params.replyTo,
      cc: params.cc
    })

    return result
  } catch (error) {
    console.error('Error sending reminder email:', error)
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Get reminder level label for display
 */
export function getReminderLevelLabel(level: ReminderLevel): string {
  switch (level) {
    case 1:
      return 'Gentle Reminder'
    case 2:
      return 'Follow-up'
    case 3:
      return 'Final Notice'
    default:
      return 'Reminder'
  }
}

/**
 * Get reminder level color for UI
 */
export function getReminderLevelColor(level: ReminderLevel): string {
  switch (level) {
    case 1:
      return 'blue' // Gentle - informational
    case 2:
      return 'orange' // Follow-up - warning
    case 3:
      return 'red' // Final - urgent
    default:
      return 'gray'
  }
}
