import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin, 
  getCurrentUserProfile, 
  ApiErrors, 
  createApiResponse 
} from '@/lib/supabase/financial-client'

// Validation schema for VAT analysis request
const VATAnalysisSchema = z.object({
  year: z.string().regex(/^\d{4}$/).transform(Number),
  quarter: z.string().regex(/^[1-4]$/).transform(Number).optional(),
  month: z.string().regex(/^(1[0-2]|[1-9])$/).transform(Number).optional(),
  category_id: z.string().uuid().optional(),
  supplier_country: z.string().length(2).optional()
})

export interface ExpenseVATAnalysis {
  period: {
    year: number
    quarter?: number
    month?: number
    date_from: string
    date_to: string
  }
  summary: {
    total_expenses: number
    total_vat_deductible: number
    total_vat_non_deductible: number
    business_portion_total: number
    private_portion_total: number
  }
  by_vat_type: {
    standard: { count: number; amount: number; vat_amount: number }
    reduced: { count: number; amount: number; vat_amount: number }
    zero: { count: number; amount: number; vat_amount: number }
    exempt: { count: number; amount: number; vat_amount: number }
    reverse_charge: { count: number; amount: number; vat_amount: number }
  }
  by_category: {
    category_name: string
    total_amount: number
    vat_deductible_amount: number
    avg_vat_rate: number
    expense_count: number
    metadata?: any
  }[]
  eu_expenses: {
    supplier_name: string
    supplier_vat_number?: string
    country_code: string
    amount: number
    vat_type: string
    is_reverse_charge: boolean
  }[]
  compliance_issues: {
    missing_vat_numbers: number
    missing_business_percentages: number
    representatie_non_deductible: number
    over_representatie_limit: boolean
  }
}

