import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'
import type { ReminderTemplate, ReminderLevel } from '@/lib/types/financial'
import { z } from 'zod'

/**
 * GET /api/reminders/templates
 * Get all reminder templates for the current tenant
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Check if templates exist, if not seed them
    const { data: existingTemplates } = await supabaseAdmin
      .from('reminder_templates')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .limit(1)

    if (!existingTemplates || existingTemplates.length === 0) {
      // Seed default templates
      await supabaseAdmin
        .rpc('seed_default_reminder_templates', { p_tenant_id: profile.tenant_id })
    }

    // Fetch all templates for this tenant
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('reminder_templates')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('reminder_level', { ascending: true })
      .order('is_default', { ascending: false })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse<ReminderTemplate[]>(
      templates || [],
      'Templates fetched successfully'
    )
    return NextResponse.json(response)

  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  reminder_level: z.number().int().min(1).max(3),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  is_default: z.boolean().optional().default(false)
})

/**
 * POST /api/reminders/templates
 * Create a new reminder template
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
    const validatedData = CreateTemplateSchema.parse(body)

    // If setting as default, unset other defaults for this level
    if (validatedData.is_default) {
      await supabaseAdmin
        .from('reminder_templates')
        .update({ is_default: false })
        .eq('tenant_id', profile.tenant_id)
        .eq('reminder_level', validatedData.reminder_level)
    }

    // Create template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('reminder_templates')
      .insert({
        tenant_id: profile.tenant_id,
        name: validatedData.name,
        reminder_level: validatedData.reminder_level as ReminderLevel,
        subject: validatedData.subject,
        body: validatedData.body,
        is_default: validatedData.is_default,
        created_at: getCurrentDate().toISOString(),
        updated_at: getCurrentDate().toISOString()
      })
      .select()
      .single()

    if (templateError) {
      console.error('Error creating template:', templateError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse<ReminderTemplate>(
      template as ReminderTemplate,
      'Template created successfully'
    )
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = ApiErrors.ValidationError(error.errors)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Create template error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
