import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { UpdateExpenseRequest } from '@/lib/types/expenses'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

const UpdateEmployeeExpenseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().max(999999.99).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']).optional(),
  category_id: z.string().uuid().optional(),
  expense_type: z.enum(['travel', 'meals', 'office_supplies', 'software', 'marketing', 'professional', 'utilities', 'other']).optional(),
  payment_method: z.enum(['corporate_card', 'personal_card', 'cash', 'bank_transfer', 'other']).optional(),
  project_code: z.string().max(50).optional(),
  cost_center: z.string().max(50).optional(),
  vendor_name: z.string().max(200).optional(),
  reference_number: z.string().max(100).optional(),
  requires_reimbursement: z.boolean().optional(),
  is_billable: z.boolean().optional(),
  client_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * GET /api/expense-management/expenses/[id] - Get specific expense
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const expenseId = params.id

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expenseId)) {
      return NextResponse.json({ error: 'Invalid expense ID format' }, { status: 400 })
    }

    // Get current user profile

    // Fetch expense with all related data
    const { data: expense, error } = await supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(id, name, expense_type),
        receipts:expense_receipts(
          id, 
          filename, 
          file_path, 
          file_size, 
          mime_type, 
          ocr_status,
          ocr_data,
          is_verified,
          created_at
        ),
        submitted_by_profile:profiles!submitted_by(id, first_name, last_name, email),
        approvals:expense_approvals(
          id,
          step_number,
          action,
          comments,
          approved_amount,
          created_at,
          approver:profiles!approver_id(id, first_name, last_name, email)
        )
      `)
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Error fetching expense:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
    }

    // Check if user can access this expense (own expense or admin)
    if (expense.submitted_by !== profile.id) {
      // TODO: Add admin role check
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      message: 'Expense fetched successfully',
      expense
    })

  } catch (error) {
    console.error('Error in GET /api/expense-management/expenses/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/expense-management/expenses/[id] - Update expense
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const validation = UpdateEmployeeExpenseSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const updateData = validation.data

    // Get current user profile

    // Fetch existing expense
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
    }

    // Check if user can edit this expense
    if (existingExpense.submitted_by !== profile.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if expense is in an editable state
    if (!['draft', 'rejected'].includes(existingExpense.status)) {
      return NextResponse.json({
        error: 'Expense cannot be edited',
        details: 'Only draft or rejected expenses can be edited'
      }, { status: 400 })
    }

    // Validate category if being updated
    if (updateData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('id', updateData.category_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .single()

      if (categoryError || !category) {
        return NextResponse.json({
          error: 'Invalid category',
          details: 'Category not found or not active'
        }, { status: 400 })
      }
    }

    // Update expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        *,
        category:expense_categories(id, name, expense_type),
        receipts:expense_receipts(id, filename, ocr_status),
        submitted_by_profile:profiles!submitted_by(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating expense:', updateError)
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    })

  } catch (error) {
    console.error('Error in PUT /api/expense-management/expenses/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/expense-management/expenses/[id] - Delete expense
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const expenseId = params.id

    // Get current user profile

    // Fetch existing expense
    const { data: existingExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, title, status, submitted_by')
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
    }

    // Check if user can delete this expense
    if (existingExpense.submitted_by !== profile.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if expense can be deleted
    if (!['draft', 'rejected'].includes(existingExpense.status)) {
      return NextResponse.json({
        error: 'Expense cannot be deleted',
        details: 'Only draft or rejected expenses can be deleted'
      }, { status: 400 })
    }

    // Delete expense (cascading deletes will handle receipts and approvals)
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting expense:', deleteError)
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Expense "${existingExpense.title}" deleted successfully`
    })

  } catch (error) {
    console.error('Error in DELETE /api/expense-management/expenses/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}