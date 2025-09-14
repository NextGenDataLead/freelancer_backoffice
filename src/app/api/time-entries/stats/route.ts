import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

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
    const now = new Date()
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
      .select('hours, hourly_rate, effective_hourly_rate')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', currentWeekStart.toISOString().split('T')[0])
      .lte('entry_date', currentWeekEnd.toISOString().split('T')[0])

    if (thisWeekError) throw thisWeekError

    // Query previous week's hours for comparison
    const { data: previousWeekEntries, error: previousWeekError } = await supabaseAdmin
      .from('time_entries')
      .select('hours')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', previousWeekStart.toISOString().split('T')[0])
      .lte('entry_date', previousWeekEnd.toISOString().split('T')[0])

    if (previousWeekError) throw previousWeekError

    // Query this month's hours and revenue
    const { data: thisMonthEntries, error: thisMonthError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate')
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', currentMonthStart.toISOString().split('T')[0])
      .lte('entry_date', currentMonthEnd.toISOString().split('T')[0])

    if (thisMonthError) throw thisMonthError

    // Query unbilled hours (billable but not invoiced)
    const { data: unbilledEntries, error: unbilledError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)

    if (unbilledError) throw unbilledError

    // Query active projects and clients
    const { data: projectStats, error: projectError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        project_name, 
        client_id, 
        project_id,
        clients(name),
        project:projects(name)
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days

    if (projectError) throw projectError

    // Calculate statistics
    const thisWeekHours = thisWeekEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const previousWeekHours = previousWeekEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const weekDifference = thisWeekHours - previousWeekHours

    const thisMonthHours = thisMonthEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const thisMonthRevenue = thisMonthEntries?.reduce((sum, entry) => {
      const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
      return sum + (entry.hours * effectiveRate)
    }, 0) || 0

    const unbilledHours = unbilledEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const unbilledRevenue = unbilledEntries?.reduce((sum, entry) => {
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

    // Get subscription metrics for SaaS dashboard cards
    const subscriptionMetrics = await calculateSubscriptionMetrics(profile.tenant_id, currentMonthStart, currentMonthEnd)

    const stats = {
      thisWeek: {
        hours: Math.round(thisWeekHours * 10) / 10, // Round to 1 decimal
        difference: Math.round(weekDifference * 10) / 10,
        trend: weekDifference >= 0 ? 'positive' : 'negative'
      },
      thisMonth: {
        hours: Math.round(thisMonthHours * 10) / 10,
        revenue: Math.round(thisMonthRevenue * 100) / 100 // Round to 2 decimals
      },
      unbilled: {
        hours: Math.round(unbilledHours * 10) / 10,
        revenue: Math.round(unbilledRevenue * 100) / 100
      },
      projects: {
        count: uniqueProjects.size,
        clients: uniqueClients.size
      },
      subscription: subscriptionMetrics
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