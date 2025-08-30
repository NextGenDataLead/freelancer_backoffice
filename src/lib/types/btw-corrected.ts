// CORRECTED BTW form types based on official Belastingdienst BTW form structure
// Replaces incorrect assumptions with verified official form layout
// Generated with Claude Code (https://claude.ai/code)

// ====================
// CORRECTED BTW FORM TYPES (Official Structure)
// ====================

export type ExportClassification = 'domestic' | 'eu_b2b' | 'eu_installation' | 'non_eu_export';
export type ReverseChargeDirection = 'outgoing_1e' | 'incoming_2a';
export type AcquisitionType = 'domestic' | 'eu_goods' | 'eu_services' | 'import_goods' | 'import_services';
export type VATDeductionType = 'full_deductible' | 'partial_deductible' | 'non_deductible' | 'reverse_charge_acquisition';
export type BTWFormStatus = 'draft' | 'calculated' | 'validated' | 'submitted' | 'needs_resubmission';
export type TransactionNature = 'goods' | 'services' | 'digital_services' | 'installation';

// ====================
// OFFICIAL BTW FORM STRUCTURE (CORRECTED)
// ====================

// Section 1: Prestaties binnenland (CORRECTED - each rubriek has omzet + btw)
export interface BTWSection1 {
  rubriek_1a: { omzet: number; btw: number }; // High rate supplies (~21%)
  rubriek_1b: { omzet: number; btw: number }; // Low rate supplies (~9%)  
  rubriek_1c: { omzet: number; btw: number }; // Other rate supplies (e.g. 13% sportkantine)
  rubriek_1d: { btw: number };                // Private use corrections (year-end only)
  rubriek_1e: { omzet: number };              // Zero rate + outgoing reverse charge
}

// Section 2: Verleggingsregelingen binnenland (CORRECTED - only 2a exists)
export interface BTWSection2 {
  rubriek_2a: { omzet: number; btw: number }; // Customer receiving reverse charge
}

// Section 3: Prestaties naar/in het buitenland (CORRECTED mappings + 3c added)
export interface BTWSection3 {
  rubriek_3a: { omzet: number }; // Non-EU exports (was incorrectly 3b)
  rubriek_3b: { omzet: number; icp_total: number }; // EU supplies (was incorrectly 3a) - MUST match ICP
  rubriek_3c: { omzet: number }; // EU installations/distance sales (was missing)
}

// Section 4: Prestaties vanuit het buitenland
export interface BTWSection4 {
  rubriek_4a: { omzet: number; btw: number }; // EU acquisitions
  rubriek_4b: { omzet: number; btw: number }; // Import services
}

// Section 5: BTW Berekening (CORRECTED OFFICIAL STRUCTURE - only 5a and 5b)
export interface BTWSection5 {
  rubriek_5a_verschuldigde_btw: number; // Total output VAT owed
  rubriek_5b_voorbelasting: number;     // Total input VAT deductible
}

// Complete BTW form (official structure)
export interface CompleteBTWForm {
  tenant_id: string;
  year: number;
  quarter: number;
  
  // All sections
  section_1: BTWSection1;
  section_2: BTWSection2;
  section_3: BTWSection3;
  section_4: BTWSection4;
  section_5: BTWSection5;
  
  // Final calculations
  calculations: {
    suppletie_corrections: number;
    net_vat_payable: number; // 5a - 5b + corrections
    invoerbtw_amount?: number; // Import VAT paid at customs
  };
  
  // Form metadata
  form_status: BTWFormStatus;
  validation_passed: boolean;
  validation_errors: string[];
  validation_warnings: string[];
  
  // ICP integration validation (CORRECTED to use 3b)
  icp_total_validation: number; // Must equal section_3.rubriek_3b.omzet
  
  // Audit trail
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ====================
// CORRECTED INVOICE TYPES
// ====================

export interface CorrectedInvoiceBTWFields {
  // Section 1: Prestaties binnenland (CORRECTED structure)
  rubriek_1a_omzet: number;
  rubriek_1a_btw: number;
  rubriek_1b_omzet: number;
  rubriek_1b_btw: number;
  rubriek_1c_omzet: number;
  rubriek_1c_btw: number;
  rubriek_1e_omzet: number;
  
  // Section 2: Verleggingsregelingen binnenland (CORRECTED - only 2a)
  rubriek_2a_omzet: number;
  rubriek_2a_btw: number;
  
  // Section 3: Prestaties naar/in het buitenland (CORRECTED + 3c added)
  rubriek_3a_omzet: number; // Non-EU exports (CORRECTED)
  rubriek_3b_omzet: number; // EU supplies (CORRECTED) - must match ICP
  rubriek_3c_omzet: number; // EU installations (NEW)
  
