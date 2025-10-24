import { NextResponse } from 'next/server'
import { VerifyExpenseSchema } from '@/lib/validations/financial'
import type { Expense, FinancialApiResponse } from '@/lib/types/financial'
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
 * PATCH /api/expenses/[id]/verify
 * Marks an expense as verified or unverified
 * This is important for OCR-extracted expenses that need manual confirmation
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
    const body = await request.json()

    // Validate request data
    const validatedData = VerifyExpenseSchema.parse({ ...body, id: expenseId })
    const isVerified = validatedData.verified

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

    // Prepare update data based on verification status
    const updateData = {
      requires_manual_review: !isVerified,
      verified_at: isVerified ? getCurrentDate().toISOString() : null,
      verified_by: isVerified ? profile.id : null,
      updated_at: getCurrentDate().toISOString()
    }

    // Update expense verification status
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating expense verification:', updateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log for verification change
    await createTransactionLog(
      profile.tenant_id,
      'expense',
      expenseId,
      isVerified ? 'verified' : 'unverified',
      profile.id,
      {
        verified_at: existingExpense.verified_at,
        verified_by: existingExpense.verified_by,
        requires_manual_review: existingExpense.requires_manual_review
      },
      {
        verified_at: updateData.verified_at,
        verified_by: updateData.verified_by,
        requires_manual_review: updateData.requires_manual_review
      },
      request
    )

    const message = isVerified 
      ? 'Expense verified successfully' 
      : 'Expense marked as requiring verification'

    const response = createApiResponse(updatedExpense, message)
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Expense verification error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * GET /api/expenses/[id]/verify
 * Gets current verification status and OCR confidence data
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

    // Fetch expense verification data
    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .select(`
        id,
        description,
        requires_manual_review,
        verified_at,
        verified_by,
        ocr_confidence_score,
        ocr_extracted_fields
      `)
      .eq('id', expenseId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Error fetching expense verification status:', error)
      if (error.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Expense')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Determine verification status
    const isVerified = !expense.requires_manual_review && expense.verified_at !== null
    const requiresVerification = expense.requires_manual_review
    const hasOCRData = expense.ocr_extracted_fields !== null
    const ocrConfidence = expense.ocr_confidence_score || 0

    // Determine confidence level
    let confidenceLevel = 'unknown'
    if (ocrConfidence >= 0.9) confidenceLevel = 'high'
    else if (ocrConfidence >= 0.7) confidenceLevel = 'medium'
    else if (ocrConfidence >= 0.5) confidenceLevel = 'low'
    else confidenceLevel = 'very_low'

    const response = createApiResponse({
      is_verified: isVerified,
      requires_verification: requiresVerification,
      verified_at: expense.verified_at,
      verified_by: expense.verified_by,
      has_ocr_data: hasOCRData,
      ocr_confidence: ocrConfidence,
      confidence_level: confidenceLevel,
      can_auto_verify: ocrConfidence >= 0.9 && hasOCRData
    }, 'Expense verification status retrieved successfully')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Expense verification status fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}