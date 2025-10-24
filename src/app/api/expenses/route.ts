import { NextResponse } from 'next/server'
import {
  CreateExpenseSchema,
  CreateExpenseWithRecurringSchema,
  ExpensesQuerySchema
} from '@/lib/validations/financial'
import type { 
  Expense,
  ExpenseWithSupplier,
  PaginatedFinancialResponse 
} from '@/lib/types/financial'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createPaginatedResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'

/**
 * GET /api/expenses
 * Retrieves paginated list of expenses for the current tenant
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = ExpensesQuerySchema.parse(queryParams)

    // Build query without supplier join (expenses are for tenant, not clients)
    let query = supabaseAdmin
      .from('expenses')
      .select('id, tenant_id, title, description, expense_date, amount, currency, category_id, expense_type, payment_method, status, submitted_by, submitted_at, project_code, cost_center, vendor_name, reference_number, requires_reimbursement, client_id, tags, metadata, vat_rate, vat_amount, vat_type, is_vat_deductible, business_percentage, supplier_country_code, supplier_vat_number, is_reverse_charge, requires_manual_review, verified_at, verified_by, created_at, updated_at', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('expense_date', { ascending: false })

    // Apply filters
    if (validatedQuery.category) {
      query = query.eq('category', validatedQuery.category)
    }

    if (validatedQuery.supplier_id) {
      query = query.eq('client_id', validatedQuery.supplier_id)
    }

    if (validatedQuery.date_from) {
      query = query.gte('expense_date', validatedQuery.date_from)
    }

    if (validatedQuery.date_to) {
      query = query.lte('expense_date', validatedQuery.date_to)
    }

    if (validatedQuery.verified !== undefined) {
      if (validatedQuery.verified) {
        query = query.not('verified_at', 'is', null)
      } else {
        query = query.is('verified_at', null)
      }
    }

    // Apply pagination
    const from = (validatedQuery.page - 1) * validatedQuery.limit
    const to = from + validatedQuery.limit - 1
    
    query = query.range(from, to)

    const { data: expenses, error, count } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Transform expenses to add calculated fields and supplier info
    const transformedExpenses = (expenses || []).map(expense => ({
      ...expense,
      category: expense.expense_type,  // Map expense_type to category
      is_deductible: expense.is_vat_deductible,  // Map is_vat_deductible to is_deductible
      total_amount: parseFloat(expense.amount) + parseFloat(expense.vat_amount || 0),
      manual_verification_required: expense.requires_manual_review ?? true,
      verified_at: expense.verified_at,
      receipt_url: null,
      supplier: expense.vendor_name ? {
        id: null,
        name: expense.vendor_name,
        company_name: expense.vendor_name,
        email: null,
        country_code: expense.supplier_country_code || 'NL',
        vat_number: expense.supplier_vat_number || null
      } : null
    }))

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response = createPaginatedResponse(
      transformedExpenses, 
      'Expenses fetched successfully',
      {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: count || 0,
        totalPages
      }
    )

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Expenses fetch error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/expenses
 * Creates a new expense entry
 */
