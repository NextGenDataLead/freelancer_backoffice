// Financial data types for Dutch ZZP'er Financial Suite
// Generated from Supabase database schema

// ====================
// ENUM TYPES
// ====================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export type VATType = 'standard' | 'reverse_charge' | 'exempt' | 'reduced';

export type ExpenseCategory = 
  | 'kantoorbenodigdheden'
  | 'reiskosten' 
  | 'maaltijden_zakelijk'
  | 'marketing_reclame'
  | 'software_ict'
  | 'afschrijvingen'
  | 'verzekeringen'
  | 'professionele_diensten'
  | 'werkruimte_kantoor'
  | 'voertuigkosten'
  | 'telefoon_communicatie'
  | 'vakliteratuur'
  | 'werkkleding'
  | 'relatiegeschenken_representatie'
  | 'overige_zakelijk';

export type BusinessType = 'sole_trader' | 'partnership' | 'bv' | 'other';

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'cash' | 'paypal' | 'other';

export type InvoicingFrequency = 'weekly' | 'monthly' | 'on_demand';

// ====================
// DATABASE TYPES
// ====================

export interface Client {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country_code: string; // Default: 'NL'
  vat_number?: string;
  is_business: boolean; // Default: true
  is_supplier: boolean; // Default: false
  default_payment_terms: number; // Default: 30
  notes?: string;
  // Invoicing configuration
  invoicing_frequency: InvoicingFrequency; // Default: 'on_demand'
  last_invoiced_date?: Date;
  next_invoice_due_date?: Date;
  auto_invoice_enabled: boolean; // Default: false
  created_at: Date;
  updated_at: Date;
}

