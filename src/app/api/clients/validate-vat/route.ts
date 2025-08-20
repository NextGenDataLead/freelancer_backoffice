import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateEUVATNumber } from '@/lib/validations/financial'
import type { VATValidationResponse, FinancialApiResponse } from '@/lib/types/financial'

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

    // In a real implementation, you would call the VIES API here
    // For now, we'll simulate the validation based on format
    const mockVIESResponse = await mockVIESValidation(cleanedVATNumber, country_code)

    const response: FinancialApiResponse<VATValidationResponse> = {
      data: mockVIESResponse,
      success: mockVIESResponse.valid,
      message: mockVIESResponse.valid ? 'VAT number is valid' : 'VAT number is invalid or not found in VIES database'
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
 * Mock VIES validation function
 * In production, this would make actual calls to the VIES API
 * https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl
 */
async function mockVIESValidation(vatNumber: string, countryCode: string): Promise<VATValidationResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Mock validation logic based on known patterns
  const mockCompanies: Record<string, { name: string; address: string }> = {
    'NL123456789B01': {
      name: 'Test Company B.V.',
      address: 'Teststraat 1, 1000 AA Amsterdam, Netherlands'
    },
    'DE123456789': {
      name: 'Test GmbH',
      address: 'Teststraße 1, 10115 Berlin, Germany'
    },
    'BE0123456789': {
      name: 'Test N.V.',
      address: 'Teststraat 1, 1000 Brussels, Belgium'
    },
    'BE0690567150': {
      name: 'Valid Belgian Company BVBA',
      address: 'Brussels Street 123, 1000 Brussels, Belgium'
    }
  }

  const company = mockCompanies[vatNumber]
  
  // For demonstration: assume format-valid numbers are valid if they pass EU format validation
  const isValid = company !== undefined || validateEUVATNumber(vatNumber, countryCode)

  return {
    vat_number: vatNumber,
    country_code: countryCode,
    valid: isValid,
    company_name: company?.name,
    company_address: company?.address
  }
}

/**
 * Real VIES API integration example (commented out)
 * You would use this in production
 */
/*
async function validateVATWithVIES(vatNumber: string, countryCode: string): Promise<VATValidationResponse> {
  try {
    // Remove country code from VAT number for VIES API
    const vatNumberOnly = vatNumber.replace(new RegExp(`^${countryCode}`), '')
    
    const viesUrl = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{{memberStateCode}}/vat/{{vatNumber}}'
    const url = viesUrl
      .replace('{{memberStateCode}}', countryCode)
      .replace('{{vatNumber}}', vatNumberOnly)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`VIES API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      vat_number: vatNumber,
      country_code: countryCode,
      valid: data.valid === true,
      company_name: data.name || undefined,
      company_address: data.address || undefined
    }
  } catch (error) {
    console.error('VIES API error:', error)
    // Return format validation only on API failure
    return {
      vat_number: vatNumber,
      country_code: countryCode,
      valid: validateEUVATNumber(vatNumber, countryCode)
    }
  }
}
*/