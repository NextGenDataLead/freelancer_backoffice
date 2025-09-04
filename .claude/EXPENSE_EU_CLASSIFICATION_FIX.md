# Expense EU Classification Fix Plan

## Problem Summary
The expense form correctly identifies Romania (RO) as supplier country, but this data doesn't reach the database properly. The re-added Mihai expense shows:
- `supplier_country: 'NL'` (should be `'RO'`)  
- `acquisition_type: null` (should be `'eu_services'`)
- No reverse charge calculations triggered

## Root Cause Analysis
1. **Missing Schema Field**: `CreateExpenseSchema` doesn't include `supplier_country` field
2. **Missing API Logic**: No automatic `acquisition_type` calculation based on country + category
3. **Form Submission Gap**: Form shows Romania but doesn't send this data to API

## Implementation Plan

### ✅ Step 1: Update Validation Schema (COMPLETED)
- Added `supplier_country: z.string().length(2, "Invalid country code").optional()` to `CreateExpenseSchema`
- Located in: `/src/lib/validations/financial.ts:187`

### 🔄 Step 2: Update API Route Logic (PENDING)
Location: `/src/app/api/expenses/route.ts` lines 155-184

**Add EU Classification Logic:**
```typescript
// EU countries for acquisition type classification
const EU_COUNTRIES = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']

// Determine acquisition type based on supplier country and category
let acquisitionType = 'domestic' // Default for NL or unknown
if (validatedData.supplier_country && validatedData.supplier_country !== 'NL') {
  if (EU_COUNTRIES.includes(validatedData.supplier_country)) {
    // EU country - determine if goods or services based on category
    const serviceCategories = ['professionele_diensten', 'software_ict', 'marketing_reclame', 'telefoon_communicatie']
    acquisitionType = serviceCategories.includes(validatedData.category) ? 'eu_services' : 'eu_goods'
  } else {
    // Non-EU country
    const serviceCategories = ['professionele_diensten', 'software_ict', 'marketing_reclame', 'telefoon_communicatie']
    acquisitionType = serviceCategories.includes(validatedData.category) ? 'import_services' : 'import_goods'
  }
}

// Add to expenseDbData:
supplier_country: validatedData.supplier_country || 'NL',
acquisition_type: acquisitionType,
```

### 🔄 Step 3: Update Expense Form (PENDING) 
Location: `/src/components/financial/expenses/expense-form.tsx`

**Ensure Form Sends Country Data:**
- Check if form captures supplier country from OCR or user input
- Add `supplier_country` field to form submission data
- Map detected country codes to API format

### 🔄 Step 4: Test End-to-End Workflow (PENDING)
**Test Scenario:**
1. Add Romanian service expense (€600, Marketing & Reclame category)
2. Verify form detects `supplier_country: 'RO'` 
3. Verify API calculates `acquisition_type: 'eu_services'`
4. Verify database triggers calculate reverse charge (€126)
5. Verify BTW dashboard shows:
   - Section 4b: €600 + €126
   - Section 5a: €840 + €126 = €966
   - Section 5b: €4.34 + €126 = €130.34

## Current Database State (Q1 2025)
- **KPN Expense**: ✅ Working correctly (€4.34 domestic VAT)
- **Mihai Expense**: ❌ Missing EU classification 
  - Current: `supplier_country: 'NL'`, `acquisition_type: null`
  - Expected: `supplier_country: 'RO'`, `acquisition_type: 'eu_services'`

## Business Logic Rules
**Country Classification:**
- `'NL'` → `'domestic'`
- EU countries (RO, BE, DE, etc.) → `'eu_services'` or `'eu_goods'` based on category
- Non-EU countries → `'import_services'` or `'import_goods'` based on category

**Service vs Goods Categories:**
- **Services**: `professionele_diensten`, `software_ict`, `marketing_reclame`, `telefoon_communicatie`
- **Goods**: All other categories

**Expected Mihai Classification:**
- Country: `'RO'` (Romania = EU)
- Category: `'marketing_reclame'` (service)
- Result: `acquisition_type: 'eu_services'` → Triggers reverse charge

## Testing Commands
```sql
-- Check expense after fix
SELECT vendor_name, supplier_country, acquisition_type, reverse_charge_received 
FROM expenses 
WHERE vendor_name = 'MUSICMEDIATECH S.R.L.';

-- Check BTW calculation
SELECT section_4b_btw, section_5a_total 
FROM btw_form_calculation 
WHERE year = 2025 AND quarter = 1;
```