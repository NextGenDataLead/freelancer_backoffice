-- Migration: Enhanced expense fields for complete BTW compliance
-- Phase 2: Adds all missing VAT deduction fields needed for complete Dutch VAT form
-- Generated with Claude Code (https://claude.ai/code)

-- Add new fields to expenses table for complete BTW voorbelasting support
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS import_vat_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_vat_amount NUMERIC(10,2) DEFAULT 0, -- EU acquisitions
ADD COLUMN IF NOT EXISTS private_use_percentage NUMERIC(5,2) DEFAULT 0 CHECK (private_use_percentage >= 0 AND private_use_percentage <= 100),
ADD COLUMN IF NOT EXISTS investment_correction_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS place_of_supply_country CHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS reverse_charge_mechanism VARCHAR(30) CHECK (reverse_charge_mechanism IN ('domestic_construction', 'domestic_waste', 'eu_services', 'import_services')),
ADD COLUMN IF NOT EXISTS btw_rubriek VARCHAR(10), -- Which BTW rubriek this expense contributes to (5a, 5b, 5c, 5d, 5e, 5f, 5g)
ADD COLUMN IF NOT EXISTS customs_declaration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS eu_vat_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) CHECK (transaction_type IN ('domestic', 'eu_acquisition', 'import', 'reverse_charge')) DEFAULT 'domestic';

-- Comments for clarity
COMMENT ON COLUMN expenses.import_vat_amount IS 'Import VAT paid at customs (invoerbtw)';
COMMENT ON COLUMN expenses.acquisition_vat_amount IS 'VAT on EU acquisitions (reverse charge)';
COMMENT ON COLUMN expenses.private_use_percentage IS 'Percentage of private use (reduces deductible VAT)';
COMMENT ON COLUMN expenses.investment_correction_amount IS 'VAT corrections for investment goods';
COMMENT ON COLUMN expenses.place_of_supply_country IS 'Country where expense was incurred';
COMMENT ON COLUMN expenses.reverse_charge_mechanism IS 'Type of reverse charge mechanism applied';
COMMENT ON COLUMN expenses.btw_rubriek IS 'BTW form rubriek where this expense VAT is deducted (5a-5g)';
COMMENT ON COLUMN expenses.customs_declaration_number IS 'Customs declaration number for imports';
COMMENT ON COLUMN expenses.eu_vat_validated IS 'Whether supplier EU VAT number was validated';
COMMENT ON COLUMN expenses.transaction_type IS 'Type of transaction for BTW classification';

-- Create expense VAT breakdown table for detailed rubriek allocation
CREATE TABLE IF NOT EXISTS expense_vat_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    vat_rubriek VARCHAR(10) NOT NULL, -- '5a', '5b', '5c', '5d', '5e', '5f', '5g'
    deductible_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    non_deductible_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    business_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
    calculation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for VAT reporting performance
CREATE INDEX IF NOT EXISTS idx_expenses_import_vat ON expenses(tenant_id, import_vat_amount) WHERE import_vat_amount > 0;
CREATE INDEX IF NOT EXISTS idx_expenses_acquisition_vat ON expenses(tenant_id, acquisition_vat_amount) WHERE acquisition_vat_amount > 0;
CREATE INDEX IF NOT EXISTS idx_expenses_private_use ON expenses(tenant_id, private_use_percentage) WHERE private_use_percentage > 0;
CREATE INDEX IF NOT EXISTS idx_expenses_investment_corrections ON expenses(tenant_id, investment_correction_amount) WHERE investment_correction_amount != 0;
CREATE INDEX IF NOT EXISTS idx_expenses_btw_rubriek ON expenses(tenant_id, btw_rubriek);
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_type ON expenses(tenant_id, transaction_type);

-- Index for VAT breakdown queries
CREATE INDEX IF NOT EXISTS idx_expense_vat_breakdown_rubriek ON expense_vat_breakdown(vat_rubriek);
CREATE INDEX IF NOT EXISTS idx_expense_vat_breakdown_expense ON expense_vat_breakdown(expense_id);

-- Update RLS policies for new table
ALTER TABLE expense_vat_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS policy for expense VAT breakdown (inherit from expense permissions)
CREATE POLICY "Expense VAT breakdown follows expense permissions" ON expense_vat_breakdown
    FOR ALL USING (
        expense_id IN (
            SELECT id FROM expenses 
            WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
        )
    );

-- Enhanced function to calculate expense VAT amounts and rubriek assignment
CREATE OR REPLACE FUNCTION calculate_enhanced_expense_vat()
RETURNS TRIGGER AS $$
DECLARE
    effective_business_pct NUMERIC(5,2);
    base_vat_amount NUMERIC(10,2);
