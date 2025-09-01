/**
 * Supplier validation utilities for expense management
 * Extends existing VAT validation with reverse charge detection
 */

import { validateEUVATNumber } from '@/lib/validations/financial'
import type { VATValidationResponse } from '@/lib/types/financial'

export interface SupplierValidationResult {
  isEUSupplier: boolean
  requiresReverseCharge: boolean
  vatValidation?: VATValidationResponse
  foreignSupplierWarnings: string[]
  suggestedVATType: 'standard' | 'reverse_charge' | 'exempt'
}

/**
 * Countries that require reverse charge for B2B services to Dutch businesses
 */
const REVERSE_CHARGE_COUNTRIES = new Set([
  // EU Member States (excluding NL)
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  // Common non-EU countries
  'GB', 'CH', 'NO', 'US', 'CA'
])

/**
 * Detect foreign supplier from vendor name patterns
 */
export function detectForeignSupplierFromName(vendorName: string): {
  isLikelyForeign: boolean
  suggestedCountry?: string
  indicators: string[]
} {
  if (!vendorName) {
    return { isLikelyForeign: false, indicators: [] }
  }
  
  const name = vendorName.toLowerCase()
  const indicators: string[] = []
  let suggestedCountry: string | undefined
  
  // German indicators
  if (/\b(gmbh|ag|kg|ohg)\b/.test(name)) {
    indicators.push('German legal entity (GmbH/AG/KG/OHG)')
    suggestedCountry = 'DE'
  }
  
  // UK indicators  
  if (/\b(ltd|limited|plc|llp)\b/.test(name)) {
    indicators.push('UK legal entity (Ltd/PLC/LLP)')
    suggestedCountry = 'GB'
  }
  
  // French indicators
  if (/\b(sarl|sas|sa|eurl)\b/.test(name)) {
    indicators.push('French legal entity (SARL/SAS/SA)')
    suggestedCountry = 'FR'
  }
  
  // US indicators
  if (/\b(inc|corp|llc)\b/.test(name)) {
    indicators.push('US legal entity (Inc/Corp/LLC)')
    suggestedCountry = 'US'
  }
  
  // Domain-based detection
  if (/\.(de|com|co\.uk|fr|it|es)$/.test(name)) {
    indicators.push('Foreign domain extension')
  }
  
  // Known international platforms
  const internationalPlatforms = [
    'amazon', 'ebay', 'aliexpress', 'alibaba', 'etsy', 'shopify'
  ]
  
  for (const platform of internationalPlatforms) {
    if (name.includes(platform)) {
      indicators.push(`International platform (${platform})`)
      break
    }
  }
  
  return {
    isLikelyForeign: indicators.length > 0,
    suggestedCountry,
    indicators
  }
}

/**
 * Check if supplier requires reverse charge based on country
 */
export function requiresReverseCharge(countryCode: string): boolean {
  return REVERSE_CHARGE_COUNTRIES.has(countryCode)
}

/**
 * Validate supplier VAT number using existing VIES endpoint
 */
export async function validateSupplierVAT(
  vatNumber: string, 
  countryCode: string
): Promise<VATValidationResponse | null> {
  if (!vatNumber || !countryCode) return null
  
  try {
    const response = await fetch('/api/clients/validate-vat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        vat_number: vatNumber, 
        country_code: countryCode.toUpperCase() 
      })
    })
    
    if (!response.ok) return null
    
    const result = await response.json()
    return result.data as VATValidationResponse
  } catch (error) {
    console.error('VAT validation failed:', error)
    return null
  }
}

/**
 * Comprehensive supplier validation for expenses
 */
export async function validateSupplierForExpense(
  vendorName: string,
  vatNumber?: string,
  countryCode?: string
): Promise<SupplierValidationResult> {
  const warnings: string[] = []
  let isEUSupplier = false
  let requiresReverseChargeFlag = false
  let vatValidation: VATValidationResponse | undefined
  
  // Detect foreign supplier from name if no country code provided
  const nameDetection = detectForeignSupplierFromName(vendorName)
  const finalCountryCode = countryCode || nameDetection.suggestedCountry
  
  if (nameDetection.isLikelyForeign && !countryCode) {
    warnings.push('Foreign supplier detected from company name - please verify country and VAT number')
  }
  
  // If we have country code, check requirements
  if (finalCountryCode) {
    requiresReverseChargeFlag = requiresReverseCharge(finalCountryCode)
    // Check if country is in EU by checking if it has a VAT pattern (without validating empty VAT)
    isEUSupplier = isEUCountry(finalCountryCode)
    
    if (requiresReverseChargeFlag) {
      warnings.push(`${getCountryName(finalCountryCode)} supplier may require reverse charge VAT`)
    }
    
    // Validate VAT number if provided
    if (vatNumber) {
      vatValidation = await validateSupplierVAT(vatNumber, finalCountryCode) || undefined
      
      if (!vatValidation?.valid) {
        warnings.push('VAT number could not be validated - please verify with supplier')
      } else if (isEUSupplier && requiresReverseChargeFlag) {
        warnings.push('EU B2B transaction - reverse charge VAT applies')
      }
    } else if (isEUSupplier && requiresReverseChargeFlag) {
      warnings.push('EU supplier detected - VAT number required for reverse charge')
    }
  }
  
  // Determine suggested VAT type
  let suggestedVATType: 'standard' | 'reverse_charge' | 'exempt' = 'standard'
  if (requiresReverseChargeFlag && vatValidation?.valid) {
    suggestedVATType = 'reverse_charge'
  } else if (isEUSupplier && requiresReverseChargeFlag) {
    suggestedVATType = 'reverse_charge'
  }
  
  return {
    isEUSupplier,
    requiresReverseCharge: requiresReverseChargeFlag,
    vatValidation,
    foreignSupplierWarnings: warnings,
    suggestedVATType
  }
}

/**
 * Check if a country is in the EU (has VAT validation pattern)
 */
function isEUCountry(countryCode: string): boolean {
  const euCountries = new Set([
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR',
    'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
  ])
  return euCountries.has(countryCode)
}

/**
 * Get country name from country code
 */
function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'CY': 'Cyprus',
    'CZ': 'Czech Republic', 'DE': 'Germany', 'DK': 'Denmark', 'EE': 'Estonia',
    'EL': 'Greece', 'ES': 'Spain', 'FI': 'Finland', 'FR': 'France',
    'HR': 'Croatia', 'HU': 'Hungary', 'IE': 'Ireland', 'IT': 'Italy',
    'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia', 'MT': 'Malta',
    'NL': 'Netherlands', 'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania',
    'SE': 'Sweden', 'SI': 'Slovenia', 'SK': 'Slovakia',
    'GB': 'United Kingdom', 'CH': 'Switzerland', 'NO': 'Norway',
    'US': 'United States', 'CA': 'Canada'
  }
  
  return countries[countryCode] || countryCode
}