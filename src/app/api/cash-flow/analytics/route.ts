import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

interface MonthlyCashFlowData {
  date: string
  incoming: number
  outgoing: number
  net: number
}

/**
 * GET /api/cash-flow/analytics
 * Gets Year-to-Date (YTD) cash flow analytics for the charts
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get YTD data based on available data (data-driven approach)
    const monthlyData: MonthlyCashFlowData[] = []

    // First find the date range of available time entries to determine the "current" year
    const { data: dateRange, error: dateRangeError } = await supabaseAdmin
      .from('time_entries')
      .select('entry_date')
      .eq('tenant_id', profile.tenant_id)
      .order('entry_date', { ascending: false })
      .limit(1)

    if (dateRangeError) {
      console.error('Error fetching time entry date range:', dateRangeError)
    }

    // Use latest entry date to determine the "current" year, or fall back to today
    const referenceDate = dateRange && dateRange.length > 0
      ? new Date(dateRange[0].entry_date)
      : new Date()

    const currentYear = referenceDate.getFullYear()

    for (let i = 0; i <= referenceDate.getMonth(); i++) {
      const year = currentYear
      const month = i

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

      // Get incoming cash flow (paid invoices)
      const { data: paidInvoices, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('total_amount, paid_at')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'paid')
        .gte('paid_at', monthStart.toISOString().split('T')[0])
        .lte('paid_at', monthEnd.toISOString().split('T')[0])

      if (invoiceError) {
        console.error(`Error fetching invoices for ${year}-${month + 1}:`, invoiceError)
      }

      // Get outgoing cash flow (expenses)
      const { data: expenses, error: expenseError } = await supabaseAdmin
        .from('expenses')
        .select('amount, expense_date')
        .eq('tenant_id', profile.tenant_id)
        .gte('expense_date', monthStart.toISOString().split('T')[0])
        .lte('expense_date', monthEnd.toISOString().split('T')[0])

      if (expenseError) {
        console.error(`Error fetching expenses for ${year}-${month + 1}:`, expenseError)
      }

      // Calculate totals
      const incoming = paidInvoices?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0
      const outgoing = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
      const net = incoming - outgoing

      // Format date for display
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}`

      monthlyData.push({
        date: dateString,
        incoming: Math.round(incoming * 100) / 100,
        outgoing: Math.round(outgoing * 100) / 100,
        net: Math.round(net * 100) / 100
      })
    }

    // Calculate summary metrics
    const totalIncoming = monthlyData.reduce((sum, month) => sum + month.incoming, 0)
    const totalOutgoing = monthlyData.reduce((sum, month) => sum + month.outgoing, 0)
    const totalNet = totalIncoming - totalOutgoing
    const averageMonthlyNet = monthlyData.length > 0 ? totalNet / monthlyData.length : 0

    // Get current month trends
    const lastMonth = monthlyData[monthlyData.length - 2]
    const currentMonth = monthlyData[monthlyData.length - 1]
    const netTrend = lastMonth && currentMonth ?
      ((currentMonth.net - lastMonth.net) / Math.abs(lastMonth.net || 1)) * 100 : 0

    const summary = {
      totalIncoming: Math.round(totalIncoming * 100) / 100,
      totalOutgoing: Math.round(totalOutgoing * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      averageMonthlyNet: Math.round(averageMonthlyNet * 100) / 100,
      netTrend: Math.round(netTrend * 100) / 100,
      trendDirection: netTrend >= 0 ? 'positive' : 'negative'
    }

    const response = createApiResponse({
      monthlyData,
      summary
    }, 'Cash flow analytics retrieved successfully')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Cash flow analytics error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}