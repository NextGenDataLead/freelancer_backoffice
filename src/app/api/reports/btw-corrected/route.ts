import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'
import type { 
  GenerateBTWFormRequest,
  GenerateBTWFormResponse,
  ValidateBTWFormRequest,
  RecalculateBTWFormRequest
} from '@/lib/types/btw-corrected'

/**
 * GET /api/reports/btw-corrected
 * Generates CORRECTED Dutch BTW form based on official Belastingdienst structure
 * Replaces incorrect VAT return calculations with proper rubriek mappings
 */
export async function GET(request: Request) {
  try {
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const quarter = parseInt(searchParams.get('quarter') || Math.ceil((new Date().getMonth() + 1) / 3).toString())

    // Validate parameters
    if (year < 2020 || year > 2099 || quarter < 1 || quarter > 4) {
      return NextResponse.json({
        ...ApiErrors.ValidationError,
        message: 'Invalid year or quarter parameters'
      }, { status: 400 })
    }

    // Generate BTW form using corrected database function
    const { data: btwFormData, error: btwError } = await supabaseAdmin
      .rpc('generate_corrected_btw_form', {
        p_tenant_id: profile.tenant_id,
        p_year: year,
        p_quarter: quarter
      })

    if (btwError) {
      console.error('Error generating corrected BTW form:', btwError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Also get ICP validation data
    const { data: icpValidation, error: icpError } = await supabaseAdmin
      .from('icp_btw_validation')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year)
      .eq('quarter', quarter)
      .single()

    if (icpError && icpError.code !== 'PGRST116') { // Ignore "not found" errors
      console.error('Error fetching ICP validation:', icpError)
    }

    // Format response according to corrected structure
    const response: GenerateBTWFormResponse = {
      tenant_id: profile.tenant_id,
      period: { year, quarter },
      generated_at: new Date(),
      form_structure: 'corrected_official_btw_form_v2',
      
      // Section 1: Prestaties binnenland (CORRECTED)
      section_1: {
        rubriek_1a: {
          omzet: btwFormData.section_1?.rubriek_1a?.omzet || 0,
          btw: btwFormData.section_1?.rubriek_1a?.btw || 0
        },
        rubriek_1b: {
          omzet: btwFormData.section_1?.rubriek_1b?.omzet || 0,
          btw: btwFormData.section_1?.rubriek_1b?.btw || 0
        },
        rubriek_1c: {
          omzet: btwFormData.section_1?.rubriek_1c?.omzet || 0,
          btw: btwFormData.section_1?.rubriek_1c?.btw || 0
        },
        rubriek_1d: {
          btw: btwFormData.section_1?.rubriek_1d?.btw || 0
        },
        rubriek_1e: {
          omzet: btwFormData.section_1?.rubriek_1e?.omzet || 0
        }
      },
      
      // Section 2: Verleggingsregelingen binnenland (CORRECTED - only 2a)
      section_2: {
        rubriek_2a: {
          omzet: btwFormData.section_2?.rubriek_2a?.omzet || 0,
          btw: btwFormData.section_2?.rubriek_2a?.btw || 0
        }
      },
      
      // Section 3: Prestaties naar/in het buitenland (CORRECTED mappings + 3c)
      section_3: {
        rubriek_3a: {
          omzet: btwFormData.section_3?.rubriek_3a?.omzet || 0 // Non-EU exports (CORRECTED)
        },
        rubriek_3b: {
          omzet: btwFormData.section_3?.rubriek_3b?.omzet || 0, // EU supplies (CORRECTED)
          icp_total: icpValidation?.icp_total || 0 // MUST match for validation
        },
        rubriek_3c: {
          omzet: btwFormData.section_3?.rubriek_3c?.omzet || 0 // EU installations (NEW)
        }
      },
      
      // Section 4: Prestaties vanuit het buitenland
      section_4: {
        rubriek_4a: {
          omzet: btwFormData.section_4?.rubriek_4a?.omzet || 0,
          btw: btwFormData.section_4?.rubriek_4a?.btw || 0
        },
        rubriek_4b: {
          omzet: btwFormData.section_4?.rubriek_4b?.omzet || 0,
          btw: btwFormData.section_4?.rubriek_4b?.btw || 0
        }
      },
      
      // Section 5: BTW Berekening (CORRECTED OFFICIAL STRUCTURE)
      section_5: {
        rubriek_5a_verschuldigde_btw: btwFormData.section_5?.rubriek_5a_verschuldigde_btw || 0,
        rubriek_5b_voorbelasting: btwFormData.section_5?.rubriek_5b_voorbelasting || 0
      },
      
      // Final calculations
      calculations: {
        suppletie_corrections: btwFormData.calculations?.suppletie_corrections || 0,
        net_vat_payable: btwFormData.calculations?.net_vat_payable || 0
      },
      
      // Validation results
      validation: btwFormData.validation || {
        valid: false,
        issues: ['Unable to validate form'],
        warnings: [],
        info: [],
        validated_at: new Date(),
        period: { year, quarter },
        btw_summary: {
          rubriek_5a_verschuldigde_btw: 0,
          rubriek_5b_voorbelasting: 0,
          net_vat_payable: 0,
          rubriek_3b_omzet: 0
        }
      }
    }

    // Save report for audit purposes
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'btw_corrected',
        period_start: `${year}-${(quarter - 1) * 3 + 1}-01`,
        period_end: `${year}-${quarter * 3}-${new Date(year, quarter * 3, 0).getDate()}`,
        data: response,
        generated_by: profile.id
      })
      .select()
      .single()

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'financial_report',
      savedReport?.id || 'unknown',
      'btw_corrected_generated',
      profile.id,
      null,
      { quarter, year, form_structure: 'corrected_official_btw_form_v2' },
      request
    )

    const apiResponse = createApiResponse(response, `CORRECTED BTW form generated for Q${quarter} ${year}`)
    return NextResponse.json(apiResponse)

  } catch (error) {
    console.error('CORRECTED BTW form generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/reports/btw-corrected
 * Validates CORRECTED BTW form data
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json() as ValidateBTWFormRequest
    const { tenant_id, year, quarter } = body

    // Verify tenant access
    if (tenant_id !== profile.tenant_id) {
      return NextResponse.json(ApiErrors.Forbidden, { status: ApiErrors.Forbidden.status })
    }

    // Run validation using corrected database function
    const { data: validationResult, error: validationError } = await supabaseAdmin
      .rpc('validate_corrected_btw_form', {
        p_tenant_id: tenant_id,
        p_year: year,
        p_quarter: quarter
      })

    if (validationError) {
      console.error('Error validating corrected BTW form:', validationError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'btw_form',
      `${tenant_id}-${year}-${quarter}`,
      'btw_corrected_validated',
      profile.id,
      null,
      { year, quarter, validation_result: validationResult },
      request
    )

    const response = createApiResponse(validationResult, `CORRECTED BTW form validation completed for Q${quarter} ${year}`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('CORRECTED BTW form validation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * PUT /api/reports/btw-corrected
 * Recalculates CORRECTED BTW forms for specified period(s)
 */
export async function PUT(request: Request) {
  try {
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json() as RecalculateBTWFormRequest
    const { tenant_id, year, quarter } = body

    // Verify tenant access
    if (tenant_id !== profile.tenant_id) {
      return NextResponse.json(ApiErrors.Forbidden, { status: ApiErrors.Forbidden.status })
    }

    // Recalculate using corrected database function
    const { error: recalcError } = await supabaseAdmin
      .rpc('recalculate_btw_forms_for_period', {
        p_tenant_id: tenant_id,
        p_year: year,
        p_quarter: quarter || null
      })

    if (recalcError) {
      console.error('Error recalculating corrected BTW forms:', recalcError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'btw_form',
      `${tenant_id}-${year}-${quarter || 'all'}`,
      'btw_corrected_recalculated',
      profile.id,
      null,
      { year, quarter: quarter || 'all_quarters' },
      request
    )

    const message = quarter 
      ? `CORRECTED BTW form recalculated for Q${quarter} ${year}`
      : `CORRECTED BTW forms recalculated for all quarters in ${year}`

    const response = createApiResponse({ success: true }, message)
    return NextResponse.json(response)

  } catch (error) {
    console.error('CORRECTED BTW form recalculation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}