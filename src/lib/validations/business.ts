// Business Profile Validation Schema
// Generated with Claude Code (https://claude.ai/code)

import { z } from 'zod'

export const businessProfileSchema = z.object({
  // Business Identity
  business_name: z.string().min(1, 'Business name is required').max(100, 'Business name is too long'),
  kvk_number: z.string()
    .optional()
    .refine((val) => !val || /^\d{8}$/.test(val), 'KvK number must be 8 digits'),
  btw_number: z.string()
    .optional()
    .refine((val) => !val || /^NL\d{9}B\d{2}$/.test(val), 'BTW number must have format NL123456789B12'),
  business_type: z.enum(['sole_trader', 'partnership', 'bv', 'other']).optional(),

  // Address Information
  address: z.string().max(200, 'Address is too long').optional(),
  postal_code: z.string()
    .optional()
    .refine((val) => !val || /^\d{4}\s?[A-Z]{2}$/i.test(val), 'Invalid postal code format'),
  city: z.string().max(100, 'City name is too long').optional(),
  country_code: z.string().length(2).default('NL'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\+]?[\d\s\-\(\)]+$/.test(val), 'Invalid phone number format'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),

  // Financial Configuration
  hourly_rate: z.number().min(0, 'Hourly rate must be positive').max(1000, 'Hourly rate is too high').optional(),
  financial_year_start: z.string()
    .optional()
    .refine((val) => !val || /^\d{2}-\d{2}$/.test(val), 'Select a valid month and day'),
  kor_enabled: z.boolean().default(false),

  // Invoice Settings
  default_payment_terms: z.number().min(1, 'Minimum 1 day').max(365, 'Maximum 365 days').default(30),
  late_payment_interest: z.number().min(0, 'Interest must be positive').max(50, 'Interest too high').default(2.0),
  default_invoice_description: z.string().max(500, 'Description is too long').optional(),
  custom_footer_text: z.string().max(500, 'Footer text is too long').optional(),
  terms_conditions: z.string().max(5000, 'Terms and conditions are too long').optional()
})

export type BusinessProfileData = z.infer<typeof businessProfileSchema>

export const businessTypes = [
  { value: 'sole_trader', label: 'Sole Proprietorship / Freelancer' },
  { value: 'partnership', label: 'General Partnership (VOF)' },
  { value: 'bv', label: 'Private Limited Company (BV)' },
  { value: 'other', label: 'Other' }
] as const

export const paymentTermsOptions = [
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' }
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