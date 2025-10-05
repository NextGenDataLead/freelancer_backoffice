import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin, 
  getCurrentUserProfile, 
  ApiErrors, 
  createApiResponse 
} from '@/lib/supabase/financial-client'
import { getCurrentDate } from '@/lib/current-date'

// Validation schema for ICP declaration request
const ICPDeclarationSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  quarter: z.coerce.number().int().min(1).max(4),
  validate_vat_numbers: z.coerce.boolean().default(true)
})

export interface ICPDeclaration {
  period: {
    year: number
    quarter: number
    date_from: string
    date_to: string
    generated_at: string
  }
  goods_deliveries: Array<{
    customer_vat_number: string
    customer_name: string
    country_code: string
    net_amount: number
    transaction_count: number
    invoice_numbers: string[]
  }>
  services_provided: Array<{
    customer_vat_number: string
    customer_name: string
    country_code: string
    net_amount: number
    transaction_count: number
    invoice_numbers: string[]
    service_description: string
  }>
  services_received: Array<{
    supplier_vat_number: string
    supplier_name: string
    country_code: string
    net_amount: number
    transaction_count: number
    service_description: string
  }>
  summary: {
    total_customers: number
    total_suppliers: number
    total_goods_amount: number
    total_services_provided_amount: number
    total_services_received_amount: number
    countries_involved: string[]
    requires_icp_submission: boolean
  }
  validation: {
    vat_numbers_checked: boolean
    invalid_vat_numbers: Array<{
      vat_number: string
      country_code: string
      entity_name: string
      error: string
    }>
    consistency_with_vat_return: boolean
    vat_return_alignment: {
      expected_rubriek_3b: number
      calculated_total: number
      difference: number
    }
  }
  compliance_notes: {
    submission_required: boolean
    submission_deadline: string
    notes: string[]
    warnings: string[]
  }
}

/**
 * GET /api/reports/icp-declaration
 * Generates Dutch ICP (Intracommunautaire Prestaties) declaration for intra-EU transactions
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    console.log('ICP - Received query params:', queryParams)
    
    let validatedParams
    try {
      validatedParams = ICPDeclarationSchema.parse(queryParams)
      console.log('ICP - Validated params:', validatedParams)
    } catch (validationError) {
      console.error('ICP - Validation error:', validationError)
      return NextResponse.json(ApiErrors.ValidationError(validationError), { status: 400 })
    }
    
    const { year, quarter, validate_vat_numbers } = validatedParams

    // Calculate quarter dates
    const quarterStartMonth = (quarter - 1) * 3
    const quarterStart = new Date(year, quarterStartMonth, 1)
    const quarterEnd = new Date(year, quarterStartMonth + 3, 0) // Last day of quarter

    console.log(`Generating ICP declaration for Q${quarter} ${year}: ${quarterStart.toISOString().split('T')[0]} to ${quarterEnd.toISOString().split('T')[0]}`)

    // Initialize ICP declaration structure
    const icpDeclaration: ICPDeclaration = {
      period: {
        year,
        quarter,
        date_from: quarterStart.toISOString().split('T')[0],
        date_to: quarterEnd.toISOString().split('T')[0],
        generated_at: getCurrentDate().toISOString()
      },
      goods_deliveries: [],
      services_provided: [],
      services_received: [],
      summary: {
        total_customers: 0,
        total_suppliers: 0,
        total_goods_amount: 0,
        total_services_provided_amount: 0,
        total_services_received_amount: 0,
        countries_involved: [],
        requires_icp_submission: false
      },
      validation: {
        vat_numbers_checked: validate_vat_numbers,
        invalid_vat_numbers: [],
        consistency_with_vat_return: false,
        vat_return_alignment: {
          expected_rubriek_3b: 0,
          calculated_total: 0,
          difference: 0
        }
      },
      compliance_notes: {
        submission_required: false,
        submission_deadline: calculateSubmissionDeadline(year, quarter),
        notes: [],
        warnings: []
      }
    }

    // Process EU services provided (revenue)
    await processEUServicesProvided(icpDeclaration, profile.tenant_id, quarterStart, quarterEnd)

    // Process EU goods deliveries (if applicable - for future expansion)
    await processEUGoodsDeliveries(icpDeclaration, profile.tenant_id, quarterStart, quarterEnd)

    // Process EU services received (expenses)
    await processEUServicesReceived(icpDeclaration, profile.tenant_id, quarterStart, quarterEnd)

    // Calculate summary statistics
    calculateICPSummary(icpDeclaration)

    // Validate VAT numbers if requested
    if (validate_vat_numbers) {
      await validateVATNumbers(icpDeclaration)
    }

    // Check consistency with VAT return
    await checkVATReturnConsistency(icpDeclaration, profile.tenant_id, quarterStart, quarterEnd)

    // Determine compliance requirements
    determineComplianceRequirements(icpDeclaration)

    // Save report for audit trail
    const { data: savedReport } = await supabaseAdmin
      .from('financial_reports')
      .insert({
        tenant_id: profile.tenant_id,
        report_type: 'icp_declaration',
        period_start: quarterStart.toISOString().split('T')[0],
        period_end: quarterEnd.toISOString().split('T')[0],
        data: icpDeclaration,
        generated_by: profile.id
      })
      .select()
      .single()

    console.log(`ICP declaration generated successfully for Q${quarter} ${year}, saved as report ${savedReport?.id}`)

    const response = createApiResponse(icpDeclaration, `ICP declaration generated for Q${quarter} ${year}`)
    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('ICP declaration generation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Process EU services provided (from invoices with reverse charge)
 */