export interface VATRate {
  id: string;
  country_code: string;
  rate_type: VATType;
  rate: number; // numeric(5,4)
  effective_from: Date;
  effective_to?: Date;
  description?: string;
  created_at: Date;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  created_by: string;
  client_id: string;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date;
  status: InvoiceStatus; // Default: 'draft'
  subtotal: number; // Default: 0
  vat_amount: number; // Default: 0
  total_amount: number; // Default: 0
  paid_amount: number; // Default: 0
  vat_type: VATType; // Default: 'standard'
  vat_rate: number; // Default: 0.21
  currency: string; // Default: 'EUR'
  reference?: string;
  notes?: string;
  sent_at?: Date;
  paid_at?: Date;
  pdf_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number; // Default: 1
  unit_price: number;
  line_total: number;
  created_at: Date;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  tenant_id: string;
  recorded_by: string;
  amount: number;
  payment_date: Date;
  payment_method: PaymentMethod; // Default: 'bank_transfer'
  reference?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Expense {
  id: string;
  tenant_id: string;
  created_by: string;
  supplier_id?: string;
  expense_date: Date;
  description: string;
  category: ExpenseCategory;
  amount: number;
  vat_amount: number; // Default: 0
  total_amount: number;
  vat_rate: number; // Default: 0.21
  is_deductible: boolean; // Default: true
  receipt_url?: string;
  ocr_data?: Record<string, any>; // jsonb
  ocr_confidence?: number; // 0.0 - 1.0
  manual_verification_required: boolean; // Default: true
  verified_at?: Date;
  verified_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TimeEntry {
  id: string;
  tenant_id: string;
  created_by: string;
  client_id?: string;
  project_name?: string;
  description: string;
  entry_date: Date;
  hours: number;
  hourly_rate?: number;
  billable: boolean; // Default: true
  invoiced: boolean; // Default: false
  invoice_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface KilometerEntry {
  id: string;
  tenant_id: string;
  created_by: string;
  client_id?: string;
  entry_date: Date;
  from_address: string;
  to_address: string;
  distance_km: number;
  business_purpose: string;
  is_business: boolean; // Default: true
  rate_per_km: number; // Default: 0.19
  total_amount?: number;
  invoiced: boolean; // Default: false
  invoice_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FinancialReport {
  id: string;
  tenant_id: string;
  report_type: string;
  period_start: Date;
  period_end: Date;
  data: Record<string, any>; // jsonb
  generated_at: Date;
  generated_by: string;
}

export interface TransactionLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_data?: Record<string, any>; // jsonb
  new_data?: Record<string, any>; // jsonb
  changed_by: string;
  changed_at: Date;
  ip_address?: string;
  user_agent?: string;
}

// ====================
// EXTENDED PROFILE TYPE
// ====================

export interface ZZPProfile {
  // Existing profile fields
  id: string;
  tenant_id: string;
  clerk_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  role: string;
  onboarding_complete: boolean;
  created_at: Date;
  updated_at: Date;
  anonymized_at?: Date;
  
  // ZZP-specific fields
  kvk_number?: string; // Dutch Chamber of Commerce registration
  btw_number?: string; // Dutch VAT identification number
  business_name?: string; // Registered business name
  business_type: BusinessType; // Default: 'sole_trader'
  financial_year_start: Date; // Default: start of current year
  kor_enabled: boolean; // Kleineondernemersregeling (small business scheme)
  hourly_rate?: number; // Default hourly rate in EUR
}

// ====================
// API REQUEST/RESPONSE TYPES
// ====================

export interface CreateClientRequest {
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
  vat_number?: string;
  is_business?: boolean;
  is_supplier?: boolean;
  default_payment_terms?: number;
  notes?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string;
}

export interface CreateInvoiceRequest {
  client_id: string;
  invoice_date?: Date;
  due_date: Date;
  reference?: string;
  notes?: string;
  items: CreateInvoiceItemRequest[];
}

export interface CreateInvoiceItemRequest {
  description: string;
  quantity?: number;
  unit_price: number;
}

export interface UpdateInvoiceRequest {
  id: string;
  client_id?: string;
  invoice_date?: Date;
  due_date?: Date;
  reference?: string;
  notes?: string;
  items?: (CreateInvoiceItemRequest & { id?: string })[];
}

export interface CreateExpenseRequest {
  supplier_id?: string;
  expense_date?: Date;
  description: string;
  category: ExpenseCategory;
  amount: number;
  vat_amount?: number;
  total_amount: number;
  vat_rate?: number;
  is_deductible?: boolean;
  receipt_url?: string;
}

export interface CreateTimeEntryRequest {
  client_id?: string;
  project_name?: string;
  description: string;
  entry_date?: Date;
  hours: number;
  hourly_rate?: number;
  billable?: boolean;
}

export interface CreateKilometerEntryRequest {
  client_id?: string;
  entry_date?: Date;
  from_address: string;
  to_address: string;
  distance_km: number;
  business_purpose: string;
  is_business?: boolean;
  rate_per_km?: number;
}

// ====================
// CALCULATED TYPES
// ====================

export interface InvoiceCalculation {
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  vat_rate: number;
  vat_type: VATType;
  explanation?: string;
}

export interface VATReturnData {
  quarter: number;
  year: number;
  total_revenue: number;
  total_vat_collected: number;
  total_expenses: number;
  total_vat_paid: number;
  vat_to_pay: number;
  reverse_charge_revenue: number; // BTW verlegd - income
  reverse_charge_expenses: number; // BTW verlegd - expenses
  eu_services: ICPDeclaration[];
}

export interface ICPDeclaration {
  client_name: string;
  vat_number: string;
  country_code: string;
  amount: number;
  service_description: string;
}

export interface ProfitLossReport {
  period: {
    date_from: string;
    date_to: string;
    generated_at: string;
  };
  revenue: {
    total_invoiced: number;
    standard_vat_revenue: number;
    reverse_charge_revenue: number;
    exempt_revenue: number;
    unbilled_revenue: number;
    total_revenue: number;
  };
  expenses: {
    total_expenses: number;
    by_category: {
      category: string;
      amount: number;
      percentage: number;
    }[];
  };
  vat_summary: {
    vat_collected: number;
    vat_paid: number;
    net_vat_position: number;
  };
  profit_summary: {
    gross_profit: number;
    gross_margin_percentage: number;
    net_profit: number;
    net_margin_percentage: number;
  };
  metrics: {
    total_invoices: number;
    total_expenses_count: number;
    unbilled_hours: number;
    average_invoice_value: number;
    expense_ratio: number;
  };
}

export interface BalanceSheetReport {
  as_of_date: string;
  generated_at: string;
  assets: {
    current_assets: {
      accounts_receivable: number;
      work_in_progress: number;
      vat_receivable: number;
      total_current_assets: number;
    };
    fixed_assets: {
      equipment: number;
      total_fixed_assets: number;
    };
    total_assets: number;
  };
  liabilities: {
    current_liabilities: {
      vat_payable: number;
      accrued_expenses: number;
      total_current_liabilities: number;
    };
    long_term_liabilities: {
      total_long_term_liabilities: number;
    };
    total_liabilities: number;
  };
  equity: {
    owner_equity: number;
    retained_earnings: number;
    total_equity: number;
  };
  balance_verification: {
    assets_total: number;
    liabilities_equity_total: number;
    balanced: boolean;
    difference: number;
  };
  metrics: {
    current_ratio: number;
    debt_to_equity_ratio: number;
    working_capital: number;
    total_receivables_count: number;
    average_receivable: number;
  };
}

// ====================
// FORM VALIDATION TYPES
// ====================

export interface ClientFormData {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  country_code: string;
  vat_number: string;
  is_business: boolean;
  is_supplier: boolean;
  default_payment_terms: number;
  notes: string;
}

export interface InvoiceFormData {
  client_id: string;
  invoice_date: string; // ISO date string for form handling
  due_date: string;
  reference: string;
  notes: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface ExpenseFormData {
  supplier_id: string;
  expense_date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  vat_rate: number;
  is_deductible: boolean;
  receipt_file?: File;
}

export interface TimeEntryFormData {
  client_id: string;
  project_name: string;
  description: string;
  entry_date: string;
  hours: number;
  hourly_rate: number;
  billable: boolean;
}

export interface ZZPProfileFormData {
  kvk_number: string;
  btw_number: string;
  business_name: string;
  business_type: BusinessType;
  financial_year_start: string;
  kor_enabled: boolean;
  hourly_rate: number;
}

// ====================
// UTILITY TYPES
// ====================

export type EntityWithRelations<T, R> = T & R;

// Client with invoicing summary data
export interface ClientInvoicingSummary extends Client {
  unbilled_hours: number;
  unbilled_amount: number;
  last_invoice_date?: Date;
  days_since_last_invoice?: number;
  ready_for_invoicing: boolean;
  overdue_for_invoicing: boolean;
}

export type InvoiceWithItems = EntityWithRelations<Invoice, {
  items: InvoiceItem[];
  client: Client;
}>;

export type ExpenseWithSupplier = EntityWithRelations<Expense, {
  supplier?: Client;
}>;

export type TimeEntryWithClient = EntityWithRelations<TimeEntry, {
  client?: Client;
}>;

export type KilometerEntryWithClient = EntityWithRelations<KilometerEntry, {
  client?: Client;
}>;

// ====================
// RESPONSE TYPES
// ====================

export interface FinancialApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedFinancialResponse<T = unknown> extends FinancialApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VATValidationResponse {
  vat_number: string;
  country_code: string;
  valid: boolean;
  company_name?: string;
  company_address?: string;
  validation_date?: string;
  error?: string;
  fallback_used?: boolean;
}

// ====================
// DASHBOARD TYPES
// ====================

export interface FinancialDashboardMetrics {
  total_revenue: number;
  outstanding_invoices: number;
  overdue_amount: number;
  monthly_expenses: number;
  profit_margin: number;
  pending_vat_return: number;
  next_vat_deadline: Date;
  recent_invoices: InvoiceWithItems[];
  recent_expenses: ExpenseWithSupplier[];
}