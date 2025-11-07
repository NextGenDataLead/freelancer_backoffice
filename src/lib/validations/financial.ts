// Zod validation schemas for Dutch ZZP'er Financial Suite
// Provides type-safe validation for forms and API requests

import { z } from "zod";
import type { 
  InvoiceStatus, 
  VATType, 
  ExpenseCategory, 
  BusinessType 
} from "@/lib/types/financial";

// ====================
// ENUM SCHEMAS
// ====================

export const InvoiceStatusSchema = z.enum([
  'draft', 
  'sent', 
  'paid', 
  'overdue', 
  'cancelled'
] as const);

export const VATTypeSchema = z.enum([
  'standard', 
  'reverse_charge', 
  'exempt', 
  'reduced'
] as const);

export const ExpenseCategorySchema = z.enum([
  'kantoorbenodigdheden',
  'reiskosten',
  'maaltijden_zakelijk',
  'marketing_reclame',
  'software_ict',
  'afschrijvingen',
  'verzekeringen',
  'professionele_diensten',
  'werkruimte_kantoor',
  'voertuigkosten',
  'telefoon_communicatie',
  'vakliteratuur',
  'werkkleding',
  'relatiegeschenken_representatie',
  'overige_zakelijk'
] as const);

export const BusinessTypeSchema = z.enum([
  'sole_trader',
  'partnership',
  'bv',
  'other'
] as const);

// Client Status Schema (Enhancement #2)
export const ClientStatusSchema = z.enum([
  'prospect',
  'active',
  'on_hold',
  'completed',
  'deactivated'
] as const);

// Project Status Schema (Enhancement #2)
export const ProjectStatusSchema = z.enum([
  'prospect',
  'active',
  'on_hold',
  'completed',
  'cancelled'
] as const);

// ====================
// COMMON FIELD SCHEMAS
// ====================

// Dutch postal code validation (1234AB format)
export const DutchPostalCodeSchema = z
  .string()
  .regex(/^\d{4}\s?[A-Z]{2}$/i, "Invalid Dutch postal code format (1234AB)")
  .transform(val => val.replace(/\s/g, '').toUpperCase());

// Dutch KVK number validation (8 digits)
export const KVKNumberSchema = z
  .string()
  .regex(/^\d{8}$/, "KVK number must be 8 digits")
  .length(8, "KVK number must be exactly 8 digits");

// Dutch VAT number validation (NL123456789B01)
export const BTWNumberSchema = z
  .string()
  .regex(/^NL\d{9}B\d{2}$/, "Invalid Dutch VAT number format (NL123456789B01)")
  .transform(val => val.toUpperCase());

// EU VAT number validation (flexible for different countries)
export const EUVATNumberSchema = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]{2,12}$/, "Invalid EU VAT number format")
  .transform(val => val.toUpperCase());

// Currency amount validation (2 decimal places)
export const CurrencyAmountSchema = z
  .number()
  .min(0, "Amount must be positive")
  .multipleOf(0.01, "Amount must have at most 2 decimal places");

// VAT rate validation (0-100%, 0 allowed for reverse charge, -1 for reverse charge)
export const VATRateSchema = z
  .number()
  .min(-1, "VAT rate must be valid (0% or higher, or -1 for reverse charge)")
  .max(1, "VAT rate must be less than or equal to 100%");

// ====================
// CLIENT CONTACT SCHEMAS
// ====================

export const ContactTypeSchema = z.enum(['primary', 'administration'] as const);

export const ClientContactSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100, "First name too long"),
  last_name: z.string().min(1, "Last name is required").max(100, "Last name too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(50, "Phone number too long").optional().or(z.literal('')).transform(val => val || undefined),
});

// ====================
// CLIENT SCHEMAS
// ====================

export const CreateClientSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(255, "Company name too long"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().max(50, "Phone number too long").optional(),
  // Contact fields (both required)
  primaryContact: ClientContactSchema,
  administrationContact: ClientContactSchema,
  address: z.string().max(500, "Address too long").optional(),
  postal_code: z.string().max(10, "Postal code too long").optional(),
  city: z.string().max(100, "City name too long").optional(),
  country_code: z.string().length(2, "Country code must be 2 characters").default("NL"),
  vat_number: z.string().max(20, "VAT number too long").optional(),
  is_business: z.boolean().default(true),
  is_supplier: z.boolean().default(false),
  default_payment_terms: z.number().int().min(1).max(365).default(30),
  notes: z.string().max(1000, "Notes too long").optional(),
  hourly_rate: z.number().min(0, "Hourly rate must be positive").max(9999.99, "Hourly rate too high").optional(),
  // Invoicing frequency fields
  invoicing_frequency: z.enum(['weekly', 'monthly', 'on_demand']).default('on_demand'),
  auto_invoice_enabled: z.boolean().default(false)
});

