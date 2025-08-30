import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

const SubmitExpenseSchema = z.object({
  workflow_id: z.string().uuid().optional(),
  policy_id: z.string().uuid().optional()
})

/**
 * POST /api/expense-management/expenses/[id]/submit - Submit expense for approval
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
    const validation = SubmitExpenseSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { workflow_id, policy_id } = validation.data

    // Get current user profile

    // Fetch expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (expenseError) {
      if (expenseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
    }

    // Check if user can submit this expense
    if (expense.submitted_by !== profile.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if expense is in submittable state
    if (expense.status !== 'draft') {
      return NextResponse.json({
        error: 'Expense cannot be submitted',
        details: 'Only draft expenses can be submitted'
      }, { status: 400 })
    }

    // Get default workflow if none specified
    let finalWorkflowId = workflow_id
    if (!finalWorkflowId) {
      const { data: defaultWorkflow } = await supabase
        .from('approval_workflows')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', 'Standard Approval')
        .eq('is_active', true)
        .single()

      finalWorkflowId = defaultWorkflow?.id
    }

    // Get default policy if none specified
    let finalPolicyId = policy_id
    if (!finalPolicyId) {
      const { data: defaultPolicy } = await supabase
        .from('expense_policies')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('name', 'Standard Policy')
        .eq('is_active', true)
        .single()

      finalPolicyId = defaultPolicy?.id
    }

    // Validate policy if provided
    if (finalPolicyId) {
      const { data: policy, error: policyError } = await supabase
        .from('expense_policies')
        .select('*')
        .eq('id', finalPolicyId)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .single()

      if (policyError || !policy) {
        return NextResponse.json({
          error: 'Invalid policy',
          details: 'Policy not found or not active'
        }, { status: 400 })
      }

      // Check policy violations
      const violations = []

      // Check amount limits
      if (policy.per_expense_limit && expense.amount > policy.per_expense_limit) {
        violations.push(`Amount ${expense.amount} exceeds per-expense limit of ${policy.per_expense_limit}`)
      }

      // Check if receipt is required
      if (policy.require_receipt_over && expense.amount > policy.require_receipt_over) {
        const { data: receipts } = await supabase
          .from('expense_receipts')
          .select('id')
          .eq('expense_id', expenseId)

        if (!receipts || receipts.length === 0) {
          violations.push(`Receipt required for amounts over ${policy.require_receipt_over}`)
        }
      }

      if (violations.length > 0) {
        return NextResponse.json({
          error: 'Policy violations detected',
          violations
        }, { status: 400 })
      }

      // Check for auto-approval
      if (policy.auto_approve_under && expense.amount < policy.auto_approve_under) {
        // Auto-approve the expense
        const { data: updatedExpense, error: updateError } = await supabase
          .from('expenses')
          .update({
            status: 'approved',
            workflow_id: finalWorkflowId,
            policy_id: finalPolicyId,
            submitted_at: new Date().toISOString(),
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
          console.error('Error auto-approving expense:', updateError)
          return NextResponse.json({ error: 'Failed to auto-approve expense' }, { status: 500 })
        }

        // Create approval record
        await supabase
          .from('expense_approvals')
          .insert({
            expense_id: expenseId,
            step_number: 1,
            approver_id: profile.id, // System auto-approval
            action: 'approve',
            comments: 'Auto-approved under policy threshold'
          })

        return NextResponse.json({
          message: 'Expense auto-approved successfully',
          expense: updatedExpense,
          auto_approved: true
        })
      }
    }

    // Submit expense for manual approval
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        status: 'submitted',
        current_approval_step: 1,
        workflow_id: finalWorkflowId,
        policy_id: finalPolicyId,
        submitted_at: new Date().toISOString(),
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
      console.error('Error submitting expense:', updateError)
      return NextResponse.json({ error: 'Failed to submit expense' }, { status: 500 })
    }

    // TODO: Send notification to approvers
    // TODO: Create approval workflow steps

    return NextResponse.json({
      message: 'Expense submitted for approval successfully',
      expense: updatedExpense
    })

  } catch (error) {
    console.error('Error in POST /api/expense-management/expenses/[id]/submit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}