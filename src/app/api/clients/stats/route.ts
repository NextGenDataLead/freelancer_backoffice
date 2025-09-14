import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * GET /api/clients/stats
 * Gets client and project statistics for the current tenant
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Query the stats view we created
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('client_project_stats')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (statsError) {
      console.error('Error fetching client stats:', statsError)
      // If no data exists, return zeros
      const defaultStats = {
        active_clients: 0,
        active_projects: 0,
        average_hourly_rate: null,
        total_clients: 0,
        total_projects: 0,
        clients_with_rates: 0,
        projects_with_rates: 0
      }
      
      const response = createApiResponse(defaultStats, 'Client statistics retrieved successfully (no data)')
      return NextResponse.json(response)
    }

    // Format the response for frontend consumption
    const stats = {
      activeClients: statsData.active_clients || 0,
      activeProjects: statsData.active_projects || 0,
      averageHourlyRate: statsData.average_hourly_rate ? 
        Math.round(parseFloat(statsData.average_hourly_rate.toString()) * 100) / 100 : null,
      totalClients: statsData.total_clients || 0,
      totalProjects: statsData.total_projects || 0,
      clientsWithRates: statsData.clients_with_rates || 0,
      projectsWithRates: statsData.projects_with_rates || 0,
      
      // Additional calculated metrics
      clientsWithoutRates: (statsData.active_clients || 0) - (statsData.clients_with_rates || 0),
      projectsWithoutRates: (statsData.active_projects || 0) - (statsData.projects_with_rates || 0)
    }

    const response = createApiResponse(stats, 'Client statistics retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Client statistics error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}