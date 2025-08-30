import { NextRequest, NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

/**
 * POST /api/expense-management/seed - Seed default expense management data for current user's tenant
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;

    // Check if already seeded to avoid duplicates
    const { data: existingCategories } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .limit(1)

    if (existingCategories && existingCategories.length > 0) {
      return NextResponse.json({
        message: 'Expense management data already exists for this tenant',
        tenant_id: profile.tenant_id
      })
    }

    // Seed default data using the database functions
    const seedResults = []

    try {
      // Seed expense categories
      const { error: categoriesError } = await supabase
        .rpc('seed_default_expense_categories', { p_tenant_id: profile.tenant_id })
      
      if (categoriesError) {
        console.error('Error seeding categories:', categoriesError)
        throw categoriesError
      }
      seedResults.push('Categories seeded successfully')

      // Seed approval workflow
      const { error: workflowError } = await supabase
        .rpc('seed_default_approval_workflow', { p_tenant_id: profile.tenant_id })
      
      if (workflowError) {
        console.error('Error seeding workflow:', workflowError)
        throw workflowError
      }
      seedResults.push('Approval workflow seeded successfully')

      // Seed expense policy
      const { error: policyError } = await supabase
        .rpc('seed_default_expense_policy', { p_tenant_id: profile.tenant_id })
      
      if (policyError) {
        console.error('Error seeding policy:', policyError)
        throw policyError
      }
      seedResults.push('Expense policy seeded successfully')

    } catch (error) {
      console.error('Error during seeding:', error)
      return NextResponse.json({ 
        error: 'Failed to seed expense management data',
        details: error
      }, { status: 500 })
    }

    // Get counts of seeded data for confirmation
    const { data: categoriesCount } = await supabase
      .from('expense_categories')
      .select('id', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)

    const { data: workflowsCount } = await supabase
      .from('approval_workflows')
      .select('id', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)

    const { data: policiesCount } = await supabase
      .from('expense_policies')
      .select('id', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)

    return NextResponse.json(createApiResponse({
      tenant_id: profile.tenant_id,
      results: seedResults,
      counts: {
        categories: categoriesCount?.length || 0,
        workflows: workflowsCount?.length || 0,
        policies: policiesCount?.length || 0
      }
    }, 'Expense management data seeded successfully'), { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/expense-management/seed:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * GET /api/expense-management/seed - Check seed status for current user's tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.ProfileNotFound, { status: ApiErrors.ProfileNotFound.status })
    }

    const supabase = supabaseAdmin;

    // Check existing data
    const [
      { count: categoriesCount },
      { count: workflowsCount },
      { count: policiesCount }
    ] = await Promise.all([
      supabase
        .from('expense_categories')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id),
      supabase
        .from('approval_workflows')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id),
      supabase
        .from('expense_policies')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
    ])

    const isSeeded = (categoriesCount || 0) > 0 && (workflowsCount || 0) > 0 && (policiesCount || 0) > 0

    return NextResponse.json({
      tenant_id: profile.tenant_id,
      is_seeded: isSeeded,
      counts: {
        categories: categoriesCount || 0,
        workflows: workflowsCount || 0,
        policies: policiesCount || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/expense-management/seed:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}