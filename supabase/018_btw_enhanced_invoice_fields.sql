-- Migration: Enhanced invoice fields for complete BTW compliance
-- Phase 2: Adds all missing fields needed for complete Dutch VAT form compliance
-- Generated with Claude Code (https://claude.ai/code)

-- Add new fields to invoices table for complete BTW support
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS export_type VARCHAR(20) CHECK (export_type IN ('eu_goods', 'eu_services', 'non_eu', 'domestic')) DEFAULT 'domestic',
ADD COLUMN IF NOT EXISTS reverse_charge_type VARCHAR(20) CHECK (reverse_charge_type IN ('domestic_goods', 'domestic_services', 'eu_acquisition', 'import')),
ADD COLUMN IF NOT EXISTS is_zero_rate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS oss_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS service_location_country CHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS customer_vat_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS customer_vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS place_of_supply_country CHAR(2) DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS transaction_nature VARCHAR(30) CHECK (transaction_nature IN ('goods', 'services', 'digital_services', 'mixed')),
ADD COLUMN IF NOT EXISTS btw_rubriek VARCHAR(10); -- Which BTW rubriek this invoice contributes to

-- Comments for clarity
COMMENT ON COLUMN invoices.export_type IS 'Type of export transaction for BTW classification';
COMMENT ON COLUMN invoices.reverse_charge_type IS 'Type of reverse charge mechanism applied';
COMMENT ON COLUMN invoices.is_zero_rate IS 'Whether this invoice is subject to 0% VAT rate (rubriek 1e)';
COMMENT ON COLUMN invoices.oss_applicable IS 'Whether this invoice falls under OSS (One Stop Shop) rules for EU B2C';
COMMENT ON COLUMN invoices.service_location_country IS 'Country where service is performed (place of supply rules)';
COMMENT ON COLUMN invoices.customer_vat_validated IS 'Whether customer VAT number was validated via VIES';
COMMENT ON COLUMN invoices.customer_vat_number IS 'Customer EU VAT number for B2B transactions';
COMMENT ON COLUMN invoices.place_of_supply_country IS 'Country where transaction is deemed to take place for VAT purposes';
COMMENT ON COLUMN invoices.transaction_nature IS 'Nature of transaction (goods, services, etc.)';
COMMENT ON COLUMN invoices.btw_rubriek IS 'BTW form rubriek where this invoice should be reported (1a, 1c, 1e, 3a, 3b, etc.)';

-- Create invoice line item VAT details table for granular VAT breakdown
CREATE TABLE IF NOT EXISTS invoice_item_vat_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_item_id UUID NOT NULL REFERENCES invoice_items(id) ON DELETE CASCADE,
    vat_rubriek VARCHAR(10) NOT NULL, -- '1a', '1b', '1c', '1d', '1e', '3a', '3b', etc.
    vat_calculation_type VARCHAR(20) NOT NULL CHECK (vat_calculation_type IN ('standard', 'reduced', 'zero', 'exempt', 'reverse_charge')),
    place_of_supply_country CHAR(2) DEFAULT 'NL',
    reverse_charge_applicable BOOLEAN DEFAULT FALSE,
    oss_country_specific_vat JSONB DEFAULT '{}', -- For OSS: country-specific VAT rates and amounts
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_export_type ON invoices(tenant_id, export_type) WHERE export_type != 'domestic';
CREATE INDEX IF NOT EXISTS idx_invoices_zero_rate ON invoices(tenant_id, is_zero_rate) WHERE is_zero_rate = true;
CREATE INDEX IF NOT EXISTS idx_invoices_oss ON invoices(tenant_id, oss_applicable) WHERE oss_applicable = true;
CREATE INDEX IF NOT EXISTS idx_invoices_btw_rubriek ON invoices(tenant_id, btw_rubriek);
CREATE INDEX IF NOT EXISTS idx_invoices_place_of_supply ON invoices(tenant_id, place_of_supply_country);

-- Index for VAT reporting queries
CREATE INDEX IF NOT EXISTS idx_invoice_vat_details_rubriek ON invoice_item_vat_details(vat_rubriek);

-- Update RLS policies for new tables
ALTER TABLE invoice_item_vat_details ENABLE ROW LEVEL SECURITY;

-- RLS policy for invoice VAT details (inherit from invoice permissions)
CREATE POLICY "Invoice VAT details follow invoice permissions" ON invoice_item_vat_details
    FOR ALL USING (
        invoice_item_id IN (
            SELECT ii.id FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.tenant_id = (SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
        )
    );

-- Function to automatically calculate BTW rubriek for invoices
CREATE OR REPLACE FUNCTION calculate_invoice_btw_rubriek()
RETURNS TRIGGER AS $$
BEGIN
    -- Determine BTW rubriek based on invoice characteristics
    IF NEW.is_zero_rate THEN
        NEW.btw_rubriek = '1e';
    ELSIF NEW.export_type = 'eu_services' OR NEW.export_type = 'eu_goods' THEN
        NEW.btw_rubriek = '3a'; -- EU B2B transactions
    ELSIF NEW.export_type = 'non_eu' THEN
        NEW.btw_rubriek = '3b'; -- Non-EU exports
    ELSIF NEW.reverse_charge_type IS NOT NULL THEN
        -- Domestic reverse charge transactions
        IF NEW.vat_rate = 0.21 THEN
            NEW.btw_rubriek = '2a';
        ELSIF NEW.vat_rate = 0.09 THEN
            NEW.btw_rubriek = '2b';
        END IF;
    ELSIF NEW.vat_rate = 0.21 THEN
        NEW.btw_rubriek = '1a'; -- Standard rate domestic
    ELSIF NEW.vat_rate = 0.09 THEN
        NEW.btw_rubriek = '1c'; -- Reduced rate domestic
    ELSE
        NEW.btw_rubriek = '1a'; -- Default to standard rate
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate BTW rubriek
DROP TRIGGER IF EXISTS calculate_invoice_btw_rubriek_trigger ON invoices;
CREATE TRIGGER calculate_invoice_btw_rubriek_trigger
    BEFORE INSERT OR UPDATE OF vat_rate, export_type, reverse_charge_type, is_zero_rate
    ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_btw_rubriek();

-- Update existing invoices to have proper BTW rubriek classification
UPDATE invoices SET 
    export_type = 'domestic',
    place_of_supply_country = 'NL',
    transaction_nature = 'services',
    btw_rubriek = CASE 
        WHEN vat_rate = 0.21 THEN '1a'
        WHEN vat_rate = 0.09 THEN '1c' 
        ELSE '1a'
    END
WHERE btw_rubriek IS NULL;