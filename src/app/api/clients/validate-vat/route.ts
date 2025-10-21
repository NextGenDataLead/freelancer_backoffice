import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateEUVATNumber } from '@/lib/validations/financial'
import type { VATValidationResponse, FinancialApiResponse } from '@/lib/types/financial'
import { getCurrentDate } from '@/lib/current-date'

// Validation schema for VAT validation request
const VATValidationRequestSchema = z.object({
  vat_number: z.string().min(1, 'VAT number is required'),
  country_code: z.string().length(2, 'Country code must be 2 characters').toUpperCase()
})

/**
 * POST /api/clients/validate-vat
 * Validates EU VAT numbers using VIES (VAT Information Exchange System)
 * This is a simplified version - in production, you'd integrate with actual VIES API
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { vat_number, country_code } = VATValidationRequestSchema.parse(body)

    // Clean VAT number (remove spaces, convert to uppercase)
    const cleanedVATNumber = vat_number.replace(/\s/g, '').toUpperCase()

    // Basic format validation
    const isValidFormat = validateEUVATNumber(cleanedVATNumber, country_code)
    
    if (!isValidFormat) {
      const response: FinancialApiResponse<VATValidationResponse> = {
        data: {
          vat_number: cleanedVATNumber,
          country_code,
          valid: false
        },
        success: false,
        message: 'Invalid VAT number format for the specified country'
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Call the real VIES API
    const viesResponse = await validateVATWithVIES(cleanedVATNumber, country_code)

    const response: FinancialApiResponse<VATValidationResponse> = {
      data: viesResponse,
      success: viesResponse.valid,
      message: viesResponse.valid ? 'VAT number is valid' : 'VAT number is invalid or not found in VIES database'
    }

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues 
      }, { status: 400 })
    }

    console.error('VAT validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Real VIES API integration
 * Validates EU VAT numbers using the official VIES REST API
 * https://ec.europa.eu/taxation_customs/vies/
 */
async function validateVATWithVIES(vatNumber: string, countryCode: string): Promise<VATValidationResponse> {
  try {
    // Remove country code from VAT number for VIES API
    const vatNumberOnly = vatNumber.replace(new RegExp(`^${countryCode}`), '')
    
    console.log(`VIES validation: ${countryCode}${vatNumberOnly}`)
    
    // Use the official VIES REST API
    const viesUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumberOnly}`
    
    const response = await fetch(viesUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Dutch-ZZP-Financial-Suite/1.0'
      },
      // 15 second timeout for VIES API
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      // VIES API returns specific error codes
      if (response.status === 400) {
        console.warn(`VIES API: Invalid VAT number format - ${countryCode}${vatNumberOnly}`)
        return {
          vat_number: vatNumber,
          country_code: countryCode,
          valid: false,
          error: 'Invalid VAT number format'
        }
      } else if (response.status === 500) {
        console.warn(`VIES API: Service unavailable - ${countryCode}${vatNumberOnly}`)
        // Fallback to format validation when VIES is down
        return {
          vat_number: vatNumber,
          country_code: countryCode,
          valid: validateEUVATNumber(vatNumber, countryCode),
          error: 'VIES service temporarily unavailable - format validation only'
        }
      }
      
      throw new Error(`VIES API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log(`VIES response for ${countryCode}${vatNumberOnly}:`, {
      isValid: data.isValid,
      hasCompanyInfo: !!(data.name || data.address)
    })
    
    return {
      vat_number: vatNumber,
      country_code: countryCode,
      valid: data.isValid === true,
      company_name: data.name || undefined,
      company_address: data.address || undefined,
      validation_date: new Date(getCurrentDate().getTime()).toISOString()
    }
    
  } catch (error) {
    console.error(`VIES API error for ${countryCode}${vatNumber}:`, error)
    
    // Return format validation on API failure with clear error message
    const formatValid = validateEUVATNumber(vatNumber, countryCode)
    
    return {
      vat_number: vatNumber,
      country_code: countryCode,
      valid: formatValid,
      error: error instanceof Error ? error.message : 'VIES API connection failed',
      fallback_used: true
    }
  }
}
