import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { calculateDaysOverdue } from '@/lib/email/reminder-service'
import type { ReminderStats, ReminderLevel } from '@/lib/types/financial'

/**
 * GET /api/reminders/stats
 * Get reminder analytics and statistics
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get all reminders for this tenant
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('payment_reminders')
      .select(`
        *,
        invoice:invoices!inner(
          id,
          status,
          paid_at,
          sent_at
        )
      `)
      .eq('tenant_id', profile.tenant_id)

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const totalReminders = reminders?.length || 0

    // Calculate reminders by level with response rates
    const remindersByLevel: { [key: number]: { count: number; paid: number } } = {
      1: { count: 0, paid: 0 },
      2: { count: 0, paid: 0 },
      3: { count: 0, paid: 0 }
    }

    const daysToPay: number[] = []

    reminders?.forEach((reminder: any) => {
      const level = reminder.reminder_level
      if (level in remindersByLevel) {
        remindersByLevel[level].count++

        // Check if invoice was paid after this reminder
        if (reminder.invoice.paid_at && reminder.invoice.status === 'paid') {
          const reminderDate = new Date(reminder.sent_at)
          const paidDate = new Date(reminder.invoice.paid_at)

          if (paidDate > reminderDate) {
            remindersByLevel[level].paid++

            // Calculate days to payment
            const diffTime = paidDate.getTime() - reminderDate.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            daysToPay.push(diffDays)
          }
        }
      }
    })

    // Calculate average days to payment
    const averageDaysToPay = daysToPay.length > 0
      ? daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length
      : 0

    // Format reminders by level with response rates
    const remindersWithStats = Object.entries(remindersByLevel).map(([level, stats]) => ({
      level: parseInt(level) as ReminderLevel,
      count: stats.count,
      response_rate: stats.count > 0 ? (stats.paid / stats.count) * 100 : 0
    }))

    // Determine most effective level (highest response rate with meaningful sample size)
    const mostEffectiveLevel = remindersWithStats
      .filter(r => r.count >= 3) // Only consider levels with at least 3 reminders
      .reduce(
        (best, current) => (current.response_rate > best.response_rate ? current : best),
        remindersWithStats[0]
      )?.level || 1

    // Get invoices needing reminders
    const { data: overdueInvoices, error: overdueError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        due_date,
        total_amount,
        status
      `)
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true })

    if (overdueError) {
      console.error('Error fetching overdue invoices:', overdueError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Categorize invoices by suggested reminder level
    const invoicesNeedingReminders: { [key: number]: { count: number; amount: number } } = {
      1: { count: 0, amount: 0 },
      2: { count: 0, amount: 0 },
      3: { count: 0, amount: 0 }
    }

    for (const invoice of overdueInvoices || []) {
      const daysOverdue = calculateDaysOverdue(invoice.due_date)

      if (daysOverdue > 0) {
        // Get last reminder for this invoice
        const { data: lastReminder } = await supabaseAdmin
          .from('payment_reminders')
          .select('reminder_level')
          .eq('invoice_id', invoice.id)
          .order('reminder_level', { ascending: false })
          .limit(1)
          .single()

        const lastLevel = lastReminder?.reminder_level as ReminderLevel | undefined

        let suggestedLevel: ReminderLevel
        if (lastLevel) {
          // Escalate to next level
          suggestedLevel = Math.min(3, lastLevel + 1) as ReminderLevel
        } else {
          // First reminder - determine based on days overdue
          if (daysOverdue >= 14) {
            suggestedLevel = 2
          } else if (daysOverdue >= 7) {
            suggestedLevel = 1
          } else {
            suggestedLevel = 1
          }
        }

        invoicesNeedingReminders[suggestedLevel].count++
        invoicesNeedingReminders[suggestedLevel].amount += parseFloat(invoice.total_amount.toString())
      }
    }

    const stats: ReminderStats = {
      total_reminders_sent: totalReminders,
      reminders_by_level: remindersWithStats,
      average_days_to_payment: Math.round(averageDaysToPay * 10) / 10,
      most_effective_level: mostEffectiveLevel,
      invoices_needing_reminders: {
        total: Object.values(invoicesNeedingReminders).reduce((sum, item) => sum + item.count, 0),
        by_level: Object.entries(invoicesNeedingReminders).map(([level, stats]) => ({
          level: parseInt(level) as ReminderLevel,
          count: stats.count,
          total_amount: stats.amount
        }))
      }
    }

    const response = createApiResponse<ReminderStats>(
      stats,
      'Reminder statistics fetched successfully'
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Get reminder stats error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
