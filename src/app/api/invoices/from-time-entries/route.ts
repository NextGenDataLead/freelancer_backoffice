import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'

// Schema for creating invoice from time entries
const CreateInvoiceFromTimeEntriesSchema = z.object({
  client_id: z.string().uuid(),
  time_entry_ids: z.array(z.string().uuid()).min(1),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().optional(),
  notes: z.string().optional(),
  additional_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit_price: z.number().min(0)
  })).optional().default([])
})

/**
 * POST /api/invoices/from-time-entries
 * Creates an invoice from selected time entries
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()
    const validatedData = CreateInvoiceFromTimeEntriesSchema.parse(body)

    // Verify client exists and belongs to tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', validatedData.client_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (clientError || !client) {
      const notFoundError = ApiErrors.NotFound('Client')
      return NextResponse.json(notFoundError, { status: notFoundError.status })
    }

    // Verify all time entries belong to the user's tenant and client
    const { data: timeEntries, error: timeEntriesError } = await supabaseAdmin
      .from('time_entries')
      .select('*')
      .in('id', validatedData.time_entry_ids)
      .eq('tenant_id', profile.tenant_id)
      .eq('client_id', validatedData.client_id)
      .eq('billable', true)
      .eq('invoiced', false)

    if (timeEntriesError || !timeEntries) {
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    if (timeEntries.length !== validatedData.time_entry_ids.length) {
      return NextResponse.json({
        success: false,
        message: 'Some time entries not found or already invoiced',
        status: 400
      }, { status: 400 })
    }

    // Check if any entries are already invoiced
    const alreadyInvoiced = timeEntries.filter(entry => entry.invoiced)
    if (alreadyInvoiced.length > 0) {
      return NextResponse.json({
        success: false,
        message: `${alreadyInvoiced.length} time entries are already invoiced`,
        status: 400
      }, { status: 400 })
    }

    // Generate invoice items from time entries
    const timeBasedItems = timeEntries.map(entry => ({
      description: `${entry.description} (${new Date(entry.entry_date).toLocaleDateString('nl-NL')})`,
      quantity: entry.hours || 1,
      unit_price: entry.hourly_rate || 0
    }))

    // Combine with any additional manual items
    const allItems = [...timeBasedItems, ...validatedData.additional_items]

    // Calculate subtotal
    const subtotal = allItems.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    )

    // Get VAT calculation
    let vatCalculation
    try {
      const vatResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/vat/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: allItems,
          client_country: client.country_code,
          client_is_business: client.is_business,
          client_has_vat_number: !!client.vat_number
        })
      })

      if (vatResponse.ok) {
        const vatData = await vatResponse.json()
        vatCalculation = vatData.data
      } else {
        // Fallback calculation with proper EU VAT rules
        let fallbackVatRate = 0.21 // Default Dutch rate
        let fallbackVatType: 'standard' | 'reverse_charge' | 'exempt' = 'standard'
        
        // Normalize country code (handles "België" -> "BE" etc.)
        const normalizedCountry = normalizeCountryCode(client.country_code)
        
        if (normalizedCountry === 'NL') {
          // Domestic (Netherlands) - always standard VAT
          fallbackVatType = 'standard'
          fallbackVatRate = 0.21
        } else if (isEUCountry(normalizedCountry)) {
          if (client.is_business && client.vat_number) {
            // EU B2B with VAT number - reverse charge (BTW verlegd)
            fallbackVatType = 'reverse_charge'
            fallbackVatRate = 0
          } else {
            // EU B2C or B2B without VAT number - Dutch VAT applies
            fallbackVatType = 'standard'
            fallbackVatRate = 0.21
          }
        } else {
          // Non-EU - export, no VAT
          fallbackVatType = 'exempt'
          fallbackVatRate = 0
        }
        
        vatCalculation = {
          subtotal,
          vat_rate: fallbackVatRate,
          vat_amount: subtotal * fallbackVatRate,
          total_amount: subtotal * (1 + fallbackVatRate),
          vat_type: fallbackVatType
        }
      }
    } catch (error) {
      console.error('VAT calculation error:', error)
      // Use fallback calculation with proper EU VAT rules
      let fallbackVatRate = 0.21 // Default Dutch rate
      let fallbackVatType: 'standard' | 'reverse_charge' | 'exempt' = 'standard'
      
      // Normalize country code (handles "België" -> "BE" etc.)
      const normalizedCountry = normalizeCountryCode(client.country_code)
      
      if (normalizedCountry === 'NL') {
        // Domestic (Netherlands) - always standard VAT
        fallbackVatType = 'standard'
        fallbackVatRate = 0.21
      } else if (isEUCountry(normalizedCountry)) {
        if (client.is_business && client.vat_number) {
          // EU B2B with VAT number - reverse charge (BTW verlegd)
          fallbackVatType = 'reverse_charge'
          fallbackVatRate = 0
        } else {
          // EU B2C or B2B without VAT number - Dutch VAT applies
          fallbackVatType = 'standard'
          fallbackVatRate = 0.21
        }
      } else {
        // Non-EU - export, no VAT
        fallbackVatType = 'exempt'
        fallbackVatRate = 0
      }
      
      vatCalculation = {
        subtotal,
        vat_rate: fallbackVatRate,
        vat_amount: subtotal * fallbackVatRate,
        total_amount: subtotal * (1 + fallbackVatRate),
        vat_type: fallbackVatType
      }
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(profile.tenant_id)

    // Create the invoice first
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        client_id: validatedData.client_id,
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        invoice_number: invoiceNumber,
        invoice_date: validatedData.invoice_date,
        due_date: validatedData.due_date,
        reference: validatedData.reference || null,
        notes: validatedData.notes || null,
        subtotal: vatCalculation.subtotal,
        vat_type: vatCalculation.vat_type || (vatCalculation.reverse_charge ? 'reverse_charge' : 'standard'),
        vat_rate: vatCalculation.vat_rate, // Already in decimal format
        vat_amount: vatCalculation.vat_amount,
        total_amount: vatCalculation.total_amount,
        currency: 'EUR',
        status: 'draft'
      })
      .select(`
        *,
        client:clients(*)
      `)
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Create invoice items
    const invoiceItems = allItems.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError)
      // Clean up the invoice since items failed
      await supabaseAdmin.from('invoices').delete().eq('id', invoice.id)
      return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
    }

    // Mark time entries as invoiced
    const { error: updateTimeEntriesError } = await supabaseAdmin
      .from('time_entries')
      .update({
        invoiced: true,
        invoice_id: invoice.id,
        updated_at: new Date().toISOString()
      })
      .in('id', validatedData.time_entry_ids)

    if (updateTimeEntriesError) {
      console.error('Error updating time entries:', updateTimeEntriesError)
      // Continue - the invoice was created successfully
    }

    // Update client's last invoiced date
    await supabaseAdmin
      .from('clients')
      .update({ last_invoiced_date: validatedData.invoice_date })
      .eq('id', validatedData.client_id)

    const response = createApiResponse(
      {
        invoice,
        time_entries_marked: timeEntries.length,
        vat_calculation: vatCalculation
      },
      'Invoice created successfully from time entries'
    )

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Create invoice from time entries error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * Generate a unique invoice number for a tenant
 * Format: YYYY-NNNN (e.g., 2025-0001)
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Get the count of invoices for this tenant in the current year
  const { data: invoices, error } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .eq('tenant_id', tenantId)
    .like('invoice_number', `${currentYear}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching invoice count:', error)
    // Fallback to timestamp-based number
    return `${currentYear}-${Date.now().toString().slice(-4)}`
  }

  let nextNumber = 1
  if (invoices && invoices.length > 0) {
    const lastInvoiceNumber = invoices[0].invoice_number
    const lastNumber = parseInt(lastInvoiceNumber.split('-')[1] || '0')
    nextNumber = lastNumber + 1
  }

  return `${currentYear}-${nextNumber.toString().padStart(4, '0')}`
}

/**
 * EU country codes for VAT calculation
 */
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 
  'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
]