  // Enhanced metadata
  export_classification: ExportClassification;
  reverse_charge_direction?: ReverseChargeDirection;
  place_of_supply_country: string;
  customer_vat_number?: string;
  customer_vat_validated: boolean;
  transaction_nature: TransactionNature;
  btw_calculation_method: string;
}

// Extended invoice with corrected BTW fields
export interface InvoiceWithCorrectedBTW extends CorrectedInvoiceBTWFields {
  // Base invoice fields
  id: string;
  tenant_id: string;
  created_by: string;
  client_id: string;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date;
  status: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  vat_type: string;
  vat_rate: number;
  currency: string;
  reference?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// ====================
// CORRECTED EXPENSE TYPES
// ====================

export interface CorrectedExpenseBTWFields {
  // Section 5b: Voorbelasting (CORRECTED - simplified)
  section_5b_voorbelasting: number; // ALL deductible expense VAT goes here
  
  // Enhanced classification
  vat_deduction_type: VATDeductionType;
  business_use_percentage: number;
  private_use_percentage: number;
  
  // International transaction details
  supplier_country: string;
  supplier_vat_number?: string;
  supplier_vat_validated: boolean;
  acquisition_type: AcquisitionType;
  
  // Special VAT types
  import_vat_paid: number; // Invoerbtw
  customs_declaration_number?: string;
  reverse_charge_received: number; // VAT we owe
  reverse_charge_deductible: number; // Same amount but deductible
  
  // Metadata
  btw_calculation_method: string;
  deduction_limitation_reason?: string;
}

// Extended expense with corrected BTW fields
export interface ExpenseWithCorrectedBTW extends CorrectedExpenseBTWFields {
  // Base expense fields
  id: string;
  tenant_id: string;
  created_by: string;
  supplier_id?: string;
  expense_date: Date;
  description: string;
  category: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  vat_rate: number;
  is_deductible: boolean;
  receipt_url?: string;
  created_at: Date;
  updated_at: Date;
}

// ====================
// ICP DECLARATION (CORRECTED for 3b validation)
// ====================

export interface CorrectedICPDeclaration {
  id: string;
  tenant_id: string;
  year: number;
  quarter: number;
  
  // Customer details
  customer_vat_number: string;
  customer_name: string;
  customer_country: string;
  
  // Transaction totals
  net_amount: number;
  transaction_type: string; // Service type code (200, 240, etc.)
  transaction_count: number;
  
  // BTW form integration (CORRECTED)
  matches_btw_3b: boolean;
  btw_form_id?: string;
  
  // Status
  declaration_status: string;
  submitted_at?: Date;
  
  created_at: Date;
  updated_at: Date;
}

// ====================
// INTERNATIONAL TRADE TRANSACTIONS
// ====================

export interface InternationalTradeTransaction {
  id: string;
  tenant_id: string;
  
  // Transaction classification
  transaction_direction: 'export' | 'import';
  partner_country: string;
  partner_vat_number?: string;
  partner_name: string;
  
  // Financial details
  net_amount: number;
  vat_amount: number;
  transaction_date: Date;
  transaction_nature: TransactionNature;
  
  // BTW classification (CORRECTED)
  btw_section: 3 | 4; // Section 3 (exports) or 4 (imports)
  btw_rubriek: '3a' | '3b' | '3c' | '4a' | '4b';
  
  // Documentation
  customs_declaration?: string;
  document_reference?: string;
  
  // Source document links
  source_document_type: 'invoice' | 'expense' | 'manual';
  source_document_id?: string;
  
  created_at: Date;
}

// ====================
// VAT CORRECTIONS
// ====================

export interface VATCorrection {
  id: string;
  tenant_id: string;
  
  correction_type: 'suppletie' | 'error_correction' | 'bad_debt' | 'returned_goods' | 
                   'price_adjustment' | 'private_use' | 'investment_correction';
  
  // Periods
  original_period_year: number;
  original_period_quarter: number;
  correction_period_year: number;
  correction_period_quarter: number;
  
  // Financial impact
  correction_amount: number;
  affects_rubriek?: string;
  
  // Documentation
  reason: string;
  supporting_documentation?: string;
  
  // Status
  processed: boolean;
  processed_at?: Date;
  
  created_by: string;
  created_at: Date;
}

// ====================
// BTW VALIDATION TYPES
// ====================

export interface BTWValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  info: string[];
  validated_at: Date;
  period: { year: number; quarter: number };
  
  btw_summary: {
    rubriek_5a_verschuldigde_btw: number;
    rubriek_5b_voorbelasting: number;
    net_vat_payable: number;
    rubriek_3b_omzet: number;
  };
  
  icp_validation?: {
    icp_total: number;
    btw_3b_total: number;
    amounts_match: boolean;
    difference: number;
  };
}

export interface ICPBTWValidation {
  tenant_id: string;
  year: number;
  quarter: number;
  
