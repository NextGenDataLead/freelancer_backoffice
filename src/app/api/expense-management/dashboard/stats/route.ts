import { NextRequest, NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { ExpenseDashboardStats } from '@/lib/types/expenses'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

/**
 * GET /api/expense-management/dashboard/stats - Get dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    
    // Date ranges for calculations
    const currentMonth = new Date()
    const startCurrentMonth = startOfMonth(currentMonth)
    const endCurrentMonth = endOfMonth(currentMonth)
    const startPreviousMonth = startOfMonth(subMonths(currentMonth, 1))
    const endPreviousMonth = endOfMonth(subMonths(currentMonth, 1))

    // Get total expenses count and amount
    const { data: totalExpenses, error: totalError } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('tenant_id', profile.tenant_id)

    if (totalError) {
      console.error('Error fetching total expenses:', totalError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get current month expenses
    const { data: currentMonthExpenses, error: currentError } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', format(startCurrentMonth, 'yyyy-MM-dd'))
      .lte('expense_date', format(endCurrentMonth, 'yyyy-MM-dd'))

    if (currentError) {
      console.error('Error fetching current month expenses:', currentError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get previous month expenses
    const { data: previousMonthExpenses, error: previousError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('tenant_id', profile.tenant_id)
      .gte('expense_date', format(startPreviousMonth, 'yyyy-MM-dd'))
      .lte('expense_date', format(endPreviousMonth, 'yyyy-MM-dd'))

    if (previousError) {
      console.error('Error fetching previous month expenses:', previousError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get pending approvals count
    const { count: pendingApprovalsCount, error: pendingError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['submitted', 'under_review'])

    if (pendingError) {
      console.error('Error fetching pending approvals:', pendingError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Calculate statistics
    const totalAmount = totalExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
    const totalCount = totalExpenses?.length || 0
    
    const currentMonthAmount = currentMonthExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
    const currentMonthCount = currentMonthExpenses?.length || 0
    
    const previousMonthAmount = previousMonthExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
    
    // Calculate percentage change
    const amountChangePercent = previousMonthAmount > 0 
      ? ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100 
      : 0

    // Status breakdown
    const statusCounts = totalExpenses?.reduce((acc, exp) => {
      acc[exp.status] = (acc[exp.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const stats: ExpenseDashboardStats = {
      pending_approval_count: pendingApprovalsCount || 0,
      pending_approval_amount: 0, // TODO: Calculate pending approval amount
      approved_this_month: statusCounts['approved'] || 0,
      approved_this_month_amount: currentMonthAmount,
      reimbursements_pending: statusCounts['reimbursed'] || 0,
      reimbursements_pending_amount: 0, // TODO: Calculate reimbursement amount
      top_categories: [], // TODO: Calculate top categories
      recent_expenses: [], // TODO: Fetch recent expenses
      monthly_trend: [] // TODO: Calculate monthly trend
    }

    return NextResponse.json(createApiResponse(stats, 'Dashboard statistics retrieved successfully'))

  } catch (error) {
    console.error('Error in GET /api/expense-management/dashboard/stats:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}