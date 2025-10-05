import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin, 
  getCurrentUserProfile, 
  ApiErrors, 
  createApiResponse 
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

// Validation schema for quarterly VAT return request
const QuarterlyVATReturnSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  quarter: z.coerce.number().int().min(1).max(4),
  include_expenses: z.coerce.boolean().default(true),
  include_revenue: z.coerce.boolean().default(true)
})

export interface QuarterlyVATReturn {
  period: {
    year: number
    quarter: number
    date_from: string
    date_to: string
    generated_at: string
  }
  revenue: {
    standard_rate: { amount: number, vat: number, transaction_count: number }
    reduced_rate: { amount: number, vat: number, transaction_count: number }
    zero_rate: { amount: number, vat: number, transaction_count: number }
    exempt: { amount: number, vat: number, transaction_count: number }
    reverse_charge_eu: { amount: number, vat: number, transaction_count: number }
    total: { amount: number, vat: number, transaction_count: number }
  }
  expenses: {
    deductible_vat_total: number
    non_deductible_vat_total: number
    reverse_charge_expenses: number
    by_category: Array<{
      category_name: string
      net_amount: number
      vat_amount: number
      business_amount: number
      transaction_count: number
      avg_business_percentage: number
    }>
    by_vat_type: {
      standard: { amount: number, vat_deductible: number, transaction_count: number }
      reduced: { amount: number, vat_deductible: number, transaction_count: number }
      zero: { amount: number, vat_deductible: number, transaction_count: number }
      exempt: { amount: number, vat_deductible: number, transaction_count: number }
      reverse_charge: { amount: number, vat_deductible: number, transaction_count: number }
    }
  }
  summary: {
    output_vat: number
    input_vat: number
    net_vat_payable: number
    reverse_charge_neutral: number
    total_revenue: number
    total_expenses: number
  }
  compliance_checks: {
    issues: string[]
    warnings: string[]
    ready_for_submission: boolean
    missing_vat_numbers: number
    representatie_expenses: number
    over_representatie_limit: boolean
  }
  eu_transactions: {
    revenue_services: Array<{
      customer_name: string
      customer_vat_number: string
      country_code: string
      amount: number
      invoice_count: number
    }>
    expense_services: Array<{
      supplier_name: string
      supplier_vat_number: string
      country_code: string
      amount: number
      expense_count: number
    }>
  }
}

/**
 * GET /api/reports/quarterly-vat-return
 * Generates comprehensive Dutch quarterly VAT return including revenue and expenses
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    console.log('Received query params:', queryParams)
    
    let validatedParams
    try {
      validatedParams = QuarterlyVATReturnSchema.parse(queryParams)
      console.log('Validated params:', validatedParams)
    } catch (validationError) {
      console.error('Validation error:', validationError)
      return NextResponse.json(ApiErrors.ValidationError(validationError), { status: 400 })
    }
    
    const { year, quarter, include_expenses, include_revenue } = validatedParams

    // Calculate quarter dates
    const quarterStartMonth = (quarter - 1) * 3
    const quarterStart = new Date(year, quarterStartMonth, 1)
    const quarterEnd = new Date(year, quarterStartMonth + 3, 0) // Last day of quarter

    console.log(`Generating VAT return for Q${quarter} ${year}: ${quarterStart.toISOString().split('T')[0]} to ${quarterEnd.toISOString().split('T')[0]}`)

    // Initialize VAT return structure
    const vatReturn: QuarterlyVATReturn = {
      period: {
        year,
        quarter,
        date_from: quarterStart.toISOString().split('T')[0],
        date_to: quarterEnd.toISOString().split('T')[0],
        generated_at: getCurrentDate().toISOString()
      },
      revenue: {
        standard_rate: { amount: 0, vat: 0, transaction_count: 0 },
        reduced_rate: { amount: 0, vat: 0, transaction_count: 0 },
        zero_rate: { amount: 0, vat: 0, transaction_count: 0 },
        exempt: { amount: 0, vat: 0, transaction_count: 0 },
        reverse_charge_eu: { amount: 0, vat: 0, transaction_count: 0 },
        total: { amount: 0, vat: 0, transaction_count: 0 }
      },
      expenses: {
        deductible_vat_total: 0,
        non_deductible_vat_total: 0,
        reverse_charge_expenses: 0,
        by_category: [],
        by_vat_type: {
          standard: { amount: 0, vat_deductible: 0, transaction_count: 0 },
          reduced: { amount: 0, vat_deductible: 0, transaction_count: 0 },
          zero: { amount: 0, vat_deductible: 0, transaction_count: 0 },
          exempt: { amount: 0, vat_deductible: 0, transaction_count: 0 },
          reverse_charge: { amount: 0, vat_deductible: 0, transaction_count: 0 }
        }
      },
      summary: {
        output_vat: 0,
        input_vat: 0,
        net_vat_payable: 0,
        reverse_charge_neutral: 0,
        total_revenue: 0,
        total_expenses: 0
      },
      compliance_checks: {
        issues: [],
        warnings: [],
        ready_for_submission: false,
        missing_vat_numbers: 0,
        representatie_expenses: 0,
        over_representatie_limit: false
      },
      eu_transactions: {
        revenue_services: [],
        expense_services: []
      }
    }

    // Process revenue (invoices) if requested
    if (include_revenue) {
      await processRevenueData(vatReturn, profile.tenant_id, quarterStart, quarterEnd)
    }

    // Process expenses if requested
    if (include_expenses) {
      await processExpenseData(vatReturn, profile.tenant_id, quarterStart, quarterEnd)
    }

    // Calculate final summary
    calculateVATSummary(vatReturn)

    // Run compliance checks
    runComplianceChecks(vatReturn)

    // Save report for audit trail
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'quarterly_vat_return',
        period_start: quarterStart.toISOString().split('T')[0],
        period_end: quarterEnd.toISOString().split('T')[0],
        data: vatReturn,
        generated_by: profile.id
      })
      .select()
      .single()

    console.log(`VAT return generated successfully for Q${quarter} ${year}, saved as report ${savedReport?.id}`)

    const response = createApiResponse(vatReturn, `Quarterly VAT return generated for Q${quarter} ${year}`)
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Quarterly VAT return generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Process revenue data from invoices for VAT return
 */