export const UpdateClientSchema = z.object({
  id: z.string().uuid("Invalid client ID"),
  company_name: z.string().min(1, "Company name is required").max(255, "Company name too long").optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // Contact fields
  primaryContact: ClientContactSchema.optional(),
  administrationContact: ClientContactSchema.optional(),
  address: z.string().optional(),
  postal_code: z.string().max(10, "Postal code too long").optional(),
  city: z.string().optional(),
  country_code: z.string().length(2).optional(),
  vat_number: z.string().optional(),
  is_business: z.boolean().optional(),
  is_supplier: z.boolean().optional(),
  default_payment_terms: z.number().int().min(1).max(365).optional(),
  notes: z.string().optional(),
  hourly_rate: z.number().min(0, "Hourly rate must be positive").max(9999.99, "Hourly rate too high").optional(),
  // Invoicing frequency fields
  invoicing_frequency: z.enum(['weekly', 'monthly', 'on_demand']).optional(),
  last_invoiced_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  next_invoice_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  auto_invoice_enabled: z.boolean().optional()
});

// ====================
// INVOICE SCHEMAS
// ====================

export const CreateInvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  quantity: z.number().min(0.001, "Quantity must be positive").max(99999, "Quantity too large").default(1),
  unit_price: CurrencyAmountSchema
});

export const CreateInvoiceSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  invoice_date: z.date().default(() => new Date()),
  due_date: z.date(),
  reference: z.string().max(255, "Reference too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  items: z.array(CreateInvoiceItemSchema).min(1, "At least one item is required")
}).refine(
  data => data.due_date >= data.invoice_date,
  { message: "Due date must be on or after invoice date", path: ["due_date"] }
);

export const UpdateInvoiceSchema = z.object({
  id: z.string().uuid("Invalid invoice ID"),
  client_id: z.string().uuid("Invalid client ID").optional(),
  invoice_date: z.date().optional(),
  due_date: z.date().optional(),
  reference: z.string().max(255, "Reference too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  items: z.array(CreateInvoiceItemSchema.extend({
    id: z.string().uuid().optional()
  })).optional()
});

export const UpdateInvoiceStatusSchema = z.object({
  id: z.string().uuid("Invalid invoice ID"),
  status: InvoiceStatusSchema
});

// ====================
// EXPENSE SCHEMAS
// ====================

export const CreateExpenseSchema = z.object({
  
  vendor_name: z.string().min(1, "Vendor name is required").max(255, "Vendor name too long"),
  supplier_country: z.string().length(2, "Invalid country code").optional(), // ISO 2-letter country code
  expense_date: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).default(() => new Date()),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  category: ExpenseCategorySchema,
  amount: CurrencyAmountSchema,
  vat_amount: CurrencyAmountSchema.default(0),
  vat_rate: VATRateSchema.default(0.21),
  is_deductible: z.boolean().default(true),
  receipt_url: z.string().url("Invalid receipt URL").optional()
});

export const UpdateExpenseSchema = z.object({
  id: z.string().uuid("Invalid expense ID"),
  client_id: z.string().uuid("Invalid client ID").optional(),
  vendor_name: z.string().min(1, "Vendor name is required").max(255, "Vendor name too long").optional(),
  expense_date: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
  description: z.string().min(1, "Description is required").max(500, "Description too long").optional(),
  category: ExpenseCategorySchema.optional(),
  amount: CurrencyAmountSchema.optional(),
  vat_amount: CurrencyAmountSchema.optional(),
  vat_rate: VATRateSchema.optional(),
  is_deductible: z.boolean().optional(),
  receipt_url: z.string().url("Invalid receipt URL").optional()
});

export const VerifyExpenseSchema = z.object({
  id: z.string().uuid("Invalid expense ID"),
  verified: z.boolean()
});

// Recurring expense configuration schema
export const RecurringExpenseConfigSchema = z.object({
  template_name: z.string().min(1, "Template name is required").max(255, "Template name too long"),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], {
    errorMap: () => ({ message: "Frequency must be weekly, monthly, quarterly, or yearly" })
  }),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  amount_escalation_percentage: z.number().min(0).max(100).optional()
});

