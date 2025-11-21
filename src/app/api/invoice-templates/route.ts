import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import {
  supabaseAdmin,
  getCurrentUserProfile,
  canUserCreateData,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

// Validation schemas
const InvoiceTemplateItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative()
})

const CreateInvoiceTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  default_payment_terms_days: z.number().int().positive().optional(),
  items: z.array(InvoiceTemplateItemSchema).min(1)
})

/**
 * GET /api/invoice-templates
 * List all invoice templates for the current user's tenant
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Fetch templates
    const { data: templates, error } = await supabaseAdmin
      .from('invoice_item_templates')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoice templates:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(templates || [], 'Templates retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/invoice-templates
 * Create a new invoice template
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateInvoiceTemplateSchema.safeParse(body)

    if (!validation.success) {
      const validationError = ApiErrors.ValidationError(validation.error.issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    const { name, description, default_payment_terms_days, items } = validation.data
    const now = getCurrentDate().toISOString()

    // Create template
    const { data: template, error } = await supabaseAdmin
      .from('invoice_item_templates')
      .insert({
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        name,
        description,
        default_payment_terms_days,
        items,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice template:', error)

      // Check if this is a unique constraint violation
      if (error.code === '23505') {
        const conflictError = ApiErrors.Conflict('A template with this name already exists')
        return NextResponse.json(conflictError, { status: conflictError.status })
      }

      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    const response = createApiResponse(
      { template },
      'Invoice template created successfully'
    )
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}
