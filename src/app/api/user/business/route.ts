// Business Profile API Endpoint
// GET/PUT endpoints for business profile management
// Generated with Claude Code (https://claude.ai/code)

import { NextRequest, NextResponse } from 'next/server'
import { 
  supabaseAdmin, 
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import { businessProfileSchema } from '@/lib/validations/business'
// import { useGracePeriodGuard } from '@/hooks/use-grace-period' // Cannot use client-side hooks in API routes

// =============================================================================
// GET BUSINESS PROFILE
// =============================================================================

export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get business profile data from profiles table
    const { data: businessData, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        business_name,
        kvk_number,
        btw_number,
        business_type,
        address,
        postal_code,
        city,
        country_code,
        phone,
        website,
        hourly_rate,
        financial_year_start,
        kor_enabled,
        default_payment_terms,
        late_payment_interest,
        default_invoice_description,
        custom_footer_text,
        terms_conditions
      `)
      .eq('id', profile.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Database error fetching business profile:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Transform null values to undefined for form compatibility
    const cleanedData = Object.fromEntries(
      Object.entries(businessData || {}).map(([key, value]) => [key, value === null ? undefined : value])
    )

    const response = createApiResponse(cleanedData, 'Business profile retrieved successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

// =============================================================================
// UPDATE BUSINESS PROFILE
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = businessProfileSchema.safeParse(body)
    
    if (!validation.success) {
      const validationError = ApiErrors.ValidationError(validation.error.issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    const updateData = validation.data
    const now = new Date().toISOString()

    // Update business profile in profiles table
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...updateData,
        updated_at: now
      })
      .eq('id', profile.id)
      .eq('tenant_id', profile.tenant_id)
      .select(`
        business_name,
        kvk_number,
        btw_number,
        business_type,
        address,
        postal_code,
        city,
        country_code,
        phone,
        website,
        hourly_rate,
        financial_year_start,
        kor_enabled,
        default_payment_terms,
        late_payment_interest,
        default_invoice_description,
        custom_footer_text,
        terms_conditions
      `)
      .single()

    if (error) {
      console.error('Database error updating business profile:', error)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Transform null values to undefined for consistency
    const cleanedData = Object.fromEntries(
      Object.entries(updatedProfile || {}).map(([key, value]) => [key, value === null ? undefined : value])
    )

    const response = createApiResponse(cleanedData, 'Business profile updated successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}