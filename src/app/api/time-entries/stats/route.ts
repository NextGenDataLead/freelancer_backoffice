import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'
import { getTimeEntryStatus } from '@/lib/utils/time-entry-status'
import type { TimeEntry, Client } from '@/lib/types/financial'

/**
 * GET /api/time-entries/stats
 * Gets time tracking statistics for the current tenant
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get current week date range (Monday to Sunday)
    const now = getCurrentDate()
    const currentWeekStart = new Date(now)
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday should go back 6 days
    currentWeekStart.setDate(now.getDate() + daysToMonday)
    currentWeekStart.setHours(0, 0, 0, 0)
    
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
    currentWeekEnd.setHours(23, 59, 59, 999)

    // Get previous week for comparison
    const previousWeekStart = new Date(currentWeekStart)
    previousWeekStart.setDate(currentWeekStart.getDate() - 7)
    
    const previousWeekEnd = new Date(currentWeekEnd)
    previousWeekEnd.setDate(currentWeekEnd.getDate() - 7)

    // Get current month date range
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Query this week's hours
    const { data: thisWeekEntries, error: thisWeekError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate, billable')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', currentWeekStart.toISOString().split('T')[0])
      .lte('entry_date', currentWeekEnd.toISOString().split('T')[0])

    if (thisWeekError) throw thisWeekError

    // Query previous week's hours for comparison
    const { data: previousWeekEntries, error: previousWeekError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, billable')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', previousWeekStart.toISOString().split('T')[0])
      .lte('entry_date', previousWeekEnd.toISOString().split('T')[0])

    if (previousWeekError) throw previousWeekError

    // Query this month's hours and revenue
    const { data: thisMonthEntries, error: thisMonthError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate, billable')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', currentMonthStart.toISOString().split('T')[0])
      .lte('entry_date', currentMonthEnd.toISOString().split('T')[0])

    if (thisMonthError) throw thisMonthError

    // Query previous month MTD (same day range as current month for comparison)
    // Example: If today is Sept 17, query Aug 1-17 (not full August)
    const currentDay = now.getDate()
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthMTDEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(currentDay, new Date(now.getFullYear(), now.getMonth(), 0).getDate()))
    previousMonthMTDEnd.setHours(23, 59, 59, 999)

    const { data: previousMonthMTDEntries, error: previousMonthMTDError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate, billable')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', previousMonthStart.toISOString().split('T')[0])
      .lte('entry_date', previousMonthMTDEnd.toISOString().split('T')[0])

    if (previousMonthMTDError) throw previousMonthMTDError

    // Query ALL unbilled billable hours (not filtered by month - for "Factureerbaar" status)
    // These are entries that are billable=true, invoiced=false, ready to invoice based on client frequency
    const { data: unbilledEntries, error: unbilledError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        id,
        hours,
        hourly_rate,
        effective_hourly_rate,
        entry_date,
        billable,
        invoiced,
        invoice_id,
        client_id,
        clients!inner(
          id,
          invoicing_frequency
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)

    if (unbilledError) {
      console.error('❌ Error fetching unbilled entries:', unbilledError)
      throw unbilledError
    }

    console.log('🔍 Unbilled entries query returned:', unbilledEntries?.length || 0, 'entries')

    // Query rolling 30-day periods for health score metrics
    // Current 30 days (last 30 days)
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: current30DaysEntries, error: current30Error } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate, billable, entry_date')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', last30DaysStart.toISOString().split('T')[0])
      .lte('entry_date', now.toISOString().split('T')[0])

    if (current30Error) throw current30Error

    // Previous 30 days (days 31-60)
    const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const previous30DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: previous30DaysEntries, error: previous30Error } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate, billable, entry_date')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', previous30DaysStart.toISOString().split('T')[0])
      .lt('entry_date', previous30DaysEnd.toISOString().split('T')[0])

    if (previous30Error) throw previous30Error

    // Query unbilled hours for rolling 30-day periods (billable but not invoiced)
    // Current 30 days unbilled
    const { data: current30DaysUnbilledEntries, error: current30UnbilledError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)
      .gte('entry_date', last30DaysStart.toISOString().split('T')[0])
      .lte('entry_date', now.toISOString().split('T')[0])

    if (current30UnbilledError) throw current30UnbilledError

    // Previous 30 days unbilled
    const { data: previous30DaysUnbilledEntries, error: previous30UnbilledError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)
      .gte('entry_date', previous30DaysStart.toISOString().split('T')[0])
      .lt('entry_date', previous30DaysEnd.toISOString().split('T')[0])

    if (previous30UnbilledError) throw previous30UnbilledError

    // Query active projects and clients (last 30 days from development date)
    const projectsLast30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: projectStats, error: projectError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        project_name,
        client_id,
        project_id,
        clients(company_name),
        project:projects(name)
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', projectsLast30DaysStart.toISOString().split('T')[0]) // Last 30 days from development date

    if (projectError) throw projectError

    console.log('📊 Active projects query:', {
      dateFrom: projectsLast30DaysStart.toISOString().split('T')[0],
      entriesFound: projectStats?.length || 0
    })

    // Calculate statistics
    const thisWeekHours = thisWeekEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const thisWeekBillableHours = thisWeekEntries?.filter(e => e.billable !== false).reduce((sum, entry) => sum + entry.hours, 0) || 0
    const previousWeekHours = previousWeekEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const previousWeekBillableHours = previousWeekEntries?.filter(e => e.billable !== false).reduce((sum, entry) => sum + entry.hours, 0) || 0
    const weekDifference = thisWeekBillableHours - previousWeekBillableHours

    const thisMonthHours = thisMonthEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const thisMonthRevenue = thisMonthEntries?.reduce((sum, entry) => {
      const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
      return sum + (entry.hours * effectiveRate)
    }, 0) || 0

    // Filter for "Factureerbaar" status - entries ready to invoice based on frequency rules
    const factureerbaarEntries = unbilledEntries?.filter(entry => {
      // Build client object from nested data
      const client = (entry as any).clients as Client
      if (!client) {
        console.log('⚠️ Entry missing client:', entry.id)
        return false
      }

      // Check if entry is "Factureerbaar" (ready to invoice)
      const statusInfo = getTimeEntryStatus(entry as unknown as TimeEntry, client, now)
      console.log('📊 Entry status:', {
        entryId: entry.id,
        status: statusInfo.status,
        color: statusInfo.color,
        reason: statusInfo.reason,
        included: statusInfo.status === 'factureerbaar' && statusInfo.color === 'green'
      })
      return statusInfo.status === 'factureerbaar' && statusInfo.color === 'green'
    }) || []

    console.log('✅ Factureerbaar totals:', {
      totalUnbilled: unbilledEntries?.length || 0,
      factureerbaarCount: factureerbaarEntries.length,
      factureerbaarHours: factureerbaarEntries.reduce((sum, e) => sum + e.hours, 0)
    })

    const factureerbaarHours = factureerbaarEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const factureerbaarRevenue = factureerbaarEntries.reduce((sum, entry) => {
      const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
      return sum + (entry.hours * effectiveRate)
    }, 0)

    // Keep legacy unbilled metrics (all billable not invoiced, regardless of frequency)
    const unbilledHours = unbilledEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const unbilledRevenue = unbilledEntries?.reduce((sum, entry) => {
      const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
      return sum + (entry.hours * effectiveRate)
    }, 0) || 0

    // Calculate billable hours for this month (includes both billed and unbilled)
    // billable = true or null (default is billable), non-billable = false
    const thisMonthBillableHours = thisMonthEntries?.filter(entry => entry.billable === true || entry.billable === null)
      .reduce((sum, entry) => sum + entry.hours, 0) || 0
    const thisMonthNonBillableHours = thisMonthEntries?.filter(entry => entry.billable === false)
      .reduce((sum, entry) => sum + entry.hours, 0) || 0

    // Calculate billable revenue for this month (time-based revenue from billable entries)
    const thisMonthBillableRevenue = thisMonthEntries
      ?.filter(entry => entry.billable === true || entry.billable === null)
      .reduce((sum, entry) => {
        const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
        return sum + (entry.hours * effectiveRate)
      }, 0) || 0

    // Calculate previous month MTD stats for comparison
    const previousMonthMTDHours = previousMonthMTDEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const previousMonthMTDBillableHours = previousMonthMTDEntries?.filter(entry => entry.billable === true || entry.billable === null)
      .reduce((sum, entry) => sum + entry.hours, 0) || 0
    const previousMonthMTDBillableRevenue = previousMonthMTDEntries
      ?.filter(entry => entry.billable === true || entry.billable === null)
      .reduce((sum, entry) => {
        const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
        return sum + (entry.hours * effectiveRate)
      }, 0) || 0

    // Calculate unique projects and clients
    const uniqueProjects = new Set()
    const uniqueClients = new Set(projectStats?.filter(p => p.client_id).map(p => p.client_id))

    // Count projects from both project_id (structured projects) and project_name (free text)
    projectStats?.forEach(p => {
      if (p.project_id) {
        uniqueProjects.add(p.project_id)
      } else if (p.project_name) {
        uniqueProjects.add(p.project_name)
      }
    })

    // Calculate distinct working days this month
    const distinctWorkingDays = new Set(
      thisMonthEntries?.map(entry => entry.entry_date) || []
    ).size

    // Calculate rolling 30-day metrics for health score
    // Current period (last 30 days)
    const current30DaysBillableRevenue = current30DaysEntries
      ?.filter(e => e.billable !== false)
      .reduce((sum, e) => sum + (e.hours * (e.effective_hourly_rate || e.hourly_rate || 0)), 0) || 0

    const current30DaysDistinctWorkingDays = new Set(
      current30DaysEntries?.map(e => e.entry_date) || []
    ).size

    const current30DaysHours = current30DaysEntries?.reduce((sum, e) => sum + e.hours, 0) || 0
    const current30DaysDailyHours = current30DaysDistinctWorkingDays > 0
      ? current30DaysHours / current30DaysDistinctWorkingDays
      : 0

    // Calculate billable/non-billable breakdown for current 30 days
    const current30DaysBillableHours = current30DaysEntries
      ?.filter(e => e.billable === true || e.billable === null)
      .reduce((sum, e) => sum + e.hours, 0) || 0
    const current30DaysNonBillableHours = current30DaysEntries
      ?.filter(e => e.billable === false)
      .reduce((sum, e) => sum + e.hours, 0) || 0

    // Previous period (days 31-60)
    const previous30DaysBillableRevenue = previous30DaysEntries
      ?.filter(e => e.billable !== false)
      .reduce((sum, e) => sum + (e.hours * (e.effective_hourly_rate || e.hourly_rate || 0)), 0) || 0

    const previous30DaysDistinctWorkingDays = new Set(
      previous30DaysEntries?.map(e => e.entry_date) || []
    ).size

    const previous30DaysHours = previous30DaysEntries?.reduce((sum, e) => sum + e.hours, 0) || 0
    const previous30DaysDailyHours = previous30DaysDistinctWorkingDays > 0
      ? previous30DaysHours / previous30DaysDistinctWorkingDays
      : 0

    // Calculate billable/non-billable breakdown for previous 30 days
    const previous30DaysBillableHours = previous30DaysEntries
      ?.filter(e => e.billable === true || e.billable === null)
      .reduce((sum, e) => sum + e.hours, 0) || 0
    const previous30DaysNonBillableHours = previous30DaysEntries
      ?.filter(e => e.billable === false)
      .reduce((sum, e) => sum + e.hours, 0) || 0

    // Calculate unbilled metrics for rolling 30-day periods
    const current30DaysUnbilledHours = current30DaysUnbilledEntries
      ?.reduce((sum, e) => sum + e.hours, 0) || 0
    const current30DaysUnbilledValue = current30DaysUnbilledEntries
      ?.reduce((sum, e) => sum + (e.hours * (e.effective_hourly_rate || e.hourly_rate || 0)), 0) || 0

    const previous30DaysUnbilledHours = previous30DaysUnbilledEntries
      ?.reduce((sum, e) => sum + e.hours, 0) || 0
    const previous30DaysUnbilledValue = previous30DaysUnbilledEntries
      ?.reduce((sum, e) => sum + (e.hours * (e.effective_hourly_rate || e.hourly_rate || 0)), 0) || 0

    // Get subscription metrics for SaaS dashboard cards
    const subscriptionMetrics = await calculateSubscriptionMetrics(profile.tenant_id, currentMonthStart, currentMonthEnd)

    const stats = {
      thisWeek: {
        hours: Math.round(thisWeekHours * 10) / 10, // All hours (for backwards compatibility)
        billableHours: Math.round(thisWeekBillableHours * 10) / 10, // Billable hours only
        difference: Math.round(weekDifference * 10) / 10,
        trend: weekDifference >= 0 ? 'positive' : 'negative'
      },
      thisMonth: {
        hours: Math.round(thisMonthHours * 10) / 10,
        revenue: Math.round(thisMonthRevenue * 100) / 100, // Round to 2 decimals
        billableHours: Math.round(thisMonthBillableHours * 10) / 10,
        billableRevenue: Math.round(thisMonthBillableRevenue * 100) / 100,
        nonBillableHours: Math.round(thisMonthNonBillableHours * 10) / 10,
        distinctWorkingDays // Add distinct working days count
      },
      previousMonthMTD: {
        hours: Math.round(previousMonthMTDHours * 10) / 10,
        billableHours: Math.round(previousMonthMTDBillableHours * 10) / 10,
        billableRevenue: Math.round(previousMonthMTDBillableRevenue * 100) / 100
      },
      unbilled: {
        hours: Math.round(unbilledHours * 10) / 10,
        revenue: Math.round(unbilledRevenue * 100) / 100
      },
      factureerbaar: {
        hours: Math.round(factureerbaarHours * 10) / 10,
        revenue: Math.round(factureerbaarRevenue * 100) / 100
      },
      projects: {
        count: uniqueProjects.size,
        clients: uniqueClients.size
      },
      subscription: subscriptionMetrics,
      rolling30Days: {
        current: {
          billableRevenue: Math.round(current30DaysBillableRevenue * 100) / 100,
          distinctWorkingDays: current30DaysDistinctWorkingDays,
          totalHours: Math.round(current30DaysHours * 10) / 10,
          dailyHours: Math.round(current30DaysDailyHours * 10) / 10,
          billableHours: Math.round(current30DaysBillableHours * 10) / 10,
          nonBillableHours: Math.round(current30DaysNonBillableHours * 10) / 10,
          unbilledHours: Math.round(current30DaysUnbilledHours * 10) / 10,
          unbilledValue: Math.round(current30DaysUnbilledValue * 100) / 100
        },
        previous: {
          billableRevenue: Math.round(previous30DaysBillableRevenue * 100) / 100,
          distinctWorkingDays: previous30DaysDistinctWorkingDays,
          totalHours: Math.round(previous30DaysHours * 10) / 10,
          dailyHours: Math.round(previous30DaysDailyHours * 10) / 10,
          billableHours: Math.round(previous30DaysBillableHours * 10) / 10,
          nonBillableHours: Math.round(previous30DaysNonBillableHours * 10) / 10,
          unbilledHours: Math.round(previous30DaysUnbilledHours * 10) / 10,
          unbilledValue: Math.round(previous30DaysUnbilledValue * 100) / 100
        }
      }
    }

    const response = createApiResponse(stats, 'Time tracking statistics retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Time statistics error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Calculate subscription metrics for MAU and Average Subscription Fee
 */
