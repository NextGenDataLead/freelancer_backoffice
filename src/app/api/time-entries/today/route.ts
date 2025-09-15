import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * GET /api/time-entries/today
 * Gets today's time tracking stats and recent entries for Active Timer Widget
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get today's date range
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Query today's time entries
    const { data: todayEntries, error: todayError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        id,
        hours,
        billable,
        hourly_rate,
        effective_hourly_rate,
        description,
        project_name,
        entry_date,
        created_at,
        client:clients(
          id,
          name,
          company_name
        ),
        project:projects(
          id,
          name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('entry_date', today.toISOString().split('T')[0])
      .order('created_at', { ascending: false })

    if (todayError) {
      console.error('Error fetching today\'s entries:', todayError)
      throw todayError
    }

    // Query recent entries (last 10, excluding today's entries)
    const { data: recentEntries, error: recentError } = await supabaseAdmin
      .from('time_entries')
      .select(`
        id,
        hours,
        description,
        project_name,
        entry_date,
        created_at,
        client:clients(
          id,
          name,
          company_name
        ),
        project:projects(
          id,
          name
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .lt('entry_date', today.toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Error fetching recent entries:', recentError)
      throw recentError
    }

    // Calculate today's statistics
    const totalHours = todayEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0
    const billableHours = todayEntries?.filter(entry => entry.billable)
      .reduce((sum, entry) => sum + entry.hours, 0) || 0

    const todayRevenue = todayEntries?.reduce((sum, entry) => {
      const effectiveRate = entry.effective_hourly_rate || entry.hourly_rate || 0
      return sum + (entry.hours * effectiveRate)
    }, 0) || 0

    // Format recent entries for display
    const formattedRecentEntries = recentEntries?.map(entry => ({
      id: entry.id,
      client: entry.client?.name || entry.client?.company_name || 'No Client',
      project: entry.project?.name || entry.project_name || 'No Project',
      hours: entry.hours,
      description: entry.description,
      date: entry.entry_date,
      createdAt: entry.created_at
    })) || []

    const todayStats = {
      today: {
        totalHours: Math.round(totalHours * 10) / 10,
        billableHours: Math.round(billableHours * 10) / 10,
        revenue: Math.round(todayRevenue * 100) / 100,
        entriesCount: todayEntries?.length || 0
      },
      recentEntries: formattedRecentEntries
    }

    const response = createApiResponse(todayStats, 'Today\'s time tracking data retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Today\'s time stats error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}