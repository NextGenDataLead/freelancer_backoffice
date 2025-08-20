import { NextResponse } from 'next/server'
import { 
  CreateExpenseSchema, 
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

    // Build query with optional supplier join
    let query = supabaseAdmin
      .from('expenses')
      .select(`
        *,
        supplier:clients(
          id,
          name,
          company_name,
          email,
          country_code,
          vat_number
        )
      `, { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('expense_date', { ascending: false })

    // Apply filters
    if (validatedQuery.category) {
      query = query.eq('category', validatedQuery.category)
    }

    if (validatedQuery.supplier_id) {
      query = query.eq('supplier_id', validatedQuery.supplier_id)
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

    const totalPages = count ? Math.ceil(count / validatedQuery.limit) : 0

    const response = createPaginatedResponse(
      expenses || [], 
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
    
    // Validate request data
    const validatedData = CreateExpenseSchema.parse(body)

    // Verify supplier exists and belongs to tenant (if provided)
    if (validatedData.supplier_id) {
      const { data: supplier, error: supplierError } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('id', validatedData.supplier_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_supplier', true)
        .single()

      if (supplierError || !supplier) {
        const notFoundError = ApiErrors.NotFound('Supplier')
        return NextResponse.json(notFoundError, { status: notFoundError.status })
      }
    }

    // Calculate VAT amount if not provided
    let vatAmount = validatedData.vat_amount
    if (vatAmount === undefined || vatAmount === 0) {
      vatAmount = Math.round(validatedData.amount * validatedData.vat_rate * 100) / 100
    }

    // Validate total amount consistency
    const expectedTotal = validatedData.amount + vatAmount
    if (Math.abs(expectedTotal - validatedData.total_amount) > 0.01) {
      const validationError = ApiErrors.ValidationError('Total amount must equal amount plus VAT amount')
      return NextResponse.json(validationError, { status: validationError.status })
    }

    // Create expense
    const { data: newExpense, error: createError } = await supabaseAdmin
      .from('expenses')
      .insert({
        ...validatedData,
        vat_amount: vatAmount,
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select(`
        *,
        supplier:clients(
          id,
          name,
          company_name,
          email,
          country_code
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating expense:', createError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
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

    const response = createApiResponse(newExpense, 'Expense created successfully')
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