import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * GET /api/invoices/stats
 * Retrieves invoice statistics for the dashboard
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear

    // Current month start and end
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const currentMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
    
    // Previous month start and end
    const previousMonthStart = new Date(previousYear, previousMonth - 1, 1).toISOString().split('T')[0]
    const previousMonthEnd = new Date(previousYear, previousMonth, 0).toISOString().split('T')[0]

    // Get current month stats
    const { data: currentMonthData, error: currentError } = await supabaseAdmin
      .from('invoices')
      .select('total_amount, vat_amount, status')
      .eq('tenant_id', profile.tenant_id)
      .gte('invoice_date', currentMonthStart)
      .lte('invoice_date', currentMonthEnd)

    if (currentError) {
      console.error('Error fetching current month stats:', currentError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get previous month stats for comparison
    const { data: previousMonthData, error: previousError } = await supabaseAdmin
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', profile.tenant_id)
      .gte('invoice_date', previousMonthStart)
      .lte('invoice_date', previousMonthEnd)

    if (previousError) {
      console.error('Error fetching previous month stats:', previousError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get outstanding invoices (sent but not paid)
    const { data: outstandingData, error: outstandingError } = await supabaseAdmin
      .from('invoices')
      .select('total_amount, due_date')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'sent')

    if (outstandingError) {
      console.error('Error fetching outstanding invoices:', outstandingError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get overdue invoices
    const { data: overdueData, error: overdueError } = await supabaseAdmin
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'sent')
      .lt('due_date', now.toISOString().split('T')[0])

    if (overdueError) {
      console.error('Error fetching overdue invoices:', overdueError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get draft invoices count
    const { count: draftCount, error: draftError } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'draft')

    if (draftError) {
      console.error('Error fetching draft count:', draftError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate statistics
    const currentMonthRevenue = (currentMonthData || [])
      .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount.toString()), 0)

    const currentMonthVAT = (currentMonthData || [])
      .reduce((sum, invoice) => sum + parseFloat(invoice.vat_amount.toString()), 0)

    const previousMonthRevenue = (previousMonthData || [])
      .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount.toString()), 0)

    const outstandingAmount = (outstandingData || [])
      .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount.toString()), 0)

    const outstandingCount = outstandingData?.length || 0

    const overdueAmount = (overdueData || [])
      .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount.toString()), 0)

    const overdueCount = overdueData?.length || 0

    // Calculate growth percentage
    const growthPercentage = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : currentMonthRevenue > 0 ? 100 : 0

    const stats = {
      currentMonth: {
        revenue: currentMonthRevenue,
        vat: currentMonthVAT,
        growthPercentage: Math.round(growthPercentage * 10) / 10 // Round to 1 decimal
      },
      outstanding: {
        amount: outstandingAmount,
        count: outstandingCount
      },
      overdue: {
        amount: overdueAmount,
        count: overdueCount
      },
      drafts: {
        count: draftCount || 0
      }
    }

    const response = createApiResponse(stats, 'Invoice statistics retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Invoice stats error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}