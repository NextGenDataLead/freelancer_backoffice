/**
 * Expense Management System Types
 * Generated with Claude Code (https://claude.ai/code)
 */

// =====================================================
// ENUMS matching database types
// =====================================================

export type ExpenseStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'reimbursed'
  | 'processed'
  | 'cancelled'

export type ExpenseType = 
  | 'travel'
  | 'meals'
  | 'office_supplies'
  | 'software'
  | 'marketing'
  | 'professional'
  | 'utilities'
  | 'other'

export type PaymentMethod = 
  | 'corporate_card'
  | 'personal_card'
  | 'cash'
  | 'bank_transfer'
  | 'other'

export type ApprovalAction = 
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'forward'

export type CurrencyCode = 
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CHF'
  | 'SEK'
  | 'NOK'
  | 'DKK'

export type VATType = 
  | 'standard'
  | 'reduced'
  | 'zero'
  | 'exempt'
  | 'reverse_charge'

export type ReceiptStatus = 
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'manual_review'

// =====================================================
// CORE INTERFACES
// =====================================================

export interface ExpenseCategory {
  id: string
  tenant_id: string
  name: string
  description?: string
  expense_type: ExpenseType
  parent_category_id?: string
  is_active: boolean
  gl_account_code?: string
  created_at: string
  updated_at: string
}

export interface ExpensePolicy {
  id: string
  tenant_id: string
  name: string
  description?: string
  is_active: boolean
  daily_limit?: number
  monthly_limit?: number
  per_expense_limit?: number
  currency: CurrencyCode
  rules: PolicyRules
  auto_approve_under?: number
  require_receipt_over?: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface PolicyRules {
  meal_limit_per_day?: number
  require_manager_approval?: boolean
  allowed_categories?: string[]
  blocked_vendors?: string[]
  require_project_code?: boolean
  [key: string]: any // For extensibility
}

export interface ApprovalWorkflow {
  id: string
  tenant_id: string
  name: string
  description?: string
  is_active: boolean
  steps: ApprovalStep[]
  conditions: WorkflowConditions
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ApprovalStep {
  step: number
  role: string
  threshold?: number
  approver_ids?: string[]
  is_required: boolean
}

export interface WorkflowConditions {
  auto_approve_under?: number
  expense_types?: ExpenseType[]
  categories?: string[]
  [key: string]: any
}

export interface Expense {
  id: string
  tenant_id: string
  title: string
  description?: string
  expense_date: string
  amount: number
  currency: CurrencyCode
  category_id?: string
  expense_type: ExpenseType
  payment_method: PaymentMethod
  status: ExpenseStatus
  current_approval_step: number
  workflow_id?: string
  policy_id?: string
  submitted_by: string
  submitted_at?: string
  project_code?: string
  cost_center?: string
  vendor_name?: string
  reference_number?: string
  requires_reimbursement: boolean
  reimbursed_at?: string
  reimbursement_amount?: number
  external_transaction_id?: string
  accounting_export_id?: string
  exported_at?: string
  created_at: string
  updated_at: string
  is_recurring: boolean
  is_billable: boolean
  client_id?: string
  tags: string[]
  metadata: Record<string, any>
  
  // VAT/BTW fields
  vat_rate?: number
  vat_amount?: number
  vat_type?: VATType
  is_vat_deductible?: boolean
  business_percentage?: number
  supplier_country_code?: string
  supplier_vat_number?: string
  is_reverse_charge?: boolean
  