BEGIN
    -- Calculate effective business percentage (reduced by private use)
    effective_business_pct = NEW.business_percentage - NEW.private_use_percentage;
    IF effective_business_pct < 0 THEN
        effective_business_pct = 0;
    END IF;
    
    -- Calculate base VAT amount
    IF NEW.is_reverse_charge THEN
        NEW.vat_amount = 0;
        NEW.acquisition_vat_amount = ROUND((NEW.amount * NEW.vat_rate), 2);
        base_vat_amount = NEW.acquisition_vat_amount;
    ELSE
        NEW.vat_amount = ROUND((NEW.amount * NEW.vat_rate * effective_business_pct / 100), 2);
        base_vat_amount = NEW.vat_amount;
    END IF;
    
    -- Determine BTW rubriek based on transaction characteristics
    IF NEW.import_vat_amount > 0 THEN
        NEW.btw_rubriek = '5d'; -- Import VAT and reverse charge
    ELSIF NEW.is_reverse_charge OR NEW.transaction_type = 'eu_acquisition' THEN
        NEW.btw_rubriek = '5d'; -- Reverse charge VAT
    ELSIF NEW.investment_correction_amount != 0 THEN
        NEW.btw_rubriek = '5g'; -- Investment corrections
    ELSIF NEW.private_use_percentage > 0 THEN
        NEW.btw_rubriek = '5f'; -- Private use adjustments
    ELSIF NEW.vat_rate = 0.21 THEN
        NEW.btw_rubriek = '5a'; -- Standard rate input VAT
    ELSIF NEW.vat_rate = 0.09 THEN
        NEW.btw_rubriek = '5b'; -- Reduced rate input VAT
    ELSIF NEW.vat_rate = 0 OR NEW.vat_type = 'exempt' THEN
        NEW.btw_rubriek = '5c'; -- Zero rate / exempt
    ELSE
        NEW.btw_rubriek = '5e'; -- Other deductible VAT
    END IF;
    
    -- Set VAT deductibility based on business percentage, transaction type and VAT type
    IF effective_business_pct = 0 OR NEW.vat_type = 'exempt' THEN
        NEW.is_vat_deductible = false;
        NEW.vat_amount = 0;
    ELSIF NEW.transaction_type = 'import' AND NEW.import_vat_amount = 0 THEN
        -- Import without proper VAT documentation
        NEW.is_vat_deductible = false;
    ELSE
        NEW.is_vat_deductible = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the existing expense VAT calculation trigger
DROP TRIGGER IF EXISTS expense_vat_calculation_trigger ON expenses;
CREATE TRIGGER enhanced_expense_vat_calculation_trigger
    BEFORE INSERT OR UPDATE OF amount, vat_rate, business_percentage, is_reverse_charge, 
    private_use_percentage, import_vat_amount, transaction_type
    ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_enhanced_expense_vat();

-- Function to create detailed VAT breakdown for an expense
CREATE OR REPLACE FUNCTION create_expense_vat_breakdown(
    p_expense_id UUID,
    p_force_refresh BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
DECLARE
    expense_record expenses%ROWTYPE;
    deductible_vat NUMERIC(10,2);
    non_deductible_vat NUMERIC(10,2);
    total_vat NUMERIC(10,2);
BEGIN
    -- Get expense details
    SELECT * INTO expense_record FROM expenses WHERE id = p_expense_id;
    
    -- Skip if breakdown already exists and not forcing refresh
    IF NOT p_force_refresh AND EXISTS(SELECT 1 FROM expense_vat_breakdown WHERE expense_id = p_expense_id) THEN
        RETURN;
    END IF;
    
    -- Delete existing breakdown if refreshing
    DELETE FROM expense_vat_breakdown WHERE expense_id = p_expense_id;
    
    -- Calculate VAT amounts
    total_vat = COALESCE(expense_record.vat_amount, 0) + 
                COALESCE(expense_record.import_vat_amount, 0) + 
                COALESCE(expense_record.acquisition_vat_amount, 0);
                
    -- Calculate deductible vs non-deductible portions
    IF expense_record.is_vat_deductible THEN
        deductible_vat = total_vat * (100 - COALESCE(expense_record.private_use_percentage, 0)) / 100;
        non_deductible_vat = total_vat - deductible_vat;
    ELSE
        deductible_vat = 0;
        non_deductible_vat = total_vat;
    END IF;
    
    -- Insert breakdown record
    INSERT INTO expense_vat_breakdown (
        expense_id,
        vat_rubriek,
        deductible_amount,
        non_deductible_amount,
        business_percentage,
        calculation_notes
    ) VALUES (
        p_expense_id,
        expense_record.btw_rubriek,
        deductible_vat,
        non_deductible_vat,
        expense_record.business_percentage,
        CASE 
            WHEN expense_record.private_use_percentage > 0 THEN 
                'Private use: ' || expense_record.private_use_percentage::text || '%'
            WHEN expense_record.import_vat_amount > 0 THEN 
                'Import VAT: ' || expense_record.import_vat_amount::text
            WHEN expense_record.is_reverse_charge THEN 
                'Reverse charge VAT'
            ELSE 
                'Standard VAT calculation'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- Update existing expenses to have proper BTW rubriek classification
UPDATE expenses SET 
    transaction_type = 'domestic',
    place_of_supply_country = COALESCE(supplier_country_code, 'NL'),
    btw_rubriek = CASE 
        WHEN is_reverse_charge THEN '5d'
        WHEN vat_rate = 0.21 THEN '5a'
        WHEN vat_rate = 0.09 THEN '5b'
        WHEN vat_rate = 0 THEN '5c'
        ELSE '5e'
    END
WHERE btw_rubriek IS NULL;