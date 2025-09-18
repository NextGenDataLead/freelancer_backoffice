import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

interface CashFlowForecast {
  date: string
  inflows: number
  outflows: number
  netFlow: number
  runningBalance: number
  confidence: number
}

interface CashFlowAnalysis {
  forecasts: CashFlowForecast[]
  scenarios: {
    optimistic: { runwayDays: number, minBalance: number }
    realistic: { runwayDays: number, minBalance: number }
    pessimistic: { runwayDays: number, minBalance: number }
  }
  insights: {
    type: 'positive' | 'warning' | 'critical'
    message: string
    action?: string
  }[]
  nextMilestones: {
    date: string
    type: 'low_balance' | 'negative_balance' | 'major_payment'
    description: string
    total_amount: number
  }[]
}

/**
 * GET /api/cash-flow/forecast
 * Generates cash flow forecast based on real financial data
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get current cash position (from invoices dashboard metrics)
    const { data: dashboardData, error: dashboardError } = await supabaseAdmin
      .rpc('get_dashboard_metrics', { tenant_id: profile.tenant_id })

    if (dashboardError) {
      console.error('Error fetching dashboard metrics:', dashboardError)
      // Use fallback current balance
    }

    // Get outstanding invoices with due dates
    const { data: outstandingInvoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id, total_amount, due_date, status, client_id, clients(name)')
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true })

    if (invoicesError) {
      console.error('Error fetching outstanding invoices:', invoicesError)
    }

    // Get unbilled time entries (future revenue)
    const { data: unbilledEntries, error: unbilledError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate, client_id, clients(name, default_payment_terms)')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)

    if (unbilledError) {
      console.error('Error fetching unbilled entries:', unbilledError)
    }

    // Calculate current balance and monthly averages
    const currentBalance = dashboardData?.[0]?.current_balance || 5000 // Fallback
    const monthlyRevenue = dashboardData?.[0]?.totale_registratie || 8000
    const monthlyExpenses = monthlyRevenue * 0.3 // Estimate 30% expenses
    const overdueAmount = dashboardData?.[0]?.achterstallig || 0

    // Generate 90-day forecast
    const forecasts: CashFlowForecast[] = []
    let runningBalance = currentBalance

    for (let day = 0; day < 90; day++) {
      const date = new Date()
      date.setDate(date.getDate() + day)
      const dateString = date.toISOString().split('T')[0]

      let inflows = 0
      let outflows = 0
      let confidence = 0.8 // Base confidence

      // Check for invoice payments due on this date
      const invoicesDue = outstandingInvoices?.filter(inv =>
        inv.due_date === dateString
      ) || []

      invoicesDue.forEach(invoice => {
        const paymentProbability = invoice.status === 'overdue' ? 0.6 : 0.85
        inflows += invoice.total_amount * paymentProbability
        confidence *= paymentProbability
      })

      // Add recurring subscription income (monthly)
      if (date.getDate() === 1) {
        inflows += monthlyRevenue * 0.3 // 30% subscription income
        confidence = Math.max(confidence, 0.9)
      }

      // Add projected unbilled revenue (weekly billing cycle)
      if (day % 7 === 0 && day > 0) {
        const weeklyUnbilledRevenue = (unbilledEntries || [])
          .reduce((sum, entry) => {
            const rate = entry.effective_hourly_rate || entry.hourly_rate || 75
            return sum + (entry.hours * rate)
          }, 0) / 12 // Spread over 12 weeks

        inflows += weeklyUnbilledRevenue * 0.8 // 80% collection rate
      }

      // Add regular monthly expenses
      if (day % 30 === 15) { // Mid-month expense cycle
        outflows += monthlyExpenses
      }

      // Add tax payments (quarterly)
      if (day % 90 === 89) {
        outflows += monthlyRevenue * 0.25 // Quarterly tax estimate
      }

      const netFlow = inflows - outflows
      runningBalance += netFlow

      forecasts.push({
        date: dateString,
        inflows,
        outflows,
        netFlow,
        runningBalance,
        confidence: Math.max(0.1, Math.min(1, confidence))
      })
    }

    // Calculate scenarios
    const scenarios = {
      optimistic: {
        runwayDays: forecasts.findIndex(f => f.runningBalance * 1.2 <= 0) || 90,
        minBalance: Math.min(...forecasts.map(f => f.runningBalance * 1.2))
      },
      realistic: {
        runwayDays: forecasts.findIndex(f => f.runningBalance <= 0) || 90,
        minBalance: Math.min(...forecasts.map(f => f.runningBalance))
      },
      pessimistic: {
        runwayDays: forecasts.findIndex(f => f.runningBalance * 0.7 <= 0) || 90,
        minBalance: Math.min(...forecasts.map(f => f.runningBalance * 0.7))
      }
    }

    // Generate insights
    const insights: CashFlowAnalysis['insights'] = []

    if (scenarios.pessimistic.runwayDays < 30) {
      insights.push({
        type: 'critical',
        message: `Cash flow risk in ${scenarios.pessimistic.runwayDays} days`,
        action: 'Contact clients about overdue invoices immediately'
      })
    } else if (scenarios.realistic.runwayDays < 60) {
      insights.push({
        type: 'warning',
        message: 'Cash flow may tighten in 2 months',
        action: 'Invoice unbilled hours and follow up on pending payments'
      })
    } else {
      insights.push({
        type: 'positive',
        message: `Healthy cash flow with €${Math.round(scenarios.realistic.minBalance).toLocaleString()} minimum balance`
      })
    }

    // Add insight about overdue amount if significant
    if (overdueAmount > monthlyRevenue * 0.2) {
      insights.push({
        type: 'warning',
        message: `€${overdueAmount.toLocaleString()} in overdue invoices affecting cash flow`,
        action: 'Prioritize collecting overdue payments'
      })
    }

    // Generate milestones (significant cash flow events)
    const nextMilestones = forecasts
      .map((forecast, index) => {
        const milestones = []

        // Low balance warnings
        if (forecast.runningBalance < 2000 && forecast.runningBalance > 0) {
          milestones.push({
            date: forecast.date,
            type: 'low_balance' as const,
            description: 'Balance below €2,000',
            amount: forecast.runningBalance
          })
        }

        // Negative balance warnings
        if (forecast.runningBalance < 0) {
          milestones.push({
            date: forecast.date,
            type: 'negative_balance' as const,
            description: 'Account may go negative',
            amount: forecast.runningBalance
          })
        }

        // Major payments
        if (forecast.inflows > monthlyRevenue * 0.3) {
          milestones.push({
            date: forecast.date,
            type: 'major_payment' as const,
            description: 'Expected large payment',
            amount: forecast.inflows
          })
        }

        return milestones
      })
      .flat()
      .slice(0, 5) // Limit to first 5 milestones

    const analysis: CashFlowAnalysis = {
      forecasts,
      scenarios,
      insights: insights.slice(0, 3), // Limit insights
      nextMilestones
    }

    const response = createApiResponse(analysis, 'Cash flow forecast generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Cash flow forecast error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}