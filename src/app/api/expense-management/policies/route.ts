import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { ExpensePolicy, CurrencyCode, PolicyRules } from '@/lib/types/expenses'
import { z } from 'zod'

const CreatePolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  daily_limit: z.number().positive().optional(),
  monthly_limit: z.number().positive().optional(),
  per_expense_limit: z.number().positive().optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']).default('EUR'),
  auto_approve_under: z.number().positive().optional(),
  require_receipt_over: z.number().positive().optional(),
  rules: z.record(z.any()).default({})
})

/**
 * GET /api/expense-management/policies - List expense policies
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
    
    // Get current user profile

    // Build query
    let query = supabase
      .from('expense_policies')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Filter by active status if provided
    const activeOnly = searchParams.get('active_only')
    if (activeOnly === 'true') {
      query = query.eq('is_active', true)
    }

    const { data: policies, error } = await query

    if (error) {
      console.error('Error fetching policies:', error)
      return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Policies fetched successfully',
      policies: policies || []
    })

  } catch (error) {
    console.error('Error in GET /api/expense-management/policies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/expense-management/policies - Create new policy
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
    const validation = CreatePolicySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const policyData = validation.data

    // Get current user profile

    // Check if policy name already exists for this tenant
    const { data: existingPolicy, error: checkError } = await supabase
      .from('expense_policies')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('name', policyData.name)
      .single()

    if (existingPolicy) {
      return NextResponse.json({
        error: 'Policy already exists',
        details: 'A policy with this name already exists'
      }, { status: 409 })
    }

    // Validate policy rules
    const validatedRules = validatePolicyRules(policyData.rules)

    // Create policy
    const { data: policy, error: insertError } = await supabase
      .from('expense_policies')
      .insert({
        ...policyData,
        rules: validatedRules,
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating policy:', insertError)
      return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Policy created successfully',
      policy
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/expense-management/policies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Validate and sanitize policy rules
 */
function validatePolicyRules(rules: Record<string, any>): PolicyRules {
  const validatedRules: PolicyRules = {}

  // Meal limit per day
  if (typeof rules.meal_limit_per_day === 'number' && rules.meal_limit_per_day > 0) {
    validatedRules.meal_limit_per_day = rules.meal_limit_per_day
  }

  // Require manager approval
  if (typeof rules.require_manager_approval === 'boolean') {
    validatedRules.require_manager_approval = rules.require_manager_approval
  }

  // Allowed categories (array of category IDs)
  if (Array.isArray(rules.allowed_categories)) {
    const validCategories = rules.allowed_categories.filter(
      (id: any) => typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id)
    )
    if (validCategories.length > 0) {
      validatedRules.allowed_categories = validCategories
    }
  }

  // Blocked vendors (array of vendor names)
  if (Array.isArray(rules.blocked_vendors)) {
    const validVendors = rules.blocked_vendors.filter(
      (name: any) => typeof name === 'string' && name.length > 0
    )
    if (validVendors.length > 0) {
      validatedRules.blocked_vendors = validVendors
    }
  }

  // Require project code
  if (typeof rules.require_project_code === 'boolean') {
    validatedRules.require_project_code = rules.require_project_code
  }

  // Max days for retrospective submission
  if (typeof rules.max_retrospective_days === 'number' && rules.max_retrospective_days > 0) {
    validatedRules.max_retrospective_days = rules.max_retrospective_days
  }

  // Require receipt for all expenses
  if (typeof rules.require_receipt_always === 'boolean') {
    validatedRules.require_receipt_always = rules.require_receipt_always
  }

  // Allow personal card usage
  if (typeof rules.allow_personal_card === 'boolean') {
    validatedRules.allow_personal_card = rules.allow_personal_card
  }

  // Travel policy specific rules
  if (typeof rules.max_hotel_rate_per_night === 'number' && rules.max_hotel_rate_per_night > 0) {
    validatedRules.max_hotel_rate_per_night = rules.max_hotel_rate_per_night
  }

  if (typeof rules.require_travel_approval === 'boolean') {
    validatedRules.require_travel_approval = rules.require_travel_approval
  }

  // Meal policy specific rules
  if (typeof rules.max_meal_entertainment_per_person === 'number' && rules.max_meal_entertainment_per_person > 0) {
    validatedRules.max_meal_entertainment_per_person = rules.max_meal_entertainment_per_person
  }

  if (typeof rules.require_business_justification === 'boolean') {
    validatedRules.require_business_justification = rules.require_business_justification
  }

  return validatedRules
}