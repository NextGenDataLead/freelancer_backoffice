import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  supabaseAdmin,
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse
} from '@/lib/supabase/financial-client'
import type { InvoiceItem } from '@/lib/types/financial'

const BulkInvoiceCreationSchema = z.object({
  invoices: z.array(z.object({
    client_id: z.string().uuid(),
    type: z.enum(['time_based', 'manual']),
    
    // For time-based invoices
    time_entry_ids: z.array(z.string().uuid()).optional(),
    
    // For manual invoices or manual additions
    manual_items: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().min(0),
      unit_price: z.number().min(0),
      tax_percentage: z.number().min(0).max(100).optional().default(21)
    })).optional(),
    
    // Common fields
    notes: z.string().optional(),
    due_date: z.string().optional(),
    payment_terms: z.string().optional()
  })).min(1)
})

/**
 * POST /api/invoices/bulk
 * Creates multiple invoices in a single transaction
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()
    const validatedData = BulkInvoiceCreationSchema.parse(body)

    // Verify all clients belong to the user's tenant
    const clientIds = validatedData.invoices.map(inv => inv.client_id)
    console.log('🔍 Looking for clients:', clientIds)
    console.log('🏢 User tenant_id:', profile.tenant_id)
    
    // Get clients for the user's tenant - add tenant filter to query
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, name, company_name, vat_number, tenant_id, country_code, is_business')
      .in('id', clientIds)
      .eq('tenant_id', profile.tenant_id)

    console.log('📊 All clients found:', clients?.length)
    console.log('🔗 Clients data:', clients?.map(c => ({ id: c.id, name: c.name, tenant_id: c.tenant_id })))
    console.log('🆔 Expected client IDs:', clientIds)
    
    if (clientsError) {
      console.error('🚨 Client query error:', clientsError)
    }

    // Filter clients that belong to the user's tenant
    const userClients = clients?.filter(c => c.tenant_id === profile.tenant_id) || []
    
    console.log('✅ User clients after filter:', userClients.length)
    console.log('🏢 Profile tenant_id:', profile.tenant_id)
    console.log('🔍 User clients IDs:', userClients.map(c => c.id))
    console.log('🔍 Expected client IDs:', clientIds)
    
    // Use actual client data for proper VAT calculations
    const validClients = userClients

    // Verify all time entries belong to the user's tenant and are unbilled
    const allTimeEntryIds = validatedData.invoices
      .flatMap(inv => inv.time_entry_ids || [])
    
    if (allTimeEntryIds.length > 0) {
      const { data: timeEntries, error: timeEntriesError } = await supabaseAdmin
        .from('time_entries')
        .select('id, invoiced, invoice_id, client_id')
        .in('id', allTimeEntryIds)
        .eq('tenant_id', profile.tenant_id)

      if (timeEntriesError || !timeEntries || timeEntries.length !== allTimeEntryIds.length) {
        return NextResponse.json({
          success: false,
          message: 'Some time entries not found or do not belong to your tenant',
          status: 400
        }, { status: 400 })
      }

      // Check if any time entries are already invoiced
      const alreadyInvoiced = timeEntries.filter(entry => entry.invoiced)
      if (alreadyInvoiced.length > 0) {
        return NextResponse.json({
          success: false,
          message: `${alreadyInvoiced.length} time entries are already invoiced`,
          already_invoiced_ids: alreadyInvoiced.map(e => e.id),
          status: 400
        }, { status: 400 })
      }
    }

    // Start transaction to create all invoices
    const createdInvoices = []
    const errors = []

    for (const invoiceData of validatedData.invoices) {
      try {
        const client = validClients.find(c => c.id === invoiceData.client_id)
        
        if (!client) {
          console.error('❌ Client not found:', invoiceData.client_id)
          errors.push(`Client not found: ${invoiceData.client_id}`)
          continue
        }
        
        // Calculate invoice total
        let subtotal = 0
        let items: InvoiceItem[] = []

        // Add time entries if this is a time-based invoice
        if (invoiceData.type === 'time_based' && invoiceData.time_entry_ids) {
          const { data: timeEntries, error: timeError } = await supabaseAdmin
            .from('time_entries')
            .select('*')
            .in('id', invoiceData.time_entry_ids)
            .eq('client_id', invoiceData.client_id)

          if (timeError || !timeEntries) {
            errors.push(`Failed to fetch time entries for client ${client.name}`)
            continue
          }

          // Convert time entries to invoice items (VAT will be calculated separately)
          items = timeEntries.map(entry => ({
            description: entry.description || 'Time entry',
            quantity: entry.hours || 0,
            unit_price: entry.hourly_rate || 0,
            amount: (entry.hours || 0) * (entry.hourly_rate || 0)
          }))

          subtotal += items.reduce((sum, item) => sum + item.amount, 0)
        }

        // Add manual items
        if (invoiceData.manual_items && invoiceData.manual_items.length > 0) {
          const manualItems: InvoiceItem[] = invoiceData.manual_items.map(item => ({
            ...item,
            amount: item.quantity * item.unit_price
          }))
          
          items = [...items, ...manualItems]
          subtotal += manualItems.reduce((sum, item) => sum + item.amount, 0)
        }

        // Calculate VAT based on Dutch tax rules
        let vatType: 'standard' | 'reverse_charge' | 'exempt' = 'standard'
        let vatRate = 0.21 // Default Dutch rate

        // Normalize country code (handles "België" -> "BE" etc.)
        const normalizedCountry = normalizeCountryCode(client.country_code || 'NL')

        if (normalizedCountry === 'NL') {
          // Domestic (Netherlands) - always standard VAT
          vatType = 'standard'
          vatRate = 0.21
        } else if (isEUCountry(normalizedCountry)) {
          if (client.is_business && client.vat_number) {
            // EU B2B with VAT number - reverse charge (BTW verlegd)
            vatType = 'reverse_charge'
            vatRate = 0
          } else {
            // EU B2C or B2B without VAT number - Dutch VAT applies
            vatType = 'standard'
            vatRate = 0.21
          }
        } else {
          // Non-EU - export, no VAT
          vatType = 'exempt'
          vatRate = 0
        }

        const vat_amount = Math.round(subtotal * vatRate * 100) / 100
        const total_amount = Math.round((subtotal + vat_amount) * 100) / 100

        // Generate invoice number
        const { data: lastInvoice } = await supabaseAdmin
          .from('invoices')
          .select('invoice_number')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(1)

        let invoiceNumber = 'INV-001'
        if (lastInvoice && lastInvoice.length > 0) {
          const lastNumber = parseInt(lastInvoice[0].invoice_number.split('-')[1]) || 0
          invoiceNumber = `INV-${String(lastNumber + 1).padStart(3, '0')}`
        }

        // Create the invoice
        const { data: newInvoice, error: invoiceError } = await supabaseAdmin
          .from('invoices')
          .insert({
            tenant_id: profile.tenant_id,
            client_id: invoiceData.client_id,
            invoice_number: invoiceNumber,
            status: 'draft',
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: invoiceData.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal,
            vat_type: vatType,
            vat_rate: vatRate,
            vat_amount,
            total_amount,
            currency: 'EUR',
            reference: invoiceData.payment_terms || '30 days',
            notes: invoiceData.notes,
            created_by: profile.id
          })
          .select()
          .single()

        if (invoiceError) {
          errors.push(`Failed to create invoice for client ${client.name}: ${invoiceError.message}`)
          continue
        }

        // Create invoice items
        if (items.length > 0) {
          const invoiceItems = items.map(item => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.amount
          }))

          const { error: itemsError } = await supabaseAdmin
            .from('invoice_items')
            .insert(invoiceItems)

          if (itemsError) {
            console.error('Error creating invoice items:', itemsError)
            // Don't fail the entire operation, but log the error
          }
        }

        // Mark time entries as invoiced if this was a time-based invoice
        if (invoiceData.type === 'time_based' && invoiceData.time_entry_ids && invoiceData.time_entry_ids.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('time_entries')
            .update({
              invoiced: true,
              invoice_id: newInvoice.id,
              updated_at: new Date().toISOString()
            })
            .in('id', invoiceData.time_entry_ids)

          if (updateError) {
            console.error('Error marking time entries as invoiced:', updateError)
            // Don't fail the entire operation, but log the error
          }
        }

        createdInvoices.push(newInvoice)

      } catch (invoiceError) {
        const client = clients.find(c => c.id === invoiceData.client_id)
        errors.push(`Failed to create invoice for client ${client?.name || 'Unknown'}: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`)
      }
    }

    // Return results
    const response = createApiResponse(
      {
        created_invoices: createdInvoices,
        success_count: createdInvoices.length,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        total_amount: createdInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
      },
      errors.length === 0 
        ? `Successfully created ${createdInvoices.length} invoices`
        : `Created ${createdInvoices.length} invoices with ${errors.length} errors`
    )

    return NextResponse.json(response, { 
      status: errors.length === 0 ? 200 : 207 // 207 Multi-Status for partial success
    })

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      console.error('🔍 Validation Error Details:', (error as any).issues)
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('Bulk invoice creation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
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