/**
 * GET /api/expense-management/reports/vat-analysis
 * Provides detailed VAT analysis for expenses with Dutch fiscal compliance
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
    const { year, quarter, month, category_id, supplier_country } = VATAnalysisSchema.parse(queryParams)

    // Calculate date range
    let dateFrom: Date
    let dateTo: Date

    if (month) {
      dateFrom = new Date(year, month - 1, 1)
      dateTo = new Date(year, month, 0) // Last day of month
    } else if (quarter) {
      const quarterStartMonth = (quarter - 1) * 3
      dateFrom = new Date(year, quarterStartMonth, 1)
      dateTo = new Date(year, quarterStartMonth + 3, 0) // Last day of quarter
    } else {
      dateFrom = new Date(year, 0, 1)
      dateTo = new Date(year, 11, 31) // Full year
    }

    // Build expense query
    let expenseQuery = supabaseAdmin
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
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', dateFrom.toISOString().split('T')[0])
      .lte('expense_date', dateTo.toISOString().split('T')[0])

    // Apply optional filters
    if (category_id) {
      expenseQuery = expenseQuery.eq('category_id', category_id)
    }
    if (supplier_country) {
      expenseQuery = expenseQuery.eq('supplier_country_code', supplier_country)
    }

    const { data: expenses, error: expensesError } = await expenseQuery

    if (expensesError) {
      console.error('Error fetching expenses for VAT analysis:', expensesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Analyze expenses
    const analysis = analyzeExpenseVAT(expenses || [], { year, quarter, month, dateFrom, dateTo })
    
    const response = createApiResponse(analysis, 'Expense VAT analysis generated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Expense VAT analysis error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

function analyzeExpenseVAT(
  expenses: any[],
  period: { year: number; quarter?: number; month?: number; dateFrom: Date; dateTo: Date }
): ExpenseVATAnalysis {
  // Initialize analysis structure
  const analysis: ExpenseVATAnalysis = {
    period: {
      year: period.year,
      quarter: period.quarter,
      month: period.month,
      date_from: period.dateFrom.toISOString().split('T')[0],
      date_to: period.dateTo.toISOString().split('T')[0]
    },
    summary: {
      total_expenses: 0,
      total_vat_deductible: 0,
      total_vat_non_deductible: 0,
      business_portion_total: 0,
      private_portion_total: 0
    },
    by_vat_type: {
      standard: { count: 0, amount: 0, vat_amount: 0 },
      reduced: { count: 0, amount: 0, vat_amount: 0 },
      zero: { count: 0, amount: 0, vat_amount: 0 },
      exempt: { count: 0, amount: 0, vat_amount: 0 },
      reverse_charge: { count: 0, amount: 0, vat_amount: 0 }
    },
    by_category: [],
    eu_expenses: [],
    compliance_issues: {
      missing_vat_numbers: 0,
      missing_business_percentages: 0,
      representatie_non_deductible: 0,
      over_representatie_limit: false
    }
  }

  const categoryTotals = new Map<string, any>()
  let representatieTotal = 0

  // Process each expense
  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount.toString())
    const vatAmount = parseFloat((expense.vat_amount || 0).toString())
    const businessPercentage = expense.business_percentage || 100
    const businessAmount = amount * businessPercentage / 100
    const privateAmount = amount * (100 - businessPercentage) / 100

    // Update summary totals
    analysis.summary.total_expenses += amount
    analysis.summary.business_portion_total += businessAmount
    analysis.summary.private_portion_total += privateAmount

    if (expense.is_vat_deductible) {
      analysis.summary.total_vat_deductible += vatAmount
    } else {
      analysis.summary.total_vat_non_deductible += vatAmount
    }

    // Categorize by VAT type
    const vatType = expense.vat_type || 'standard'
    if (analysis.by_vat_type[vatType as keyof typeof analysis.by_vat_type]) {
      analysis.by_vat_type[vatType as keyof typeof analysis.by_vat_type].count++
      analysis.by_vat_type[vatType as keyof typeof analysis.by_vat_type].amount += businessAmount
      analysis.by_vat_type[vatType as keyof typeof analysis.by_vat_type].vat_amount += vatAmount
    }

    // Track category totals
    const categoryName = expense.category?.name || 'Uncategorized'
    if (!categoryTotals.has(categoryName)) {
      categoryTotals.set(categoryName, {
        category_name: categoryName,
        total_amount: 0,
        vat_deductible_amount: 0,
        total_vat: 0,
        expense_count: 0,
        metadata: expense.category?.metadata || {}
      })
    }

    const categoryData = categoryTotals.get(categoryName)!
    categoryData.total_amount += businessAmount
    categoryData.expense_count++
    categoryData.total_vat += vatAmount
    if (expense.is_vat_deductible) {
      categoryData.vat_deductible_amount += vatAmount
    }

    // Track EU expenses
    if (expense.supplier_country_code && expense.supplier_country_code !== 'NL') {
      analysis.eu_expenses.push({
        supplier_name: expense.vendor_name || 'Unknown',
        supplier_vat_number: expense.supplier_vat_number,
        country_code: expense.supplier_country_code,
        amount: businessAmount,
        vat_type: vatType,
        is_reverse_charge: expense.is_reverse_charge || false
      })

      // Check for missing VAT numbers on EU B2B services
      if (expense.is_reverse_charge && !expense.supplier_vat_number) {
        analysis.compliance_issues.missing_vat_numbers++
      }
    }

    // Check compliance issues
    if (!businessPercentage || businessPercentage === 0) {
      analysis.compliance_issues.missing_business_percentages++
    }

    // Track representatie expenses (entertainment - limited deductibility)
    if (categoryName.toLowerCase().includes('representatie')) {
      representatieTotal += businessAmount
      if (!expense.is_vat_deductible) {
        analysis.compliance_issues.representatie_non_deductible++
      }
    }
  })

  // Convert category map to array with calculated averages
  analysis.by_category = Array.from(categoryTotals.values()).map(cat => ({
    ...cat,
    avg_vat_rate: cat.total_vat > 0 ? cat.total_vat / cat.total_amount : 0
  }))

  // Check representatie limit (Dutch rule: limited deductibility)
  analysis.compliance_issues.over_representatie_limit = representatieTotal > 5000 // Example limit

  return analysis
}