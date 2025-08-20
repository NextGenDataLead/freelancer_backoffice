import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ProfitLossReport, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'

// Schema for P&L report parameters
const ProfitLossQuerySchema = z.object({
  date_from: z.string().datetime('Invalid date format'),
  date_to: z.string().datetime('Invalid date format'),
  include_draft: z.coerce.boolean().optional().default(false)
})

/**
 * GET /api/reports/profit-loss
 * Generates real-time Profit & Loss statement for specified date range
 * Includes revenue, expenses, VAT calculations, and net profit
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
    
    const validatedQuery = ProfitLossQuerySchema.parse(queryParams)
    const { date_from, date_to, include_draft } = validatedQuery

    // Build invoice status filter
    const invoiceStatuses = include_draft 
      ? ['draft', 'sent', 'paid', 'overdue']
      : ['sent', 'paid', 'overdue']

    // Get all invoices for the period
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          name,
          country_code,
          is_business
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('invoice_date', new Date(date_from).toISOString().split('T')[0])
      .lte('invoice_date', new Date(date_to).toISOString().split('T')[0])
      .in('status', invoiceStatuses)

    if (invoicesError) {
      console.error('Error fetching invoices for P&L:', invoicesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get all expenses for the period
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_deductible', true)
      .gte('expense_date', new Date(date_from).toISOString().split('T')[0])
      .lte('expense_date', new Date(date_to).toISOString().split('T')[0])

    if (expensesError) {
      console.error('Error fetching expenses for P&L:', expensesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get time entries for the period (for internal revenue calculation)
    const { data: timeEntries, error: timeError } = await supabaseAdmin
      .from('time_entries')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false) // Not yet invoiced time
      .gte('entry_date', new Date(date_from).toISOString().split('T')[0])
      .lte('entry_date', new Date(date_to).toISOString().split('T')[0])

    if (timeError) {
      console.error('Error fetching time entries for P&L:', timeError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate P&L report
    const profitLoss = calculateProfitLoss(
      invoices || [],
      expenses || [],
      timeEntries || [],
      date_from,
      date_to
    )

    // Save calculated report for audit purposes
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'profit_loss',
        period_start: new Date(date_from).toISOString().split('T')[0],
        period_end: new Date(date_to).toISOString().split('T')[0],
        data: profitLoss,
        generated_by: profile.id
      })
      .select()
      .single()

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'financial_report',
      savedReport?.id || 'unknown',
      'profit_loss_generated',
      profile.id,
      null,
      { date_from, date_to, profitLoss },
      request
    )

    const response = createApiResponse(profitLoss, 'Profit & Loss report generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('P&L report generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Calculates comprehensive Profit & Loss statement
 */
function calculateProfitLoss(
  invoices: any[], 
  expenses: any[], 
  unbilledTime: any[],
  dateFrom: string,
  dateTo: string
): ProfitLossReport {
  // Initialize revenue calculations
  let totalRevenue = 0
  let standardVATRevenue = 0
  let reverseChargeRevenue = 0
  let exemptRevenue = 0
  let totalVATCollected = 0

  // Process invoiced revenue
  invoices.forEach(invoice => {
    const subtotal = parseFloat(invoice.subtotal.toString())
    const vatAmount = parseFloat(invoice.vat_amount.toString())

    totalRevenue += subtotal

    switch (invoice.vat_type) {
      case 'standard':
        standardVATRevenue += subtotal
        totalVATCollected += vatAmount
        break
      case 'reverse_charge':
        reverseChargeRevenue += subtotal
        break
      case 'exempt':
        exemptRevenue += subtotal
        break
    }
  })

  // Calculate unbilled revenue from time entries
  let unbilledRevenue = 0
  unbilledTime.forEach(entry => {
    const hours = parseFloat(entry.hours.toString())
    const rate = entry.hourly_rate ? parseFloat(entry.hourly_rate.toString()) : 0
    unbilledRevenue += hours * rate
  })

  // Initialize expense calculations by category
  const expensesByCategory: Record<string, number> = {}
  let totalExpenses = 0
  let totalVATPaid = 0

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount.toString())
    const vatAmount = parseFloat(expense.vat_amount.toString())
    const category = expense.category || 'other'

    totalExpenses += amount
    totalVATPaid += vatAmount

    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0
    }
    expensesByCategory[category] += amount
  })

  // Calculate net figures
  const grossProfit = totalRevenue - totalExpenses
  const netVATPosition = totalVATCollected - totalVATPaid
  const netProfit = grossProfit

  return {
    period: {
      date_from: dateFrom,
      date_to: dateTo,
      generated_at: new Date().toISOString()
    },
    revenue: {
      total_invoiced: Math.round(totalRevenue * 100) / 100,
      standard_vat_revenue: Math.round(standardVATRevenue * 100) / 100,
      reverse_charge_revenue: Math.round(reverseChargeRevenue * 100) / 100,
      exempt_revenue: Math.round(exemptRevenue * 100) / 100,
      unbilled_revenue: Math.round(unbilledRevenue * 100) / 100,
      total_revenue: Math.round((totalRevenue + unbilledRevenue) * 100) / 100
    },
    expenses: {
      total_expenses: Math.round(totalExpenses * 100) / 100,
      by_category: Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: Math.round((amount / totalExpenses) * 100 * 100) / 100
      }))
    },
    vat_summary: {
      vat_collected: Math.round(totalVATCollected * 100) / 100,
      vat_paid: Math.round(totalVATPaid * 100) / 100,
      net_vat_position: Math.round(netVATPosition * 100) / 100
    },
    profit_summary: {
      gross_profit: Math.round(grossProfit * 100) / 100,
      gross_margin_percentage: totalRevenue > 0 
        ? Math.round((grossProfit / totalRevenue) * 100 * 100) / 100 
        : 0,
      net_profit: Math.round(netProfit * 100) / 100,
      net_margin_percentage: totalRevenue > 0 
        ? Math.round((netProfit / totalRevenue) * 100 * 100) / 100 
        : 0
    },
    metrics: {
      total_invoices: invoices.length,
      total_expenses_count: expenses.length,
      unbilled_hours: unbilledTime.reduce((sum, entry) => sum + parseFloat(entry.hours.toString()), 0),
      average_invoice_value: invoices.length > 0 
        ? Math.round((totalRevenue / invoices.length) * 100) / 100 
        : 0,
      expense_ratio: totalRevenue > 0 
        ? Math.round((totalExpenses / totalRevenue) * 100 * 100) / 100 
        : 0
    }
  }
}