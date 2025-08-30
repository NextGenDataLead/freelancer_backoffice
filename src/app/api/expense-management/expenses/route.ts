import { NextRequest, NextResponse } from 'next/server'

import { 
  supabaseAdmin, 
  getCurrentUserProfile, 
  ApiErrors, 
  createApiResponse,
  getDutchVATRates 
} from '@/lib/supabase/financial-client'
import { 
  CreateExpenseRequest, 
  ExpenseListFilters, 
  ExpenseListResponse,
  ExpenseValidationError 
} from '@/lib/types/expenses'
import { z } from 'zod'

// Validation schemas for employee expense management
const CreateEmployeeExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  amount: z.number().positive('Amount must be positive').max(999999.99, 'Amount too large'),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']).optional(),
  category_id: z.string().uuid().optional(),
  expense_type: z.enum(['travel', 'meals', 'office_supplies', 'software', 'marketing', 'professional', 'utilities', 'other']),
  payment_method: z.enum(['corporate_card', 'personal_card', 'cash', 'bank_transfer', 'other']),
  project_code: z.string().max(50).optional(),
  cost_center: z.string().max(50).optional(),
  vendor_name: z.string().max(200).optional(),
  reference_number: z.string().max(100).optional(),
  requires_reimbursement: z.boolean().optional(),
  is_billable: z.boolean().optional(),
  client_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  // VAT/BTW fields
  vat_rate: z.number().min(0).max(1).optional(),
  vat_amount: z.number().min(0).optional(),
  vat_type: z.enum(['standard', 'reduced', 'zero', 'exempt', 'reverse_charge']).optional(),
  is_vat_deductible: z.boolean().optional(),
  business_percentage: z.number().min(0).max(100).optional(),
  supplier_country_code: z.string().length(2).optional(),
  supplier_vat_number: z.string().max(50).optional(),
  is_reverse_charge: z.boolean().optional()
})

