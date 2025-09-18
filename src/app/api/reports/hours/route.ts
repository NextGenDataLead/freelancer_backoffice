import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

// Query schema for hours report
const HoursReportQuerySchema = z.object({
  period: z.enum(['this_week', 'this_month', 'this_quarter', 'this_year', 'last_month', 'last_quarter']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional()
})

/**
 * GET /api/reports/hours
 * Generates comprehensive hours report with breakdowns
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = HoursReportQuerySchema.parse(queryParams)

    // Calculate date range based on period or custom dates
    let dateFrom: string
    let dateTo: string
    const now = new Date()

    if (validatedQuery.date_from && validatedQuery.date_to) {
      dateFrom = validatedQuery.date_from
      dateTo = validatedQuery.date_to
    } else {
      const period = validatedQuery.period || 'this_month'

      switch (period) {
        case 'this_week':
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
          dateFrom = startOfWeek.toISOString().split('T')[0]
          dateTo = now.toISOString().split('T')[0]
          break

        case 'this_month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          dateTo = now.toISOString().split('T')[0]
          break

        case 'this_quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          dateFrom = quarterStart.toISOString().split('T')[0]
          dateTo = now.toISOString().split('T')[0]
          break

        case 'this_year':
          dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
          dateTo = now.toISOString().split('T')[0]
          break

        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
          dateFrom = lastMonth.toISOString().split('T')[0]
          dateTo = lastMonthEnd.toISOString().split('T')[0]
          break

        case 'last_quarter':
          const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
          const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
          dateFrom = lastQuarterStart.toISOString().split('T')[0]
          dateTo = lastQuarterEnd.toISOString().split('T')[0]
          break

        default:
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          dateTo = now.toISOString().split('T')[0]
      }
    }

    // Fetch time entries with related data
    const { data: timeEntries, error } = await supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        client:clients(
          id,
          name,
          company_name,
          hourly_rate
        ),
        project:projects(
          id,
          name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date', { ascending: false })

    if (error) {
      console.error('Error fetching time entries for report:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate summary statistics
    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0
    const billableHours = timeEntries?.reduce((sum, entry) =>
      entry.billable ? sum + (entry.hours || 0) : sum, 0) || 0
    const nonBillableHours = totalHours - billableHours
    const totalRevenue = timeEntries?.reduce((sum, entry) => {
      if (!entry.billable) return sum
      const rate = entry.effective_hourly_rate || entry.hourly_rate || entry.client?.hourly_rate || 0
      return sum + ((entry.hours || 0) * rate)
    }, 0) || 0
    const averageHourlyRate = billableHours > 0 ? totalRevenue / billableHours : 0

    // Client breakdown
    const clientMap = new Map()
    timeEntries?.forEach(entry => {
      if (!entry.client) return

      const clientId = entry.client.id
      const clientName = entry.client.company_name || entry.client.name

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          clientName,
          totalHours: 0,
          billableHours: 0,
          revenue: 0
        })
      }

      const client = clientMap.get(clientId)
      client.totalHours += entry.hours || 0

      if (entry.billable) {
        client.billableHours += entry.hours || 0
        const rate = entry.effective_hourly_rate || entry.hourly_rate || entry.client.hourly_rate || 0
        client.revenue += (entry.hours || 0) * rate
      }
    })

    const clientBreakdown = Array.from(clientMap.values()).map(client => ({
      ...client,
      averageRate: client.billableHours > 0 ? client.revenue / client.billableHours : 0
    }))

    // Project breakdown
    const projectMap = new Map()
    timeEntries?.forEach(entry => {
      const projectKey = entry.project?.id || `no-project-${entry.client?.id}`
      const projectName = entry.project?.name || entry.project_name || 'Algemeen'
      const clientName = entry.client?.company_name || entry.client?.name || 'Onbekende klant'

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, {
          projectId: entry.project?.id || null,
          projectName,
          clientName,
          totalHours: 0,
          revenue: 0
        })
      }

      const project = projectMap.get(projectKey)
      project.totalHours += entry.hours || 0

      if (entry.billable) {
        const rate = entry.effective_hourly_rate || entry.hourly_rate || entry.client?.hourly_rate || 0
        project.revenue += (entry.hours || 0) * rate
      }
    })

    const projectBreakdown = Array.from(projectMap.values())

    // Daily breakdown
    const dailyMap = new Map()
    timeEntries?.forEach(entry => {
      const date = entry.entry_date

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          totalHours: 0,
          billableHours: 0,
          revenue: 0
        })
      }

      const day = dailyMap.get(date)
      day.totalHours += entry.hours || 0

      if (entry.billable) {
        day.billableHours += entry.hours || 0
        const rate = entry.effective_hourly_rate || entry.hourly_rate || entry.client?.hourly_rate || 0
        day.revenue += (entry.hours || 0) * rate
      }
    })

    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const reportData = {
      summary: {
        totalHours,
        billableHours,
        nonBillableHours,
        totalRevenue,
        averageHourlyRate
      },
      clientBreakdown: clientBreakdown.sort((a, b) => b.totalHours - a.totalHours),
      projectBreakdown: projectBreakdown.sort((a, b) => b.totalHours - a.totalHours),
      dailyBreakdown,
      metadata: {
        dateFrom,
        dateTo,
        totalEntries: timeEntries?.length || 0,
        period: validatedQuery.period
      }
    }

    const response = createApiResponse(reportData, 'Hours report generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Hours report generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}