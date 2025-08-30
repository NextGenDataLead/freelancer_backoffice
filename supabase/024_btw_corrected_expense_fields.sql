-- Migration: CORRECTED BTW expense fields for official Dutch VAT form compliance
-- Based on official Belastingdienst BTW form - expenses only contribute to Section 5b (Voorbelasting)
-- Replaces incorrect 019_btw_enhanced_expense_fields.sql
-- Generated with Claude Code (https://claude.ai/code)

-- Add CORRECTED BTW fields to expenses table - SIMPLIFIED to match official form
ALTER TABLE expenses 
-- Section 5b: Voorbelasting (input VAT) - ALL deductible expense VAT goes here
ADD COLUMN IF NOT EXISTS section_5b_voorbelasting NUMERIC(12,2) DEFAULT 0, -- Total deductible input VAT

-- Enhanced classification for proper VAT deduction calculation
ADD COLUMN IF NOT EXISTS vat_deduction_type VARCHAR(30) CHECK (vat_deduction_type IN ('full_deductible', 'partial_deductible', 'non_deductible', 'reverse_charge_acquisition')),
ADD COLUMN IF NOT EXISTS business_use_percentage NUMERIC(5,2) DEFAULT 100 CHECK (business_use_percentage >= 0 AND business_use_percentage <= 100),
ADD COLUMN IF NOT EXISTS private_use_percentage NUMERIC(5,2) DEFAULT 0 CHECK (private_use_percentage >= 0 AND private_use_percentage <= 100),

-- EU/Import transaction details for Section 4 calculations (supplier side)
ADD COLUMN IF NOT EXISTS supplier_country CHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS supplier_vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS supplier_vat_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS acquisition_type VARCHAR(30) CHECK (acquisition_type IN ('domestic', 'eu_goods', 'eu_services', 'import_goods', 'import_services')),

-- Import VAT (Invoerbtw) tracking - separate from regular VAT
ADD COLUMN IF NOT EXISTS import_vat_paid NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customs_declaration_number VARCHAR(50),

-- Reverse charge mechanism tracking  
ADD COLUMN IF NOT EXISTS reverse_charge_received NUMERIC(12,2) DEFAULT 0, -- VAT we owe on reverse charge purchases
ADD COLUMN IF NOT EXISTS reverse_charge_deductible NUMERIC(12,2) DEFAULT 0, -- Same amount but deductible

-- Metadata for audit and compliance
ADD COLUMN IF NOT EXISTS btw_calculation_method VARCHAR(30) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS deduction_limitation_reason TEXT;

-- Comments explaining CORRECTED simplified structure
COMMENT ON COLUMN expenses.section_5b_voorbelasting IS 'Section 5b: Total deductible input VAT (Voorbelasting) - all expense VAT deductions aggregate here';
COMMENT ON COLUMN expenses.vat_deduction_type IS 'Type of VAT deduction allowed for this expense';
COMMENT ON COLUMN expenses.business_use_percentage IS 'Percentage of business use (affects VAT deductibility)';
COMMENT ON COLUMN expenses.private_use_percentage IS 'Percentage of private use (reduces VAT deductibility)';
COMMENT ON COLUMN expenses.supplier_country IS 'Country of supplier (determines acquisition classification)';
COMMENT ON COLUMN expenses.acquisition_type IS 'Type of acquisition for BTW form classification';
COMMENT ON COLUMN expenses.import_vat_paid IS 'Import VAT paid at customs (Invoerbtw) - separate from regular VAT';
COMMENT ON COLUMN expenses.reverse_charge_received IS 'VAT amount under reverse charge mechanism (we owe this)';
COMMENT ON COLUMN expenses.reverse_charge_deductible IS 'VAT amount deductible from reverse charge (usually same as received)';

-- Create expense VAT calculation details table for audit trail
CREATE TABLE IF NOT EXISTS expense_vat_calculation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    calculation_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Input values
    gross_amount NUMERIC(12,2) NOT NULL,
    net_amount NUMERIC(12,2) NOT NULL, 
    vat_rate NUMERIC(5,4) NOT NULL,
    business_percentage NUMERIC(5,2) NOT NULL,
    
    -- Calculated values
    gross_vat_amount NUMERIC(12,2) NOT NULL, -- Total VAT on expense
    deductible_vat_amount NUMERIC(12,2) NOT NULL, -- Amount deductible for Section 5b
    non_deductible_vat_amount NUMERIC(12,2) NOT NULL, -- Private use portion
    
    -- Classification results
    contributes_to_section_5b BOOLEAN DEFAULT TRUE,
    deduction_limitation VARCHAR(100),
    
    -- Reverse charge specifics
    reverse_charge_owed NUMERIC(12,2) DEFAULT 0, -- For Section 4a/4b
    reverse_charge_deductible NUMERIC(12,2) DEFAULT 0, -- For Section 5b
    
    -- Audit trail
    calculation_method VARCHAR(50),
    calculation_notes TEXT
);

