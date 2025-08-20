import { NextResponse } from 'next/server'
import { VATReturnPeriodSchema } from '@/lib/validations/financial'
import type { VATReturnData, ICPDeclaration, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'

/**
 * GET /api/reports/vat-return
 * Generates Dutch VAT return report for specified quarter
 * Includes both standard VAT and ICP (Intracommunautaire Prestaties) declaration
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
    
    const validatedQuery = VATReturnPeriodSchema.parse(queryParams)
    const { year, quarter } = validatedQuery

    // Calculate quarter dates
    const quarterStartMonth = (quarter - 1) * 3
    const quarterStart = new Date(year, quarterStartMonth, 1)
    const quarterEnd = new Date(year, quarterStartMonth + 3, 0) // Last day of quarter

    // Get all invoices for the quarter
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        client:clients!inner(
          id,
          name,
          country_code,
          vat_number,
          is_business
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('invoice_date', quarterStart.toISOString().split('T')[0])
      .lte('invoice_date', quarterEnd.toISOString().split('T')[0])
      .in('status', ['sent', 'paid']) // Only include sent/paid invoices

    if (invoicesError) {
      console.error('Error fetching invoices for VAT return:', invoicesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get all expenses for the quarter
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_deductible', true)
      .gte('expense_date', quarterStart.toISOString().split('T')[0])
      .lte('expense_date', quarterEnd.toISOString().split('T')[0])

    if (expensesError) {
      console.error('Error fetching expenses for VAT return:', expensesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate VAT return data
    const vatReturn = calculateVATReturn(invoices || [], expenses || [], quarter, year)

    // Save calculated report for audit purposes
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'vat_return',
        period_start: quarterStart.toISOString().split('T')[0],
        period_end: quarterEnd.toISOString().split('T')[0],
        data: vatReturn,
        generated_by: profile.id
      })
      .select()
      .single()

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'financial_report',
      savedReport?.id || 'unknown',
      'vat_return_generated',
      profile.id,
      null,
      { quarter, year, vatReturn },
      request
    )

    const response = createApiResponse(vatReturn, `VAT return generated for Q${quarter} ${year}`)
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('VAT return generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Calculates Dutch VAT return data including ICP declaration
 */
function calculateVATReturn(
  invoices: any[], 
  expenses: any[], 
  quarter: number, 
  year: number
): VATReturnData {
  // Initialize totals
  let totalRevenue = 0
  let totalVATCollected = 0
  let reverseChargeRevenue = 0
  const euServices: ICPDeclaration[] = []

  // Process invoices
  invoices.forEach(invoice => {
    const subtotal = parseFloat(invoice.subtotal.toString())
    const vatAmount = parseFloat(invoice.vat_amount.toString())

    totalRevenue += subtotal

    if (invoice.vat_type === 'standard') {
      totalVATCollected += vatAmount
    } else if (invoice.vat_type === 'reverse_charge') {
      reverseChargeRevenue += subtotal
      
      // Add to ICP declaration if EU B2B service
      if (invoice.client.country_code !== 'NL' && invoice.client.is_business) {
        euServices.push({
          client_name: invoice.client.name,
          vat_number: invoice.client.vat_number || '',
          country_code: invoice.client.country_code,
          amount: subtotal,
          service_description: 'Professional services'
        })
      }
    }
  })

  // Process expenses (calculate deductible VAT)
  let totalExpenses = 0
  let totalVATPaid = 0

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount.toString())
    const vatAmount = parseFloat(expense.vat_amount.toString())

    totalExpenses += amount
    if (expense.vat_rate > 0) {
      totalVATPaid += vatAmount
    }
  })

  // Calculate net VAT to pay/receive
  const vatToPay = Math.round((totalVATCollected - totalVATPaid) * 100) / 100

  return {
    quarter,
    year,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_vat_collected: Math.round(totalVATCollected * 100) / 100,
    total_expenses: Math.round(totalExpenses * 100) / 100,
    total_vat_paid: Math.round(totalVATPaid * 100) / 100,
    vat_to_pay: vatToPay,
    reverse_charge_revenue: Math.round(reverseChargeRevenue * 100) / 100,
    eu_services: euServices
  }
}