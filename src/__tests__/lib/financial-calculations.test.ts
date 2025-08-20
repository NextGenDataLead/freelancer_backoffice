import { describe, it, expect } from 'vitest'

/**
 * Dutch VAT Calculation Tests
 * Testing the core financial calculation logic for Dutch ZZP requirements
 */

// VAT calculation utilities (these would be extracted from the actual implementation)
export const calculateDutchVAT = (amount: number, vatType: string, clientCountry: string, isBusiness: boolean) => {
  const vatRates = {
    standard: 0.21,
    reduced: 0.09,
    exempt: 0.00,
    reverse_charge: 0.00
  }

  // Determine VAT type based on client details
  let finalVatType = vatType
  if (isBusiness && clientCountry !== 'NL' && isEUCountry(clientCountry)) {
    finalVatType = 'reverse_charge'
  } else if (clientCountry && !isEUCountry(clientCountry)) {
    finalVatType = 'exempt'
  }

  const vatRate = vatRates[finalVatType as keyof typeof vatRates] || 0
  const vatAmount = Math.round(amount * vatRate * 100) / 100
  const totalAmount = Math.round((amount + vatAmount) * 100) / 100

  return {
    subtotal: amount,
    vat_type: finalVatType,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    explanation: getVATExplanation(finalVatType, clientCountry, isBusiness)
  }
}

const isEUCountry = (countryCode: string): boolean => {
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ]
  return euCountries.includes(countryCode)
}

const getVATExplanation = (vatType: string, clientCountry: string, isBusiness: boolean): string => {
  switch (vatType) {
    case 'standard':
      return 'Nederlandse standaard BTW van 21% wordt toegepast'
    case 'reverse_charge':
      return `BTW verlegd naar ${clientCountry} - zakelijke klant binnen EU`
    case 'exempt':
      return `BTW vrijgesteld - export naar ${clientCountry} buiten EU`
    case 'reduced':
      return 'Verlaagd BTW tarief van 9% wordt toegepast'
    default:
      return 'Standaard BTW berekening'
  }
}

export const validateDutchVATNumber = (vatNumber: string, countryCode: string): { isValid: boolean; formatted: string } => {
  // Remove spaces and convert to uppercase
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase()
  
  // Dutch VAT number format: NL123456789B01
  if (countryCode === 'NL') {
    const nlRegex = /^NL\d{9}B\d{2}$/
    return {
      isValid: nlRegex.test(cleaned),
      formatted: cleaned
    }
  }

  // Basic EU VAT validation (simplified)
  const euRegex = /^[A-Z]{2}[A-Z0-9]+$/
  return {
    isValid: euRegex.test(cleaned) && cleaned.length >= 8 && cleaned.length <= 15,
    formatted: cleaned
  }
}

export const calculateInvoiceTotal = (items: Array<{ quantity: number; unit_price: number }>, vatType: string, clientCountry: string, isBusiness: boolean) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  return calculateDutchVAT(subtotal, vatType, clientCountry, isBusiness)
}