async function processRevenueData(
  vatReturn: QuarterlyVATReturn, 
  tenantId: string, 
  quarterStart: Date, 
  quarterEnd: Date
) {
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
    .eq('tenant_id', tenantId)
    .gte('invoice_date', quarterStart.toISOString().split('T')[0])
    .lte('invoice_date', quarterEnd.toISOString().split('T')[0])
    .in('status', ['sent', 'paid', 'partial']) // Only include invoices actually issued

  if (invoicesError) {
    console.error('Error fetching invoices for VAT return:', invoicesError)
    throw new Error('Failed to fetch invoice data')
  }

  console.log(`Processing ${invoices?.length || 0} invoices for revenue`)

  const euRevenueCustomers = new Map<string, any>()

  invoices?.forEach(invoice => {
    const subtotal = parseFloat(invoice.subtotal.toString())
    const vatAmount = parseFloat(invoice.vat_amount.toString())
    const vatType = invoice.vat_type || 'standard'

    // Update revenue by VAT type
    if (vatType === 'standard') {
      vatReturn.revenue.standard_rate.amount += subtotal
      vatReturn.revenue.standard_rate.vat += vatAmount
      vatReturn.revenue.standard_rate.transaction_count++
    } else if (vatType === 'reduced') {
      vatReturn.revenue.reduced_rate.amount += subtotal
      vatReturn.revenue.reduced_rate.vat += vatAmount
      vatReturn.revenue.reduced_rate.transaction_count++
    } else if (vatType === 'exempt') {
      vatReturn.revenue.exempt.amount += subtotal
      vatReturn.revenue.exempt.vat += vatAmount
      vatReturn.revenue.exempt.transaction_count++
    } else if (vatType === 'reverse_charge') {
      vatReturn.revenue.reverse_charge_eu.amount += subtotal
      vatReturn.revenue.reverse_charge_eu.vat += vatAmount
      vatReturn.revenue.reverse_charge_eu.transaction_count++

      // Track EU B2B services for ICP
      if (invoice.client.country_code !== 'NL' && invoice.client.is_business && invoice.client.vat_number) {
        const key = `${invoice.client.vat_number}-${invoice.client.country_code}`
        if (!euRevenueCustomers.has(key)) {
          euRevenueCustomers.set(key, {
            customer_name: invoice.client.name,
            customer_vat_number: invoice.client.vat_number,
            country_code: invoice.client.country_code,
            amount: 0,
            invoice_count: 0
          })
        }
        const customer = euRevenueCustomers.get(key)
        customer.amount += subtotal
        customer.invoice_count++
      }
    } else {
      // Default to zero rate for unknown types
      vatReturn.revenue.zero_rate.amount += subtotal
      vatReturn.revenue.zero_rate.vat += vatAmount
      vatReturn.revenue.zero_rate.transaction_count++
    }

    // Update totals
    vatReturn.revenue.total.amount += subtotal
    vatReturn.revenue.total.vat += vatAmount
    vatReturn.revenue.total.transaction_count++
  })

  // Convert EU customer map to array
  vatReturn.eu_transactions.revenue_services = Array.from(euRevenueCustomers.values())

  console.log(`Revenue processed: €${vatReturn.revenue.total.amount.toFixed(2)} total, €${vatReturn.revenue.total.vat.toFixed(2)} VAT`)
}

