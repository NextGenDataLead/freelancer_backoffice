import { NextRequest, NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

/**
 * PATCH /api/recurring-expenses/templates/[id]
 * Update a recurring expense template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()

    // Validate frequency if provided
    if (body.frequency) {
      const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly']
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          createApiResponse(null, `Frequency must be one of: ${validFrequencies.join(', ')}`, false),
          { status: 400 }
        )
      }
    }

    // Validate amount if provided
    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json(
        createApiResponse(null, 'Amount must be greater than 0', false),
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

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date(getCurrentDate().getTime()).toISOString()
    }

    const allowedFields = [
      'name',
      'description',
      'category_id',
      'amount',
      'currency',
      'frequency',
      'start_date',
      'end_date',
      'next_occurrence',
      'day_of_month',
      'amount_escalation_percentage',
      'last_escalation_date',
      'vat_rate',
      'is_vat_deductible',
      'business_use_percentage',
      'supplier_id',
      'payment_method',
      'is_billable',
      'client_id',
      'is_active',
      'notes',
      'tags',
      'metadata'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Update the template (RLS will ensure user can only update their tenant's templates)
    const { data: template, error } = await supabaseAdmin
      .from('recurring_expense_templates')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating recurring template:', error)
      return NextResponse.json(
        createApiResponse(null, 'Failed to update recurring expense template', false),
        { status: 500 }
      )
    }

    if (!template) {
      return NextResponse.json(
        createApiResponse(null, 'Recurring expense template not found', false),
        { status: 404 }
      )
    }

    const response = createApiResponse(
      template,
      'Recurring expense template updated successfully'
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Recurring templates PATCH error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * DELETE /api/recurring-expenses/templates/[id]
 * Delete a recurring expense template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Delete the template (RLS will ensure user can only delete their tenant's templates)
    const { data, error } = await supabaseAdmin
      .from('recurring_expense_templates')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
      .select()

    if (error) {
      console.error('Error deleting recurring template:', error)
      return NextResponse.json(
        createApiResponse(null, 'Failed to delete recurring expense template', false),
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        createApiResponse(null, 'Recurring expense template not found', false),
        { status: 404 }
      )
    }

    const response = createApiResponse(
      { id: params.id },
      'Recurring expense template deleted successfully'
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Recurring templates DELETE error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * GET /api/recurring-expenses/templates/[id]
 * Get a single recurring expense template with details
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

    const { data: template, error } = await supabaseAdmin
      .from('recurring_expense_templates')
      .select(`
        *,
        category:expense_categories(id, name),
        supplier:supplier_id(id, name, company_name),
        client:client_id(id, name, company_name)
      `)
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

    const response = createApiResponse(
      template,
      'Recurring expense template retrieved successfully'
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Recurring templates GET error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
