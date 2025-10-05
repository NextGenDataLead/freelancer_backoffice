import { NextRequest, NextResponse } from 'next/server'
import { 
  supabaseAdmin, 
  getCurrentUserProfile, 
  ApiErrors, 
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

interface ExpenseMetrics {
  currentMonth: {
    totalAmount: number
    percentageChange: number
  }
  vatPaid: {
    totalVatAmount: number
    deductibleAmount: number
    breakdown: Array<{
      rate: number
      amount: number
    }>
  }
  ocrProcessed: {
    totalCount: number
    ocrCount: number
    percentageAutomatic: number
  }
  categories: {
    uniqueCount: number
    topCategories: Array<{
      category: string
      totalAmount: number
      count: number
    }>
  }
}

/**
 * GET /api/expenses/metrics - Get expense dashboard metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const now = getCurrentDate()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear

    // Get current month expenses
    const { data: currentMonthExpenses, error: currentError } = await supabase
      .from('expenses')
      .select('amount, vat_amount, vat_rate, expense_type, created_at, metadata, expense_date')
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('expense_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)

    if (currentError) {
      console.error('Error fetching current month expenses:', currentError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get previous month expenses for comparison
    const { data: previousMonthExpenses, error: previousError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`)
      .lt('expense_date', `${previousYear}-${(previousMonth + 1).toString().padStart(2, '0')}-01`)

    if (previousError) {
      console.error('Error fetching previous month expenses:', previousError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate metrics
    const currentTotal = (currentMonthExpenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
    const previousTotal = (previousMonthExpenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
    const percentageChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    // VAT breakdown by rate
    const vatBreakdown = new Map<number, number>()
    let totalVatAmount = 0
    
    ;(currentMonthExpenses || []).forEach(exp => {
      const vatAmount = parseFloat(exp.vat_amount || 0)
      const vatRate = parseFloat(exp.vat_rate || 0)
      totalVatAmount += vatAmount
      
      // Only include VAT rates that have actual amounts
      if (vatAmount > 0) {
        const existing = vatBreakdown.get(vatRate) || 0
        vatBreakdown.set(vatRate, existing + vatAmount)
      }
    })

    // Count OCR processed expenses (simplified - checking if metadata has OCR info)
    const ocrProcessed = (currentMonthExpenses || []).filter(exp => 
      exp.metadata && (exp.metadata.ocr_processed === true || exp.metadata.receipt_processed === true)
    ).length
    const totalCount = (currentMonthExpenses || []).length
    const percentageAutomatic = totalCount > 0 ? (ocrProcessed / totalCount) * 100 : 0

    // Category analysis
    const categoryMap = new Map<string, { amount: number, count: number }>()
    ;(currentMonthExpenses || []).forEach(exp => {
      const category = exp.expense_type || 'other'
      const existing = categoryMap.get(category) || { amount: 0, count: 0 }
      categoryMap.set(category, {
        amount: existing.amount + parseFloat(exp.amount),
        count: existing.count + 1
      })
    })

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalAmount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)

    const metrics: ExpenseMetrics = {
      currentMonth: {
        totalAmount: currentTotal,
        percentageChange: Math.round(percentageChange * 10) / 10
      },
      vatPaid: {
        totalVatAmount,
        deductibleAmount: totalVatAmount, // Assuming all VAT is deductible for now
        breakdown: Array.from(vatBreakdown.entries())
          .map(([rate, amount]) => ({ rate, amount }))
          .filter(item => item.amount > 0) // Extra safety filter
          .sort((a, b) => b.rate - a.rate)
      },
      ocrProcessed: {
        totalCount,
        ocrCount: ocrProcessed,
        percentageAutomatic: Math.round(percentageAutomatic)
      },
      categories: {
        uniqueCount: categoryMap.size,
        topCategories
      }
    }

    const response = createApiResponse(metrics, 'Expense metrics fetched successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/expenses/metrics:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}