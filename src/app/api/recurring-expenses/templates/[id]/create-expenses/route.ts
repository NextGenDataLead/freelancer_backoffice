import { NextRequest, NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  isValidUUID
} from '@/lib/supabase/financial-client'
import { calculateOccurrencesFromStart, calculateNextOccurrence, type RecurringExpenseTemplate } from '@/lib/financial/recurring-expense-calculator'
import { getCurrentDate } from '@/lib/current-date'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/recurring-expenses/templates/[id]/create-expenses
 * Creates actual expense records from a recurring template's due occurrences
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const canCreate = await canUserCreateData()
    if (!canCreate) {
      return NextResponse.json(ApiErrors.GracePeriodActive, { status: ApiErrors.GracePeriodActive.status })
    }

    const templateId = params.id

    if (!isValidUUID(templateId)) {
      const validationError = ApiErrors.ValidationError('Invalid template ID format')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Fetch the template
    const { data: template, error: fetchError } = await supabaseAdmin
      .from('recurring_expense_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError) {
      console.error('Error fetching template:', fetchError)
      if (fetchError.code === 'PGRST116') {
        const notFoundError = ApiErrors.NotFound('Recurring expense template')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    if (!template.is_active) {
      return NextResponse.json(
        createApiResponse(null, 'Template is not active', false),
        { status: 400 }
      )
    }

    const currentDate = getCurrentDate()
    const today = new Date(currentDate.getTime())
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().split('T')[0]
    const nowIso = new Date(currentDate.getTime()).toISOString()

    // Calculate all occurrences that are due
    const expectedOccurrences = calculateOccurrencesFromStart(
      template as RecurringExpenseTemplate,
      today
    )

    const dueOccurrences = expectedOccurrences.filter(occ => {
      const occDate = new Date(occ.date)
      occDate.setHours(0, 0, 0, 0)
      return occDate <= today
    })

    if (dueOccurrences.length === 0) {
      return NextResponse.json(
        createApiResponse(null, 'No due occurrences for this template', false),
        { status: 400 }
      )
    }

    const { data: recordedExpenses, error: recordedError } = await supabaseAdmin
      .from('expenses')
      .select('id, metadata, expense_date')
      .eq('tenant_id', profile.tenant_id)
      .eq('metadata->>template_id', template.id)
      .lte('expense_date', todayIso)

    if (recordedError) {
      console.error('Error fetching recorded expenses for template:', template.id, recordedError)
    }

    const recordedDates = new Set<string>()
    recordedExpenses?.forEach(expense => {
      const occurrenceDate = expense.metadata?.occurrence_date
      if (occurrenceDate) {
        recordedDates.add(occurrenceDate)
      }
    })

    const outstandingOccurrences = dueOccurrences.filter(occ => !recordedDates.has(occ.date))

    if (outstandingOccurrences.length === 0) {
      return NextResponse.json(
        createApiResponse(null, 'No outstanding occurrences for this template', false),
        { status: 400 }
      )
    }

    // Create expense records for each due occurrence
    const expensesToCreate = outstandingOccurrences.map(occ => ({
      tenant_id: profile.tenant_id,
      title: template.name,
      description: template.description || `Automatic expense from recurring template`,
      expense_date: occ.date,
      amount: occ.gross_amount,
      currency: template.currency || 'EUR',
      category_id: template.category_id,
      expense_type: template.category_id ? undefined : 'overige_zakelijk',
      payment_method: template.payment_method,
      status: 'draft',
      submitted_by: profile.id,
      submitted_at: nowIso,
      vendor_name: null,
      vat_rate: template.vat_rate,
      vat_amount: occ.vat_amount,
      is_vat_deductible: template.is_vat_deductible,
      business_percentage: template.business_use_percentage,
      metadata: {
        source: 'recurring_template',
        template_id: template.id,
        template_name: template.name,
        occurrence_date: occ.date
      }
    }))

    // Insert all expenses
    const { data: createdExpenses, error: createError } = await supabaseAdmin
      .from('expenses')
      .insert(expensesToCreate)
      .select()

    if (createError) {
      console.error('Error creating expenses:', createError)
      return NextResponse.json(
        createApiResponse(null, 'Failed to create expenses from template', false),
        { status: 500 }
      )
    }

    // Calculate next occurrence date after today
    const nextOccurrenceDate = calculateNextOccurrence(
      template as RecurringExpenseTemplate,
      today
    )

    // Update template's next_occurrence
    const { error: updateError } = await supabaseAdmin
      .from('recurring_expense_templates')
      .update({
        next_occurrence: nextOccurrenceDate.toISOString().split('T')[0],
        updated_at: nowIso
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Error updating template next_occurrence:', updateError)
      // Don't fail the request, expenses were created successfully
    }

    const response = createApiResponse(
      {
        expenses: createdExpenses,
        count: createdExpenses.length,
        template: template,
        next_occurrence: nextOccurrenceDate.toISOString().split('T')[0]
      },
      `Created ${createdExpenses.length} expense(s) from template`
    )
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Create expenses from template error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
