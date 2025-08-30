import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { ApprovalAction } from '@/lib/types/expenses'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

const ExpenseApprovalSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes', 'forward']),
  comments: z.string().optional(),
  approved_amount: z.number().positive().optional()
})

/**
 * POST /api/expense-management/expenses/[id]/approve - Approve or reject expense
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const expenseId = params.id
    const body = await request.json()

    // Validate request body
    const validation = ExpenseApprovalSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { action, comments, approved_amount } = validation.data

    // Get current user profile

    // Fetch expense with workflow details
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        workflow:approval_workflows(id, steps),
        category:expense_categories(id, name, expense_type),
        submitted_by_profile:profiles!submitted_by(id, first_name, last_name, email)
      `)
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (expenseError) {
      if (expenseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
    }

    // Check if expense is in an approvable state
    if (!['submitted', 'under_review'].includes(expense.status)) {
      return NextResponse.json({
        error: 'Expense cannot be approved',
        details: 'Only submitted or under review expenses can be approved'
      }, { status: 400 })
    }

    // Check if user can approve this expense
    // For now, any user can approve (in a real system, you'd check roles/hierarchy)
    if (expense.submitted_by === profile.id) {
      return NextResponse.json({
        error: 'Access denied',
        details: 'Cannot approve your own expense'
      }, { status: 403 })
    }

    // TODO: Check if user is authorized approver for this step
    // This would involve checking the workflow steps and user roles

    let newStatus = expense.status
    let newApprovalStep = expense.current_approval_step

    switch (action) {
      case 'approve':
        // Check if this is the final approval step
        const workflowSteps = expense.workflow?.steps || []
        const isLastStep = newApprovalStep >= workflowSteps.length

        if (isLastStep) {
          newStatus = 'approved'
        } else {
          newStatus = 'under_review'
          newApprovalStep += 1
        }
        break

      case 'reject':
        newStatus = 'rejected'
        break

      case 'request_changes':
        newStatus = 'rejected' // User needs to resubmit with changes
        break

      case 'forward':
        // Move to next approver without approving
        newStatus = 'under_review'
        newApprovalStep += 1
        break
    }

    // Validate approved amount if provided
    let finalApprovedAmount = approved_amount
    if (action === 'approve' && finalApprovedAmount && finalApprovedAmount > expense.amount) {
      return NextResponse.json({
        error: 'Invalid approved amount',
        details: 'Approved amount cannot exceed requested amount'
      }, { status: 400 })
    }

    // Start transaction
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        status: newStatus,
        current_approval_step: newApprovalStep,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select(`
        *,
        category:expense_categories(id, name, expense_type),
        submitted_by_profile:profiles!submitted_by(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating expense status:', updateError)
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    }

    // Create approval record
    const { error: approvalError } = await supabase
      .from('expense_approvals')
      .insert({
        expense_id: expenseId,
        step_number: expense.current_approval_step,
        approver_id: profile.id,
        action,
        comments,
        approved_amount: finalApprovedAmount
      })

    if (approvalError) {
      console.error('Error creating approval record:', approvalError)
      // Don't fail the request, just log the error
    }

    // TODO: Send notification to expense submitter
    // TODO: If forwarded, send notification to next approver

    let message = 'Expense processed successfully'
    switch (action) {
      case 'approve':
        message = newStatus === 'approved' 
          ? 'Expense fully approved successfully' 
          : 'Expense approved and forwarded to next approver'
        break
      case 'reject':
        message = 'Expense rejected successfully'
        break
      case 'request_changes':
        message = 'Changes requested for expense'
        break
      case 'forward':
        message = 'Expense forwarded to next approver'
        break
    }

    return NextResponse.json({
      message,
      expense: updatedExpense,
      action_taken: action,
      new_status: newStatus
    })

  } catch (error) {
    console.error('Error in POST /api/expense-management/expenses/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}