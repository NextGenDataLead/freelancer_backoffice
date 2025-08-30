-- Migration: Supporting tables for complete BTW compliance
-- Phase 2: Creates specialized tables for KOR, OSS, corrections, and trade tracking
-- Generated with Claude Code (https://claude.ai/code)

-- =====================================================
-- VAT RATE RULES AND HISTORICAL TRACKING
-- =====================================================

-- VAT rate history and rules for different countries and transaction types
CREATE TABLE IF NOT EXISTS vat_rate_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code CHAR(2) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL, -- 'goods', 'services', 'digital_services'
    rate_type VARCHAR(20) NOT NULL, -- 'standard', 'reduced', 'zero', 'exempt'
    rate NUMERIC(5,4) NOT NULL,
    rubriek_mapping VARCHAR(10) NOT NULL, -- Which BTW rubriek this maps to
    effective_from DATE NOT NULL,
    effective_to DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_vat_rule UNIQUE(country_code, transaction_type, rate_type, effective_from)
);

-- Index for efficient VAT rate lookups
CREATE INDEX IF NOT EXISTS idx_vat_rate_rules_lookup ON vat_rate_rules(country_code, transaction_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_vat_rate_rules_active ON vat_rate_rules(country_code, transaction_type) WHERE effective_to IS NULL;

-- =====================================================
-- IMPORT/EXPORT AND TRADE TRACKING
-- =====================================================

-- Import/Export transactions for rubriek 3b, 4a, 4b, and invoerbtw
CREATE TABLE IF NOT EXISTS trade_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('import', 'export', 'eu_acquisition', 'eu_supply')),
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'expense', 'customs_declaration')),
    document_id UUID NOT NULL,
    partner_country CHAR(2) NOT NULL,
    partner_vat_number VARCHAR(50),
    partner_name VARCHAR(200) NOT NULL,
    commodity_code VARCHAR(20), -- For goods classification
    net_amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    import_duty_amount NUMERIC(12,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    customs_declaration_number VARCHAR(50),
    incoterms VARCHAR(10), -- EXW, FOB, CIF, etc.
    btw_rubriek VARCHAR(10) NOT NULL, -- 3a, 3b, 4a, 4b, Inv
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_trade_amount CHECK (net_amount > 0)
);

-- Indexes for trade reporting
CREATE INDEX IF NOT EXISTS idx_trade_transactions_tenant ON trade_transactions(tenant_id, transaction_type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_country ON trade_transactions(tenant_id, partner_country, transaction_date);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_rubriek ON trade_transactions(tenant_id, btw_rubriek, transaction_date);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_customs ON trade_transactions(customs_declaration_number) WHERE customs_declaration_number IS NOT NULL;

-- =====================================================
-- VAT CORRECTIONS AND ADJUSTMENTS
-- =====================================================

-- VAT corrections for rubriek 5f, 5g and suppletie
CREATE TABLE IF NOT EXISTS vat_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    correction_type VARCHAR(30) NOT NULL CHECK (correction_type IN ('investment_goods', 'bad_debt', 'returned_goods', 'price_adjustment', 'error_correction', 'private_use', 'suppletie')),
    original_document_type VARCHAR(20) NOT NULL,
    original_document_id UUID NOT NULL,
    original_rubriek VARCHAR(10) NOT NULL,
    correction_rubriek VARCHAR(10) NOT NULL,
    correction_amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    correction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    correction_period VARCHAR(10), -- Quarter/year for suppletie (e.g., '2024-Q3')
    processed BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_correction_amount CHECK (correction_amount != 0)
);

-- Indexes for corrections tracking
CREATE INDEX IF NOT EXISTS idx_vat_corrections_tenant ON vat_corrections(tenant_id, correction_type, correction_date);
CREATE INDEX IF NOT EXISTS idx_vat_corrections_rubriek ON vat_corrections(tenant_id, correction_rubriek, processed);
CREATE INDEX IF NOT EXISTS idx_vat_corrections_period ON vat_corrections(tenant_id, correction_period) WHERE correction_period IS NOT NULL;

-- =====================================================
-- KOR (SMALL BUSINESS SCHEME) SETTINGS
-- =====================================================

-- KOR (Kleine Ondernemersregeling) settings and tracking
CREATE TABLE IF NOT EXISTS kor_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    annual_revenue_threshold NUMERIC(10,2) DEFAULT 20000, -- €20,000 threshold for 2024
    current_year_revenue NUMERIC(12,2) DEFAULT 0,
    previous_year_revenue NUMERIC(12,2) DEFAULT 0,
    qualification_check_date DATE DEFAULT CURRENT_DATE,
    automatic_monitoring BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_threshold CHECK (annual_revenue_threshold > 0),
    CONSTRAINT valid_revenue_amounts CHECK (current_year_revenue >= 0 AND previous_year_revenue >= 0)
);

-- KOR revenue tracking for threshold monitoring
CREATE TABLE IF NOT EXISTS kor_revenue_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter IN (1, 2, 3, 4)),
    quarterly_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
    cumulative_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
    threshold_exceeded BOOLEAN DEFAULT FALSE,
    threshold_exceeded_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_kor_tracking UNIQUE(tenant_id, year, quarter)
);