/**
 * GET /api/expense-management/expenses - List employee expenses
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url)

    // Parse filters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(id, name, expense_type),
        receipts:expense_receipts(id, filename, ocr_status),
        submitted_by_profile:profiles!submitted_by(id, first_name, last_name, email),
        approvals:expense_approvals(
          id,
          step_number,
          action,
          comments,
          created_at,
          approver:profiles!approver_id(id, first_name, last_name, email)
        )
      `)
      .eq('tenant_id', profile.tenant_id)

    // Apply status filter
    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    // Apply expense type filter
    const expenseType = searchParams.get('expense_type')
    if (expenseType) {
      query = query.eq('expense_type', expenseType)
    }

    // Apply date range filters
    const dateFrom = searchParams.get('date_from')
    if (dateFrom) {
      query = query.gte('expense_date', dateFrom)
    }

    const dateTo = searchParams.get('date_to')
    if (dateTo) {
      query = query.lte('expense_date', dateTo)
    }

    // Apply search filter
    const search = searchParams.get('search')
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,vendor_name.ilike.%${search}%`)
    }

    // Only show user's own expenses unless they have admin role
    const showAllExpenses = searchParams.get('all') === 'true'
    if (!showAllExpenses) {
      query = query.eq('submitted_by', profile.id)
    }

    // Apply sorting
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    query = query.order(sortBy === 'date' ? 'expense_date' : sortBy, { ascending: sortOrder === 'asc' })

    // Execute query with pagination
    const { data: expenses, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('expenses')
      .select('amount, currency, status, expense_type')
      .eq('tenant_id', profile.tenant_id)
      .eq('submitted_by', profile.id)
    
    const summary = summaryData?.reduce((acc: any, expense) => {
      acc.total_amount += expense.amount || 0
      acc.status_breakdown[expense.status] = (acc.status_breakdown[expense.status] || 0) + 1
      acc.type_breakdown[expense.expense_type] = (acc.type_breakdown[expense.expense_type] || 0) + 1
      return acc
    }, {
      total_amount: 0,
      currency: 'EUR',
      status_breakdown: {},
      type_breakdown: {}
    }) || {
      total_amount: 0,
      currency: 'EUR',
      status_breakdown: {},
      type_breakdown: {}
    }

    const response: ExpenseListResponse = {
      expenses: expenses || [],
      total_count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
      filters_applied: {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder as 'asc' | 'desc'
      },
      summary
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/expense-management/expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/expense-management/expenses - Create new employee expense
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;
    const body = await request.json()

    // Validate request body
    const validation = CreateEmployeeExpenseSchema.safeParse(body)
    if (!validation.success) {
      const errors: ExpenseValidationError[] = validation.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))

      return NextResponse.json({
        error: 'Validation failed',
        validation_errors: errors
      }, { status: 400 })
    }

    const expenseData = validation.data as CreateExpenseRequest

    // Validate category exists and belongs to tenant
    if (expenseData.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('id', expenseData.category_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .single()

      if (categoryError || !category) {
        return NextResponse.json({
          error: 'Invalid category',
          details: 'Category not found or not active'
        }, { status: 400 })
      }
    }

    // Get Dutch VAT rates and calculate VAT
    const dutchVATRates = await getDutchVATRates()
    
    // Determine VAT rate based on expense type and category metadata
    let vatRate = 0.21 // Default Dutch standard rate
    let vatType = 'standard'
    let isVatDeductible = true
    let businessPercentage = 100
    
    // Get VAT settings from category if provided
    if (expenseData.category_id) {
      const { data: category } = await supabase
        .from('expense_categories')
        .select('metadata')
        .eq('id', expenseData.category_id)
        .single()
      
      if (category?.metadata) {
        vatRate = Number(category.metadata.default_vat_rate) || 0.21
        isVatDeductible = category.metadata.vat_deductible ?? true
        businessPercentage = Number(category.metadata.business_percentage) || 100
        if (category.metadata.vat_type) {
          vatType = category.metadata.vat_type
        }
      }
    }
    
    // Handle reverse charge for EU suppliers
    const isReverseCharge = expenseData.supplier_country_code && 
                          expenseData.supplier_country_code !== 'NL' && 
                          expenseData.supplier_vat_number
    
    if (isReverseCharge) {
      vatRate = 0
      vatType = 'reverse_charge'
      isVatDeductible = true // Reverse charge VAT is deductible
    }
    
    // Calculate VAT amount
    const vatAmount = isReverseCharge ? 0 : 
                     Math.round((expenseData.amount * vatRate * businessPercentage / 100) * 100) / 100

    // Set default values with VAT calculations
    const expenseInsert = {
      ...expenseData,
      tenant_id: profile.tenant_id,
      submitted_by: profile.id,
      currency: expenseData.currency || 'EUR',
      requires_reimbursement: expenseData.requires_reimbursement ?? (expenseData.payment_method !== 'corporate_card'),
      is_billable: expenseData.is_billable ?? false,
      is_recurring: false,
      status: 'draft' as const,
      current_approval_step: 0,
      tags: expenseData.tags || [],
      metadata: expenseData.metadata || {},
      // VAT fields
      vat_rate: vatRate,
      vat_amount: vatAmount,
      vat_type: vatType,
      is_vat_deductible: isVatDeductible,
      business_percentage: expenseData.business_percentage || businessPercentage,
      supplier_country_code: expenseData.supplier_country_code || 'NL',
      supplier_vat_number: expenseData.supplier_vat_number,
      is_reverse_charge: isReverseCharge
    }

    // Insert expense
    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert(expenseInsert)
      .select(`
        *,
        category:expense_categories(id, name, expense_type),
        submitted_by_profile:profiles!submitted_by(id, first_name, last_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating expense:', insertError)
      return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Expense created successfully',
      expense
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/expense-management/expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}