  // Populated relations
  category?: ExpenseCategory
  receipts?: ExpenseReceipt[]
  approvals?: ExpenseApproval[]
  submitted_by_profile?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface ExpenseReceipt {
  id: string
  expense_id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  ocr_status: ReceiptStatus
  ocr_data: OCRData
  ocr_confidence?: number
  ocr_processed_at?: string
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

export interface OCRData {
  vendor?: string
  total_amount?: number
  currency?: string
  date?: string
  items?: OCRLineItem[]
  tax_amount?: number
  confidence_scores?: {
    vendor?: number
    amount?: number
    date?: number
  }
  raw_text?: string
  [key: string]: any
}

export interface OCRLineItem {
  description: string
  amount?: number
  quantity?: number
  unit_price?: number
}

export interface ExpenseApproval {
  id: string
  expense_id: string
  step_number: number
  approver_id: string
  action: ApprovalAction
  comments?: string
  approved_amount?: number
  created_at: string
  
  // Populated relations
  approver?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface CorporateCardTransaction {
  id: string
  tenant_id: string
  external_transaction_id: string
  card_holder_id?: string
  merchant_name: string
  transaction_date: string
  amount: number
  currency: CurrencyCode
  card_last_four?: string
  card_type?: string
  suggested_category_id?: string
  suggested_expense_type?: ExpenseType
  ai_confidence?: number
  expense_id?: string
  is_matched: boolean
  matched_at?: string
  matched_by?: string
  imported_at: string
  import_batch_id?: string
  raw_data: Record<string, any>
  created_at: string
  updated_at: string
  
  // Populated relations
  card_holder?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  expense?: Expense
  suggested_category?: ExpenseCategory
}

export interface ExpenseReport {
  id: string
  tenant_id: string
  name: string
  description?: string
  report_period_start: string
  report_period_end: string
  status: ExpenseStatus
  submitted_by: string
  submitted_at?: string
  total_amount: number
  currency: CurrencyCode
  expense_count: number
  created_at: string
  updated_at: string
  
  // Populated relations
  expenses?: Expense[]
  submitted_by_profile?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface ExpenseReportItem {
  id: string
  report_id: string
  expense_id: string
  created_at: string
}

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateExpenseRequest {
  title: string
  description?: string
  expense_date: string
  amount: number
  currency?: CurrencyCode
  category_id?: string
  expense_type: ExpenseType
  payment_method: PaymentMethod
  project_code?: string
  cost_center?: string
  vendor_name?: string
  reference_number?: string
  requires_reimbursement?: boolean
  is_billable?: boolean
  client_id?: string
  tags?: string[]
  metadata?: Record<string, any>
  
  // VAT/BTW fields
  vat_rate?: number
  vat_amount?: number
  vat_type?: VATType
  is_vat_deductible?: boolean
  business_percentage?: number
  supplier_country_code?: string
  supplier_vat_number?: string
  is_reverse_charge?: boolean
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  id: string
}

export interface SubmitExpenseRequest {
  expense_id: string
  workflow_id?: string
  policy_id?: string
}

export interface ExpenseApprovalRequest {
  expense_id: string
  action: ApprovalAction
  comments?: string
  approved_amount?: number
}

export interface ExpenseListFilters {
  status?: ExpenseStatus[]
  expense_type?: ExpenseType[]
  category_id?: string[]
  submitted_by?: string[]
  date_from?: string
  date_to?: string
  amount_min?: number
  amount_max?: number
  currency?: CurrencyCode[]
  requires_reimbursement?: boolean
  is_billable?: boolean
  tags?: string[]
  search?: string // Free text search
  page?: number
  limit?: number
  sort_by?: 'date' | 'amount' | 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface ExpenseListResponse {
  expenses: Expense[]
  total_count: number
  page: number
  limit: number
  total_pages: number
  filters_applied: ExpenseListFilters
  summary: {
    total_amount: number
    currency: CurrencyCode
    status_breakdown: Record<ExpenseStatus, number>
    type_breakdown: Record<ExpenseType, number>
  }
}

export interface ExpenseDashboardStats {
  pending_approval_count: number
  pending_approval_amount: number
  approved_this_month: number
  approved_this_month_amount: number
  reimbursements_pending: number
  reimbursements_pending_amount: number
  top_categories: Array<{
    name: string
    amount: number
    count: number
  }>
  recent_expenses: Expense[]
  monthly_trend: Array<{
    month: string
    amount: number
    count: number
  }>
}

export interface ReceiptUploadRequest {
  expense_id: string
  file: File
}

export interface ReceiptUploadResponse {
  receipt_id: string
  upload_url?: string
  ocr_status: ReceiptStatus
  estimated_processing_time?: number
}

export interface OCRProcessingResult {
  receipt_id: string
  status: ReceiptStatus
  confidence: number
  extracted_data: OCRData
  suggestions: {
    title?: string
    amount?: number
    vendor?: string
    date?: string
    category_id?: string
  }
}

export interface BulkExpenseImportRequest {
  csv_data: string
  mapping: {
    title: string
    amount: string
    date: string
    description?: string
    category?: string
    vendor?: string
  }
  default_values?: Partial<CreateExpenseRequest>
}

export interface BulkExpenseImportResponse {
  success_count: number
  error_count: number
  errors: Array<{
    row: number
    message: string
    data: any
  }>
  imported_expense_ids: string[]
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface ExpenseValidationError {
  field: string
  message: string
  code: string
}

export interface ExpenseFormData extends CreateExpenseRequest {
  receipts?: File[]
}

export interface ExpenseAIInsights {
  duplicate_likelihood: number
  category_suggestions: Array<{
    category_id: string
    category_name: string
    confidence: number
  }>
  policy_violations: Array<{
    rule: string
    severity: 'warning' | 'error'
    message: string
  }>
  vendor_history: {
    previous_expenses: number
    average_amount: number
    typical_category: string
  }
}

export interface ExpenseReimbursementBatch {
  id: string
  tenant_id: string
  name: string
  expense_ids: string[]
  total_amount: number
  currency: CurrencyCode
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_by: string
  created_at: string
  processed_at?: string
  payment_reference?: string
}

// Status display helpers
export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Reimbursed',
  processed: 'Processed',
  cancelled: 'Cancelled'
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  travel: 'Travel',
  meals: 'Meals & Entertainment',
  office_supplies: 'Office Supplies',
  software: 'Software & Licenses',
  marketing: 'Marketing',
  professional: 'Professional Services',
  utilities: 'Utilities',
  other: 'Other'
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  corporate_card: 'Corporate Card',
  personal_card: 'Personal Card',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  other: 'Other'
}

export const VAT_TYPE_LABELS: Record<VATType, string> = {
  standard: 'Standaard BTW (21%)',
  reduced: 'Verlaagd BTW (9%)',
  zero: 'Nul tarief BTW (0%)',
  exempt: 'BTW-vrijgesteld',
  reverse_charge: 'BTW verlegd'
}