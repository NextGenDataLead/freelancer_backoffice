import { NextRequest, NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import {
  previewOccurrences,
  calculateAnnualCost,
  calculateOccurrencesFromStart,
  type RecurringExpenseTemplate
} from '@/lib/financial/recurring-expense-calculator'
import { getCurrentDate } from '@/lib/current-date'

/**
 * GET /api/recurring-expenses/templates
 * List all recurring expense templates for the authenticated user's tenant
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')
    const categoryId = searchParams.get('category_id')

    // Build query
    let query = supabaseAdmin
      .from('recurring_expense_templates')
      .select(`
        *,
        category:expense_categories(id, name)

      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching recurring templates:', error)
      return NextResponse.json(
        createApiResponse(null, 'Failed to fetch recurring expense templates', false),
        { status: 500 }
      )
    }

    const currentDate = getCurrentDate()
    const today = new Date(currentDate.getTime())
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().split('T')[0]

    // Add computed fields
    const enrichedTemplates = await Promise.all(
      templates.map(async template => {
        const recurringTemplate = template as RecurringExpenseTemplate
        const expectedOccurrences = calculateOccurrencesFromStart(recurringTemplate, today)

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

        const outstandingOccurrences = expectedOccurrences.filter(occ => !recordedDates.has(occ.date))

        const outstandingAmount = outstandingOccurrences.reduce((sum, occ) => sum + occ.gross_amount, 0)

        return {
          ...template,
          annual_cost: calculateAnnualCost(recurringTemplate),
          next_6_occurrences: previewOccurrences(recurringTemplate, 6),
          expected_occurrences: expectedOccurrences.length,
          recorded_occurrences: recordedDates.size,
          outstanding_occurrences: outstandingOccurrences.length,
          outstanding_amount: outstandingAmount,
          next_outstanding_occurrence: outstandingOccurrences[0]?.date ?? null
        }
      })
    )

    const response = createApiResponse(
      enrichedTemplates,
      `Found ${enrichedTemplates.length} recurring expense template(s)`
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Recurring templates GET error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/recurring-expenses/templates
 * Create a new recurring expense template
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.amount || !body.frequency || !body.start_date) {
      return NextResponse.json(
        createApiResponse(null, 'Missing required fields: name, amount, frequency, start_date', false),
        { status: 400 }
      )
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        createApiResponse(null, 'Amount must be greater than 0', false),
        { status: 400 }
      )
    }

    // Validate frequency
    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly']
    if (!validFrequencies.includes(body.frequency)) {
      return NextResponse.json(
        createApiResponse(null, `Frequency must be one of: ${validFrequencies.join(', ')}`, false),
        { status: 400 }
      )
    }

    // Validate billable logic
    if (body.is_billable && !body.client_id) {
      return NextResponse.json(
        createApiResponse(null, 'client_id required when is_billable is true', false),
        { status: 400 }
      )
    }

    // Calculate next_occurrence from start_date
    const startDate = new Date(body.start_date)
    const nextOccurrence = body.next_occurrence || body.start_date

    // Prepare insert data
    const insertData = {
      tenant_id: profile.tenant_id,
      created_by: profile.id,
      name: body.name,
      description: body.description || null,
      category_id: body.category_id || null,
      amount: body.amount,
      currency: body.currency || 'EUR',
      frequency: body.frequency,
      start_date: body.start_date,
      end_date: body.end_date || null,
      next_occurrence: nextOccurrence,
      day_of_month: body.day_of_month || null,
      amount_escalation_percentage: body.amount_escalation_percentage || null,
      last_escalation_date: body.last_escalation_date || null,
      vat_rate: body.vat_rate || 21.00,
      is_vat_deductible: body.is_vat_deductible !== undefined ? body.is_vat_deductible : true,
      business_use_percentage: body.business_use_percentage || 100.00,
      supplier_id: body.supplier_id || null,
      payment_method: body.payment_method || null,
      is_billable: body.is_billable || false,
      client_id: body.client_id || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      notes: body.notes || null,
      tags: body.tags || [],
      metadata: body.metadata || {}
    }

    const { data: template, error } = await supabaseAdmin
      .from('recurring_expense_templates')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating recurring template:', error)
      return NextResponse.json(
        createApiResponse(null, 'Failed to create recurring expense template', false),
        { status: 500 }
      )
    }

    const response = createApiResponse(
      template,
      'Recurring expense template created successfully'
    )
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Recurring templates POST error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