// Expense creation with optional recurring template
export const CreateExpenseWithRecurringSchema = CreateExpenseSchema.extend({
  is_recurring: z.boolean().default(false),
  recurring_config: RecurringExpenseConfigSchema.optional()
}).refine(
  (data) => !data.is_recurring || data.recurring_config !== undefined,
  {
    message: "Recurring configuration is required when is_recurring is true",
    path: ["recurring_config"]
  }
);

// ====================
// TIME ENTRY SCHEMAS
// ====================

export const CreateTimeEntrySchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  project_id: z.string().uuid("Invalid project ID"),
  project_name: z.string().max(255, "Project name too long").optional(),
  description: z.string().max(500, "Description too long").optional(),
  entry_date: z.string().min(1, "Entry date is required"),
  hours: z.number().min(0, "Hours cannot be negative").max(24, "Hours cannot exceed 24 per day").optional(),
  hourly_rate: CurrencyAmountSchema.optional(),
  billable: z.boolean().default(true),
  invoiced: z.boolean().default(false)
});

export const UpdateTimeEntrySchema = z.object({
  id: z.string().uuid("Invalid time entry ID"),
  client_id: z.string().uuid().optional(),
  project_name: z.string().min(1).optional(),
  description: z.string().optional(),
  entry_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  hours: z.number().positive().optional(),
  hourly_rate: z.number().min(0).optional(),
  total_value: z.number().min(0).optional(),
  is_billable: z.boolean().optional(),
  is_invoiced: z.boolean().optional(),
  invoice_id: z.string().uuid().optional(),
  notes: z.string().optional()
});

// ====================
// KILOMETER ENTRY SCHEMAS
// ====================

export const CreateKilometerEntrySchema = z.object({
  client_id: z.string().uuid("Invalid client ID").optional(),
  entry_date: z.date().default(() => new Date()),
  from_address: z.string().min(1, "From address is required").max(255, "Address too long"),
  to_address: z.string().min(1, "To address is required").max(255, "Address too long"),
  distance_km: z.number().min(0.1, "Distance must be at least 0.1 km").max(9999, "Distance too large"),
  business_purpose: z.string().min(1, "Business purpose is required").max(500, "Purpose too long"),
  is_business: z.boolean().default(true),
  rate_per_km: z.number().min(0, "Rate must be positive").max(10, "Rate too high").default(0.19)
});

export const UpdateKilometerEntrySchema = z.object({
  id: z.string().uuid("Invalid kilometer entry ID"),
  client_id: z.string().uuid().optional(),
  travel_date: z.string().optional(),
  from_address: z.string().min(1).optional(),
  to_address: z.string().min(1).optional(),
  kilometers: z.number().positive().optional(),
  rate_per_km: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  is_business_trip: z.boolean().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});

// ====================
// ZZP PROFILE SCHEMAS
// ====================

export const UpdateZZPProfileSchema = z.object({
  kvk_number: KVKNumberSchema.optional(),
  btw_number: BTWNumberSchema.optional(),
  business_name: z.string().max(255, "Business name too long").optional(),
  business_type: BusinessTypeSchema.default('sole_trader'),
  financial_year_start: z.date().default(() => new Date(new Date().getFullYear(), 0, 1)),
  kor_enabled: z.boolean().default(false),
  hourly_rate: CurrencyAmountSchema.optional()
});

// ====================
// REPORT SCHEMAS
// ====================

export const VATReturnPeriodSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  quarter: z.number().int().min(1).max(4)
});

export const FinancialReportPeriodSchema = z.object({
  period_start: z.date(),
  period_end: z.date()
}).refine(
  data => data.period_end >= data.period_start,
  { message: "End date must be on or after start date", path: ["period_end"] }
);

// ====================
// FORM SCHEMAS (for React Hook Form)
// ====================

export const ClientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company_name: z.string(),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string(),
  address: z.string(),
  postal_code: z.string(),
  city: z.string(),
  country_code: z.string().length(2).default("NL"),
  vat_number: z.string(),
  is_business: z.boolean().default(true),
  is_supplier: z.boolean().default(false),
  default_payment_terms: z.coerce.number().int().min(1).max(365).default(30),
  notes: z.string()
});

export const InvoiceFormSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  reference: z.string(),
  notes: z.string(),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0.001, "Quantity must be positive"),
    unit_price: z.coerce.number().min(0, "Unit price must be positive")
  })).min(1, "At least one item is required")
});

