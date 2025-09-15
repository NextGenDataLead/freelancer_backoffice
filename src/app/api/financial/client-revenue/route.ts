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

    // Calculate summary statistics
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

    const response = createApiResponse({
      clients: rankedData,
      summary
    }, 'Client revenue distribution retrieved successfully')

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