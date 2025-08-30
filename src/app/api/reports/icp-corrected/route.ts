import { NextResponse } from 'next/server'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  createTransactionLog
} from '@/lib/supabase/financial-client'
import type { CorrectedICPDeclaration, ICPBTWValidation } from '@/lib/types/btw-corrected'

/**
 * GET /api/reports/icp-corrected
 * Generates CORRECTED ICP declaration with proper BTW Section 3b validation
 * Ensures ICP totals match BTW rubriek 3b for compliance
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

    // Get ICP declarations using corrected structure
    const { data: icpDeclarations, error: icpError } = await supabaseAdmin
      .from('icp_declarations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year)
      .eq('quarter', quarter)
      .order('customer_name')

    if (icpError) {
      console.error('Error fetching corrected ICP declarations:', icpError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Get BTW vs ICP validation data
    const { data: validationData, error: validationError } = await supabaseAdmin
      .from('icp_btw_validation')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year)
      .eq('quarter', quarter)
      .single()

    if (validationError && validationError.code !== 'PGRST116') {
      console.error('Error fetching ICP-BTW validation:', validationError)
    }

    // Get BTW form data for cross-validation (CORRECTED - check against 3b)
    const { data: btwData, error: btwError } = await supabaseAdmin
      .from('quarterly_btw_forms')
      .select('rubriek_3b_omzet, icp_total_validation, validation_passed')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year)
      .eq('quarter', quarter)
      .single()

    if (btwError && btwError.code !== 'PGRST116') {
      console.error('Error fetching BTW form data:', btwError)
    }

    // Calculate totals and validation
    const icpTotal = icpDeclarations?.reduce((sum, icp) => sum + icp.net_amount, 0) || 0
    const btwSection3b = btwData?.rubriek_3b_omzet || 0
    const amountsMatch = Math.abs(icpTotal - btwSection3b) <= 0.01

    // Format response with corrected validation structure
    const response = {
      tenant_id: profile.tenant_id,
      period: { year, quarter },
      generated_at: new Date(),
      
      // ICP declaration data
      declarations: icpDeclarations || [],
      
      // Summary totals
      summary: {
        total_declarations: icpDeclarations?.length || 0,
        total_customers: new Set(icpDeclarations?.map(icp => icp.customer_vat_number)).size,
        total_countries: new Set(icpDeclarations?.map(icp => icp.customer_country)).size,
        total_amount: icpTotal,
        total_transactions: icpDeclarations?.reduce((sum, icp) => sum + icp.transaction_count, 0) || 0
      },
      
      // BTW Section 3b validation (CORRECTED)
      btw_validation: {
        btw_section_3b_total: btwSection3b,
        icp_total: icpTotal,
        amounts_match: amountsMatch,
        difference: Math.abs(icpTotal - btwSection3b),
        validation_status: amountsMatch ? 'valid' : 'mismatch',
        btw_form_exists: !!btwData,
        btw_form_validated: btwData?.validation_passed || false
      },
      
      // Validation details from view if available
      detailed_validation: validationData || null,
      
      // Warnings and recommendations
      validation_issues: generateICPValidationIssues(icpDeclarations || [], btwData, validationData),
      
      // Compliance status
      compliance: {
        ready_for_submission: amountsMatch && icpDeclarations && icpDeclarations.length > 0,
        requires_btw_form: btwSection3b > 0,
        all_vat_numbers_present: icpDeclarations?.every(icp => icp.customer_vat_number && icp.customer_vat_number.length >= 9) || false,
        all_amounts_positive: icpDeclarations?.every(icp => icp.net_amount > 0) || false
      }
    }

    // Save report for audit purposes
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'icp_corrected',
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
      'icp_corrected_generated',
      profile.id,
      null,
      { 
        quarter, 
        year, 
        declaration_count: response.summary.total_declarations,
        validation_status: response.btw_validation.validation_status 
      },
      request
    )

    const apiResponse = createApiResponse(response, `CORRECTED ICP declaration generated for Q${quarter} ${year}`)
    return NextResponse.json(apiResponse)

  } catch (error) {
    console.error('CORRECTED ICP declaration generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * POST /api/reports/icp-corrected  
 * Validates ICP declaration against BTW Section 3b (CORRECTED validation)
 */
