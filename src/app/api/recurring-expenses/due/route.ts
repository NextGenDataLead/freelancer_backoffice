import { NextRequest, NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { calculateOccurrencesFromStart, type RecurringExpenseTemplate } from '@/lib/financial/recurring-expense-calculator'
import { getCurrentDate } from '@/lib/current-date'

interface DueRecurringExpense {
  template: RecurringExpenseTemplate
  occurrences_due: number
  total_amount: number
  next_occurrence_date: string
  last_occurrence_date: string
}

/**
 * GET /api/recurring-expenses/due
 * Returns recurring expense templates that have occurrences due (past next_occurrence date)
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const currentDate = getCurrentDate()
    const today = new Date(currentDate.getTime())
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().split('T')[0]

    // Get all active recurring expense templates
    const { data: templates, error } = await supabaseAdmin
      .from('recurring_expense_templates')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .lte('next_occurrence', todayIso)
      .order('next_occurrence', { ascending: true })

    if (error) {
      console.error('Error fetching due recurring templates:', error)
      return NextResponse.json(
        createApiResponse(null, 'Failed to fetch due recurring expenses', false),
        { status: 500 }
      )
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json(createApiResponse([], 'No due recurring expenses found'))
    }

    // Calculate how many occurrences are due for each template
    const dueExpenses: DueRecurringExpense[] = []

    for (const template of templates) {
      const expectedOccurrences = calculateOccurrencesFromStart(
        template as RecurringExpenseTemplate,
        today
      )

      if (expectedOccurrences.length === 0) {
        continue
      }

      const dueOccurrences = expectedOccurrences.filter(occ => {
        const occDate = new Date(occ.date)
        occDate.setHours(0, 0, 0, 0)
        return occDate <= today
      })

      if (dueOccurrences.length === 0) {
        continue
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

      if (outstandingOccurrences.length > 0) {
        const totalAmount = outstandingOccurrences.reduce((sum, occ) => sum + occ.gross_amount, 0)

        dueExpenses.push({
          template: template as RecurringExpenseTemplate,
          occurrences_due: outstandingOccurrences.length,
          total_amount: totalAmount,
          next_occurrence_date: outstandingOccurrences[0].date,
          last_occurrence_date: outstandingOccurrences[outstandingOccurrences.length - 1].date
        })
      }
    }

    const response = createApiResponse(
      dueExpenses,
      `Found ${dueExpenses.length} recurring expense(s) with due occurrences`
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Due recurring expenses GET error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