describe('Dutch VAT Calculations', () => {
  describe('Standard Dutch VAT (21%)', () => {
    it('should calculate 21% VAT for Dutch B2C clients', () => {
      const result = calculateDutchVAT(100, 'standard', 'NL', false)
      
      expect(result.subtotal).toBe(100)
      expect(result.vat_type).toBe('standard')
      expect(result.vat_rate).toBe(0.21)
      expect(result.vat_amount).toBe(21)
      expect(result.total_amount).toBe(121)
      expect(result.explanation).toContain('Nederlandse standaard BTW')
    })

    it('should calculate 21% VAT for Dutch B2B clients', () => {
      const result = calculateDutchVAT(1000, 'standard', 'NL', true)
      
      expect(result.subtotal).toBe(1000)
      expect(result.vat_type).toBe('standard')
      expect(result.vat_rate).toBe(0.21)
      expect(result.vat_amount).toBe(210)
      expect(result.total_amount).toBe(1210)
    })

    it('should handle decimal amounts correctly', () => {
      const result = calculateDutchVAT(33.33, 'standard', 'NL', false)
      
      expect(result.subtotal).toBe(33.33)
      expect(result.vat_amount).toBe(7.00) // Rounded to 2 decimals
      expect(result.total_amount).toBe(40.33)
    })
  })

  describe('Reverse-Charge VAT (BTW verlegd)', () => {
    it('should apply reverse-charge for EU B2B clients', () => {
      const result = calculateDutchVAT(500, 'standard', 'DE', true)
      
      expect(result.subtotal).toBe(500)
      expect(result.vat_type).toBe('reverse_charge')
      expect(result.vat_rate).toBe(0.00)
      expect(result.vat_amount).toBe(0)
      expect(result.total_amount).toBe(500)
      expect(result.explanation).toContain('BTW verlegd naar DE')
    })

    it('should apply reverse-charge for all EU countries', () => {
      const euCountries = ['BE', 'FR', 'DE', 'IT', 'ES']
      
      euCountries.forEach(country => {
        const result = calculateDutchVAT(100, 'standard', country, true)
        expect(result.vat_type).toBe('reverse_charge')
        expect(result.vat_amount).toBe(0)
        expect(result.explanation).toContain(`BTW verlegd naar ${country}`)
      })
    })

    it('should NOT apply reverse-charge for EU B2C clients', () => {
      const result = calculateDutchVAT(100, 'standard', 'DE', false)
      
      expect(result.vat_type).toBe('standard')
      expect(result.vat_rate).toBe(0.21)
      expect(result.vat_amount).toBe(21)
    })
  })

  describe('VAT Exempt (Export outside EU)', () => {
    it('should be VAT exempt for non-EU clients', () => {
      const result = calculateDutchVAT(200, 'standard', 'US', true)
      
      expect(result.subtotal).toBe(200)
      expect(result.vat_type).toBe('exempt')
      expect(result.vat_rate).toBe(0.00)
      expect(result.vat_amount).toBe(0)
      expect(result.total_amount).toBe(200)
      expect(result.explanation).toContain('export naar US buiten EU')
    })

    it('should be VAT exempt for various non-EU countries', () => {
      const nonEuCountries = ['US', 'CA', 'AU', 'JP', 'UK']
      
      nonEuCountries.forEach(country => {
        const result = calculateDutchVAT(100, 'standard', country, true)
        expect(result.vat_type).toBe('exempt')
        expect(result.vat_amount).toBe(0)
      })
    })
  })

  describe('Reduced VAT Rate (9%)', () => {
    it('should calculate 9% VAT for reduced rate items', () => {
      const result = calculateDutchVAT(100, 'reduced', 'NL', false)
      
      expect(result.subtotal).toBe(100)
      expect(result.vat_type).toBe('reduced')
      expect(result.vat_rate).toBe(0.09)
      expect(result.vat_amount).toBe(9)
      expect(result.total_amount).toBe(109)
      expect(result.explanation).toContain('Verlaagd BTW tarief van 9%')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero amounts', () => {
      const result = calculateDutchVAT(0, 'standard', 'NL', false)
      
      expect(result.subtotal).toBe(0)
      expect(result.vat_amount).toBe(0)
      expect(result.total_amount).toBe(0)
    })

    it('should handle very large amounts', () => {
      const result = calculateDutchVAT(999999.99, 'standard', 'NL', false)
      
      expect(result.subtotal).toBe(999999.99)
      expect(result.vat_amount).toBe(209999.98)
      expect(result.total_amount).toBe(1209999.97)
    })

    it('should handle rounding edge cases', () => {
      const result = calculateDutchVAT(33.333, 'standard', 'NL', false)
      
      // Should round VAT amount to 2 decimal places
      expect(result.vat_amount).toBe(7.00)
      expect(result.total_amount).toBe(40.33)
    })
  })
})