/**
 * Process expense data for VAT return
 */
async function processExpenseData(
  vatReturn: QuarterlyVATReturn,
  tenantId: string,
  quarterStart: Date,
  quarterEnd: Date
) {
  const { data: expenses, error: expensesError } = await supabaseAdmin
    .from('expenses')
    .select(`
      *,
      category:expense_categories(
        id,
        name,
        expense_type,
        metadata
      )
    `)
    .eq('tenant_id', tenantId)
    .gte('expense_date', quarterStart.toISOString().split('T')[0])
    .lte('expense_date', quarterEnd.toISOString().split('T')[0])

  if (expensesError) {
    console.error('Error fetching expenses for VAT return:', expensesError)
    throw new Error('Failed to fetch expense data')
  }

  console.log(`Processing ${expenses?.length || 0} expenses`)

  const categoryTotals = new Map<string, any>()
  const euExpenseSuppliers = new Map<string, any>()
  let representatieTotal = 0

  expenses?.forEach(expense => {
    const amount = parseFloat(expense.amount.toString())
    const vatAmount = parseFloat((expense.vat_amount || 0).toString())
    const businessPercentage = expense.business_percentage || 100
    const businessAmount = amount * businessPercentage / 100
    const businessVATAmount = vatAmount * businessPercentage / 100
    const vatType = expense.vat_type || 'standard'
    const categoryName = expense.category?.name || 'Uncategorized'

    // Track total expenses
    vatReturn.summary.total_expenses += businessAmount

    // Process deductible VAT
    if (expense.is_vat_deductible) {
      vatReturn.expenses.deductible_vat_total += businessVATAmount
    } else {
      vatReturn.expenses.non_deductible_vat_total += businessVATAmount
    }

    // Track by VAT type
    if (vatType === 'reverse_charge' && expense.is_reverse_charge) {
      vatReturn.expenses.reverse_charge_expenses += businessAmount
      vatReturn.expenses.by_vat_type.reverse_charge.amount += businessAmount
      if (expense.is_vat_deductible) {
        vatReturn.expenses.by_vat_type.reverse_charge.vat_deductible += businessVATAmount
      }
      vatReturn.expenses.by_vat_type.reverse_charge.transaction_count++

      // Track EU expense suppliers for ICP
      if (expense.supplier_country_code && expense.supplier_country_code !== 'NL' && expense.supplier_vat_number) {
        const key = `${expense.supplier_vat_number}-${expense.supplier_country_code}`
        if (!euExpenseSuppliers.has(key)) {
          euExpenseSuppliers.set(key, {
            supplier_name: expense.vendor_name || 'Unknown Supplier',
            supplier_vat_number: expense.supplier_vat_number,
            country_code: expense.supplier_country_code,
            amount: 0,
            expense_count: 0
          })
        }
        const supplier = euExpenseSuppliers.get(key)
        supplier.amount += businessAmount
        supplier.expense_count++
      }
    } else if (vatType === 'standard') {
      vatReturn.expenses.by_vat_type.standard.amount += businessAmount
      if (expense.is_vat_deductible) {
        vatReturn.expenses.by_vat_type.standard.vat_deductible += businessVATAmount
      }
      vatReturn.expenses.by_vat_type.standard.transaction_count++
    } else if (vatType === 'reduced') {
      vatReturn.expenses.by_vat_type.reduced.amount += businessAmount
      if (expense.is_vat_deductible) {
        vatReturn.expenses.by_vat_type.reduced.vat_deductible += businessVATAmount
      }
      vatReturn.expenses.by_vat_type.reduced.transaction_count++
    } else if (vatType === 'exempt') {
      vatReturn.expenses.by_vat_type.exempt.amount += businessAmount
      if (expense.is_vat_deductible) {
        vatReturn.expenses.by_vat_type.exempt.vat_deductible += businessVATAmount
      }
      vatReturn.expenses.by_vat_type.exempt.transaction_count++
    } else {
      vatReturn.expenses.by_vat_type.zero.amount += businessAmount
      if (expense.is_vat_deductible) {
        vatReturn.expenses.by_vat_type.zero.vat_deductible += businessVATAmount
      }
      vatReturn.expenses.by_vat_type.zero.transaction_count++
    }

    // Track by category
    if (!categoryTotals.has(categoryName)) {
      categoryTotals.set(categoryName, {
        category_name: categoryName,
        net_amount: 0,
        vat_amount: 0,
        business_amount: 0,
        transaction_count: 0,
        total_business_percentage: 0
      })
    }

    const category = categoryTotals.get(categoryName)
    category.net_amount += amount
    category.vat_amount += vatAmount
    category.business_amount += businessAmount
    category.transaction_count++
    category.total_business_percentage += businessPercentage

    // Check for representatie (entertainment) expenses
    if (categoryName.toLowerCase().includes('representatie') || 
        (expense.category?.metadata?.is_representatie === true)) {
      representatieTotal += businessAmount
      vatReturn.compliance_checks.representatie_expenses += businessAmount
    }

    // Check for missing business percentages
    if (!businessPercentage || businessPercentage === 0) {
      vatReturn.compliance_checks.issues.push(`Expense missing business percentage: ${expense.description}`)
    }

    // Check for missing VAT numbers on EU reverse charge
    if (expense.is_reverse_charge && expense.supplier_country_code !== 'NL' && !expense.supplier_vat_number) {
      vatReturn.compliance_checks.missing_vat_numbers++
      vatReturn.compliance_checks.issues.push(`EU expense missing VAT number: ${expense.vendor_name || expense.description}`)
    }
  })

  // Convert category map to array with averages
  vatReturn.expenses.by_category = Array.from(categoryTotals.values()).map(cat => ({
    ...cat,
    avg_business_percentage: cat.transaction_count > 0 ? cat.total_business_percentage / cat.transaction_count : 100
  }))

  // Convert EU supplier map to array
  vatReturn.eu_transactions.expense_services = Array.from(euExpenseSuppliers.values())

  // Check representatie limit (Dutch limit is typically around €5000-7000)
  vatReturn.compliance_checks.over_representatie_limit = representatieTotal > 5000

  console.log(`Expenses processed: €${vatReturn.summary.total_expenses.toFixed(2)} business amount, €${vatReturn.expenses.deductible_vat_total.toFixed(2)} deductible VAT`)
}