export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()
    const { year, quarter } = body

    if (!year || !quarter || year < 2020 || year > 2099 || quarter < 1 || quarter > 4) {
      return NextResponse.json({
        ...ApiErrors.ValidationError,
        message: 'Invalid year or quarter parameters'
      }, { status: 400 })
    }

    // Run ICP-BTW validation using database view
    const { data: validationResult, error: validationError } = await supabaseAdmin
      .from('icp_btw_validation')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year)
      .eq('quarter', quarter)
      .single()

    if (validationError) {
      console.error('Error running ICP-BTW validation:', validationError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Generate detailed validation report
    const validationReport = {
      period: { year, quarter },
      validated_at: new Date(),
      
      // Validation results
      amounts_match: validationResult.amounts_match,
      difference: validationResult.difference,
      
      // Totals comparison (CORRECTED - against BTW Section 3b)
      icp_total: validationResult.icp_total,
      btw_3b_total: validationResult.btw_3b_total,
      
      // Status flags  
      has_icp_without_btw: validationResult.icp_without_btw,
      has_btw_without_icp: validationResult.btw_without_icp,
      both_systems_have_data: validationResult.both_present,
      
      // Transaction details
      icp_transaction_count: validationResult.icp_transaction_count,
      icp_countries_count: validationResult.icp_countries,
      
      // Validation status
      validation_status: validationResult.amounts_match ? 'valid' : 'requires_attention',
      
      // Recommendations
      recommendations: generateValidationRecommendations(validationResult)
    }

    // Create audit log
    await createTransactionLog(
      profile.tenant_id,
      'icp_validation',
      `${profile.tenant_id}-${year}-${quarter}`,
      'icp_btw_validation_run',
      profile.id,
      null,
      validationReport,
      request
    )

    const response = createApiResponse(validationReport, `ICP-BTW validation completed for Q${quarter} ${year}`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('ICP-BTW validation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Generate validation issues for ICP declaration
 */
function generateICPValidationIssues(
  declarations: CorrectedICPDeclaration[],
  btwData: any,
  validationData: ICPBTWValidation | null
): string[] {
  const issues: string[] = []
  
  // Check for missing BTW form
  if (!btwData) {
    issues.push('BTW form not found for this period - ICP validation cannot be completed')
  }
  
  // Check for amount mismatch (CORRECTED - against Section 3b)
  if (validationData && !validationData.amounts_match) {
    issues.push(`ICP total (€${validationData.icp_total.toFixed(2)}) does not match BTW Section 3b (€${validationData.btw_3b_total.toFixed(2)}) - difference: €${Math.abs(validationData.difference).toFixed(2)}`)
  }
  
  // Check for missing VAT numbers
  const missingVATNumbers = declarations.filter(d => !d.customer_vat_number || d.customer_vat_number.length < 9)
  if (missingVATNumbers.length > 0) {
    issues.push(`${missingVATNumbers.length} declarations have missing or invalid VAT numbers`)
  }
  
  // Check for zero amounts
  const zeroAmounts = declarations.filter(d => d.net_amount <= 0)
  if (zeroAmounts.length > 0) {
    issues.push(`${zeroAmounts.length} declarations have zero or negative amounts`)
  }
  
  // Check for ICP without BTW
  if (validationData?.icp_without_btw) {
    issues.push('ICP declarations exist but no corresponding BTW Section 3b amounts found')
  }
  
  // Check for BTW without ICP
  if (validationData?.btw_without_icp) {
    issues.push('BTW Section 3b amounts exist but no corresponding ICP declarations found')
  }
  
  return issues
}

/**
 * Generate validation recommendations
 */
function generateValidationRecommendations(validationData: ICPBTWValidation): string[] {
  const recommendations: string[] = []
  
  if (!validationData.amounts_match) {
    recommendations.push('Review EU B2B invoices to ensure all transactions are properly classified in BTW Section 3b')
    recommendations.push('Verify that all EU B2B customers have valid VAT numbers')
  }
  
  if (validationData.icp_without_btw) {
    recommendations.push('Check invoice export classification - EU B2B invoices should generate BTW Section 3b amounts')
  }
  
  if (validationData.btw_without_icp) {
    recommendations.push('Ensure all EU B2B invoices have customer VAT numbers to generate ICP declarations')
  }
  
  if (validationData.amounts_match) {
    recommendations.push('ICP and BTW amounts match - declaration is ready for submission')
  }
  
  return recommendations
}