async function processEUServicesProvided(
  icpDeclaration: ICPDeclaration,
  tenantId: string,
  quarterStart: Date,
  quarterEnd: Date
) {
  const { data: invoices, error: invoicesError } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      client:clients!inner(
        id,
        name,
        country_code,
        vat_number,
        is_business
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('export_classification', 'eu_b2b')  // Use corrected BTW classification
    .gte('invoice_date', quarterStart.toISOString().split('T')[0])
    .lte('invoice_date', quarterEnd.toISOString().split('T')[0])
    .in('status', ['sent', 'paid', 'partial'])
    .not('customer_vat_number', 'is', null)  // Use corrected field

  if (invoicesError) {
    console.error('Error fetching EU invoices for ICP:', invoicesError)
    throw new Error('Failed to fetch EU invoice data')
  }

  console.log(`Processing ${invoices?.length || 0} EU B2B service invoices`)

  const serviceCustomers = new Map<string, any>()

  invoices?.forEach(invoice => {
    const subtotal = parseFloat(invoice.subtotal.toString())
    const key = `${invoice.customer_vat_number || invoice.client.vat_number}-${invoice.place_of_supply_country || invoice.client.country_code}`

    if (!serviceCustomers.has(key)) {
      serviceCustomers.set(key, {
        customer_vat_number: invoice.customer_vat_number || invoice.client.vat_number,  // Use corrected field first
        customer_name: invoice.client.name,
        country_code: invoice.place_of_supply_country || invoice.client.country_code,  // Use corrected field first
        net_amount: 0,
        transaction_count: 0,
        invoice_numbers: [],
        service_description: 'Professional services'
      })
    }

    const customer = serviceCustomers.get(key)
    customer.net_amount += subtotal
    customer.transaction_count++
    customer.invoice_numbers.push(invoice.invoice_number)
  })

  icpDeclaration.services_provided = Array.from(serviceCustomers.values())
  console.log(`Found ${icpDeclaration.services_provided.length} unique EU service customers`)
}

/**
 * Process EU goods deliveries (placeholder for future expansion)
 */
async function processEUGoodsDeliveries(
  icpDeclaration: ICPDeclaration,
  tenantId: string,
  quarterStart: Date,
  quarterEnd: Date
) {
  // For ZZP'ers (freelancers), goods deliveries are rare
  // This is a placeholder for future expansion if needed
  console.log('EU goods deliveries processing skipped (not applicable for most ZZP services)')
  icpDeclaration.goods_deliveries = []
}

/**
 * Process EU services received (from expenses with reverse charge)
 */
async function processEUServicesReceived(
  icpDeclaration: ICPDeclaration,
  tenantId: string,
  quarterStart: Date,
  quarterEnd: Date
) {
  const { data: expenses, error: expensesError } = await supabaseAdmin
    .from('expenses')
    .select(`
      *,
      category:expense_categories(name, metadata)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_reverse_charge', true)
    .gte('expense_date', quarterStart.toISOString().split('T')[0])
    .lte('expense_date', quarterEnd.toISOString().split('T')[0])
    .neq('supplier_country_code', 'NL')
    .not('supplier_vat_number', 'is', null)

  if (expensesError) {
    console.error('Error fetching EU expenses for ICP:', expensesError)
    throw new Error('Failed to fetch EU expense data')
  }

  console.log(`Processing ${expenses?.length || 0} EU B2B service expenses`)

  const serviceSuppliers = new Map<string, any>()

  expenses?.forEach(expense => {
    const amount = parseFloat(expense.amount.toString())
    const businessPercentage = expense.business_percentage || 100
    const businessAmount = amount * businessPercentage / 100
    const key = `${expense.supplier_vat_number}-${expense.supplier_country_code}`

    if (!serviceSuppliers.has(key)) {
      serviceSuppliers.set(key, {
        supplier_vat_number: expense.supplier_vat_number,
        supplier_name: expense.vendor_name || 'Unknown Supplier',
        country_code: expense.supplier_country_code,
        net_amount: 0,
        transaction_count: 0,
        service_description: expense.category?.name || 'Business services'
      })
    }

    const supplier = serviceSuppliers.get(key)
    supplier.net_amount += businessAmount
    supplier.transaction_count++
  })

  icpDeclaration.services_received = Array.from(serviceSuppliers.values())
  console.log(`Found ${icpDeclaration.services_received.length} unique EU service suppliers`)
}

/**
 * Calculate ICP summary statistics
 */
function calculateICPSummary(icpDeclaration: ICPDeclaration) {
  const summary = icpDeclaration.summary

  // Count unique entities
  summary.total_customers = icpDeclaration.services_provided.length + icpDeclaration.goods_deliveries.length
  summary.total_suppliers = icpDeclaration.services_received.length

  // Calculate amounts
  summary.total_goods_amount = icpDeclaration.goods_deliveries.reduce((sum, item) => sum + item.net_amount, 0)
  summary.total_services_provided_amount = icpDeclaration.services_provided.reduce((sum, item) => sum + item.net_amount, 0)
  summary.total_services_received_amount = icpDeclaration.services_received.reduce((sum, item) => sum + item.net_amount, 0)

  // Collect unique countries
  const countries = new Set<string>()
  icpDeclaration.services_provided.forEach(item => countries.add(item.country_code))
  icpDeclaration.goods_deliveries.forEach(item => countries.add(item.country_code))
  icpDeclaration.services_received.forEach(item => countries.add(item.country_code))
  summary.countries_involved = Array.from(countries).sort()

  // Determine if ICP submission is required
  summary.requires_icp_submission = summary.total_customers > 0 || summary.total_suppliers > 0

  console.log(`ICP Summary: ${summary.total_customers} customers, ${summary.total_suppliers} suppliers, Total provided: €${summary.total_services_provided_amount.toFixed(2)}`)
}

/**
 * Validate EU VAT numbers via VIES (simplified version)
 */
async function validateVATNumbers(icpDeclaration: ICPDeclaration) {
  console.log('VAT number validation via VIES API - placeholder implementation')
  
  // In a real implementation, this would:
  // 1. Call the EU VIES API for each VAT number
  // 2. Cache results in vat_number_validations table
  // 3. Mark invalid numbers for user attention
  
  // For now, we'll assume all VAT numbers are valid
  // TODO: Implement actual VIES API integration
  
  icpDeclaration.validation.vat_numbers_checked = true
  icpDeclaration.validation.invalid_vat_numbers = []
  
  // Add note about validation
  icpDeclaration.compliance_notes.notes.push('VAT number validation via VIES API not yet implemented - manual verification recommended')
}

/**
 * Check consistency with VAT return data
 */
async function checkVATReturnConsistency(
  icpDeclaration: ICPDeclaration,
  tenantId: string,
  quarterStart: Date,
  quarterEnd: Date
) {
  // Calculate what should be in VAT return rubriek 3b (intra-EU supplies)
  const expectedRubriek3b = icpDeclaration.summary.total_goods_amount + icpDeclaration.summary.total_services_provided_amount

  // Try to fetch corresponding VAT return data
  const { data: vatReturn } = await supabaseAdmin
    .from('financial_reports')
    .select('data')
    .eq('tenant_id', tenantId)
    .eq('report_type', 'quarterly_vat_return')
    .eq('period_start', quarterStart.toISOString().split('T')[0])
    .eq('period_end', quarterEnd.toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (vatReturn?.data) {
    const vatData = vatReturn.data as any
    const actualReverseCharge = vatData.revenue?.reverse_charge_eu?.amount || 0
    const difference = Math.abs(expectedRubriek3b - actualReverseCharge)

    icpDeclaration.validation.vat_return_alignment = {
      expected_rubriek_3b: expectedRubriek3b,
      calculated_total: actualReverseCharge,
      difference: difference
    }

    icpDeclaration.validation.consistency_with_vat_return = difference < 0.01 // Allow for rounding

    if (!icpDeclaration.validation.consistency_with_vat_return) {
      icpDeclaration.compliance_notes.warnings.push(`ICP total (€${expectedRubriek3b.toFixed(2)}) does not match VAT return reverse charge amount (€${actualReverseCharge.toFixed(2)})`)
    }
  } else {
    icpDeclaration.compliance_notes.notes.push('No corresponding VAT return found for consistency check')
  }

  console.log(`VAT return consistency check: Expected €${expectedRubriek3b.toFixed(2)}, Consistent: ${icpDeclaration.validation.consistency_with_vat_return}`)
}

/**
 * Determine compliance requirements and submission deadlines
 */
function determineComplianceRequirements(icpDeclaration: ICPDeclaration) {
  const summary = icpDeclaration.summary
  const compliance = icpDeclaration.compliance_notes

  // ICP submission is required if there are any intra-EU transactions
  compliance.submission_required = summary.requires_icp_submission

  if (compliance.submission_required) {
    compliance.notes.push('ICP declaration submission required due to intra-EU transactions')
    compliance.notes.push('Submit via Mijn Belastingdienst Zakelijk or SBR-enabled software')
    compliance.notes.push('ICP data must align with VAT return rubriek 3b totals')

    // Check for significant amounts that might require monthly reporting
    const totalProvided = summary.total_services_provided_amount + summary.total_goods_amount
    if (totalProvided > 50000) { // Example threshold
      compliance.warnings.push('High transaction volume - consider monthly ICP reporting instead of quarterly')
    }

    // Remind about VAT number requirements
    if (icpDeclaration.services_provided.some(s => !s.customer_vat_number) || 
        icpDeclaration.services_received.some(s => !s.supplier_vat_number)) {
      compliance.warnings.push('All EU B2B transactions require valid VAT numbers')
    }
  } else {
    compliance.notes.push('No ICP declaration required - no intra-EU transactions found')
  }
}

/**
 * Calculate submission deadline based on quarter
 */
function calculateSubmissionDeadline(year: number, quarter: number): string {
  // ICP declarations have the same deadlines as VAT returns
  switch (quarter) {
    case 1: return `${year}-04-30` // Q1 due April 30
    case 2: return `${year}-07-31` // Q2 due July 31  
    case 3: return `${year}-10-31` // Q3 due October 31
    case 4: return `${year + 1}-01-31` // Q4 due January 31 next year
    default: return `${year}-04-30`
  }
}