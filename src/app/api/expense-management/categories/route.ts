import { NextRequest, NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse,
  createPaginatedResponse
} from '@/lib/supabase/financial-client'
import { ExpenseCategory, ExpenseType } from '@/lib/types/expenses'
import { z } from 'zod'

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  expense_type: z.enum(['travel', 'meals', 'office_supplies', 'software', 'marketing', 'professional', 'utilities', 'other']),
  parent_category_id: z.string().uuid().optional(),
  gl_account_code: z.string().max(50).optional()
})

/**
 * GET /api/expense-management/categories - List expense categories
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
    
    // Build query
    let query = supabase
      .from('expense_categories')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)

    // Add filters
    const expense_type = searchParams.get('expense_type')
    const parent_id = searchParams.get('parent_id')
    
    if (expense_type) {
      query = query.eq('expense_type', expense_type)
    }
    
    if (parent_id) {
      query = query.eq('parent_category_id', parent_id)
    } else if (parent_id === 'null') {
      query = query.is('parent_category_id', null)
    }

    const { data: categories, error } = await query.order('name')

    if (error) {
      console.error('Error fetching expense categories:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    return NextResponse.json(createApiResponse(categories || [], 'Expense categories retrieved successfully'))

  } catch (error) {
    console.error('Error in GET /api/expense-management/categories:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/expense-management/categories - Create new expense category
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    // Check if user can create data (not in grace period)
    const canCreate = await canUserCreateData()
    if (!canCreate) {
      return NextResponse.json(ApiErrors.GracePeriodActive, { status: ApiErrors.GracePeriodActive.status })
    }

    const body = await request.json()
    const validatedData = CreateCategorySchema.parse(body)

    const supabase = supabaseAdmin;

    // Check for duplicate category name within tenant
    const { data: existingCategory } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('name', validatedData.name)
      .eq('is_active', true)
      .single()

    if (existingCategory) {
      return NextResponse.json(ApiErrors.Conflict('Category name already exists'), { 
        status: ApiErrors.Conflict('Category name already exists').status 
      })
    }

    // Create the category
    const { data: newCategory, error } = await supabase
      .from('expense_categories')
      .insert({
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        ...validatedData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating expense category:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    return NextResponse.json(createApiResponse(newCategory, 'Expense category created successfully'), { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(ApiErrors.ValidationError(error.errors), { 
        status: ApiErrors.ValidationError().status 
      })
    }
    
    console.error('Error in POST /api/expense-management/categories:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}