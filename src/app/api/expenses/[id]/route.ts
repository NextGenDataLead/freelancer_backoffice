import { NextResponse } from 'next/server'
import { UpdateExpenseSchema, VerifyExpenseSchema } from '@/lib/validations/financial'
import type { Expense, ExpenseWithSupplier, FinancialApiResponse } from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createTransactionLog,
  isValidUUID
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/expenses/[id]
 * Retrieves a specific expense by ID with supplier information
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const expenseId = params.id

    // Validate UUID format
    if (!isValidUUID(expenseId)) {
      const validationError = ApiErrors.ValidationError('Invalid expense ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Fetch expense with supplier data
    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .select(`
        *,
        supplier:clients(
          id,
          name,
          company_name,
          email,
          phone,
          address,
          postal_code,
          city,
          country_code,
          vat_number
        ),
        verified_by_user:profiles!expenses_verified_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Error fetching expense:', error)
      if (error.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Expense')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(expense, 'Expense fetched successfully')
    return NextResponse.json(response)
  } catch (error) {
    console.error('Expense fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * PUT /api/expenses/[id]
 * Updates a specific expense by ID
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Check if user can create data (not in grace period)
    const canCreate = await canUserCreateData()
    if (!canCreate) {
      return NextResponse.json(ApiErrors.GracePeriodActive, { status: ApiErrors.GracePeriodActive.status })
    }

    const expenseId = params.id
    const body = await request.json()

    // Validate request data
    const validatedData = UpdateExpenseSchema.parse({ ...body, id: expenseId })

    // Fetch existing expense
    const { data: existingExpense, error: fetchError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing expense:', fetchError)
      if (fetchError.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Expense')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Verify supplier exists and belongs to tenant (if provided)
    if (validatedData.supplier_id) {
      const { data: supplier, error: supplierError } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('id', validatedData.supplier_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_supplier', true)
        .single()

      if (supplierError || !supplier) {
        const notFoundError = ApiErrors.NotFound('Supplier')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
    }

    // Remove id from validated data for update
    const { id, ...updateData } = validatedData
    
    // Calculate VAT amount if amount or VAT rate changed
    if (updateData.amount !== undefined || updateData.vat_rate !== undefined) {
      const amount = updateData.amount ?? existingExpense.amount
      const vatRate = updateData.vat_rate ?? existingExpense.vat_rate
      
      updateData.vat_amount = Math.round(amount * vatRate * 100) / 100
      updateData.total_amount = amount + updateData.vat_amount
    }

    // Update expense
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('expenses')
      .update({
        ...updateData,
        updated_at: getCurrentDate().toISOString()
      })
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        *,
        supplier:clients(
          id,
          name,
          company_name,
          email,
          country_code
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating expense:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'expense',
      expenseId,
      'updated',
      profile.id,
      existingExpense,
      updatedExpense,
      request
    )

    const response = createApiResponse(updatedExpense, 'Expense updated successfully')
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Expense update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * DELETE /api/expenses/[id]
 * Deletes a specific expense by ID
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const expenseId = params.id

    // Validate UUID format
    if (!isValidUUID(expenseId)) {
      const validationError = ApiErrors.ValidationError('Invalid expense ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Fetch existing expense
    const { data: existingExpense, error: fetchError } = await supabaseAdmin
      .from('expenses')
      .select('id, description, total_amount, expense_date')
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching existing expense:', fetchError)
      if (fetchError.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Expense')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Delete expense
    const { error: deleteError } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      console.error('Error deleting expense:', deleteError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'expense',
      expenseId,
      'deleted',
      profile.id,
      existingExpense,
      null,
      request
    )

    return NextResponse.json({
      success: true,
      message: `Expense "${existingExpense.description}" deleted successfully`
    })

  } catch (error) {
    console.error('Expense deletion error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}