describe('Dutch VAT Number Validation', () => {
  describe('Dutch VAT Numbers', () => {
    it('should validate correct Dutch VAT numbers', () => {
      const validNumbers = [
        'NL123456789B01',
        'NL999999999B99',
        'NL000000000B00'
      ]

      validNumbers.forEach(number => {
        const result = validateDutchVATNumber(number, 'NL')
        expect(result.isValid).toBe(true)
        expect(result.formatted).toBe(number)
      })
    })

    it('should validate Dutch VAT numbers with spaces', () => {
      const result = validateDutchVATNumber('NL 123456789 B01', 'NL')
      
      expect(result.isValid).toBe(true)
      expect(result.formatted).toBe('NL123456789B01')
    })

    it('should reject invalid Dutch VAT numbers', () => {
      const invalidNumbers = [
        'NL12345678B01',     // Too few digits
        'NL1234567890B01',   // Too many digits
        'NL123456789C01',    // Wrong letter
        'NL123456789B1',     // Too few digits at end
        'DE123456789',       // Wrong country code
        '123456789B01'       // Missing country code
      ]

      invalidNumbers.forEach(number => {
        const result = validateDutchVATNumber(number, 'NL')
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('EU VAT Numbers', () => {
    it('should validate basic EU VAT number formats', () => {
      const validEuNumbers = [
        { number: 'DE123456789', country: 'DE' },
        { number: 'FR12345678901', country: 'FR' },
        { number: 'BE1234567890', country: 'BE' },
      ]

      validEuNumbers.forEach(({ number, country }) => {
        const result = validateDutchVATNumber(number, country)
        expect(result.isValid).toBe(true)
        expect(result.formatted).toBe(number)
      })
    })

    it('should reject invalid EU VAT numbers', () => {
      const invalidNumbers = [
        { number: 'DE', country: 'DE' },           // Too short
        { number: 'DE123456789012345', country: 'DE' }, // Too long
        { number: '123456789', country: 'DE' },    // No country code
      ]

      invalidNumbers.forEach(({ number, country }) => {
        const result = validateDutchVATNumber(number, country)
        expect(result.isValid).toBe(false)
      })
    })
  })
})

describe('Invoice Total Calculations', () => {
  it('should calculate totals for multi-line invoices', () => {
    const items = [
      { quantity: 2, unit_price: 50.00 },    // €100.00
      { quantity: 1, unit_price: 75.50 },    // €75.50
      { quantity: 3, unit_price: 25.00 }     // €75.00
    ]
    // Subtotal: €250.50

    const result = calculateInvoiceTotal(items, 'standard', 'NL', false)
    
    expect(result.subtotal).toBe(250.50)
    expect(result.vat_amount).toBe(52.61)  // 21% of 250.50, rounded
    expect(result.total_amount).toBe(303.11)
  })

  it('should handle reverse-charge for EU B2B multi-line invoices', () => {
    const items = [
      { quantity: 10, unit_price: 100.00 },  // €1000.00
      { quantity: 5, unit_price: 200.00 }    // €1000.00
    ]
    // Subtotal: €2000.00

    const result = calculateInvoiceTotal(items, 'standard', 'DE', true)
    
    expect(result.subtotal).toBe(2000.00)
    expect(result.vat_type).toBe('reverse_charge')
    expect(result.vat_amount).toBe(0)
    expect(result.total_amount).toBe(2000.00)
    expect(result.explanation).toContain('BTW verlegd naar DE')
  })

  it('should handle decimal quantities and prices', () => {
    const items = [
      { quantity: 1.5, unit_price: 33.33 },  // €49.995
      { quantity: 2.25, unit_price: 44.44 }  // €99.99
    ]
    // Subtotal: €149.985 -> €149.99

    const result = calculateInvoiceTotal(items, 'standard', 'NL', false)
    
    expect(result.subtotal).toBe(149.985)
    expect(result.vat_amount).toBe(31.50)  // 21% rounded
    expect(result.total_amount).toBe(181.49)
  })
})