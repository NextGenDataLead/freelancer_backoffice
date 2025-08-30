-- Migration: CORRECTED BTW supporting tables for official Dutch VAT form compliance
-- Based on official Belastingdienst BTW form structure with proper rubriek mappings
-- Replaces incorrect 020_btw_supporting_tables.sql  
-- Generated with Claude Code (https://claude.ai/code)

-- =====================================================
-- QUARTERLY BTW FORM MASTER TABLE (OFFICIAL STRUCTURE)
-- =====================================================

-- Master table following exact official BTW form structure
CREATE TABLE IF NOT EXISTS quarterly_btw_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2099),
    quarter INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),
    
    -- Section 1: Prestaties binnenland (CORRECTED STRUCTURE)
    rubriek_1a_omzet NUMERIC(12,2) DEFAULT 0, -- High rate supplies revenue (~21%)
    rubriek_1a_btw NUMERIC(12,2) DEFAULT 0,   -- High rate supplies VAT 
    rubriek_1b_omzet NUMERIC(12,2) DEFAULT 0, -- Low rate supplies revenue (~9%)
    rubriek_1b_btw NUMERIC(12,2) DEFAULT 0,   -- Low rate supplies VAT
    rubriek_1c_omzet NUMERIC(12,2) DEFAULT 0, -- Other rate supplies revenue
    rubriek_1c_btw NUMERIC(12,2) DEFAULT 0,   -- Other rate supplies VAT
    rubriek_1d_btw NUMERIC(12,2) DEFAULT 0,   -- Private use corrections (year-end only)
    rubriek_1e_omzet NUMERIC(12,2) DEFAULT 0, -- Zero rate + outgoing reverse charge
    
    -- Section 2: Verleggingsregelingen binnenland (CORRECTED - ONLY 2a exists)
    rubriek_2a_omzet NUMERIC(12,2) DEFAULT 0, -- Customer receiving reverse charge revenue
    rubriek_2a_btw NUMERIC(12,2) DEFAULT 0,   -- Customer receiving reverse charge VAT
    
    -- Section 3: Prestaties naar/in het buitenland (CORRECTED MAPPINGS + 3c added)
    rubriek_3a_omzet NUMERIC(12,2) DEFAULT 0, -- Non-EU exports (was incorrectly 3b)
    rubriek_3b_omzet NUMERIC(12,2) DEFAULT 0, -- EU supplies (was incorrectly 3a) - MUST match ICP
    rubriek_3c_omzet NUMERIC(12,2) DEFAULT 0, -- EU installations/distance sales (was missing)
    
    -- Section 4: Prestaties vanuit het buitenland 
    rubriek_4a_omzet NUMERIC(12,2) DEFAULT 0, -- EU acquisitions revenue
    rubriek_4a_btw NUMERIC(12,2) DEFAULT 0,   -- EU acquisitions VAT owed
    rubriek_4b_omzet NUMERIC(12,2) DEFAULT 0, -- Import services revenue  
    rubriek_4b_btw NUMERIC(12,2) DEFAULT 0,   -- Import services VAT owed
    
    -- Section 5: BTW Berekening (CORRECTED OFFICIAL STRUCTURE - ONLY 5a and 5b)
    rubriek_5a_verschuldigde_btw NUMERIC(12,2) DEFAULT 0, -- Total output VAT (sum of 1a+1b+1c+1d+2a+4a+4b)
    rubriek_5b_voorbelasting NUMERIC(12,2) DEFAULT 0,     -- Total input VAT (from all deductible expenses)
    
    -- Additional fields for completeness
    invoerbtw_amount NUMERIC(12,2) DEFAULT 0, -- Import VAT paid at customs
    suppletie_correction NUMERIC(12,2) DEFAULT 0, -- Corrections from previous periods
    
    -- Final calculation (Rubriek 8 in most presentations)
    net_vat_payable NUMERIC(12,2) GENERATED ALWAYS AS (
        rubriek_5a_verschuldigde_btw - rubriek_5b_voorbelasting + suppletie_correction
    ) STORED,
    
    -- Form metadata and validation
    form_status VARCHAR(20) DEFAULT 'draft' CHECK (form_status IN ('draft', 'calculated', 'validated', 'submitted')),
    icp_total_validation NUMERIC(12,2), -- Must match rubriek_3b_omzet
    validation_passed BOOLEAN DEFAULT FALSE,
    validation_errors JSONB DEFAULT '[]',
    validation_warnings JSONB DEFAULT '[]',
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Unique constraint
    UNIQUE(tenant_id, year, quarter)
);

-- =====================================================
-- ICP DECLARATION TABLE (Enhanced for 3b validation)
-- =====================================================

