import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { InvoiceCalculation, FinancialApiResponse, VATType } from '@/lib/types/financial'
import { 
  getCurrentUserProfile,
  ApiErrors,
  createApiResponse,
  getDutchVATRates,
  calculateInvoiceTotals
} from '@/lib/supabase/financial-client'

// Request schema for VAT calculation
const VATCalculationRequestSchema = z.object({
  items: z.array(z.object({
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unit_price: z.number().min(0, 'Unit price must be positive')
  })).min(1, 'At least one item is required'),
  client_country: z.string().length(2, 'Country code must be 2 characters').default('NL'),
  client_has_vat_number: z.boolean().default(false),
  client_is_business: z.boolean().default(true),
  vat_type_override: z.enum(['standard', 'reverse_charge', 'exempt', 'reduced']).optional()
})

/**
 * POST /api/vat/calculate
 * Calculates VAT amounts based on client location and business type
 * Implements Dutch VAT rules including reverse-charge (BTW verlegd) for EU B2B
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    const body = await request.json()
    const validatedData = VATCalculationRequestSchema.parse(body)

    // Determine VAT type and rate based on Dutch tax rules
    let vatType: VATType = 'standard'
    let vatRate = 0.21 // Default Dutch standard rate

    // Apply VAT type override if provided
    if (validatedData.vat_type_override) {
      vatType = validatedData.vat_type_override
    } else {
      // Determine VAT type based on client characteristics
      if (validatedData.client_country === 'NL') {
        // Domestic (Netherlands) - always standard VAT
        vatType = 'standard'
        vatRate = 0.21
      } else if (isEUCountry(validatedData.client_country)) {
        if (validatedData.client_is_business && validatedData.client_has_vat_number) {
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
    }

    // Get current VAT rate from database if using standard rate
    if (vatType === 'standard') {
      const vatRates = await getDutchVATRates()
      const standardRate = vatRates.find(rate => rate.rate_type === 'standard')
      if (standardRate) {
        vatRate = standardRate.rate
      }
    } else if (vatType === 'reduced') {
      const vatRates = await getDutchVATRates()
      const reducedRate = vatRates.find(rate => rate.rate_type === 'reduced')
      if (reducedRate) {
        vatRate = reducedRate.rate
      }
    }

    // Calculate totals
    const { subtotal, vatAmount, totalAmount } = calculateInvoiceTotals(
      validatedData.items,
      vatRate
    )

    const calculation: InvoiceCalculation = {
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      vat_rate: vatRate,
      vat_type: vatType
    }

    // Add explanation for the VAT calculation
    let explanation = ''
    switch (vatType) {
      case 'standard':
        explanation = `Standard Dutch VAT (${Math.round(vatRate * 100)}%) applied`
        break
      case 'reverse_charge':
        explanation = 'Reverse charge (BTW verlegd) - VAT handled by customer'
        break
      case 'exempt':
        explanation = 'Export outside EU - VAT exempt'
        break
      case 'reduced':
        explanation = `Reduced Dutch VAT rate (${Math.round(vatRate * 100)}%) applied`
        break
    }

    const response = createApiResponse({
      ...calculation,
      explanation,
      applied_rules: {
        client_country: validatedData.client_country,
        client_is_business: validatedData.client_is_business,
        client_has_vat_number: validatedData.client_has_vat_number,
        is_eu_country: isEUCountry(validatedData.client_country),
        is_domestic: validatedData.client_country === 'NL'
      }
    }, 'VAT calculation completed')

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const validationError = ApiErrors.ValidationError((error as any).issues)
      return NextResponse.json(validationError, { status: validationError.status })
    }

    console.error('VAT calculation error:', error)
    return NextResponse.json(ApiErrors.InternalError, { status: ApiErrors.InternalError.status })
  }
}

/**
 * GET /api/vat/calculate
 * Returns current Dutch VAT rates and calculation rules
 */
export async function GET() {
  try {
    // Get authenticated user profile
    const profile = await getCurrentUserProfile()
    
    if (!profile) {
      return NextResponse.json(ApiErrors.Unauthorized, { status: ApiErrors.Unauthorized.status })
    }

    // Get current VAT rates from database
    const vatRates = await getDutchVATRates()

    const response = createApiResponse({
      vat_rates: vatRates,
      calculation_rules: {
        domestic_nl: {
          vat_type: 'standard',
          rate: 0.21,
          description: 'Standard Dutch VAT for domestic sales'
        },
        eu_b2b_with_vat: {
          vat_type: 'reverse_charge',
          rate: 0,
          description: 'Reverse charge (BTW verlegd) for EU B2B with valid VAT number'
        },
        eu_b2c_or_no_vat: {
          vat_type: 'standard',
          rate: 0.21,
          description: 'Dutch VAT for EU B2C or B2B without VAT number'
        },
        non_eu_export: {
          vat_type: 'exempt',
          rate: 0,
          description: 'Export outside EU - VAT exempt'
        }
      },
      eu_countries: EU_COUNTRIES
    }, 'VAT rates and calculation rules retrieved')

    return NextResponse.json(response)

  } catch (error) {
    console.error('VAT rates fetch error:', error)
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
 * Checks if a country code is in the EU for VAT purposes
 */
function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRIES.includes(countryCode.toUpperCase())
}