export const ExpenseFormSchema = z.object({
  supplier_id: z.string(),
  expense_date: z.string().min(1, "Expense date is required"),
  description: z.string().min(1, "Description is required"),
  category: ExpenseCategorySchema,
  amount: z.coerce.number().min(0, "Amount must be positive"),
  vat_rate: z.coerce.number().min(-1, "VAT rate must be valid (0% or higher, or -1 for reverse charge)").max(1).default(0.21),
  is_deductible: z.boolean().default(true),
  receipt_file: z.any().optional()
});

export const TimeEntryFormSchema = z.object({
  client_id: z.string(),
  project_name: z.string(),
  description: z.string().min(1, "Description is required"),
  entry_date: z.string().min(1, "Entry date is required"),
  hours: z.coerce.number().min(0.01, "Hours must be positive").max(24),
  hourly_rate: z.coerce.number().min(0, "Hourly rate must be positive"),
  billable: z.boolean().default(true)
});

export const ZZPProfileFormSchema = z.object({
  kvk_number: z.string(),
  btw_number: z.string(),
  business_name: z.string(),
  business_type: BusinessTypeSchema.default('sole_trader'),
  financial_year_start: z.string().min(1, "Financial year start is required"),
  kor_enabled: z.boolean().default(false),
  hourly_rate: z.coerce.number().min(0, "Hourly rate must be positive")
});

// ====================
// API QUERY SCHEMAS
// ====================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
});

export const ClientsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  is_business: z.coerce.boolean().optional(),
  is_supplier: z.coerce.boolean().optional(),
  country_code: z.string().length(2).optional(),
  // Support filtering by status (Enhancement #2)
  // Can be single status or comma-separated list (e.g., "active,on_hold")
  status: z.string().optional().transform((val) => {
    if (!val) return undefined;
    // Split comma-separated values and validate each
    const statuses = val.split(',').map(s => s.trim());
    return statuses.every(s => ['prospect', 'active', 'on_hold', 'completed', 'deactivated'].includes(s))
      ? statuses
      : undefined;
  })
});

export const InvoicesQuerySchema = PaginationSchema.extend({
  status: InvoiceStatusSchema.optional(),
  client_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
});

export const ExpensesQuerySchema = PaginationSchema.extend({
  category: ExpenseCategorySchema.optional(),
  supplier_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  verified: z.coerce.boolean().optional()
});

// ====================
// VALIDATION HELPERS
// ====================

export function validateDutchVATNumber(vatNumber: string): boolean {
  // Basic Dutch VAT number validation
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
  return /^NL\d{9}B\d{2}$/.test(cleaned);
}

export function validateEUVATNumber(vatNumber: string, countryCode: string): boolean {
  // Basic EU VAT number validation patterns
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
  
  const patterns: Record<string, RegExp> = {
    'AT': /^ATU\d{8}$/,
    'BE': /^BE\d{10}$/,
    'BG': /^BG\d{9,10}$/,
    'CY': /^CY\d{8}[A-Z]$/,
    'CZ': /^CZ\d{8,10}$/,
    'DE': /^DE\d{9}$/,
    'DK': /^DK\d{8}$/,
    'EE': /^EE\d{9}$/,
    'EL': /^EL\d{9}$/,
    'ES': /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    'FI': /^FI\d{8}$/,
    'FR': /^FR[A-Z0-9]{2}\d{9}$/,
    'GB': /^GB(\d{9}(\d{3})?|\d{12}|GD\d{3}|HA\d{3})$/,
    'HR': /^HR\d{11}$/,
    'HU': /^HU\d{8}$/,
    'IE': /^IE\d[A-Z0-9*+]\d{5}[A-Z]$/,
    'IT': /^IT\d{11}$/,
    'LT': /^LT(\d{9}|\d{12})$/,
    'LU': /^LU\d{8}$/,
    'LV': /^LV\d{11}$/,
    'MT': /^MT\d{8}$/,
    'NL': /^NL\d{9}B\d{2}$/,
    'PL': /^PL\d{10}$/,
    'PT': /^PT\d{9}$/,
    'RO': /^RO\d{2,10}$/,
    'SE': /^SE\d{12}$/,
    'SI': /^SI\d{8}$/,
    'SK': /^SK\d{10}$/
  };

  return patterns[countryCode]?.test(cleaned) ?? false;
}

export function calculateVATAmount(amount: number, vatRate: number): number {
  return Math.round(amount * vatRate * 100) / 100;
}

export function calculateTotalWithVAT(amount: number, vatRate: number): number {
  const vatAmount = calculateVATAmount(amount, vatRate);
  return Math.round((amount + vatAmount) * 100) / 100;
}