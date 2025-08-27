// Business Profile Validation Schema
// Generated with Claude Code (https://claude.ai/code)

import { z } from 'zod'

export const businessProfileSchema = z.object({
  // Business Identity
  business_name: z.string().min(1, 'Bedrijfsnaam is verplicht').max(100, 'Bedrijfsnaam is te lang'),
  kvk_number: z.string()
    .optional()
    .refine((val) => !val || /^\d{8}$/.test(val), 'KvK nummer moet 8 cijfers zijn'),
  btw_number: z.string()
    .optional()
    .refine((val) => !val || /^NL\d{9}B\d{2}$/.test(val), 'BTW nummer moet format NL123456789B12 hebben'),
  business_type: z.enum(['sole_trader', 'partnership', 'bv', 'other']).optional(),
  
  // Address Information
  address: z.string().max(200, 'Adres is te lang').optional(),
  postal_code: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}\s?[A-Z]{2}$/i.test(val), 'Ongeldige postcode format'),
  city: z.string().max(100, 'Stad is te lang').optional(),
  country_code: z.string().length(2).default('NL'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\+]?[\d\s\-\(\)]+$/.test(val), 'Ongeldig telefoonnummer format'),
  website: z.string().url('Ongeldige website URL').optional().or(z.literal('')),
  
  // Financial Configuration
  hourly_rate: z.number().min(0, 'Uurtarief moet positief zijn').max(1000, 'Uurtarief is te hoog').optional(),
  financial_year_start: z.string()
    .optional()
    .refine((val) => !val || /^\d{2}-\d{2}$/.test(val), 'Selecteer een geldige maand en dag'),
  kor_enabled: z.boolean().default(false),
  
  // Invoice Settings
  default_payment_terms: z.number().min(1, 'Minimaal 1 dag').max(365, 'Maximaal 365 dagen').default(30),
  late_payment_interest: z.number().min(0, 'Rente moet positief zijn').max(50, 'Rente te hoog').default(2.0),
  default_invoice_description: z.string().max(500, 'Omschrijving is te lang').optional(),
  custom_footer_text: z.string().max(500, 'Footer tekst is te lang').optional(),
  terms_conditions: z.string().max(5000, 'Algemene voorwaarden zijn te lang').optional()
})

export type BusinessProfileData = z.infer<typeof businessProfileSchema>

export const businessTypes = [
  { value: 'sole_trader', label: 'Eenmanszaak / ZZP' },
  { value: 'partnership', label: 'Vennootschap onder Firma (VOF)' },
  { value: 'bv', label: 'Besloten Vennootschap (BV)' },
  { value: 'other', label: 'Overig' }
] as const

export const paymentTermsOptions = [
  { value: 14, label: '14 dagen' },
  { value: 30, label: '30 dagen' },
  { value: 60, label: '60 dagen' },
  { value: 90, label: '90 dagen' }
] as const

// Helper function to validate Dutch KvK number
export function validateKvKNumber(kvk: string): boolean {
  return /^\d{8}$/.test(kvk)
}

// Helper function to validate Dutch BTW/VAT number
export function validateBTWNumber(btw: string): boolean {
  return /^NL\d{9}B\d{2}$/.test(btw)
}

// Helper function to validate Dutch postal code
export function validatePostalCode(postalCode: string): boolean {
  return /^\d{4}\s?[A-Z]{2}$/i.test(postalCode)
}