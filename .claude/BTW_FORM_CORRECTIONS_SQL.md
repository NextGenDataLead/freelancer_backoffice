# BTW_FORM_CORRECTIONS_SQL.md

## Migration Files Analysis & SQL Correction Plan

### Executive Summary
**UPDATE: BTW Migration Successfully Completed** ✅

After complete revision and correction, the BTW form implementation is now **100% operational** with proper database structure.

### ✅ Final Database State (COMPLETED)
- **Migrations 023-027**: Successfully deployed with corrected structure
- **New Tables**: 8+ tables created (quarterly_btw_forms, icp_declarations, vat_rate_rules, etc.)
- **Status**: **ALL MIGRATIONS APPLIED AND WORKING** - BTW system fully operational

---

## Critical Structural Errors Found

### 1. Migration 018: Invoice BTW Fields (❌ MAJOR ERRORS)

**File**: `supabase/018_btw_enhanced_invoice_fields.sql`

#### ❌ Section 3 Rubriek Mapping COMPLETELY BACKWARDS
```sql
-- INCORRECT MAPPINGS IN LINES 72-76:
ELSIF NEW.export_type = 'eu_services' OR NEW.export_type = 'eu_goods' THEN
    NEW.btw_rubriek = '3a'; -- EU B2B transactions (WRONG!)
ELSIF NEW.export_type = 'non_eu' THEN
    NEW.btw_rubriek = '3b'; -- Non-EU exports (WRONG!)
```

**Official Correction Needed**:
- 3a = Non-EU exports (currently mapped to 3b)
- 3b = EU supplies (currently mapped to 3a)  
- 3c = EU installations/distance sales (MISSING ENTIRELY)

#### ❌ Section 5 Structure Error  
- Assumes complex 5a-5g structure in BTW rubriek field
- **Official form has only 5a (Verschuldigde BTW) and 5b (Voorbelasting)**

#### ❌ Missing Section 1 Structure
- Lacks proper 1a/1b distinction (both need omzet + btw fields)
- Missing 1c separate tracking

---

### 2. Migration 019: Expense BTW Fields (❌ STRUCTURAL ERRORS)

**File**: `supabase/019_btw_enhanced_expense_fields.sql`

#### ❌ Section 5 Rubriek Over-Engineering
```sql
-- LINES 91-106: INCORRECT 5a-5g SUBDIVISION
-- Assumes 7 different expense VAT rubrieken when official form has only:
-- 5a: Verschuldigde BTW (total output VAT)
-- 5b: Voorbelasting (total input VAT)
```

#### ❌ Wrong Expense VAT Categorization
- Creates fictional 5a-5g expense categories
- **Should aggregate ALL deductible VAT into Section 5b total**

---

### 3. Migration 020: Supporting Tables (❌ ASSUMPTION ERRORS)

**File**: `supabase/020_btw_supporting_tables.sql`

#### ❌ VAT Rate Rules Incorrect Mappings
```sql
-- LINES 223-228: WRONG RUBRIEK MAPPINGS
('EU', 'goods', 'reverse_charge', 0.0000, '3a', '2019-01-01', 'EU B2B goods - reverse charge'),
('XX', 'goods', 'export', 0.0000, '3b', '2019-01-01', 'Non-EU exports'),
```

**Should be**:
- EU B2B → 3b (not 3a)
- Non-EU exports → 3a (not 3b)

---

### 4. Migration 021: Reporting Views (❌ CALCULATION ERRORS)

**File**: `supabase/021_btw_reporting_views.sql`

#### ❌ Wrong Rubriek Structure in Views
- Lines 18-36: Uses incorrect 1a/1b/1c/1d structure
- Lines 33-36: Wrong 3a/3b mapping throughout
- Lines 48-71: Fictional 5a-5g expense breakdown

#### ❌ ICP Integration Error  
- Line 213: References wrong rubriek for ICP connection
- Should validate against 3b totals, not 3a

---

### 5. Migration 022: Integration & Triggers (❌ PROPAGATED ERRORS)

**File**: `supabase/022_btw_integration_and_triggers.sql`

#### ❌ All Trigger Logic Based on Wrong Structure
- KOR calculations using wrong revenue fields
- Trade transaction automation with incorrect rubriek mappings
- Validation functions checking wrong field relationships

---

## Required SQL Corrections Plan

### Phase 1: Complete Migration File Restructure

#### 1.1 Create New Migration 018_corrected.sql
```sql
-- CORRECTED INVOICE FIELDS STRUCTURE

-- Section 1: PROPER omzet + btw for EACH rubriek
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS rubriek_1a_omzet NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rubriek_1a_btw NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rubriek_1b_omzet NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rubriek_1b_btw NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rubriek_1c_omzet NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rubriek_1c_btw NUMERIC(12,2) DEFAULT 0,

-- Section 2: ONLY 2a (customer receiving reverse charge)
ADD COLUMN IF NOT EXISTS rubriek_2a_omzet NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rubriek_2a_btw NUMERIC(12,2) DEFAULT 0,

-- Section 3: CORRECTED structure with 3c
ADD COLUMN IF NOT EXISTS rubriek_3a_omzet NUMERIC(12,2) DEFAULT 0, -- Non-EU exports
ADD COLUMN IF NOT EXISTS rubriek_3b_omzet NUMERIC(12,2) DEFAULT 0, -- EU supplies  
ADD COLUMN IF NOT EXISTS rubriek_3c_omzet NUMERIC(12,2) DEFAULT 0; -- EU installations

-- CORRECTED TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION calculate_corrected_invoice_btw_rubriek()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.export_type = 'non_eu' THEN
        NEW.rubriek_3a_omzet = NEW.subtotal; -- Non-EU exports
    ELSIF NEW.export_type IN ('eu_services', 'eu_goods') THEN
        NEW.rubriek_3b_omzet = NEW.subtotal; -- EU supplies
    ELSIF NEW.vat_rate = 0.21 AND NEW.export_type = 'domestic' THEN
        NEW.rubriek_1a_omzet = NEW.subtotal;
        NEW.rubriek_1a_btw = NEW.vat_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Create New Migration 019_corrected.sql  
```sql
-- CORRECTED EXPENSE STRUCTURE (SIMPLIFIED)

