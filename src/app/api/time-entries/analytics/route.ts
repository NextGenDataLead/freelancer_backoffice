import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

interface WeeklyTimeData {
  week: string
  billable: number
  nonBillable: number
  target: number
  efficiency: number
}

/**
 * GET /api/time-entries/analytics
 * Gets weekly time tracking analytics for the charts
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get rolling 8 weeks based on available data (data-driven approach)
    const weeklyData: WeeklyTimeData[] = []

    // First find the latest time entry to determine the "current" period
    const { data: latestEntry, error: latestError } = await supabaseAdmin
      .from('time_entries')
      .select('entry_date')
      .eq('tenant_id', profile.tenant_id)
      .order('entry_date', { ascending: false })
      .limit(1)

    if (latestError) {
      console.error('Error fetching latest time entry:', latestError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Use latest entry date as "current" date, or fall back to today
    const referenceDate = latestEntry && latestEntry.length > 0
      ? new Date(latestEntry[0].entry_date)
      : new Date()

    // Find Monday of the week containing the reference date
    const currentWeekMonday = new Date(referenceDate)
    const dayOfWeek = currentWeekMonday.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    currentWeekMonday.setDate(referenceDate.getDate() + daysToMonday)
    currentWeekMonday.setHours(0, 0, 0, 0)

    // Generate 8 weeks ending with the week containing the latest data
    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(currentWeekMonday)
      weekStart.setDate(currentWeekMonday.getDate() - (i * 7))

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      // Calculate calendar week number (ISO week)
      const jan1 = new Date(weekStart.getFullYear(), 0, 1)
      const weekNumber = Math.ceil(((weekStart.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)

      weeks.push({
        start: weekStart,
        end: weekEnd,
        weekNumber: weekNumber,
        year: weekStart.getFullYear()
      })
    }

    // Fetch time entries for each week
    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i]

      const { data: timeEntries, error } = await supabaseAdmin
        .from('time_entries')
        .select('hours, billable')
        .eq('tenant_id', profile.tenant_id)
        .gte('entry_date', week.start.toISOString().split('T')[0])
        .lte('entry_date', week.end.toISOString().split('T')[0])

      if (error) {
        console.error(`Error fetching time entries for week ${week.weekNumber}:`, error)
        continue
      }

      // Calculate billable and non-billable hours
      const billableHours = timeEntries
        ?.filter(entry => entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0) || 0

      const nonBillableHours = timeEntries
        ?.filter(entry => !entry.billable)
        .reduce((sum, entry) => sum + parseFloat(entry.hours), 0) || 0

      const totalHours = billableHours + nonBillableHours
      const efficiency = totalHours > 0 ? (billableHours / totalHours) * 100 : 0
      const target = 35 // Weekly target hours

      // Use calendar week number
      const weekLabel = week.year === new Date().getFullYear() ?
        `W${week.weekNumber}` :
        `W${week.weekNumber}'${week.year.toString().slice(-2)}`

      weeklyData.push({
        week: weekLabel,
        billable: Math.round(billableHours * 10) / 10,
        nonBillable: Math.round(nonBillableHours * 10) / 10,
        target,
        efficiency: Math.round(efficiency * 10) / 10
      })
    }

    // Calculate summary metrics
    const averageBillable = weeklyData.length > 0
      ? weeklyData.reduce((sum, week) => sum + week.billable, 0) / weeklyData.length
      : 0

    const averageEfficiency = weeklyData.length > 0
      ? weeklyData.reduce((sum, week) => sum + week.efficiency, 0) / weeklyData.length
      : 0

    const currentWeek = weeklyData[weeklyData.length - 1]
    const target = 35

    const summary = {
      averageBillable: Math.round(averageBillable * 10) / 10,
      averageEfficiency: Math.round(averageEfficiency * 10) / 10,
      currentWeekTotal: currentWeek ? currentWeek.billable + currentWeek.nonBillable : 0,
      target,
      onTarget: currentWeek ? (currentWeek.billable + currentWeek.nonBillable) >= target : false
    }

    const response = createApiResponse({
      weeklyData,
      summary
    }, 'Time analytics retrieved successfully')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Time analytics error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}