/**
 * Calculate final VAT summary totals
 */
function calculateVATSummary(vatReturn: QuarterlyVATReturn) {
  // Output VAT (from revenue)
  vatReturn.summary.output_vat = 
    vatReturn.revenue.standard_rate.vat +
    vatReturn.revenue.reduced_rate.vat +
    vatReturn.revenue.zero_rate.vat +
    vatReturn.revenue.exempt.vat

  // Input VAT (from expenses) - only deductible amount
  vatReturn.summary.input_vat = vatReturn.expenses.deductible_vat_total

  // Reverse charge is neutral (both input and output VAT)
  vatReturn.summary.reverse_charge_neutral = vatReturn.revenue.reverse_charge_eu.vat

  // Net VAT payable (positive = owe tax, negative = receive refund)
  vatReturn.summary.net_vat_payable = vatReturn.summary.output_vat - vatReturn.summary.input_vat

  // Total revenue
  vatReturn.summary.total_revenue = vatReturn.revenue.total.amount

  console.log(`VAT Summary: Output €${vatReturn.summary.output_vat.toFixed(2)}, Input €${vatReturn.summary.input_vat.toFixed(2)}, Net payable €${vatReturn.summary.net_vat_payable.toFixed(2)}`)
}

/**
 * Run compliance checks and determine submission readiness
 */
function runComplianceChecks(vatReturn: QuarterlyVATReturn) {
  const checks = vatReturn.compliance_checks

  // Check for missing data
  if (vatReturn.summary.total_revenue === 0 && vatReturn.summary.total_expenses === 0) {
    checks.warnings.push('No revenue or expenses found for this quarter')
  }

  // Check for unusual patterns
  if (vatReturn.summary.input_vat > vatReturn.summary.output_vat * 2) {
    checks.warnings.push('Input VAT significantly higher than output VAT - please review')
  }

  // Check EU transaction compliance
  if (vatReturn.eu_transactions.revenue_services.length > 0 || vatReturn.eu_transactions.expense_services.length > 0) {
    checks.warnings.push('EU transactions present - ICP declaration may be required')
  }

  // Check representatie expenses
  if (checks.over_representatie_limit) {
    checks.warnings.push(`Representatie expenses (€${checks.representatie_expenses.toFixed(2)}) exceed recommended limits`)
  }

  // Determine submission readiness
  checks.ready_for_submission = checks.issues.length === 0 && checks.missing_vat_numbers === 0

  console.log(`Compliance checks: ${checks.issues.length} issues, ${checks.warnings.length} warnings, Ready: ${checks.ready_for_submission}`)
}