-- ICP declarations with validation against BTW Section 3b
CREATE TABLE IF NOT EXISTS icp_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    
    -- Customer details
    customer_vat_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_country CHAR(2) NOT NULL,
    
    -- Transaction details
    net_amount NUMERIC(12,2) NOT NULL,
    transaction_type VARCHAR(10) DEFAULT '200', -- Service type code
    transaction_count INTEGER DEFAULT 1,
    
    -- Validation with BTW form
    matches_btw_3b BOOLEAN DEFAULT FALSE,
    btw_form_id UUID REFERENCES quarterly_btw_forms(id),
    
    -- Status tracking
    declaration_status VARCHAR(20) DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, year, quarter, customer_vat_number)
);

-- =====================================================
-- VAT RATE RULES (CORRECTED MAPPINGS)
-- =====================================================

-- VAT rate rules with CORRECTED rubriek mappings
CREATE TABLE IF NOT EXISTS vat_rate_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code CHAR(2) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    rate_type VARCHAR(20) NOT NULL,
    rate NUMERIC(5,4) NOT NULL,
    rubriek_mapping VARCHAR(10) NOT NULL, -- CORRECTED mappings
    effective_from DATE NOT NULL,
    effective_to DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_vat_rule UNIQUE(country_code, transaction_type, rate_type, effective_from)
);

-- =====================================================
-- TRADE TRANSACTIONS (For Section 4 calculations)
-- =====================================================

-- Import/Export tracking for Sections 3 and 4
CREATE TABLE IF NOT EXISTS international_trade_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Transaction classification
    transaction_direction VARCHAR(20) NOT NULL CHECK (transaction_direction IN ('export', 'import')),
    partner_country CHAR(2) NOT NULL,
    partner_vat_number VARCHAR(50),
    partner_name VARCHAR(200) NOT NULL,
    
    -- Transaction details
    net_amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    transaction_nature VARCHAR(30) CHECK (transaction_nature IN ('goods', 'services', 'digital_services')),
    
    -- BTW classification (CORRECTED)
    btw_section INTEGER NOT NULL CHECK (btw_section IN (3, 4)), -- Section 3 (exports) or 4 (imports)
    btw_rubriek VARCHAR(10) NOT NULL, -- 3a, 3b, 3c, 4a, 4b
    
    -- Additional metadata
    customs_declaration VARCHAR(50),
    document_reference VARCHAR(100),
    
    -- Links to source documents
    source_document_type VARCHAR(20) CHECK (source_document_type IN ('invoice', 'expense', 'manual')),
    source_document_id UUID,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_amount CHECK (net_amount > 0)
);

-- =====================================================
-- VAT CORRECTIONS AND ADJUSTMENTS
-- =====================================================