/**
 * Country name to ISO code mapping for Dutch names
 */
const COUNTRY_NAME_MAPPING: Record<string, string> = {
  // Dutch country names to ISO codes
  'belgië': 'BE',
  'belgie': 'BE',
  'duitsland': 'DE', 
  'frankrijk': 'FR',
  'spanje': 'ES',
  'italië': 'IT',
  'italie': 'IT',
  'oostenrijk': 'AT',
  'portugal': 'PT',
  'griekenland': 'GR',
  'polen': 'PL',
  'tsjechië': 'CZ',
  'tsjechie': 'CZ',
  'hongarije': 'HU',
  'slovenië': 'SI',
  'slovenie': 'SI',
  'slowakije': 'SK',
  'kroatië': 'HR',
  'kroatie': 'HR',
  'bulgarije': 'BG',
  'roemenië': 'RO',
  'roemenie': 'RO',
  'letland': 'LV',
  'litouwen': 'LT',
  'estland': 'EE',
  'finland': 'FI',
  'zweden': 'SE',
  'denemarken': 'DK',
  'ierland': 'IE',
  'cyprus': 'CY',
  'malta': 'MT',
  'luxemburg': 'LU',
  'nederland': 'NL',
  'netherlands': 'NL',
  
  // Common non-EU countries
  'verenigd koninkrijk': 'GB',
  'groot-brittannië': 'GB',
  'engeland': 'GB',
  'verenigde staten': 'US',
  'america': 'US',
  'canada': 'CA',
  'australië': 'AU',
  'australie': 'AU',
  'nieuw-zeeland': 'NZ',
  'zwitserland': 'CH',
  'noorwegen': 'NO',
  'ijsland': 'IS'
}

/**
 * Normalizes country code or name to ISO country code
 */
function normalizeCountryCode(countryInput: string): string {
  if (!countryInput) return 'NL' // Default to Netherlands
  
  const input = countryInput.trim().toLowerCase()
  
  // If it's already a 2-letter ISO code, return uppercase
  if (input.length === 2 && /^[a-z]{2}$/i.test(input)) {
    return input.toUpperCase()
  }
  
  // Check if it's a mapped country name
  const mappedCode = COUNTRY_NAME_MAPPING[input]
  if (mappedCode) {
    return mappedCode
  }
  
  // If no mapping found, assume it's already a country code and return uppercase
  return input.toUpperCase()
}

/**
 * Checks if a country code is in the EU for VAT purposes
 */
function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRIES.includes(countryCode.toUpperCase())
}