export async function POST(request: Request) {
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

    const body = await request.json()

    // Validate request data - use extended schema if recurring
    const isRecurring = body.is_recurring === true
    const validatedData = isRecurring
      ? CreateExpenseWithRecurringSchema.parse(body)
      : CreateExpenseSchema.parse(body)

    // Note: Expenses are primarily for the tenant itself, not linked to clients

    // EU countries for acquisition type classification
    const EU_COUNTRIES = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']

    // Determine acquisition type based on supplier country and category
    let acquisitionType = 'domestic' // Default for NL or unknown
    if (validatedData.supplier_country && validatedData.supplier_country !== 'NL') {
      if (EU_COUNTRIES.includes(validatedData.supplier_country)) {
        // EU country - determine if goods or services based on category
        const serviceCategories = ['professionele_diensten', 'software_ict', 'marketing_reclame', 'telefoon_communicatie']
        acquisitionType = serviceCategories.includes(validatedData.category) ? 'eu_services' : 'eu_goods'
      } else {
        // Non-EU country
        const serviceCategories = ['professionele_diensten', 'software_ict', 'marketing_reclame', 'telefoon_communicatie']
        acquisitionType = serviceCategories.includes(validatedData.category) ? 'import_services' : 'import_goods'
      }
    }

    // Calculate VAT amount if not provided
    let vatAmount = validatedData.vat_amount
    if (vatAmount === undefined || vatAmount === 0) {
      vatAmount = Math.round(validatedData.amount * validatedData.vat_rate * 100) / 100
    }

    // Total amount will be calculated by the database/frontend as amount + vat_amount

    // Map form data to database schema
    const expenseDbData = {
      title: validatedData.description, // DB uses 'title' field
      description: validatedData.description,
      vendor_name: validatedData.vendor_name,
      expense_date: validatedData.expense_date,
      amount: validatedData.amount,
      currency: 'EUR', // Required field - default to EUR for Dutch ZZP
      vat_amount: vatAmount,
      vat_rate: validatedData.vat_rate,
      vat_type: validatedData.vat_rate === -1 ? 'reverse_charge' : 'standard',
      is_reverse_charge: validatedData.vat_rate === -1,
      is_vat_deductible: validatedData.is_deductible,
      expense_type: validatedData.category,
      payment_method: 'bank_transfer', // Required field - default payment method
      status: 'draft',
      tenant_id: profile.tenant_id,
      submitted_by: profile.id,
      supplier_country: validatedData.supplier_country || 'NL',
      acquisition_type: acquisitionType,
      // Optional fields - only include if they have values
      ...(validatedData.supplier_id && { supplier_id: validatedData.supplier_id }),
      ...(validatedData.receipt_url && { receipt_url: validatedData.receipt_url })
    }

    // Create expense
    const { data: newExpense, error: createError } = await supabaseAdmin
      .from('expenses')
      .insert(expenseDbData)
      .select('*')
      .single()

    if (createError) {
      console.error('Error creating expense:', createError)
      console.error('Expense data that failed:', expenseDbData)
      return NextResponse.json(
        { success: false, error: 'Database error: ' + createError.message, details: createError },
        { status: 500 }
      )
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'expense',
      newExpense.id,
      'created',
      profile.id,
      null,
      newExpense,
      request
    )

    let templateId: string | null = null

    // Create recurring template if requested
    if (isRecurring && 'recurring_config' in validatedData && validatedData.recurring_config) {
      const config = validatedData.recurring_config

      console.log('=== RECURRING TEMPLATE CREATION DEBUG ===')
      console.log('Is recurring:', isRecurring)
      console.log('Recurring config received:', config)
      console.log('Validated expense data:', validatedData)

      // Prepare OCR metadata if available from body
      const ocrMetadata = body.ocr_result?.extracted_data ? {
        supplier_country_code: validatedData.supplier_country,
        requires_reverse_charge: validatedData.vat_rate === -1,
        supplier_vat_number: body.ocr_result.extracted_data.validated_supplier?.vat_number,
        vat_validation_status: body.ocr_result.extracted_data.vat_validation_status
      } : null

      const templateData = {
        name: config.template_name,
        description: validatedData.description,
        vendor_name: validatedData.vendor_name, // Now stored in column
        amount: validatedData.amount,
        currency: 'EUR',
        frequency: config.frequency,
        start_date: config.start_date,
        end_date: config.end_date || null,
        day_of_month: config.day_of_month || null,
        amount_escalation_percentage: config.amount_escalation_percentage || null,
        vat_rate: validatedData.vat_rate,
        is_vat_deductible: validatedData.is_deductible,
        expense_type: validatedData.category, // Now stored in column
        vat_type: validatedData.vat_rate === -1 ? 'reverse_charge' : 'standard', // Now stored in column
        supplier_country: validatedData.supplier_country || 'NL', // Now stored in column
        business_use_percentage: 100, // Default to 100% business use
        tenant_id: profile.tenant_id,
        is_active: true,
        next_occurrence: config.start_date,
        ocr_metadata: ocrMetadata, // Still store OCR metadata for audit trail
        // Optional: link to supplier if we have supplier_id
        ...(validatedData.supplier_id && { supplier_id: validatedData.supplier_id })
      }

      console.log('Template data to be inserted:', JSON.stringify(templateData, null, 2))

      const { data: template, error: templateError } = await supabaseAdmin
        .from('recurring_expense_templates')
        .insert(templateData)
        .select('id')
        .single()

      if (templateError) {
        console.error('❌ ERROR creating recurring template:', templateError)
        console.error('Error details:', JSON.stringify(templateError, null, 2))
        console.error('Template data that failed:', JSON.stringify(templateData, null, 2))
        // Don't fail the whole request, just log the error
        console.warn('Expense created but recurring template failed:', newExpense.id)
      } else {
        templateId = template.id
        console.log('✅ Successfully created recurring template:', templateId, 'for expense:', newExpense.id)
      }
      console.log('=== END RECURRING TEMPLATE DEBUG ===')
    }

    const responseData = {
      ...newExpense,
      ...(templateId && { template_id: templateId })
    }

    const message = isRecurring && templateId
      ? 'Expense and recurring template created successfully'
      : 'Expense created successfully'

    const response = createApiResponse(responseData, message)
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Expense creation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}