  // ICP totals
  icp_total: number;
  icp_transaction_count: number;
  icp_countries: number;
  
  // BTW 3b totals (CORRECTED validation)
  btw_3b_total: number;
  
  // Validation results
  amounts_match: boolean;
  difference: number;
  
  // Status flags
  icp_without_btw: boolean;
  btw_without_icp: boolean;
  both_present: boolean;
}

// ====================
// BTW CALCULATION VIEW TYPES
// ====================

export interface BTWFormCalculation {
  tenant_id: string;
  year: number;
  quarter: number;
  
  // Section 1: Prestaties binnenland (CORRECTED)
  rubriek_1a_omzet: number;
  rubriek_1a_btw: number;
  rubriek_1b_omzet: number;
  rubriek_1b_btw: number;
  rubriek_1c_omzet: number;
  rubriek_1c_btw: number;
  rubriek_1d_btw: number;
  rubriek_1e_omzet: number;
  
  // Section 2: Verleggingsregelingen binnenland (CORRECTED)
  rubriek_2a_omzet: number;
  rubriek_2a_btw: number;
  
  // Section 3: Prestaties naar/in het buitenland (CORRECTED)
  rubriek_3a_omzet: number; // Non-EU exports
  rubriek_3b_omzet: number; // EU supplies
  rubriek_3c_omzet: number; // EU installations
  
  // Section 4: Prestaties vanuit het buitenland
  rubriek_4a_omzet: number;
  rubriek_4a_btw: number;
  rubriek_4b_omzet: number;
  rubriek_4b_btw: number;
  
  // Section 5: BTW Berekening (CORRECTED)
  rubriek_5a_verschuldigde_btw: number;
  rubriek_5b_voorbelasting: number;
  
  // Final calculations
  suppletie_corrections: number;
  net_vat_payable: number;
  
  // Breakdown for analysis
  domestic_input_vat_detail: number;
  eu_acquisition_input_vat_detail: number;
  import_input_vat_detail: number;
}

// ====================
// API REQUEST/RESPONSE TYPES
// ====================

export interface GenerateBTWFormRequest {
  tenant_id: string;
  year: number;
  quarter: number;
}

export interface GenerateBTWFormResponse {
  tenant_id: string;
  period: { year: number; quarter: number };
  generated_at: Date;
  form_structure: string; // 'corrected_official_btw_form_v2'
  
  // All form sections
  section_1: BTWSection1;
  section_2: BTWSection2;
  section_3: BTWSection3;
  section_4: BTWSection4;
  section_5: BTWSection5;
  
  calculations: {
    suppletie_corrections: number;
    net_vat_payable: number;
  };
  
  validation: BTWValidationResult;
}

export interface ValidateBTWFormRequest {
  tenant_id: string;
  year: number;
  quarter: number;
}

export interface RecalculateBTWFormRequest {
  tenant_id: string;
  year: number;
  quarter?: number; // If not provided, recalculates all quarters
}

// ====================
// AUDIT TRAIL TYPES
// ====================

export interface InvoiceBTWClassification {
  id: string;
  invoice_id: string;
  classification_date: Date;
  
  // Original inputs
  vat_rate: number;
  customer_country: string;
  transaction_type: string;
  
  // Classification results
  assigned_rubriek: string;
  revenue_amount: number;
  vat_amount: number;
  
  // Validation requirements
  requires_vat_number: boolean;
  requires_icp_declaration: boolean;
  
  // Audit
  calculation_method: string;
  classification_notes?: string;
}

export interface ExpenseVATCalculation {
  id: string;
  expense_id: string;
  calculation_date: Date;
  
  // Input values
  gross_amount: number;
  net_amount: number;
  vat_rate: number;
  business_percentage: number;
  
  // Calculated values
  gross_vat_amount: number;
  deductible_vat_amount: number;
  non_deductible_vat_amount: number;
  
  // Classification
  contributes_to_section_5b: boolean;
  deduction_limitation?: string;
  
  // Reverse charge details
  reverse_charge_owed: number;
  reverse_charge_deductible: number;
  
  // Audit
  calculation_method: string;
  calculation_notes?: string;
}

// ====================
// FORM DATA TYPES
// ====================

export interface BTWFormData {
  tenant_id: string;
  year: number;
  quarter: number;
  
  // Form sections (populated from calculations)
  sections: {
    section_1: BTWSection1;
    section_2: BTWSection2;
    section_3: BTWSection3;
    section_4: BTWSection4;
    section_5: BTWSection5;
  };
  
  // Metadata
  form_status: BTWFormStatus;
  validation_passed: boolean;
  last_calculated_at: Date;
  
  // User actions
  user_corrections?: {
    rubriek: string;
    original_amount: number;
    corrected_amount: number;
    reason: string;
  }[];
}