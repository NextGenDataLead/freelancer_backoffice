-- Migration: Add VAT support to expenses for Dutch fiscal compliance
-- This migration adds VAT fields to the expenses table to support Dutch ZZP'er tax requirements

-- Add VAT-related columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,4) DEFAULT 0.21,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_type VARCHAR(20) DEFAULT 'standard' CHECK (vat_type IN ('standard', 'reduced', 'zero', 'exempt', 'reverse_charge')),
ADD COLUMN IF NOT EXISTS is_vat_deductible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS business_percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (business_percentage >= 0 AND business_percentage <= 100),
ADD COLUMN IF NOT EXISTS supplier_country_code CHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS supplier_vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN expenses.vat_rate IS 'VAT rate applied (0.21 for standard Dutch VAT, 0.09 for reduced, 0 for exempt)';
COMMENT ON COLUMN expenses.vat_amount IS 'VAT amount in euros (calculated from amount * vat_rate * business_percentage/100)';
COMMENT ON COLUMN expenses.vat_type IS 'Type of VAT treatment: standard, reduced, zero, exempt, reverse_charge';
COMMENT ON COLUMN expenses.is_vat_deductible IS 'Whether VAT can be deducted from quarterly VAT return';
COMMENT ON COLUMN expenses.business_percentage IS 'Percentage of expense that is business-related (vs private use)';
COMMENT ON COLUMN expenses.supplier_country_code IS 'Country code of supplier for VAT jurisdiction rules';
COMMENT ON COLUMN expenses.supplier_vat_number IS 'Supplier VAT number for reverse-charge validation';
COMMENT ON COLUMN expenses.is_reverse_charge IS 'Whether this expense uses reverse-charge VAT (BTW verlegd)';

-- Update existing expenses to have proper VAT calculation
-- Set standard Dutch VAT rate for existing expenses where appropriate
UPDATE expenses 
SET 
    vat_rate = 0.21,
    vat_amount = ROUND((amount * 0.21 * business_percentage / 100), 2),
    vat_type = 'standard',
    is_vat_deductible = true
WHERE vat_rate IS NULL OR vat_rate = 0;

-- Create index for VAT reporting queries
CREATE INDEX IF NOT EXISTS idx_expenses_vat_deductible ON expenses(tenant_id, is_vat_deductible, expense_date) WHERE is_vat_deductible = true;
CREATE INDEX IF NOT EXISTS idx_expenses_reverse_charge ON expenses(tenant_id, is_reverse_charge, expense_date) WHERE is_reverse_charge = true;
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_country ON expenses(tenant_id, supplier_country_code, expense_date);

-- Update RLS policies to include new VAT fields (inherit from existing tenant-based policies)
-- The existing RLS policies on expenses table will automatically apply to new columns

-- Create function to calculate VAT amount automatically
CREATE OR REPLACE FUNCTION calculate_expense_vat_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate VAT amount based on expense amount, VAT rate, and business percentage
    IF NEW.is_reverse_charge THEN
        NEW.vat_amount = 0;
        NEW.vat_rate = 0;
        NEW.vat_type = 'reverse_charge';
    ELSE
        NEW.vat_amount = ROUND((NEW.amount * NEW.vat_rate * NEW.business_percentage / 100), 2);
    END IF;
    
    -- Set VAT deductibility based on business percentage and VAT type
    IF NEW.business_percentage = 0 OR NEW.vat_type = 'exempt' THEN
        NEW.is_vat_deductible = false;
        NEW.vat_amount = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate VAT amounts
DROP TRIGGER IF EXISTS expense_vat_calculation_trigger ON expenses;
CREATE TRIGGER expense_vat_calculation_trigger
    BEFORE INSERT OR UPDATE OF amount, vat_rate, business_percentage, is_reverse_charge
    ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_vat_amount();

-- Update expense categories to include default VAT rates
-- This will be done in the next migration for Dutch fiscal categories