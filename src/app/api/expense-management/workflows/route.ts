import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin, getCurrentUserProfile, ApiErrors, createApiResponse } from '@/lib/supabase/financial-client'
import { ApprovalWorkflow, ApprovalStep, WorkflowConditions } from '@/lib/types/expenses'
import { z } from 'zod'

const ApprovalStepSchema = z.object({
  step: z.number().int().positive(),
  role: z.string().min(1, 'Role is required'),
  threshold: z.number().positive().optional(),
  approver_ids: z.array(z.string().uuid()).optional(),
  is_required: z.boolean().default(true)
})

const WorkflowConditionsSchema = z.object({
  auto_approve_under: z.number().positive().optional(),
  expense_types: z.array(z.enum(['travel', 'meals', 'office_supplies', 'software', 'marketing', 'professional', 'utilities', 'other'])).optional(),
  categories: z.array(z.string().uuid()).optional()
})

const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  steps: z.array(ApprovalStepSchema).min(1, 'At least one approval step is required'),
  conditions: WorkflowConditionsSchema.default({})
})

/**
 * GET /api/expense-management/workflows - List approval workflows
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
      .from('approval_workflows')
      .select(`
        *,
        created_by_profile:profiles!created_by(id, first_name, last_name, email)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // Filter by active status if provided
    const activeOnly = searchParams.get('active_only')
    if (activeOnly === 'true') {
      query = query.eq('is_active', true)
    }

    const { data: workflows, error } = await query

    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Workflows fetched successfully',
      workflows: workflows || []
    })

  } catch (error) {
    console.error('Error in GET /api/expense-management/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/expense-management/workflows - Create new workflow
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
    const validation = CreateWorkflowSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const workflowData = validation.data

    // Get current user profile

    // Check if workflow name already exists for this tenant
    const { data: existingWorkflow, error: checkError } = await supabase
      .from('approval_workflows')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('name', workflowData.name)
      .single()

    if (existingWorkflow) {
      return NextResponse.json({
        error: 'Workflow already exists',
        details: 'A workflow with this name already exists'
      }, { status: 409 })
    }

    // Validate approval steps
    const validatedSteps = await validateApprovalSteps(workflowData.steps, profile.tenant_id, supabase)
    if (!validatedSteps.success) {
      return NextResponse.json({
        error: 'Invalid approval steps',
        details: validatedSteps.error
      }, { status: 400 })
    }

    // Create workflow
    const { data: workflow, error: insertError } = await supabase
      .from('approval_workflows')
      .insert({
        name: workflowData.name,
        description: workflowData.description,
        steps: validatedSteps.steps,
        conditions: workflowData.conditions,
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select(`
        *,
        created_by_profile:profiles!created_by(id, first_name, last_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating workflow:', insertError)
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Workflow created successfully',
      workflow
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/expense-management/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Validate approval steps and ensure approver IDs exist
 */
async function validateApprovalSteps(
  steps: ApprovalStep[], 
  tenantId: string, 
  supabase: any
): Promise<{ success: boolean; steps?: ApprovalStep[]; error?: string }> {
  try {
    // Sort steps by step number
    const sortedSteps = [...steps].sort((a, b) => a.step - b.step)

    // Validate step numbers are sequential starting from 1
    for (let i = 0; i < sortedSteps.length; i++) {
      if (sortedSteps[i].step !== i + 1) {
        return {
          success: false,
          error: `Step numbers must be sequential starting from 1. Found step ${sortedSteps[i].step} at position ${i + 1}`
        }
      }
    }

    // Validate approver IDs if provided
    for (const step of sortedSteps) {
      if (step.approver_ids && step.approver_ids.length > 0) {
        const { data: approvers, error: approverError } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', tenantId)
          .in('id', step.approver_ids)

        if (approverError) {
          return {
            success: false,
            error: `Failed to validate approvers for step ${step.step}`
          }
        }

        if (approvers.length !== step.approver_ids.length) {
          const foundIds = approvers.map((a: any) => a.id)
          const missingIds = step.approver_ids.filter(id => !foundIds.includes(id))
          return {
            success: false,
            error: `Invalid approver IDs in step ${step.step}: ${missingIds.join(', ')}`
          }
        }
      }
    }

    // Validate role names (in a real system, you'd check against your role definitions)
    const validRoles = ['manager', 'finance_admin', 'department_head', 'executive', 'any_user']
    for (const step of sortedSteps) {
      if (!validRoles.includes(step.role)) {
        return {
          success: false,
          error: `Invalid role "${step.role}" in step ${step.step}. Valid roles: ${validRoles.join(', ')}`
        }
      }
    }

    return {
      success: true,
      steps: sortedSteps
    }

  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get recommended workflow templates
 */
export async function GET_TEMPLATES(request: NextRequest) {
  try {
    const templates = [
      {
        id: 'simple-approval',
        name: 'Simple Manager Approval',
        description: 'Single manager approval for all expenses',
        steps: [
          {
            step: 1,
            role: 'manager',
            threshold: 1000.00,
            is_required: true
          }
        ],
        conditions: {
          auto_approve_under: 50.00
        }
      },
      {
        id: 'two-tier-approval',
        name: 'Two-Tier Approval',
        description: 'Manager approval up to €500, Finance approval for higher amounts',
        steps: [
          {
            step: 1,
            role: 'manager',
            threshold: 500.00,
            is_required: true
          },
          {
            step: 2,
            role: 'finance_admin',
            threshold: 5000.00,
            is_required: true
          }
        ],
        conditions: {
          auto_approve_under: 25.00
        }
      },
      {
        id: 'department-approval',
        name: 'Department Head Approval',
        description: 'Department head approval with executive override for large amounts',
        steps: [
          {
            step: 1,
            role: 'department_head',
            threshold: 2000.00,
            is_required: true
          },
          {
            step: 2,
            role: 'executive',
            threshold: 10000.00,
            is_required: true
          }
        ],
        conditions: {
          auto_approve_under: 100.00
        }
      },
      {
        id: 'travel-specific',
        name: 'Travel Expense Workflow',
        description: 'Specialized workflow for travel expenses',
        steps: [
          {
            step: 1,
            role: 'manager',
            threshold: 1000.00,
            is_required: true
          },
          {
            step: 2,
            role: 'finance_admin',
            threshold: 5000.00,
            is_required: true
          }
        ],
        conditions: {
          expense_types: ['travel'],
          auto_approve_under: 0 // No auto-approval for travel
        }
      }
    ]

    return NextResponse.json({
      message: 'Workflow templates fetched successfully',
      templates
    })

  } catch (error) {
    console.error('Error fetching workflow templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}