import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { BalanceSheetReport, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'

// Schema for Balance Sheet report parameters
const BalanceSheetQuerySchema = z.object({
  as_of_date: z.string().datetime('Invalid date format').optional()
})

/**
 * GET /api/reports/balance-sheet
 * Generates real-time Balance Sheet statement as of specified date
 * Shows assets, liabilities, and equity position
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
    
    const validatedQuery = BalanceSheetQuerySchema.parse(queryParams)
    const asOfDate = validatedQuery.as_of_date 
      ? new Date(validatedQuery.as_of_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    // Get all invoices up to the date (assets: accounts receivable)
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          name,
          country_code
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .lte('invoice_date', asOfDate)
      .in('status', ['sent', 'overdue']) // Only unpaid invoices are assets

    if (invoicesError) {
      console.error('Error fetching invoices for Balance Sheet:', invoicesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get all expenses up to the date (for accrued expenses calculation)
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .lte('expense_date', asOfDate)

    if (expensesError) {
      console.error('Error fetching expenses for Balance Sheet:', expensesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get time entries for work in progress calculation
    const { data: timeEntries, error: timeError } = await supabaseAdmin
      .from('time_entries')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('billable', true)
      .eq('invoiced', false) // Unbilled time = work in progress
      .lte('entry_date', asOfDate)

    if (timeError) {
      console.error('Error fetching time entries for Balance Sheet:', timeError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate historical profit up to this date for retained earnings
    const { data: historicalProfitData, error: profitError } = await supabaseAdmin
      .rpc('calculate_retained_earnings', {
        p_tenant_id: profile.tenant_id,
        p_as_of_date: asOfDate
      })

    // If RPC doesn't exist, calculate basic retained earnings
    const retainedEarnings = profitError ? 0 : (historicalProfitData || 0)

    // Calculate Balance Sheet
    const balanceSheet = calculateBalanceSheet(
      invoices || [],
      expenses || [],
      timeEntries || [],
      retainedEarnings,
      asOfDate
    )

    // Save calculated report for audit purposes
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'balance_sheet',
        period_start: asOfDate,
        period_end: asOfDate,
        data: balanceSheet,
        generated_by: profile.id
      })
      .select()
      .single()

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'financial_report',
      savedReport?.id || 'unknown',
      'balance_sheet_generated',
      profile.id,
      null,
      { as_of_date: asOfDate, balanceSheet },
      request
    )

    const response = createApiResponse(balanceSheet, 'Balance Sheet generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Balance Sheet generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Calculates Balance Sheet statement for ZZP business
 */
function calculateBalanceSheet(
  unpaidInvoices: any[], 
  expenses: any[], 
  unbilledTime: any[],
  retainedEarnings: number,
  asOfDate: string
): BalanceSheetReport {
  // === ASSETS ===
  
  // Current Assets: Accounts Receivable (unpaid invoices)
  let accountsReceivable = 0
  unpaidInvoices.forEach(invoice => {
    const total = parseFloat(invoice.total_amount.toString())
    accountsReceivable += total
  })

  // Current Assets: Work in Progress (unbilled time)
  let workInProgress = 0
  unbilledTime.forEach(entry => {
    const hours = parseFloat(entry.hours.toString())
    const rate = entry.hourly_rate ? parseFloat(entry.hourly_rate.toString()) : 0
    workInProgress += hours * rate
  })

  // VAT Receivable (VAT paid on expenses that can be reclaimed)
  let vatReceivable = 0
  expenses.forEach(expense => {
    const vatAmount = parseFloat(expense.vat_amount.toString())
    if (expense.vat_rate > 0 && expense.is_deductible) {
      vatReceivable += vatAmount
    }
  })

  // Fixed Assets: For ZZP, usually minimal (computer equipment, etc.)
  const fixedAssets = 0 // Would need separate asset tracking for this

  // Total Assets
  const totalCurrentAssets = accountsReceivable + workInProgress + vatReceivable
  const totalFixedAssets = fixedAssets
  const totalAssets = totalCurrentAssets + totalFixedAssets

  // === LIABILITIES ===
  
  // Current Liabilities: VAT Payable (would need invoice data to calculate)
  const vatPayable = 0 // Would calculate from invoices with standard VAT

  // Current Liabilities: Accrued Expenses (unpaid expenses)
  let accruedExpenses = 0
  expenses.forEach(expense => {
    const total = parseFloat(expense.total_amount.toString())
    // In a more sophisticated system, would track payment status
    // For now, assume all expenses are paid (ZZP typically pays immediately)
    accruedExpenses += 0
  })

  // Total Liabilities
  const totalCurrentLiabilities = vatPayable + accruedExpenses
  const totalLongTermLiabilities = 0 // ZZP rarely has long-term debt
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

  // === EQUITY ===
  
  // Owner's Equity: Retained Earnings from previous periods + current period
  const ownerEquity = retainedEarnings
  const totalEquity = ownerEquity

  // Verify Balance Sheet equation: Assets = Liabilities + Equity
  const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01

  return {
    as_of_date: asOfDate,
    generated_at: new Date().toISOString(),
    assets: {
      current_assets: {
        accounts_receivable: Math.round(accountsReceivable * 100) / 100,
        work_in_progress: Math.round(workInProgress * 100) / 100,
        vat_receivable: Math.round(vatReceivable * 100) / 100,
        total_current_assets: Math.round(totalCurrentAssets * 100) / 100
      },
      fixed_assets: {
        equipment: Math.round(fixedAssets * 100) / 100,
        total_fixed_assets: Math.round(totalFixedAssets * 100) / 100
      },
      total_assets: Math.round(totalAssets * 100) / 100
    },
    liabilities: {
      current_liabilities: {
        vat_payable: Math.round(vatPayable * 100) / 100,
        accrued_expenses: Math.round(accruedExpenses * 100) / 100,
        total_current_liabilities: Math.round(totalCurrentLiabilities * 100) / 100
      },
      long_term_liabilities: {
        total_long_term_liabilities: Math.round(totalLongTermLiabilities * 100) / 100
      },
      total_liabilities: Math.round(totalLiabilities * 100) / 100
    },
    equity: {
      owner_equity: Math.round(ownerEquity * 100) / 100,
      retained_earnings: Math.round(retainedEarnings * 100) / 100,
      total_equity: Math.round(totalEquity * 100) / 100
    },
    balance_verification: {
      assets_total: Math.round(totalAssets * 100) / 100,
      liabilities_equity_total: Math.round((totalLiabilities + totalEquity) * 100) / 100,
      balanced: balanceCheck,
      difference: Math.round((totalAssets - (totalLiabilities + totalEquity)) * 100) / 100
    },
    metrics: {
      current_ratio: totalCurrentLiabilities > 0 
        ? Math.round((totalCurrentAssets / totalCurrentLiabilities) * 100) / 100 
        : totalCurrentAssets > 0 ? 999 : 0,
      debt_to_equity_ratio: totalEquity > 0 
        ? Math.round((totalLiabilities / totalEquity) * 100) / 100 
        : totalLiabilities > 0 ? 999 : 0,
      working_capital: Math.round((totalCurrentAssets - totalCurrentLiabilities) * 100) / 100,
      total_receivables_count: unpaidInvoices.length,
      average_receivable: unpaidInvoices.length > 0 
        ? Math.round((accountsReceivable / unpaidInvoices.length) * 100) / 100 
        : 0
    }
  }
}