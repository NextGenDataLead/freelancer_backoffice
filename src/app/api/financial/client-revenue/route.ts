import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * GET /api/financial/client-revenue
 * Gets client revenue distribution data for Financial Charts
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get current date and calculate 3-month period (matching revenue-trend scope)
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const threeMonthsAgo = new Date(currentMonth)
    threeMonthsAgo.setMonth(currentMonth.getMonth() - 2)

    // Query time entries with client information
    const { data: timeEntries, error: timeError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        hours,
        hourly_rate,
        effective_hourly_rate,
        client_id,
        client:clients(
          id,
          name,
          company_name,
          hourly_rate
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('entry_date', now.toISOString().split('T')[0])

    if (timeError) {
      console.error('Error fetching time entries for client revenue:', timeError)
      throw timeError
    }

    // Query rolling 30-day periods for health score metrics
    // Current 30 days (last 30 days)
    const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: current30DaysEntries, error: current30Error } = await supabaseAdmin
      .from('time_entries')
      .select(`
        hours,
        hourly_rate,
        effective_hourly_rate,
        client_id,
        client:clients(
          id,
          name,
          company_name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', last30DaysStart.toISOString().split('T')[0])
      .lte('entry_date', now.toISOString().split('T')[0])

    if (current30Error) throw current30Error

    // Previous 30 days (days 31-60)
    const previous30DaysStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const previous30DaysEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: previous30DaysEntries, error: previous30Error } = await supabaseAdmin
      .from('time_entries')
      .select(`
        hours,
        hourly_rate,
        effective_hourly_rate,
        client_id,
        client:clients(
          id,
          name,
          company_name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', previous30DaysStart.toISOString().split('T')[0])
      .lt('entry_date', previous30DaysEnd.toISOString().split('T')[0])

    if (previous30Error) throw previous30Error

    // Query clients for additional information
    const { data: clients, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        id,
        name,
        company_name,
        email,
        hourly_rate,
        created_at
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('active', true)

    if (clientError) {
      console.error('Error fetching clients for revenue distribution:', clientError)
      throw clientError
    }

    // Group time entries by client and calculate revenue
    const clientRevenueMap = new Map()
    let totalRevenue = 0

    // Process time entries
    timeEntries?.forEach(entry => {
      const clientId = entry.client_id
      const clientName = entry.client?.name || entry.client?.company_name || 'Unknown Client'
      const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
      const revenue = entry.hours * effectiveRate

      totalRevenue += revenue

      if (clientId && clientName !== 'Unknown Client') {
        if (clientRevenueMap.has(clientId)) {
          const existing = clientRevenueMap.get(clientId)
          clientRevenueMap.set(clientId, {
            ...existing,
            revenue: existing.revenue + revenue,
            hours: existing.hours + entry.hours,
            entries: existing.entries + 1
          })
        } else {
          clientRevenueMap.set(clientId, {
            id: clientId,
            name: clientName,
            revenue,
            hours: entry.hours,
            entries: 1,
            client: entry.client
          })
        }
      }
    })

    // Convert to array and calculate percentages
    const clientRevenueData = Array.from(clientRevenueMap.values())
      .map(client => ({
        id: client.id,
        name: client.name,
        revenue: Math.round(client.revenue * 100) / 100,
        hours: Math.round(client.hours * 10) / 10,
        entries: client.entries,
        percentage: totalRevenue > 0 ? Math.round((client.revenue / totalRevenue) * 100 * 100) / 100 : 0,
        averageRate: client.hours > 0 ? Math.round((client.revenue / client.hours) * 100) / 100 : 0,
        email: client.client?.email || '',
        clientHourlyRate: client.client?.hourly_rate || 0
      }))
      .sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending

    // Add ranking, color assignment, and revenue type breakdown
    const rankedData = clientRevenueData.map((client, index) => ({
      ...client,
      rank: index + 1,
      color: getClientColor(index), // Assign chart colors
      isTopClient: index === 0,
      // Revenue breakdown by type
      timeRevenue: client.revenue, // Currently all revenue is from time entries
      subscriptionRevenue: 0, // TODO: Add subscription revenue when available
      totalRevenue: client.revenue + 0 // time + subscription
    }))

    // Get SaaS/Platform revenue breakdown by subscription plans and payment providers
    const { data: subscriptionPayments, error: subscriptionError } = await supabaseAdmin
      .from('platform_subscription_payments')
      .select(`
        amount,
        payment_date,
        payment_provider,
        description,
        tenant_platform_subscriptions!inner(
          platform_subscription_plans!inner(
            name,
            billing_interval
          )
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'paid')
      .gte('payment_date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('payment_date', now.toISOString().split('T')[0])

    // Process SaaS revenue data for chart breakdown
    const saasRevenueMap = new Map()
    let totalSaasRevenue = 0

    if (!subscriptionError && subscriptionPayments) {
      subscriptionPayments.forEach(payment => {
        const plan = payment.tenant_platform_subscriptions?.platform_subscription_plans
        const planName = plan?.name || 'Unknown Plan'
        const provider = payment.payment_provider || 'Unknown Provider'
        const interval = plan?.billing_interval || 'monthly'
        const revenue = parseFloat(payment.amount.toString())

        totalSaasRevenue += revenue

        // Group by plan name for cleaner visualization
        const key = `${planName} (${interval})`

        if (saasRevenueMap.has(key)) {
          const existing = saasRevenueMap.get(key)
          saasRevenueMap.set(key, {
            ...existing,
            revenue: existing.revenue + revenue,
            payments: existing.payments + 1
          })
        } else {
          saasRevenueMap.set(key, {
            id: key.toLowerCase().replace(/\s+/g, '-'),
            name: key,
            revenue,
            payments: 1,
            provider,
            interval,
            planName
          })
        }
      })
    }

    // Convert SaaS revenue to array and calculate percentages
    const saasRevenueData = Array.from(saasRevenueMap.values())
      .map((item, index) => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
        percentage: totalSaasRevenue > 0 ? Math.round((item.revenue / totalSaasRevenue) * 100 * 100) / 100 : 0,
        rank: index + 1,
        color: getClientColor(index),
        isTopPlan: index === 0
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Calculate summary statistics for both revenue types
    const summary = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalClients: rankedData.length,
      totalHours: rankedData.reduce((sum, client) => sum + client.hours, 0),
      averageRevenuePerClient: rankedData.length > 0
        ? Math.round((totalRevenue / rankedData.length) * 100) / 100
        : 0,
      topClient: rankedData.length > 0 ? {
        name: rankedData[0].name,
        revenue: rankedData[0].revenue,
        percentage: rankedData[0].percentage
      } : null
    }

    const saasSummary = {
      totalSaasRevenue: Math.round(totalSaasRevenue * 100) / 100,
      totalPlans: saasRevenueData.length,
      totalPayments: saasRevenueData.reduce((sum, plan) => sum + plan.payments, 0),
      averageRevenuePerPlan: saasRevenueData.length > 0
        ? Math.round((totalSaasRevenue / saasRevenueData.length) * 100) / 100
        : 0,
      topPlan: saasRevenueData.length > 0 ? {
        name: saasRevenueData[0].name,
        revenue: saasRevenueData[0].revenue,
        percentage: saasRevenueData[0].percentage
      } : null
    }

    // Calculate rolling 30-day client concentration metrics
    // Helper function to calculate client revenue from entries
    const calculateClientRevenue = (entries: any[]) => {
      const clientMap = new Map()
      let total = 0

      entries?.forEach(entry => {
        const clientId = entry.client_id
        const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
        const revenue = entry.hours * effectiveRate
        total += revenue

        if (clientId) {
          clientMap.set(clientId, (clientMap.get(clientId) || 0) + revenue)
        }
      })

      return { clientMap, total }
    }

    // Current 30-day period
    const current30Days = calculateClientRevenue(current30DaysEntries)
    const current30DaysSorted = Array.from(current30Days.clientMap.entries())
      .sort((a, b) => b[1] - a[1])
    const current30DaysTopClientShare = current30Days.total > 0 && current30DaysSorted.length > 0
      ? Math.round((current30DaysSorted[0][1] / current30Days.total) * 100 * 100) / 100
      : 0

    // Previous 30-day period
    const previous30Days = calculateClientRevenue(previous30DaysEntries)
    const previous30DaysSorted = Array.from(previous30Days.clientMap.entries())
      .sort((a, b) => b[1] - a[1])
    const previous30DaysTopClientShare = previous30Days.total > 0 && previous30DaysSorted.length > 0
      ? Math.round((previous30DaysSorted[0][1] / previous30Days.total) * 100 * 100) / 100
      : 0

    const rolling30DaysComparison = {
      current: {
        topClientShare: current30DaysTopClientShare,
        totalRevenue: Math.round(current30Days.total * 100) / 100
      },
      previous: {
        topClientShare: previous30DaysTopClientShare,
        totalRevenue: Math.round(previous30Days.total * 100) / 100
      }
    }

    const response = createApiResponse({
      clients: rankedData,
      saasRevenue: saasRevenueData,
      summary,
      saasSummary,
      rolling30DaysComparison
    }, 'Client and SaaS revenue distribution retrieved successfully')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Client revenue distribution error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Assign consistent colors for chart visualization
 */
function getClientColor(index: number): string {
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#6b7280'  // Gray
  ]

  return colors[index % colors.length]
}