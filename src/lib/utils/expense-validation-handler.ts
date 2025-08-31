/**
 * Expense validation handler for supplier validation results
 * Converts supplier validation results into proper expense fields for BTW reporting
 */

import type { SupplierValidationResult } from '@/lib/utils/supplier-validation'

export interface EnhancedExpenseData {
  vendor_name: string
  supplier_country_code: string
  supplier_vat_number?: string
  vat_type: 'standard' | 'reverse_charge' | 'exempt' | 'reduced' | 'zero'
  is_reverse_charge: boolean
  is_vat_deductible: boolean
  requires_manual_review: boolean
  supplier_validation_warnings: string[]
}

/**
 * Enhance expense data with supplier validation results for proper BTW reporting
 */
export function enhanceExpenseWithValidation(
  baseExpenseData: any,
  supplierValidation: SupplierValidationResult | null,
  manualSupplierCountry?: string,
  manualSupplierVatNumber?: string
): EnhancedExpenseData {
  // Start with base data
  const enhanced: EnhancedExpenseData = {
    vendor_name: baseExpenseData.vendor_name || '',
    supplier_country_code: manualSupplierCountry || 'NL',
    supplier_vat_number: manualSupplierVatNumber,
    vat_type: 'standard',
    is_reverse_charge: false,
    is_vat_deductible: baseExpenseData.is_deductible ?? true,
    requires_manual_review: false,
    supplier_validation_warnings: []
  }

  // Apply supplier validation results if available
  if (supplierValidation) {
    // Use suggested VAT type
    enhanced.vat_type = supplierValidation.suggestedVATType
    enhanced.is_reverse_charge = supplierValidation.requiresReverseCharge
    
    // Add validation warnings
    enhanced.supplier_validation_warnings = supplierValidation.foreignSupplierWarnings
    
    // Determine if manual review is needed
    enhanced.requires_manual_review = 
      supplierValidation.requiresReverseCharge && !manualSupplierVatNumber ||
      supplierValidation.foreignSupplierWarnings.length > 0 ||
      (supplierValidation.vatValidation && !supplierValidation.vatValidation.valid)
    
    // Set supplier info from validation if available
    if (supplierValidation.vatValidation) {
      enhanced.supplier_country_code = supplierValidation.vatValidation.country_code
      enhanced.supplier_vat_number = supplierValidation.vatValidation.vat_number
    }
  }

  // Override with manual input if provided
  if (manualSupplierCountry) {
    enhanced.supplier_country_code = manualSupplierCountry
  }
  
  if (manualSupplierVatNumber) {
    enhanced.supplier_vat_number = manualSupplierVatNumber
  }

  // Apply reverse charge logic for VAT deductibility
  if (enhanced.is_reverse_charge) {
    // For reverse charge, the expense itself has 0% VAT paid to supplier,
    // but VAT is still deductible as "voorbelasting" in BTW return
    enhanced.is_vat_deductible = true
    enhanced.vat_type = 'reverse_charge'
  }

  return enhanced
}

/**
 * Create expense submission data with proper BTW fields
 */
export function createExpenseSubmissionData(
  formData: any,
  enhancedData: EnhancedExpenseData,
  ocrMetadata?: any
) {
  return {
    // Basic expense data
    ...formData,
    
    // Enhanced supplier data for BTW compliance
    vendor_name: enhancedData.vendor_name,
    supplier_country_code: enhancedData.supplier_country_code,
    supplier_vat_number: enhancedData.supplier_vat_number,
    vat_type: enhancedData.vat_type,
    is_reverse_charge: enhancedData.is_reverse_charge,
    is_vat_deductible: enhancedData.is_vat_deductible,
    
    // OCR and validation metadata
    requires_manual_review: enhancedData.requires_manual_review,
    supplier_validation_warnings: enhancedData.supplier_validation_warnings,
    
    // OCR fields if available
    ...(ocrMetadata && {
      ocr_confidence_score: ocrMetadata.confidence,
      ocr_extracted_fields: ocrMetadata.extracted_data,
      ocr_raw_text: ocrMetadata.raw_text,
      processing_engine: ocrMetadata.ocr_metadata?.processing_engine
    })
  }
}

/**
 * Validate expense data for BTW compliance
 */
export function validateExpenseForBTW(expenseData: EnhancedExpenseData): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields validation
  if (!expenseData.vendor_name) {
    errors.push('Leverancier naam is verplicht')
  }
  
  if (!expenseData.supplier_country_code) {
    errors.push('Land van leverancier is verplicht voor BTW aangifte')
  }
  
  // Reverse charge validation
  if (expenseData.is_reverse_charge) {
    if (!expenseData.supplier_vat_number) {
      warnings.push('BTW nummer van leverancier is aanbevolen voor BTW verlegd transacties')
    }
    
    if (expenseData.supplier_country_code === 'NL') {
      warnings.push('BTW verlegd is doorgaans niet van toepassing op Nederlandse leveranciers')
    }
  }
  
  // EU transaction validation
  const euCountries = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 
    'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 
    'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
  ]
  
  if (euCountries.includes(expenseData.supplier_country_code) && !expenseData.is_reverse_charge) {
    warnings.push('EU leverancier gedetecteerd - controleer of BTW verlegd van toepassing is')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: [...warnings, ...expenseData.supplier_validation_warnings]
  }
}