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



    // Remove id from validated data for update
    const { id, ...updateData } = validatedData

    const dbUpdates: Record<string, any> = {}

    if (updateData.vendor_name !== undefined) {
      dbUpdates.vendor_name = updateData.vendor_name
    }

    if (updateData.expense_date !== undefined) {
      const formattedDate = updateData.expense_date instanceof Date
        ? updateData.expense_date.toISOString().split('T')[0]
        : updateData.expense_date.toString().split('T')[0]
      dbUpdates.expense_date = formattedDate
    }

    if (updateData.description !== undefined) {
      dbUpdates.description = updateData.description
      dbUpdates.title = updateData.description
    }

    if (updateData.category !== undefined) {
      dbUpdates.expense_type = updateData.category
    }

    if (updateData.is_deductible !== undefined) {
      dbUpdates.is_vat_deductible = updateData.is_deductible
    }



    if (updateData.receipt_url !== undefined) {
      dbUpdates.receipt_url = updateData.receipt_url
    }

    const existingAmount = parseFloat(existingExpense.amount)
    const existingVatRate = parseFloat(existingExpense.vat_rate ?? 0)
    const amountValueRaw = updateData.amount ?? existingAmount
    const vatRateValueRaw = updateData.vat_rate ?? existingVatRate
    const amountValue = typeof amountValueRaw === 'string' ? parseFloat(amountValueRaw) : amountValueRaw
    const vatRateValue = typeof vatRateValueRaw === 'string' ? parseFloat(vatRateValueRaw) : vatRateValueRaw

    if ((updateData.amount !== undefined || updateData.vat_rate !== undefined || updateData.vat_amount !== undefined) && (!Number.isFinite(amountValue) || !Number.isFinite(vatRateValue))) {
      console.error('[expenses:update] invalid numeric values', { amount: amountValueRaw, vatRate: vatRateValueRaw })
      const validationError = ApiErrors.ValidationError('Invalid amount or VAT rate')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    if (updateData.amount !== undefined) {
      dbUpdates.amount = amountValue
    }

    if (updateData.vat_rate !== undefined) {
      dbUpdates.vat_rate = vatRateValue
    }

    if (updateData.amount !== undefined || updateData.vat_rate !== undefined || updateData.vat_amount !== undefined) {
      const computedVatAmount = Math.round(amountValue * vatRateValue * 100) / 100
      let finalVatAmount = computedVatAmount

      if (updateData.vat_amount !== undefined) {
        const providedVatAmount = typeof updateData.vat_amount === 'string'
          ? parseFloat(updateData.vat_amount)
          : updateData.vat_amount

        if (!Number.isFinite(providedVatAmount)) {
          console.error('[expenses:update] invalid vat_amount value', { vat_amount: updateData.vat_amount })
          const validationError = ApiErrors.ValidationError('Invalid VAT amount')
          return NextResponse.json(validationError, { status: validationError.status })
        }

        finalVatAmount = providedVatAmount
      }

      dbUpdates.vat_amount = finalVatAmount
      dbUpdates.vat_rate = vatRateValue
      dbUpdates.vat_type = vatRateValue === -1 ? 'reverse_charge' : 'standard'
      dbUpdates.is_reverse_charge = vatRateValue === -1
    }

    if (Object.keys(dbUpdates).length === 0) {
      const response = createApiResponse(existingExpense, 'Expense updated successfully')
      return NextResponse.json(response)
    }

    console.log('[expenses:update] applying updates:', dbUpdates)

    // Update expense
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('expenses')
      .update({
        ...dbUpdates,
        updated_at: getCurrentDate().toISOString()
      })
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        *
      `)
      .single()

    if (updateError) {
      console.error('Error updating expense:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    console.log('[expenses:update] update succeeded for expense', expenseId)

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

    const recurringTemplateId = existingExpense.metadata?.template_id || existingExpense.metadata?.template
    const occurrenceDate = existingExpense.metadata?.occurrence_date || existingExpense.metadata?.recurring_date
    let metricsRefreshHint: { templateId?: string } | undefined

    if (recurringTemplateId) {
      metricsRefreshHint = { templateId: recurringTemplateId }

      if (occurrenceDate) {
        try {
          const { data: template, error: templateError } = await supabaseAdmin
            .from('recurring_expense_templates')
            .select('next_occurrence')
            .eq('id', recurringTemplateId)
            .eq('tenant_id', profile.tenant_id)
            .single()

          if (!templateError && template) {
            const deletedOccurrence = new Date(occurrenceDate)
            const currentNext = template.next_occurrence ? new Date(template.next_occurrence) : null

            if (!currentNext || deletedOccurrence < currentNext) {
              const normalizedDate = deletedOccurrence.toISOString().split('T')[0]
              const { error: updateTemplateError } = await supabaseAdmin
                .from('recurring_expense_templates')
                .update({ next_occurrence: normalizedDate })
                .eq('id', recurringTemplateId)
                .eq('tenant_id', profile.tenant_id)

              if (updateTemplateError) {
                console.error('Failed to reset recurring template next_occurrence:', updateTemplateError)
              }
            }
          }
        } catch (err) {
          console.error('Failed to adjust recurring template after deletion:', err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Expense "${existingExpense.description}" deleted successfully`,
      deletedExpenseId: expenseId,
      metricsRefreshHint
    })

  } catch (error) {
    console.error('Expense deletion error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * PATCH /api/expenses/[id]
 * Updates the status of a specific expense by ID
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const expenseId = params.id
    const body = await request.json()

    // Validate request data
    const { status } = body
    if (status !== 'approved' && status !== 'draft') {
      const validationError = ApiErrors.ValidationError('Invalid status')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Update expense status
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('expenses')
      .update({ status, updated_at: getCurrentDate().toISOString() })
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating expense status:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(updatedExpense, 'Expense status updated successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Expense status update error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
