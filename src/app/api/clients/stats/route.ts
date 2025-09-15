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

    // Get client statistics
    const { data: clientsData, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, active, hourly_rate')
      .eq('tenant_id', profile.tenant_id)

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      throw clientsError
    }

    // Get project statistics
    const { data: projectsData, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, active, hourly_rate')
      .eq('tenant_id', profile.tenant_id)

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      throw projectsError
    }

    // Calculate statistics
    const totalClients = clientsData?.length || 0
    const activeClients = clientsData?.filter(c => c.active).length || 0
    const clientsWithRates = clientsData?.filter(c => c.active && c.hourly_rate && c.hourly_rate > 0).length || 0

    const totalProjects = projectsData?.length || 0
    const activeProjects = projectsData?.filter(p => p.active).length || 0
    const projectsWithRates = projectsData?.filter(p => p.active && p.hourly_rate && p.hourly_rate > 0).length || 0

    // Calculate average hourly rate from both clients and projects
    const allRates = [
      ...(clientsData?.filter(c => c.active && c.hourly_rate && c.hourly_rate > 0).map(c => c.hourly_rate) || []),
      ...(projectsData?.filter(p => p.active && p.hourly_rate && p.hourly_rate > 0).map(p => p.hourly_rate) || [])
    ]
    const averageHourlyRate = allRates.length > 0 ?
      Math.round(allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length * 100) / 100 : null

    // Format the response for frontend consumption
    const stats = {
      activeClients,
      activeProjects,
      averageHourlyRate,
      totalClients,
      totalProjects,
      clientsWithRates,
      projectsWithRates,

      // Additional calculated metrics
      clientsWithoutRates: activeClients - clientsWithRates,
      projectsWithoutRates: activeProjects - projectsWithRates
    }

    const response = createApiResponse(stats, 'Client statistics retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Client statistics error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}