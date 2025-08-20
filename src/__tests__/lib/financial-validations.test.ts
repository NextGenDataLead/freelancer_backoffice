import { describe, it, expect } from 'vitest'
import { 
  CreateClientSchema,
  CreateInvoiceSchema,
  CreateExpenseSchema,
  CreateTimeEntrySchema,
  VATReturnPeriodSchema
} from '../../lib/validations/financial'

/**
 * Financial Validation Schema Tests
 * Testing all Zod validation schemas for Dutch ZZP requirements
 */

describe('Client Validation Schema', () => {
  const validClientData = {
    name: 'Jan de Vries',
    company_name: 'Acme BV',
    email: 'jan@acme.nl',
    phone: '+31612345678',
    address: 'Hoofdstraat 123',
    postal_code: '1234AB',
    city: 'Amsterdam',
    country_code: 'NL',
    vat_number: 'NL123456789B01',
    is_business: true,
    is_supplier: false,
    default_payment_terms: 30,
    notes: 'Belangrijke klant'
  }

  it('should validate complete client data', () => {
    const result = CreateClientSchema.safeParse(validClientData)
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.data.name).toBe(validClientData.name)
      expect(result.data.is_business).toBe(true)
      expect(result.data.default_payment_terms).toBe(30)
    }
  })

  it('should validate minimal client data', () => {
    const minimalData = {
      name: 'Jan Janssen',
      email: 'jan@example.com',
      is_business: false,
      is_supplier: false,
      default_payment_terms: 30
    }

    const result = CreateClientSchema.safeParse(minimalData)
    expect(result.success).toBe(true)
  })

  it('should require name and email', () => {
    const invalidData = {
      company_name: 'Test BV',
      is_business: true,
      is_supplier: false,
      default_payment_terms: 30
    }

    const result = CreateClientSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    
    if (!result.success) {
      const errors = result.error.issues.map(i => i.path[0])
      expect(errors).toContain('name')
      expect(errors).toContain('email')
    }
  })

  it('should validate payment terms range', () => {
    const invalidTerms = [-1, 0, 366, 1000]
    
    invalidTerms.forEach(terms => {
      const data = { ...validClientData, default_payment_terms: terms }
      const result = CreateClientSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('Invoice Validation Schema', () => {
  const validInvoiceData = {
    client_id: 'client-uuid-123',
    invoice_date: '2024-01-15',
    due_date: '2024-02-14',
    reference: 'Project ABC',
    notes: 'Monthly service fee',
    items: [
      {
        description: 'Web development services',
        quantity: 40,
        unit_price: 75.00
      }
    ]
  }

  it('should validate complete invoice data', () => {
    const result = CreateInvoiceSchema.safeParse(validInvoiceData)
    expect(result.success).toBe(true)
  })

  it('should require at least one invoice item', () => {
    const dataWithoutItems = { ...validInvoiceData, items: [] }
    const result = CreateInvoiceSchema.safeParse(dataWithoutItems)
    expect(result.success).toBe(false)
  })

  it('should validate positive quantities and prices', () => {
    const invalidData = {
      ...validInvoiceData,
      items: [{ description: 'Test', quantity: -1, unit_price: -10 }]
    }
    const result = CreateInvoiceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('VAT Return Period Validation', () => {
  it('should validate quarterly VAT return periods', () => {
    const validPeriods = [
      { year: 2024, quarter: 1 },
      { year: 2024, quarter: 4 }
    ]

    validPeriods.forEach(period => {
      const result = VATReturnPeriodSchema.safeParse(period)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid quarters', () => {
    const invalidQuarters = [0, 5, -1]
    
    invalidQuarters.forEach(quarter => {
      const data = { year: 2024, quarter }
      const result = VATReturnPeriodSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})