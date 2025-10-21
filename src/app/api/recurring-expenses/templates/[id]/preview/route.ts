import { NextRequest, NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { previewOccurrences, calculateAnnualCost, type RecurringExpenseTemplate } from '@/lib/financial/recurring-expense-calculator'

/**
 * GET /api/recurring-expenses/templates/[id]/preview
 * Preview future occurrences of a recurring expense template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get query param for count (default 6)
    const searchParams = request.nextUrl.searchParams
    const count = parseInt(searchParams.get('count') || '6', 10)

    // Validate count
    if (count < 1 || count > 100) {
      return NextResponse.json(
        createApiResponse(null, 'Count must be between 1 and 100', false),
        { status: 400 }
      )
    }

    // Fetch the template
    const { data: template, error } = await supabaseAdmin
      .from('recurring_expense_templates')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error || !template) {
      console.error('Error fetching recurring template:', error)
      return NextResponse.json(
        createApiResponse(null, 'Recurring expense template not found', false),
        { status: 404 }
      )
    }

    // Calculate preview occurrences
    const occurrences = previewOccurrences(template as RecurringExpenseTemplate, count)

    // Calculate additional metrics
    const annualCost = calculateAnnualCost(template as RecurringExpenseTemplate)
    const totalPreviewCost = occurrences.reduce((sum, occ) => sum + occ.gross_amount, 0)

    const response = createApiResponse({
      template: {
        id: template.id,
        name: template.name,
        frequency: template.frequency,
        amount: template.amount
      },
      occurrences,
      metrics: {
        count: occurrences.length,
        total_cost: totalPreviewCost,
        annual_cost: annualCost,
        average_monthly_cost: annualCost / 12
      }
    }, `Generated ${occurrences.length} occurrence preview(s)`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Recurring template preview error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
