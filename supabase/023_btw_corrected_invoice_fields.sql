-- Migration: CORRECTED BTW invoice fields for official Dutch VAT form compliance
-- Based on official Belastingdienst BTW form structure verification
-- Replaces incorrect 018_btw_enhanced_invoice_fields.sql
-- Generated with Claude Code (https://claude.ai/code)

-- Add CORRECTED BTW fields to invoices table following official form structure
ALTER TABLE invoices 
-- Section 1: Prestaties binnenland (CORRECTED - each rubriek has omzet + btw)
ADD COLUMN IF NOT EXISTS rubriek_1a_omzet NUMERIC(12,2) DEFAULT 0, -- High rate supplies - revenue
ADD COLUMN IF NOT EXISTS rubriek_1a_btw NUMERIC(12,2) DEFAULT 0,   -- High rate supplies - VAT (~21%)
ADD COLUMN IF NOT EXISTS rubriek_1b_omzet NUMERIC(12,2) DEFAULT 0, -- Low rate supplies - revenue  
ADD COLUMN IF NOT EXISTS rubriek_1b_btw NUMERIC(12,2) DEFAULT 0,   -- Low rate supplies - VAT (~9%)
ADD COLUMN IF NOT EXISTS rubriek_1c_omzet NUMERIC(12,2) DEFAULT 0, -- Other rate supplies - revenue
ADD COLUMN IF NOT EXISTS rubriek_1c_btw NUMERIC(12,2) DEFAULT 0,   -- Other rate supplies - VAT
ADD COLUMN IF NOT EXISTS rubriek_1e_omzet NUMERIC(12,2) DEFAULT 0, -- Zero rate + reverse charge outgoing

-- Section 2: Verleggingsregelingen binnenland (CORRECTED - only 2a exists)
ADD COLUMN IF NOT EXISTS rubriek_2a_omzet NUMERIC(12,2) DEFAULT 0, -- Customer receiving reverse charge - revenue
ADD COLUMN IF NOT EXISTS rubriek_2a_btw NUMERIC(12,2) DEFAULT 0,   -- Customer receiving reverse charge - VAT

-- Section 3: Prestaties naar/in het buitenland (CORRECTED with proper mapping + 3c)
ADD COLUMN IF NOT EXISTS rubriek_3a_omzet NUMERIC(12,2) DEFAULT 0, -- Non-EU exports (was incorrectly 3b)
ADD COLUMN IF NOT EXISTS rubriek_3b_omzet NUMERIC(12,2) DEFAULT 0, -- EU supplies (was incorrectly 3a) - MUST match ICP
ADD COLUMN IF NOT EXISTS rubriek_3c_omzet NUMERIC(12,2) DEFAULT 0, -- EU installations/distance sales (was missing)

-- Enhanced metadata fields for proper classification
ADD COLUMN IF NOT EXISTS export_classification VARCHAR(30) CHECK (export_classification IN ('domestic', 'eu_b2b', 'eu_installation', 'non_eu_export')) DEFAULT 'domestic',
ADD COLUMN IF NOT EXISTS reverse_charge_direction VARCHAR(20) CHECK (reverse_charge_direction IN ('outgoing_1e', 'incoming_2a')),
ADD COLUMN IF NOT EXISTS place_of_supply_country CHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS customer_vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS customer_vat_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transaction_nature VARCHAR(30) CHECK (transaction_nature IN ('goods', 'services', 'digital_services', 'installation')) DEFAULT 'services',
ADD COLUMN IF NOT EXISTS btw_calculation_method VARCHAR(20) DEFAULT 'standard';

-- Comments for clarity on CORRECTED structure
COMMENT ON COLUMN invoices.rubriek_1a_omzet IS 'Section 1a: High rate supplies revenue (~21% VAT rate)';
COMMENT ON COLUMN invoices.rubriek_1a_btw IS 'Section 1a: High rate supplies VAT amount (~21% VAT rate)';
COMMENT ON COLUMN invoices.rubriek_1b_omzet IS 'Section 1b: Low rate supplies revenue (~9% VAT rate)';
COMMENT ON COLUMN invoices.rubriek_1b_btw IS 'Section 1b: Low rate supplies VAT amount (~9% VAT rate)';
COMMENT ON COLUMN invoices.rubriek_1c_omzet IS 'Section 1c: Other rate supplies revenue (e.g. 13% sportkantine)';
COMMENT ON COLUMN invoices.rubriek_1c_btw IS 'Section 1c: Other rate supplies VAT amount';
COMMENT ON COLUMN invoices.rubriek_1e_omzet IS 'Section 1e: Zero rate supplies + outgoing reverse charge revenue';
COMMENT ON COLUMN invoices.rubriek_2a_omzet IS 'Section 2a: Domestic reverse charge to customer revenue';
COMMENT ON COLUMN invoices.rubriek_2a_btw IS 'Section 2a: Domestic reverse charge to customer VAT';
COMMENT ON COLUMN invoices.rubriek_3a_omzet IS 'Section 3a: Non-EU exports (CORRECTED from wrong mapping)';
COMMENT ON COLUMN invoices.rubriek_3b_omzet IS 'Section 3b: EU B2B supplies (CORRECTED from wrong mapping) - must match ICP total';
COMMENT ON COLUMN invoices.rubriek_3c_omzet IS 'Section 3c: EU installations/distance sales (was missing in original)';

-- Create invoice BTW classification table for audit trail
CREATE TABLE IF NOT EXISTS invoice_btw_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    classification_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Original classification inputs
    vat_rate NUMERIC(5,4),
    customer_country CHAR(2),
    transaction_type VARCHAR(30),
    
    -- Calculated BTW rubriek assignments
    assigned_rubriek VARCHAR(10) NOT NULL,
    revenue_amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Validation flags
    requires_vat_number BOOLEAN DEFAULT FALSE,
    requires_icp_declaration BOOLEAN DEFAULT FALSE,
    
    -- Audit trail
    calculation_method VARCHAR(50),
    classification_notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_btw_1a ON invoices(tenant_id, rubriek_1a_omzet) WHERE rubriek_1a_omzet > 0;
CREATE INDEX IF NOT EXISTS idx_invoices_btw_1b ON invoices(tenant_id, rubriek_1b_omzet) WHERE rubriek_1b_omzet > 0;
CREATE INDEX IF NOT EXISTS idx_invoices_btw_3b ON invoices(tenant_id, rubriek_3b_omzet) WHERE rubriek_3b_omzet > 0; -- For ICP validation
CREATE INDEX IF NOT EXISTS idx_invoices_export_class ON invoices(tenant_id, export_classification, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_vat ON invoices(tenant_id, customer_vat_number) WHERE customer_vat_number IS NOT NULL;

-- Index for BTW classification audit
CREATE INDEX IF NOT EXISTS idx_btw_classification_rubriek ON invoice_btw_classification(assigned_rubriek, classification_date);

-- Update RLS policies for new table
ALTER TABLE invoice_btw_classification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoice BTW classification follows invoice permissions" ON invoice_btw_classification
    FOR ALL USING (
        invoice_id IN (
            SELECT id FROM invoices i
            WHERE i.tenant_id = (SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
        )
    );

-- CORRECTED function to calculate BTW rubriek assignments
CREATE OR REPLACE FUNCTION calculate_corrected_invoice_btw_rubriek()
RETURNS TRIGGER AS $$
DECLARE
    calculated_rubriek VARCHAR(10);
    revenue_amount NUMERIC(12,2) := NEW.subtotal;
    vat_amount NUMERIC(12,2) := NEW.vat_amount;
BEGIN
    -- Reset all rubriek fields first
    NEW.rubriek_1a_omzet := 0; NEW.rubriek_1a_btw := 0;
    NEW.rubriek_1b_omzet := 0; NEW.rubriek_1b_btw := 0;
    NEW.rubriek_1c_omzet := 0; NEW.rubriek_1c_btw := 0;
    NEW.rubriek_1e_omzet := 0;
    NEW.rubriek_2a_omzet := 0; NEW.rubriek_2a_btw := 0;
    NEW.rubriek_3a_omzet := 0;
    NEW.rubriek_3b_omzet := 0;
    NEW.rubriek_3c_omzet := 0;
    
    -- Classify based on export classification and transaction details
    CASE 
        -- Non-EU exports (CORRECTED: was mapped to 3b incorrectly)
        WHEN NEW.export_classification = 'non_eu_export' THEN
            NEW.rubriek_3a_omzet := revenue_amount;
            calculated_rubriek := '3a';
            
        -- EU B2B supplies (CORRECTED: was mapped to 3a incorrectly) 
        WHEN NEW.export_classification = 'eu_b2b' THEN
            NEW.rubriek_3b_omzet := revenue_amount;
            calculated_rubriek := '3b';
            
        -- EU installations/distance sales (NEW: was missing)
        WHEN NEW.export_classification = 'eu_installation' THEN
            NEW.rubriek_3c_omzet := revenue_amount;
            calculated_rubriek := '3c';
            
        -- Domestic reverse charge outgoing (part of 1e)
        WHEN NEW.reverse_charge_direction = 'outgoing_1e' THEN
            NEW.rubriek_1e_omzet := revenue_amount;
            calculated_rubriek := '1e';
            
        -- Domestic reverse charge incoming (customer receives)
        WHEN NEW.reverse_charge_direction = 'incoming_2a' THEN
            NEW.rubriek_2a_omzet := revenue_amount;
            NEW.rubriek_2a_btw := vat_amount;
            calculated_rubriek := '2a';
            
        -- Domestic supplies with VAT (CORRECTED: proper 1a/1b/1c structure)
        WHEN NEW.export_classification = 'domestic' THEN
            CASE 
                WHEN NEW.vat_rate BETWEEN 0.20 AND 0.22 THEN -- ~21% standard rate
                    NEW.rubriek_1a_omzet := revenue_amount;
                    NEW.rubriek_1a_btw := vat_amount;
                    calculated_rubriek := '1a';
                WHEN NEW.vat_rate BETWEEN 0.08 AND 0.10 THEN -- ~9% reduced rate  
                    NEW.rubriek_1b_omzet := revenue_amount;
                    NEW.rubriek_1b_btw := vat_amount;
                    calculated_rubriek := '1b';
                WHEN NEW.vat_rate BETWEEN 0.12 AND 0.14 THEN -- ~13% other rate (e.g. sportkantine)
                    NEW.rubriek_1c_omzet := revenue_amount;
                    NEW.rubriek_1c_btw := vat_amount;
                    calculated_rubriek := '1c';
                WHEN NEW.vat_rate = 0 THEN -- Zero rate domestic
                    NEW.rubriek_1e_omzet := revenue_amount;
                    calculated_rubriek := '1e';
                ELSE -- Fallback to standard rate
                    NEW.rubriek_1a_omzet := revenue_amount;
                    NEW.rubriek_1a_btw := vat_amount;
                    calculated_rubriek := '1a';
            END CASE;
            
        ELSE 
            -- Default fallback
            NEW.rubriek_1a_omzet := revenue_amount;
            NEW.rubriek_1a_btw := vat_amount;
            calculated_rubriek := '1a';
    END CASE;
    
    -- Create classification audit record
    INSERT INTO invoice_btw_classification (
        invoice_id,
        vat_rate,
        customer_country,
        transaction_type,
        assigned_rubriek,
        revenue_amount,
        vat_amount,
        requires_vat_number,
        requires_icp_declaration,
        calculation_method
    ) VALUES (
        NEW.id,
        NEW.vat_rate,
        NEW.place_of_supply_country,
        NEW.transaction_nature,
        calculated_rubriek,
        revenue_amount,
        vat_amount,
        (NEW.export_classification IN ('eu_b2b', 'eu_installation')),
        (calculated_rubriek = '3b'), -- 3b requires ICP declaration
        'automated_classification_v2'
    ) ON CONFLICT (invoice_id) DO UPDATE SET
        assigned_rubriek = EXCLUDED.assigned_rubriek,
        revenue_amount = EXCLUDED.revenue_amount,
        vat_amount = EXCLUDED.vat_amount,
        classification_date = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create CORRECTED trigger
DROP TRIGGER IF EXISTS calculate_invoice_btw_rubriek_trigger ON invoices;
CREATE TRIGGER calculate_corrected_invoice_btw_rubriek_trigger
    BEFORE INSERT OR UPDATE OF vat_rate, export_classification, reverse_charge_direction, subtotal, vat_amount
    ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_corrected_invoice_btw_rubriek();

-- Update existing invoices with corrected structure
UPDATE invoices SET 
    export_classification = CASE
        WHEN place_of_supply_country = 'NL' THEN 'domestic'
        WHEN place_of_supply_country IN ('BE', 'DE', 'FR', 'ES', 'IT', 'PL', 'SE', 'DK', 'FI', 'AT', 'PT', 'IE', 'LU', 'EE', 'LV', 'LT', 'SI', 'SK', 'CZ', 'HU', 'RO', 'BG', 'HR', 'CY', 'MT', 'GR') THEN 'eu_b2b'
        ELSE 'non_eu_export'
    END,
    place_of_supply_country = COALESCE(place_of_supply_country, 'NL'),
    transaction_nature = COALESCE(transaction_nature, 'services'),
    btw_calculation_method = 'migrated_corrected'
WHERE export_classification IS NULL;