async function calculateSubscriptionMetrics(tenantId: string, currentMonthStart: Date, currentMonthEnd: Date) {
  try {
    // Previous month boundaries for comparison
    const previousMonthStart = new Date(currentMonthStart)
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1)
    const previousMonthEnd = new Date(currentMonthEnd)
    previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1)

    // Get current month subscription payments
    const { data: currentPayments, error: currentError } = await supabaseAdmin
      .from('platform_subscription_payments')
      .select('id, amount, payment_date, description, provider_data')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('payment_date', currentMonthStart.toISOString().split('T')[0])
      .lte('payment_date', currentMonthEnd.toISOString().split('T')[0])

    if (currentError) {
      console.error('Error fetching current subscription payments:', currentError)
      return getDefaultSubscriptionMetrics()
    }

    // Get previous month subscription payments
    const { data: previousPayments, error: previousError } = await supabaseAdmin
      .from('platform_subscription_payments')
      .select('id, amount, payment_date, description, provider_data')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('payment_date', previousMonthStart.toISOString().split('T')[0])
      .lte('payment_date', previousMonthEnd.toISOString().split('T')[0])

    if (previousError) {
      console.error('Error fetching previous subscription payments:', previousError)
      return getDefaultSubscriptionMetrics()
    }

    // Calculate MAU (Monthly Active Users)
    const currentCustomers = extractUniqueCustomers(currentPayments || [])
    const previousCustomers = extractUniqueCustomers(previousPayments || [])

    const currentMAU = currentCustomers.size
    const previousMAU = previousCustomers.size
    const mauGrowth = previousMAU > 0 ? ((currentMAU - previousMAU) / previousMAU) * 100 : 0

    // Calculate Average Subscription Fee
    const currentRevenue = (currentPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0)
    const previousRevenue = (previousPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0)

    const currentAvgFee = currentMAU > 0 ? currentRevenue / currentMAU : 0
    const previousAvgFee = previousMAU > 0 ? previousRevenue / previousMAU : 0
    const avgFeeGrowth = previousAvgFee > 0 ? ((currentAvgFee - previousAvgFee) / previousAvgFee) * 100 : 0

    return {
      monthlyActiveUsers: {
        current: currentMAU,
        previous: previousMAU,
        growth: Math.round(mauGrowth * 100) / 100,
        trend: mauGrowth >= 0 ? 'positive' : 'negative'
      },
      averageSubscriptionFee: {
        current: Math.round(currentAvgFee * 100) / 100,
        previous: Math.round(previousAvgFee * 100) / 100,
        growth: Math.round(avgFeeGrowth * 100) / 100,
        trend: avgFeeGrowth >= 0 ? 'positive' : 'negative'
      },
      totalRevenue: Math.round(currentRevenue * 100) / 100
    }

  } catch (error) {
    console.error('Error calculating subscription metrics:', error)
    return getDefaultSubscriptionMetrics()
  }
}

