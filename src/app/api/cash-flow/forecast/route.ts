import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import {
  calculateOccurrences,
  type RecurringExpenseTemplate
} from '@/lib/financial/recurring-expense-calculator'
import { getCurrentDate } from '@/lib/current-date'

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
  expenseBreakdown: {
    recurring: number
    oneTime: number
    daily_average: number
    total_projected: number
  }
  taxBreakdown: {
    vat_owed: number
    vat_deductible: number
    net_vat: number
    next_payment_date: string | null
    filing_frequency: string
  }
  dataQuality: {
    has_recurring_templates: boolean
    has_expense_history: boolean
    expense_history_days: number
  }
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

    const currentDate = getCurrentDate()
    // Get date in YYYY-MM-DD format without timezone issues
    const todayIso = currentDate.toISOString().split('T')[0]

    // Create a proper UTC midnight date for calculations
    const today = new Date(todayIso + 'T00:00:00.000Z')

    // Get forecast settings from profile (defaults: 90 days)
    const forecastDays = (profile as any).cash_flow_forecast_days || 90
    const vatFilingFrequency = (profile as any).vat_filing_frequency || 'quarterly'
    const vatPaymentDay = (profile as any).vat_payment_day || 25

    // Get current cash position (from invoices dashboard metrics)
    const { data: dashboardData, error: dashboardError } = await supabaseAdmin
      .rpc('get_dashboard_metrics', { tenant_id: profile.tenant_id })

    if (dashboardError) {
      console.error('Error fetching dashboard metrics:', dashboardError)
    }

    // Get outstanding invoices with due dates
    const { data: outstandingInvoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id, total_amount, due_date, status, vat_amount')
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true })

    if (invoicesError) {
      console.error('Error fetching outstanding invoices:', invoicesError)
    }

    // Get unbilled time entries (future revenue)
    const { data: unbilledEntries, error: unbilledError } = await supabaseAdmin
      .from('time_entries')
      .select('hours, hourly_rate, effective_hourly_rate')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false)

    if (unbilledError) {
      console.error('Error fetching unbilled entries:', unbilledError)
    }

    // ========================================
    // NEW: Get actual historical expenses (last 90 days)
    // ========================================
    const ninetyDaysAgo = new Date(today.getTime())
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

    const { data: historicalExpenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('amount, expense_date, category, vat_amount, section_5b_voorbelasting')
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', ninetyDaysAgoStr)
      .in('status', ['approved', 'processed', 'reimbursed'])

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
    }

    // ========================================
    // NEW: Get recurring expense templates
    // ========================================
    const { data: recurringTemplates, error: recurringError } = await supabaseAdmin
      .from('recurring_expense_templates')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${todayIso}`)

    if (recurringError) {
      console.error('Error fetching recurring templates:', recurringError)
    }

    // Calculate daily average expense from real data
    const totalHistoricalExpenses = historicalExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    let dailyAverageExpense = 0

    // Only use historical data if we have a meaningful sample (at least 30 days of expenses)
    if (historicalExpenses && historicalExpenses.length >= 10) {
      dailyAverageExpense = totalHistoricalExpenses / 90
    }

    // If no historical data and no recurring templates, use a conservative baseline
    // NOTE: We DON'T estimate from recurring templates here because they're already
    // being tracked as specific occurrences on their due dates (avoid double-counting)
    if (dailyAverageExpense === 0 && (!recurringTemplates || recurringTemplates.length === 0)) {
      dailyAverageExpense = 50 // €50/day minimum baseline for business expenses
    }

    // If we have recurring templates but no daily average, set to 0
    // The recurring expenses will be added on their specific due dates only
    if (dailyAverageExpense === 0 && recurringTemplates && recurringTemplates.length > 0) {
      dailyAverageExpense = 0 // Don't double-count recurring expenses
    }

    // Calculate deductible VAT from expenses (for tax calculations)
    const totalDeductibleVAT = historicalExpenses?.reduce(
      (sum, e) => sum + (e.section_5b_voorbelasting || 0),
      0
    ) || 0

    // Calculate all recurring occurrences for forecast period
    const recurringOccurrences = new Map<string, number>() // date -> total amount
    let totalRecurringExpenses = 0

    if (recurringTemplates && recurringTemplates.length > 0) {
      // Calculate the end date for the forecast period
      const forecastEndDate = new Date(today.getTime())
      forecastEndDate.setDate(forecastEndDate.getDate() + forecastDays)

      for (const template of recurringTemplates) {
        // Use calculateOccurrences with today as the start date
        // This will generate occurrences starting from today
        const occurrences = calculateOccurrences(
          template as RecurringExpenseTemplate,
          forecastDays,
          today // Start from today
        )

        for (const occ of occurrences) {
          const currentAmount = recurringOccurrences.get(occ.date) || 0
          recurringOccurrences.set(occ.date, currentAmount + occ.gross_amount)
          totalRecurringExpenses += occ.gross_amount
        }
      }
    }

    // ========================================
    // NEW: Calculate actual VAT owed
    // ========================================
    // VAT owed from sent/paid invoices (last quarter)
    const threeMonthsAgo = new Date(today.getTime())
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: recentInvoices, error: vatInvoicesError } = await supabaseAdmin
      .from('invoices')
      .select('vat_amount, invoice_date')
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['sent', 'paid', 'overdue'])
      .gte('invoice_date', threeMonthsAgo.toISOString().split('T')[0])

    const totalVATOwed = recentInvoices?.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0) || 0
    const netVATOwed = Math.max(0, totalVATOwed - totalDeductibleVAT)

    // Calculate next VAT payment date
    const nextVATPaymentDate = calculateNextVATPaymentDate(
      vatFilingFrequency,
      vatPaymentDay,
      today
    )

    // Get current balance and revenue
    const currentBalance = dashboardData?.[0]?.current_balance || 5000
    const monthlyRevenue = dashboardData?.[0]?.totale_registratie || 8000
    const overdueAmount = dashboardData?.[0]?.achterstallig || 0

    // ========================================
    // Generate day-by-day forecast
    // ========================================
    const forecasts: CashFlowForecast[] = []
    let runningBalance = currentBalance

    for (let day = 0; day < forecastDays; day++) {
      const date = new Date(today.getTime())
      date.setDate(date.getDate() + day)
      const dateString = date.toISOString().split('T')[0]

      let inflows = 0
      let outflows = 0
      let confidence = 0.8 // Base confidence

      // Check for invoice payments due on this date
      const invoicesDue = outstandingInvoices?.filter(inv => inv.due_date === dateString) || []

      invoicesDue.forEach(invoice => {
        const paymentProbability = invoice.status === 'overdue' ? 0.6 : 0.85
        inflows += invoice.total_amount * paymentProbability
        confidence = Math.min(confidence, paymentProbability)
      })

      // Add projected unbilled revenue (weekly billing cycle)
      if (day % 7 === 0 && day > 0 && unbilledEntries && unbilledEntries.length > 0) {
        const weeklyUnbilledRevenue = unbilledEntries
          .reduce((sum, entry) => {
            const rate = entry.effective_hourly_rate || entry.hourly_rate || 75
            return sum + (entry.hours * rate)
          }, 0) / 12 // Spread over 12 weeks

        inflows += weeklyUnbilledRevenue * 0.8 // 80% collection rate
        confidence = Math.min(confidence, 0.75)
      }

      // ========================================
      // NEW: Add actual daily expenses (from historical average or estimate)
      // ========================================
      if (dailyAverageExpense > 0) {
        outflows += dailyAverageExpense

        // Adjust confidence based on data source
        if (historicalExpenses && historicalExpenses.length > 0) {
          confidence = Math.max(confidence, 0.85) // Higher confidence with real historical data
        } else if (recurringTemplates && recurringTemplates.length > 0) {
          confidence = Math.max(confidence, 0.70) // Medium confidence with recurring expense estimates
        } else {
          confidence = Math.max(confidence, 0.50) // Lower confidence with baseline estimate
        }
      }

      // ========================================
      // NEW: Add recurring expenses from templates
      // ========================================
      const recurringExpenseToday = recurringOccurrences.get(dateString) || 0
      if (recurringExpenseToday > 0) {
        outflows += recurringExpenseToday
        confidence = Math.max(confidence, 0.95) // Very high confidence for scheduled expenses
      }

      // ========================================
      // NEW: Add VAT payments based on user's schedule
      // ========================================
      if (dateString === nextVATPaymentDate && netVATOwed > 0) {
        outflows += netVATOwed
        confidence = 1.0 // Tax is certain
      }

      // Calculate all future VAT payment dates in forecast
      const allVATPaymentDates = calculateAllVATPaymentDates(
        vatFilingFrequency,
        vatPaymentDay,
        forecastDays,
        today
      )

      if (allVATPaymentDates.includes(dateString) && day > 30) {
        // Estimate future VAT payments based on current quarter
        const estimatedFutureVAT = netVATOwed * 0.9 // Slightly conservative
        outflows += estimatedFutureVAT
        confidence = Math.min(confidence, 0.7) // Lower confidence for future estimates
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
        runwayDays: forecasts.findIndex(f => f.runningBalance * 1.2 <= 0) || forecastDays,
        minBalance: Math.min(...forecasts.map(f => f.runningBalance * 1.2))
      },
      realistic: {
        runwayDays: forecasts.findIndex(f => f.runningBalance <= 0) || forecastDays,
        minBalance: Math.min(...forecasts.map(f => f.runningBalance))
      },
      pessimistic: {
        runwayDays: forecasts.findIndex(f => f.runningBalance * 0.7 <= 0) || forecastDays,
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

    if (overdueAmount > monthlyRevenue * 0.2) {
      insights.push({
        type: 'warning',
        message: `€${Math.round(overdueAmount).toLocaleString()} in overdue invoices affecting cash flow`,
        action: 'Prioritize collecting overdue payments'
      })
    }

    // NEW: Add insights about recurring expenses
    if (recurringTemplates && recurringTemplates.length > 0) {
      insights.push({
        type: 'positive',
        message: `${recurringTemplates.length} recurring expense${recurringTemplates.length > 1 ? 's' : ''} tracked (€${Math.round(totalRecurringExpenses / forecastDays * 30).toLocaleString()}/month avg)`
      })
    }

    // Warn about using estimated data
    if (!historicalExpenses || historicalExpenses.length === 0) {
      if (recurringTemplates && recurringTemplates.length > 0) {
        insights.push({
          type: 'warning',
          message: 'Forecast based on recurring expenses only',
          action: 'Add historical expenses for more accurate forecasting'
        })
      } else {
        insights.push({
          type: 'warning',
          message: 'Forecast using baseline estimates',
          action: 'Add expenses and recurring templates for accurate forecasting'
        })
      }
    }

    // Generate milestones
    const nextMilestones = forecasts
      .map((forecast) => {
        const milestones = []

        if (forecast.runningBalance < 2000 && forecast.runningBalance > 0) {
          milestones.push({
            date: forecast.date,
            type: 'low_balance' as const,
            description: 'Balance below €2,000',
            total_amount: forecast.runningBalance
          })
        }

        if (forecast.runningBalance < 0) {
          milestones.push({
            date: forecast.date,
            type: 'negative_balance' as const,
            description: 'Account may go negative',
            total_amount: forecast.runningBalance
          })
        }

        if (forecast.inflows > monthlyRevenue * 0.3) {
          milestones.push({
            date: forecast.date,
            type: 'major_payment' as const,
            description: 'Expected large payment',
            total_amount: forecast.inflows
          })
        }

        return milestones
      })
      .flat()
      .slice(0, 5)

    // Build comprehensive analysis response
    const analysis: CashFlowAnalysis = {
      forecasts,
      scenarios,
      insights: insights.slice(0, 3),
      nextMilestones,
      expenseBreakdown: {
        recurring: totalRecurringExpenses,
        oneTime: Math.max(0, totalHistoricalExpenses - totalRecurringExpenses),
        daily_average: dailyAverageExpense,
        total_projected: (dailyAverageExpense * forecastDays) + totalRecurringExpenses
      },
      taxBreakdown: {
        vat_owed: totalVATOwed,
        vat_deductible: totalDeductibleVAT,
        net_vat: netVATOwed,
        next_payment_date: nextVATPaymentDate,
        filing_frequency: vatFilingFrequency
      },
      dataQuality: {
        has_recurring_templates: (recurringTemplates?.length || 0) > 0,
        has_expense_history: (historicalExpenses?.length || 0) > 0,
        expense_history_days: historicalExpenses?.length || 0
      }
    }

    const response = createApiResponse(analysis, 'Cash flow forecast generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Cash flow forecast error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Calculate next VAT payment date based on filing frequency
 */
function calculateNextVATPaymentDate(
  frequency: string,
  paymentDay: number,
  baseDate: Date
): string {
  const today = new Date(baseDate.getTime())
  const currentMonth = today.getMonth() + 1

  if (frequency === 'monthly') {
    // Payment due on paymentDay of following month
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay)
    return nextMonth.toISOString().split('T')[0]
  } else {
    // Quarterly: find next quarter end (March=3, June=6, Sept=9, Dec=12)
    let quarterEndMonth: number
    if (currentMonth <= 3) quarterEndMonth = 3
    else if (currentMonth <= 6) quarterEndMonth = 6
    else if (currentMonth <= 9) quarterEndMonth = 9
    else quarterEndMonth = 12

    // If we're past quarter end, move to next quarter
    if (currentMonth > quarterEndMonth) {
      quarterEndMonth += 3
      if (quarterEndMonth > 12) quarterEndMonth = 3
    }

    // Payment due paymentDay of month following quarter end
    const year = quarterEndMonth < currentMonth ? today.getFullYear() + 1 : today.getFullYear()
    const nextQuarterPayment = new Date(year, quarterEndMonth, paymentDay)

    return nextQuarterPayment.toISOString().split('T')[0]
  }
}

/**
 * Calculate all VAT payment dates within forecast period
 */
function calculateAllVATPaymentDates(
  frequency: string,
  paymentDay: number,
  daysAhead: number,
  baseDate: Date
): string[] {
  const dates: string[] = []
  const today = new Date(baseDate.getTime())
  const endDate = new Date(baseDate.getTime())
  endDate.setDate(endDate.getDate() + daysAhead)

  let currentDate = new Date(
    calculateNextVATPaymentDate(frequency, paymentDay, today)
  )

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0])

    if (frequency === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + 1)
    } else {
      currentDate.setMonth(currentDate.getMonth() + 3)
    }
  }

  return dates
}