-- VAT corrections including suppletie
CREATE TABLE IF NOT EXISTS vat_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Correction details
    correction_type VARCHAR(30) NOT NULL CHECK (correction_type IN (
        'suppletie', 'error_correction', 'bad_debt', 'returned_goods', 
        'price_adjustment', 'private_use', 'investment_correction'
    )),
    
    -- Period affected
    original_period_year INTEGER NOT NULL,
    original_period_quarter INTEGER NOT NULL,
    correction_period_year INTEGER NOT NULL,
    correction_period_quarter INTEGER NOT NULL,
    
    -- Financial impact
    correction_amount NUMERIC(12,2) NOT NULL,
    affects_rubriek VARCHAR(10), -- Which rubriek is being corrected
    
    -- Documentation
    reason TEXT NOT NULL,
    supporting_documentation TEXT,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    
    -- Audit trail
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_correction CHECK (correction_amount != 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- BTW forms indexes
CREATE INDEX IF NOT EXISTS idx_btw_forms_tenant_period ON quarterly_btw_forms(tenant_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_btw_forms_status ON quarterly_btw_forms(tenant_id, form_status);
CREATE INDEX IF NOT EXISTS idx_btw_forms_3b_validation ON quarterly_btw_forms(tenant_id, rubriek_3b_omzet) WHERE rubriek_3b_omzet > 0;

-- ICP declarations indexes  
CREATE INDEX IF NOT EXISTS idx_icp_tenant_period ON icp_declarations(tenant_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_icp_customer_vat ON icp_declarations(tenant_id, customer_vat_number);
CREATE INDEX IF NOT EXISTS idx_icp_btw_validation ON icp_declarations(btw_form_id, matches_btw_3b);

-- VAT rate rules indexes
CREATE INDEX IF NOT EXISTS idx_vat_rates_lookup ON vat_rate_rules(country_code, transaction_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_vat_rates_active ON vat_rate_rules(country_code, transaction_type) WHERE effective_to IS NULL;

-- Trade transactions indexes
CREATE INDEX IF NOT EXISTS idx_trade_tenant_direction ON international_trade_transactions(tenant_id, transaction_direction, transaction_date);
CREATE INDEX IF NOT EXISTS idx_trade_btw_section ON international_trade_transactions(tenant_id, btw_section, btw_rubriek);
CREATE INDEX IF NOT EXISTS idx_trade_partner_country ON international_trade_transactions(tenant_id, partner_country);

-- VAT corrections indexes
CREATE INDEX IF NOT EXISTS idx_corrections_tenant_period ON vat_corrections(tenant_id, correction_period_year, correction_period_quarter);
CREATE INDEX IF NOT EXISTS idx_corrections_original_period ON vat_corrections(tenant_id, original_period_year, original_period_quarter);
CREATE INDEX IF NOT EXISTS idx_corrections_processed ON vat_corrections(tenant_id, processed);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE quarterly_btw_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_rate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_trade_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_corrections ENABLE ROW LEVEL SECURITY;

-- Helper function for tenant access
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub';
$$;

-- RLS policies
CREATE POLICY "BTW forms are tenant-isolated" ON quarterly_btw_forms
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "ICP declarations are tenant-isolated" ON icp_declarations
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "VAT rate rules are publicly readable" ON vat_rate_rules
    FOR SELECT USING (true);

CREATE POLICY "Trade transactions are tenant-isolated" ON international_trade_transactions
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "VAT corrections are tenant-isolated" ON vat_corrections
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- SEED DATA WITH CORRECTED MAPPINGS
-- =====================================================

-- Function to seed CORRECTED Dutch VAT rates
CREATE OR REPLACE FUNCTION seed_corrected_dutch_vat_rates()
RETURNS void AS $$
BEGIN
    INSERT INTO vat_rate_rules (country_code, transaction_type, rate_type, rate, rubriek_mapping, effective_from, description) VALUES
    -- Dutch domestic rates (CORRECTED)
    ('NL', 'goods', 'standard', 0.2100, '1a', '2019-01-01', 'Dutch standard VAT rate for goods'),
    ('NL', 'services', 'standard', 0.2100, '1a', '2019-01-01', 'Dutch standard VAT rate for services'),
    ('NL', 'goods', 'reduced', 0.0900, '1b', '2019-01-01', 'Dutch reduced VAT rate for goods'),
    ('NL', 'services', 'reduced', 0.0900, '1b', '2019-01-01', 'Dutch reduced VAT rate for services'),
    ('NL', 'goods', 'zero', 0.0000, '1e', '2019-01-01', 'Dutch zero VAT rate for goods'),
    ('NL', 'services', 'zero', 0.0000, '1e', '2019-01-01', 'Dutch zero VAT rate for services'),
    
    -- CORRECTED EU/International mappings
    ('EU', 'goods', 'b2b', 0.0000, '3b', '2019-01-01', 'EU B2B goods - goes to 3b (CORRECTED)'),
    ('EU', 'services', 'b2b', 0.0000, '3b', '2019-01-01', 'EU B2B services - goes to 3b (CORRECTED)'),
    ('EU', 'goods', 'acquisition', 0.0000, '4a', '2019-01-01', 'EU acquisitions - we purchase'),
    ('EU', 'services', 'acquisition', 0.0000, '4b', '2019-01-01', 'EU service acquisitions - we purchase'),
    
    -- Non-EU exports (CORRECTED mapping to 3a)
    ('XX', 'goods', 'export', 0.0000, '3a', '2019-01-01', 'Non-EU exports - goes to 3a (CORRECTED)'),
    ('XX', 'services', 'export', 0.0000, '3a', '2019-01-01', 'Non-EU service exports - goes to 3a (CORRECTED)')
    
    ON CONFLICT (country_code, transaction_type, rate_type, effective_from) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute corrected seeding
SELECT seed_corrected_dutch_vat_rates();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE quarterly_btw_forms IS 'Official Dutch BTW form structure following exact Belastingdienst layout';
COMMENT ON TABLE icp_declarations IS 'ICP declarations with validation against BTW Section 3b totals';
COMMENT ON TABLE vat_rate_rules IS 'VAT rates with CORRECTED rubriek mappings (3a/3b fixed)';
COMMENT ON TABLE international_trade_transactions IS 'Import/export tracking for BTW Sections 3 and 4';
COMMENT ON TABLE vat_corrections IS 'VAT corrections including suppletie adjustments';

-- Section-specific comments
COMMENT ON COLUMN quarterly_btw_forms.rubriek_3a_omzet IS 'Section 3a: Non-EU exports (CORRECTED from wrong 3b mapping)';
COMMENT ON COLUMN quarterly_btw_forms.rubriek_3b_omzet IS 'Section 3b: EU supplies (CORRECTED from wrong 3a mapping) - must match ICP total';
COMMENT ON COLUMN quarterly_btw_forms.rubriek_3c_omzet IS 'Section 3c: EU installations/distance sales (was missing in original implementation)';
COMMENT ON COLUMN quarterly_btw_forms.rubriek_5a_verschuldigde_btw IS 'Section 5a: Total output VAT owed (official form structure)';
COMMENT ON COLUMN quarterly_btw_forms.rubriek_5b_voorbelasting IS 'Section 5b: Total input VAT deductible (official form structure)';
COMMENT ON COLUMN quarterly_btw_forms.icp_total_validation IS 'Validation field - must equal rubriek_3b_omzet for form accuracy';