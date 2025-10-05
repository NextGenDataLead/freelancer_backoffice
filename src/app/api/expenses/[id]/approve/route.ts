import { NextResponse } from 'next/server'
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
 * PATCH /api/expenses/[id]/approve
 * Toggles expense approval status between 'draft' and 'approved'
 * This triggers BTW calculation updates via database triggers
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

    // Validate UUID format
    if (!isValidUUID(expenseId)) {
      const validationError = ApiErrors.ValidationError('Invalid expense ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    const body = await request.json()
    const { approved } = body

    if (typeof approved !== 'boolean') {
      const validationError = ApiErrors.ValidationError('approved field must be a boolean')
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

    // Determine new status
    const newStatus = approved ? 'approved' : 'draft'

    // Prepare update data
    const updateData = {
      status: newStatus,
      updated_at: getCurrentDate().toISOString()
    }

    // Update expense approval status
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating expense approval:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log for approval change
    await createTransactionLog(
      profile.tenant_id,
      'expense',
      expenseId,
      approved ? 'approved' : 'unapproved',
      profile.id,
      { status: existingExpense.status },
      { status: newStatus },
      request
    )

    const message = approved 
      ? 'Expense approved successfully - BTW calculations updated' 
      : 'Expense approval removed'

    const response = createApiResponse(updatedExpense, message)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Expense approval error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}