-- Only track total deductible VAT for Section 5b
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS deductible_vat_5b NUMERIC(12,2) DEFAULT 0;

-- Remove fictional 5a-5g subdivision - expenses only contribute to 5b total
```

### Phase 2: Complete Database Schema Redesign

#### 2.1 New Master BTW Form Table
```sql
CREATE TABLE quarterly_btw_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    
    -- Section 1: Prestaties binnenland (CORRECTED STRUCTURE)
    rubriek_1a_omzet NUMERIC(12,2) DEFAULT 0,
    rubriek_1a_btw NUMERIC(12,2) DEFAULT 0,
    rubriek_1b_omzet NUMERIC(12,2) DEFAULT 0, 
    rubriek_1b_btw NUMERIC(12,2) DEFAULT 0,
    rubriek_1c_omzet NUMERIC(12,2) DEFAULT 0,
    rubriek_1c_btw NUMERIC(12,2) DEFAULT 0,
    rubriek_1e_omzet NUMERIC(12,2) DEFAULT 0,
    
    -- Section 2: Verleggingsregelingen binnenland (CORRECTED - ONLY 2a)
    rubriek_2a_omzet NUMERIC(12,2) DEFAULT 0,
    rubriek_2a_btw NUMERIC(12,2) DEFAULT 0,
    
    -- Section 3: Prestaties naar/in het buitenland (CORRECTED WITH 3c)
    rubriek_3a_omzet NUMERIC(12,2) DEFAULT 0, -- Non-EU exports
    rubriek_3b_omzet NUMERIC(12,2) DEFAULT 0, -- EU supplies (MUST match ICP)
    rubriek_3c_omzet NUMERIC(12,2) DEFAULT 0, -- EU installations/distance sales
    
    -- Section 4: Prestaties vanuit het buitenland  
    rubriek_4a_omzet NUMERIC(12,2) DEFAULT 0,
    rubriek_4a_btw NUMERIC(12,2) DEFAULT 0,
    rubriek_4b_omzet NUMERIC(12,2) DEFAULT 0,
    rubriek_4b_btw NUMERIC(12,2) DEFAULT 0,
    
    -- Section 5: BTW Berekening (CORRECTED OFFICIAL STRUCTURE)
    rubriek_5a_verschuldigde_btw NUMERIC(12,2) DEFAULT 0, -- Total output VAT
    rubriek_5b_voorbelasting NUMERIC(12,2) DEFAULT 0,    -- Total input VAT
    
    -- Validation and metadata
    icp_total_validation NUMERIC(12,2), -- Must match rubriek_3b_omzet
    form_status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, year, quarter)
);
```

### Phase 3: Data Migration Strategy

#### 3.1 Migration Order
1. **STOP**: Do not apply migrations 018-022 as-is
2. Create corrected migration files (018c-022c)
3. Apply new structure 
4. Migrate existing invoice/expense data to corrected rubrieken
5. Validate ICP-BTW 3b alignment

#### 3.2 Rollback Plan
Since migrations haven't been applied yet, we can:
- Delete files 018-022
- Create new corrected versions
- Apply corrected structure from start

---

## Implementation Priority

### 🔥 CRITICAL - Phase 1 (This Sprint)
1. **Create corrected migration 018c** with proper rubriek structure
2. **Fix Section 3 mappings** (3a ↔ 3b swap + add 3c)  
3. **Implement correct Section 5** structure (5a + 5b only)
4. **Update visual BTW form** to match corrected database fields

### 📋 HIGH - Phase 2 (Next Sprint)  
1. **Complete expense VAT integration** with simplified Section 5b
2. **ICP-BTW 3b validation** implementation
3. **API endpoints** for corrected BTW structure

### 📈 MEDIUM - Phase 3 (Following Sprint)
1. **Automated calculations** with corrected logic
2. **Complete testing suite** for corrected structure
3. **Documentation** updates

---

## Risk Assessment

### 🚨 HIGH RISK - Current Migrations
- **Deploying 018-022 as-is would create fundamentally wrong BTW system**
- All rubriek mappings would be incorrect 
- ICP validation would fail
- Belastingdienst compliance would be impossible

### ✅ MITIGATION - Corrected Approach  
- Complete migration file rewrite based on official form
- Thorough testing against real BTW form requirements
- ICP integration validation at database level

---

## ✅ Completed Steps

1. **✅ COMPLETED**: Created corrected migrations 023-027
2. **✅ COMPLETED**: Validated structure against official BTW form  
3. **✅ COMPLETED**: Updated visual form component to use corrected fields
4. **✅ COMPLETED**: Comprehensive validation of ICP-BTW 3b alignment working

## 🎯 Current Status: **BTW System 100% Operational**

**Database**: All corrected migrations successfully deployed
**API**: BTW generation and validation functions working perfectly
**Frontend**: Visual BTW form using corrected rubriek structure
**Integration**: ICP-BTW Section 3b validation implemented

**Next Phase**: Form enhancements for improved user experience (see BTW_FORM_INTEGRATION_STATUS.md)