-- Create indexes for performance and reporting
CREATE INDEX IF NOT EXISTS idx_expenses_5b_voorbelasting ON expenses(tenant_id, section_5b_voorbelasting) WHERE section_5b_voorbelasting > 0;
CREATE INDEX IF NOT EXISTS idx_expenses_deduction_type ON expenses(tenant_id, vat_deduction_type, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_acquisition_type ON expenses(tenant_id, acquisition_type, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_country ON expenses(tenant_id, supplier_country) WHERE supplier_country != 'NL';
CREATE INDEX IF NOT EXISTS idx_expenses_import_vat ON expenses(tenant_id, import_vat_paid) WHERE import_vat_paid > 0;
CREATE INDEX IF NOT EXISTS idx_expenses_reverse_charge ON expenses(tenant_id, reverse_charge_received) WHERE reverse_charge_received > 0;

-- Index for VAT calculation audit
CREATE INDEX IF NOT EXISTS idx_expense_vat_calc_expense ON expense_vat_calculation(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_vat_calc_5b ON expense_vat_calculation(contributes_to_section_5b) WHERE contributes_to_section_5b = true;

-- Update RLS policies for new table
ALTER TABLE expense_vat_calculation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expense VAT calculation follows expense permissions" ON expense_vat_calculation
    FOR ALL USING (
        expense_id IN (
            SELECT id FROM expenses e
            WHERE e.tenant_id = (SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
        )
    );

-- CORRECTED function to calculate expense VAT for Section 5b (simplified approach)
CREATE OR REPLACE FUNCTION calculate_corrected_expense_vat()
RETURNS TRIGGER AS $$
DECLARE
    effective_business_pct NUMERIC(5,2);
    gross_vat NUMERIC(12,2);
    deductible_vat NUMERIC(12,2);
    non_deductible_vat NUMERIC(12,2);
BEGIN
    -- Calculate effective business percentage
    effective_business_pct := NEW.business_use_percentage - COALESCE(NEW.private_use_percentage, 0);
    IF effective_business_pct < 0 THEN
        effective_business_pct := 0;
    END IF;
    
    -- Calculate VAT amounts based on expense type
    IF NEW.acquisition_type = 'domestic' THEN
        -- Regular domestic expense with VAT
        gross_vat := NEW.vat_amount;
        deductible_vat := gross_vat * effective_business_pct / 100;
        
    ELSIF NEW.acquisition_type IN ('eu_goods', 'eu_services') THEN
        -- EU acquisition - reverse charge mechanism
        NEW.reverse_charge_received := NEW.amount * NEW.vat_rate;
        NEW.reverse_charge_deductible := NEW.reverse_charge_received * effective_business_pct / 100;
        gross_vat := NEW.reverse_charge_received;
        deductible_vat := NEW.reverse_charge_deductible;
        
    ELSIF NEW.acquisition_type IN ('import_goods', 'import_services') THEN
        -- Import - use import VAT paid at customs
        gross_vat := NEW.import_vat_paid;
        deductible_vat := gross_vat * effective_business_pct / 100;
        
    ELSE
        -- Fallback to regular VAT calculation
        gross_vat := COALESCE(NEW.vat_amount, 0);
        deductible_vat := gross_vat * effective_business_pct / 100;
    END IF;
    
    non_deductible_vat := gross_vat - deductible_vat;
    
    -- Determine deduction type and limitations
    IF effective_business_pct = 100 THEN
        NEW.vat_deduction_type := 'full_deductible';
    ELSIF effective_business_pct > 0 THEN
        NEW.vat_deduction_type := 'partial_deductible';
    ELSE
        NEW.vat_deduction_type := 'non_deductible';
        NEW.deduction_limitation_reason := 'No business use';
    END IF;
    
    -- Set Section 5b amount (ALL deductible VAT goes here in official form)
    NEW.section_5b_voorbelasting := deductible_vat;
    
    -- Update main VAT fields for consistency
    NEW.vat_amount := gross_vat;
    NEW.is_vat_deductible := (deductible_vat > 0);
    
    -- Create detailed calculation record
    INSERT INTO expense_vat_calculation (
        expense_id,
        gross_amount,
        net_amount,
        vat_rate,
        business_percentage,
        gross_vat_amount,
        deductible_vat_amount,
        non_deductible_vat_amount,
        contributes_to_section_5b,
        deduction_limitation,
        reverse_charge_owed,
        reverse_charge_deductible,
        calculation_method
    ) VALUES (
        NEW.id,
        NEW.amount + gross_vat,
        NEW.amount,
        NEW.vat_rate,
        effective_business_pct,
        gross_vat,
        deductible_vat,
        non_deductible_vat,
        (deductible_vat > 0),
        NEW.deduction_limitation_reason,
        COALESCE(NEW.reverse_charge_received, 0),
        COALESCE(NEW.reverse_charge_deductible, 0),
        'corrected_calculation_v2'
    ) ON CONFLICT (expense_id) DO UPDATE SET
        gross_vat_amount = EXCLUDED.gross_vat_amount,
        deductible_vat_amount = EXCLUDED.deductible_vat_amount,
        non_deductible_vat_amount = EXCLUDED.non_deductible_vat_amount,
        calculation_date = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create CORRECTED trigger
DROP TRIGGER IF EXISTS enhanced_expense_vat_calculation_trigger ON expenses;
CREATE TRIGGER calculate_corrected_expense_vat_trigger
    BEFORE INSERT OR UPDATE OF amount, vat_rate, vat_amount, business_use_percentage, private_use_percentage, 
    acquisition_type, import_vat_paid
    ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_corrected_expense_vat();

-- Function to aggregate Section 5b totals for BTW form
CREATE OR REPLACE FUNCTION get_section_5b_total_for_period(
    p_tenant_id UUID,
    p_year INTEGER,
    p_quarter INTEGER
)
RETURNS NUMERIC(12,2) AS $$
DECLARE
    total_5b NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(e.section_5b_voorbelasting), 0)
    INTO total_5b
    FROM expenses e
    WHERE e.tenant_id = p_tenant_id
      AND e.status NOT IN ('draft', 'cancelled')
      AND EXTRACT(year FROM e.expense_date) = p_year
      AND EXTRACT(quarter FROM e.expense_date) = p_quarter;
      
    RETURN total_5b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing expenses with corrected structure
UPDATE expenses SET 
    acquisition_type = CASE
        WHEN supplier_country = 'NL' OR supplier_country IS NULL THEN 'domestic'
        WHEN supplier_country IN ('BE', 'DE', 'FR', 'ES', 'IT', 'PL', 'SE', 'DK', 'FI', 'AT', 'PT', 'IE', 'LU', 'EE', 'LV', 'LT', 'SI', 'SK', 'CZ', 'HU', 'RO', 'BG', 'HR', 'CY', 'MT', 'GR') THEN 
            CASE WHEN category LIKE '%goods%' THEN 'eu_goods' ELSE 'eu_services' END
        ELSE 'import_goods'
    END,
    supplier_country = COALESCE(supplier_country, 'NL'),
    business_use_percentage = COALESCE(business_percentage, 100),
    private_use_percentage = 0,
    btw_calculation_method = 'migrated_corrected'
WHERE acquisition_type IS NULL;