import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

/**
 * Calculate subscription revenue for a specific month
 */
async function getMonthSubscriptionRevenue(tenantId: string, monthStart: Date, monthEnd: Date): Promise<number> {
  try {
    // Query subscription payments for the month
    const { data: subscriptionPayments, error } = await supabaseAdmin
      .from('platform_subscription_payments')
      .select('amount, payment_date')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('payment_date', monthStart.toISOString().split('T')[0])
      .lte('payment_date', monthEnd.toISOString().split('T')[0])

    if (error) {
      console.error('Error fetching subscription payments:', error)
      return 0
    }

    // Sum up the subscription revenue for the month
    return subscriptionPayments?.reduce((sum, payment) => {
      return sum + parseFloat(payment.amount)
    }, 0) || 0

  } catch (error) {
    console.error('Error calculating subscription revenue:', error)
    return 0
  }
}

/**
 * GET /api/financial/revenue-trend
 * Gets revenue trend data with configurable granularity
 * Query params:
 *   - granularity: 'daily' | 'weekly' | 'monthly' (default: 'monthly')
 *   - period: '31d' | '3m' | '12m' (default: '12m')
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const granularity = searchParams.get('granularity') || 'monthly'
  const period = searchParams.get('period') || '12m'
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Determine date range based on period parameter
    const referenceDate = getCurrentDate()
    let startDate: Date
    let endDate = new Date(referenceDate)

    switch (period) {
      case '31d':
        startDate = new Date(referenceDate)
        startDate.setDate(startDate.getDate() - 30)
        break
      case '3m':
        startDate = new Date(referenceDate)
        startDate.setMonth(startDate.getMonth() - 3)
        break
      case '12m':
      default:
        startDate = new Date(referenceDate)
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
    }

    // Generate time periods based on granularity
    const periods: Array<{
      date: Date
      name: string
      fullName: string
      startDate: Date
      endDate: Date
    }> = []

    if (granularity === 'daily') {
      // Generate daily periods
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(currentDate)
        dayEnd.setHours(23, 59, 59, 999)

        periods.push({
          date: new Date(currentDate),
          name: currentDate.getDate().toString(),
          fullName: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          startDate: dayStart,
          endDate: dayEnd
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }
    } else if (granularity === 'weekly') {
      // Generate weekly periods
      const currentDate = new Date(startDate)
      // Start from beginning of week (Sunday)
      currentDate.setDate(currentDate.getDate() - currentDate.getDay())

      let weekNumber = 1
      while (currentDate <= endDate) {
        const weekStart = new Date(currentDate)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(currentDate)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        periods.push({
          date: new Date(currentDate),
          name: `W${weekNumber}`,
          fullName: `Week ${weekNumber} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
          startDate: weekStart,
          endDate: weekEnd
        })
        currentDate.setDate(currentDate.getDate() + 7)
        weekNumber++
      }
    } else {
      // Generate monthly periods
      const currentDate = new Date(startDate)
      currentDate.setDate(1) // Start of month

      while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999)

        periods.push({
          date: new Date(currentDate),
          name: currentDate.toLocaleDateString('en-US', { month: 'short' }),
          fullName: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          startDate: monthStart,
          endDate: monthEnd
        })
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    // Query time entries for revenue calculation
    const { data: timeEntries, error: timeError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        hours,
        hourly_rate,
        effective_hourly_rate,
        entry_date,
        billable
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0])

    if (timeError) {
      console.error('Error fetching time entries for revenue trend:', timeError)
      throw timeError
    }

    // Query expenses for actual expense data
    const { data: expenses, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .select(`
        amount,
        expense_date,
        status
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .lte('expense_date', endDate.toISOString().split('T')[0])
      .in('status', ['approved', 'processed', 'reimbursed'])

    if (expenseError) {
      console.error('Error fetching expenses for revenue trend:', expenseError)
      // Don't throw - expenses are optional
    }

    // Calculate revenue trend data with subscription revenue and actual expenses
    const revenueData = await Promise.all(periods.map(async (period) => {
      // Calculate revenue from time entries
      const periodTimeEntries = timeEntries?.filter(entry => {
        const entryDate = new Date(entry.entry_date)
        return entryDate >= period.startDate && entryDate <= period.endDate
      }) || []

      const timeRevenue = periodTimeEntries.reduce((sum, entry) => {
        const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
        return sum + (entry.hours * effectiveRate)
      }, 0)

      // Calculate billable vs non-billable revenue
      const billableRevenue = periodTimeEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => {
          const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
          return sum + (entry.hours * effectiveRate)
        }, 0)

      // Calculate subscription revenue for this period
      const periodSubscriptions = await getMonthSubscriptionRevenue(profile.tenant_id, period.startDate, period.endDate)

      // Total business revenue = Time entries revenue + Subscription revenue
      const totalRevenue = timeRevenue + periodSubscriptions

      // Calculate actual expenses from expense records
      const periodExpenses = expenses?.filter(expense => {
        const expenseDate = new Date(expense.expense_date)
        return expenseDate >= period.startDate && expenseDate <= period.endDate
      }) || []

      const actualExpenses = periodExpenses.reduce((sum, expense) => {
        return sum + parseFloat(expense.amount.toString())
      }, 0)

      // Calculate total hours
      const totalHours = periodTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)

      return {
        month: period.name,
        fullName: period.fullName,
        revenue: Math.round(totalRevenue * 100) / 100, // Total business revenue
        timeRevenue: Math.round(timeRevenue * 100) / 100, // Revenue from time entries
        subscriptionRevenue: Math.round(periodSubscriptions * 100) / 100, // Revenue from subscriptions
        billableRevenue: Math.round(billableRevenue * 100) / 100,
        expenses: Math.round(actualExpenses * 100) / 100, // Actual expenses from database
        profit: Math.round((totalRevenue - actualExpenses) * 100) / 100,
        totalHours: Math.round(totalHours * 10) / 10,
        averageRate: totalHours > 0 ? Math.round((timeRevenue / totalHours) * 100) / 100 : 0
      }
    }))

    // Calculate growth trends
    const trendData = revenueData.map((current, index) => {
      if (index === 0) return { ...current, growth: 0, trend: 'neutral' as const }

      const previous = revenueData[index - 1]
      const growth = previous.revenue > 0
        ? ((current.revenue - previous.revenue) / previous.revenue) * 100
        : 0

      return {
        ...current,
        growth: Math.round(growth * 100) / 100,
        trend: growth > 0 ? 'positive' as const : growth < 0 ? 'negative' as const : 'neutral' as const
      }
    })

    const response = createApiResponse(trendData, 'Revenue trend data retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Revenue trend error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}