/**
 * Extract unique customers from payment data
 */
function extractUniqueCustomers(payments: any[]): Set<string> {
  const customers = new Set<string>()

  payments.forEach(payment => {
    let customerId = null

    try {
      // Try to get customer from provider_data JSON
      if (payment.provider_data && typeof payment.provider_data === 'object') {
        if (payment.provider_data.customer) {
          customerId = payment.provider_data.customer
        }
      }

      // Fallback: extract from description
      if (!customerId && payment.description) {
        const customerMatch = payment.description.match(/(Customer [A-J]|Enterprise [A-C])/i)
        if (customerMatch) {
          customerId = customerMatch[1].toLowerCase().replace(' ', '-')
        }
      }

      if (customerId) {
        customers.add(customerId)
      }
    } catch (error) {
      console.error('Error extracting customer ID from payment:', error)
    }
  })

  return customers
}

/**
 * Default subscription metrics for error cases
 */
function getDefaultSubscriptionMetrics() {
  return {
    monthlyActiveUsers: {
      current: 0,
      previous: 0,
      growth: 0,
      trend: 'neutral' as const
    },
    averageSubscriptionFee: {
      current: 0,
      previous: 0,
      growth: 0,
      trend: 'neutral' as const
    },
    totalRevenue: 0
  }
}