-- Indexes for KOR monitoring
CREATE INDEX IF NOT EXISTS idx_kor_revenue_tracking ON kor_revenue_tracking(tenant_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_kor_threshold_exceeded ON kor_revenue_tracking(tenant_id, threshold_exceeded) WHERE threshold_exceeded = true;

-- =====================================================
-- OSS (ONE STOP SHOP) TRANSACTIONS
-- =====================================================

-- OSS transactions for EU B2C digital services
CREATE TABLE IF NOT EXISTS oss_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    consumer_country CHAR(2) NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- 'digital_services', 'broadcasting', 'telecommunications'
    net_amount NUMERIC(12,2) NOT NULL,
    local_vat_rate NUMERIC(5,4) NOT NULL,
    local_vat_amount NUMERIC(12,2) NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),
    year INTEGER NOT NULL,
    reported BOOLEAN DEFAULT FALSE,
    report_date DATE,
    oss_identifier VARCHAR(50), -- OSS registration number
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_oss_amounts CHECK (net_amount > 0 AND local_vat_amount >= 0),
    CONSTRAINT valid_oss_period CHECK (year >= 2021) -- OSS started in 2021
);

-- Indexes for OSS reporting
CREATE INDEX IF NOT EXISTS idx_oss_transactions_tenant ON oss_transactions(tenant_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_oss_transactions_country ON oss_transactions(tenant_id, consumer_country, year, quarter);
CREATE INDEX IF NOT EXISTS idx_oss_transactions_reporting ON oss_transactions(tenant_id, reported, year, quarter);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE vat_rate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kor_revenue_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE oss_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function for tenant ID lookup (reuse existing if available)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tenant_id') THEN
        CREATE OR REPLACE FUNCTION get_user_tenant_id()
        RETURNS UUID
        LANGUAGE SQL
        SECURITY DEFINER
        AS 'SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> ''sub'';';
    END IF;
END $$;

-- RLS policies for tenant isolation
CREATE POLICY "VAT rate rules are publicly readable" ON vat_rate_rules FOR SELECT USING (true);

CREATE POLICY "Trade transactions are tenant-isolated" ON trade_transactions
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "VAT corrections are tenant-isolated" ON vat_corrections
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "KOR settings are tenant-isolated" ON kor_settings
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "KOR revenue tracking is tenant-isolated" ON kor_revenue_tracking
    FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "OSS transactions are tenant-isolated" ON oss_transactions
    FOR ALL USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- SEED DATA AND HELPER FUNCTIONS
-- =====================================================

-- Function to seed Dutch VAT rates
CREATE OR REPLACE FUNCTION seed_dutch_vat_rates()
RETURNS void AS $$
BEGIN
    INSERT INTO vat_rate_rules (country_code, transaction_type, rate_type, rate, rubriek_mapping, effective_from, description) VALUES
    -- Dutch standard rates
    ('NL', 'goods', 'standard', 0.2100, '1a', '2019-01-01', 'Dutch standard VAT rate for goods'),
    ('NL', 'services', 'standard', 0.2100, '1a', '2019-01-01', 'Dutch standard VAT rate for services'),
    ('NL', 'goods', 'reduced', 0.0900, '1c', '2019-01-01', 'Dutch reduced VAT rate for goods'),
    ('NL', 'services', 'reduced', 0.0900, '1c', '2019-01-01', 'Dutch reduced VAT rate for services'),
    ('NL', 'goods', 'zero', 0.0000, '1e', '2019-01-01', 'Dutch zero VAT rate for goods'),
    ('NL', 'services', 'zero', 0.0000, '1e', '2019-01-01', 'Dutch zero VAT rate for services'),
    
    -- EU B2B (reverse charge)
    ('EU', 'goods', 'reverse_charge', 0.0000, '3a', '2019-01-01', 'EU B2B goods - reverse charge'),
    ('EU', 'services', 'reverse_charge', 0.0000, '3a', '2019-01-01', 'EU B2B services - reverse charge'),
    
    -- Non-EU exports
    ('XX', 'goods', 'export', 0.0000, '3b', '2019-01-01', 'Non-EU exports'),
    ('XX', 'services', 'export', 0.0000, '3b', '2019-01-01', 'Non-EU services')
    
    ON CONFLICT (country_code, transaction_type, rate_type, effective_from) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize KOR settings for a tenant
CREATE OR REPLACE FUNCTION initialize_kor_settings(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO kor_settings (tenant_id, enabled, annual_revenue_threshold, automatic_monitoring)
    VALUES (p_tenant_id, false, 20000.00, true)
    ON CONFLICT (tenant_id) DO NOTHING;
    
    -- Initialize current year tracking
    INSERT INTO kor_revenue_tracking (tenant_id, year, quarter, quarterly_revenue, cumulative_revenue)
    SELECT p_tenant_id, EXTRACT(year FROM CURRENT_DATE)::integer, generate_series(1, 4), 0, 0
    ON CONFLICT (tenant_id, year, quarter) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed the Dutch VAT rates
SELECT seed_dutch_vat_rates();

-- Add comments for documentation
COMMENT ON TABLE trade_transactions IS 'Tracks import/export transactions for BTW rubrieken 3a, 3b, 4a, 4b';
COMMENT ON TABLE vat_corrections IS 'VAT corrections and adjustments for rubrieken 5f, 5g, and suppletie';
COMMENT ON TABLE kor_settings IS 'KOR (Small Business Scheme) settings and revenue monitoring';
COMMENT ON TABLE oss_transactions IS 'One Stop Shop transactions for EU B2C digital services';
COMMENT ON TABLE vat_rate_rules IS 'Historical VAT rates by country and transaction type for automated rubriek classification';