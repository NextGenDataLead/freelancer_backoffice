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
 * Gets Year-to-Date (YTD) revenue trend data for Financial Charts
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get Year-to-Date period based on available data (data-driven approach)

    // First find the date range of available time entries
    const { data: dateRange, error: dateRangeError } = await supabaseAdmin
      .from('time_entries')
      .select('entry_date')
      .eq('tenant_id', profile.tenant_id)
      .order('entry_date', { ascending: false })
      .limit(1)

    if (dateRangeError) {
      console.error('Error fetching time entry date range:', dateRangeError)
    }

    // Use latest entry date to determine the "current" year, or fall back to today
    const referenceDate = dateRange && dateRange.length > 0
      ? new Date(dateRange[0].entry_date)
      : getCurrentDate()

    const currentYear = referenceDate.getFullYear()
    const yearStart = new Date(currentYear, 0, 1) // January 1st of the year with data
    const currentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)

    // Generate array of months from January to the month containing the latest data
    const months = []
    for (let i = 0; i <= referenceDate.getMonth(); i++) {
      const monthDate = new Date(currentYear, i, 1)
      months.push({
        date: monthDate,
        name: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        fullName: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        startDate: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        endDate: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999)
      })
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
      .gte('entry_date', yearStart.toISOString().split('T')[0])
      .lte('entry_date', referenceDate.toISOString().split('T')[0])

    if (timeError) {
      console.error('Error fetching time entries for revenue trend:', timeError)
      throw timeError
    }

    // Query invoices for actual revenue (optional - if available)
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        total_amount,
        status,
        invoice_date,
        due_date
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('invoice_date', yearStart.toISOString().split('T')[0])
      .lte('invoice_date', referenceDate.toISOString().split('T')[0])

    if (invoiceError) {
      console.error('Error fetching invoices for revenue trend:', invoiceError)
      // Don't throw - invoices are optional
    }

    // Calculate revenue trend data with subscription revenue
    const revenueData = await Promise.all(months.map(async (month) => {
      // Calculate revenue from time entries
      const monthTimeEntries = timeEntries?.filter(entry => {
        const entryDate = new Date(entry.entry_date)
        return entryDate >= month.startDate && entryDate <= month.endDate
      }) || []

      const timeRevenue = monthTimeEntries.reduce((sum, entry) => {
        const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
        return sum + (entry.hours * effectiveRate)
      }, 0)

      // Calculate billable vs non-billable revenue
      const billableRevenue = monthTimeEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => {
          const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
          return sum + (entry.hours * effectiveRate)
        }, 0)

      // Calculate subscription revenue for this month
      const monthSubscriptions = await getMonthSubscriptionRevenue(profile.tenant_id, month.startDate, month.endDate)

      // Total business revenue = Time entries revenue + Subscription revenue
      const totalRevenue = timeRevenue + monthSubscriptions

      // Calculate expenses (simplified - could be enhanced with actual expense tracking)
      const totalHours = monthTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)
      const estimatedExpenses = totalHours * 15 // Assume €15/hour operational cost

      return {
        month: month.name,
        fullName: month.fullName,
        revenue: Math.round(totalRevenue * 100) / 100, // Total business revenue
        timeRevenue: Math.round(timeRevenue * 100) / 100, // Revenue from time entries
        subscriptionRevenue: Math.round(monthSubscriptions * 100) / 100, // Revenue from subscriptions
        billableRevenue: Math.round(billableRevenue * 100) / 100,
        expenses: Math.round(estimatedExpenses * 100) / 100,
        profit: Math.round((totalRevenue - estimatedExpenses) * 100) / 100,
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