-- Migration: CORRECTED BTW reporting views and functions for official Dutch VAT form
-- Based on official Belastingdienst BTW form structure with proper calculations
-- Replaces incorrect 021_btw_reporting_views.sql
-- Generated with Claude Code (https://claude.ai/code)

-- =====================================================
-- MASTER BTW FORM CALCULATION VIEW (CORRECTED)
-- =====================================================

-- Complete BTW form calculation with CORRECTED rubriek structure
CREATE OR REPLACE VIEW btw_form_calculation AS
WITH invoice_totals AS (
    SELECT 
        i.tenant_id,
        EXTRACT(year FROM i.invoice_date) as year,
        EXTRACT(quarter FROM i.invoice_date) as quarter,
        
        -- Section 1: Prestaties binnenland (CORRECTED - sum from individual rubriek fields)
        SUM(i.rubriek_1a_omzet) as section_1a_omzet,
        SUM(i.rubriek_1a_btw) as section_1a_btw,
        SUM(i.rubriek_1b_omzet) as section_1b_omzet,
        SUM(i.rubriek_1b_btw) as section_1b_btw,
        SUM(i.rubriek_1c_omzet) as section_1c_omzet,
        SUM(i.rubriek_1c_btw) as section_1c_btw,
        SUM(i.rubriek_1e_omzet) as section_1e_omzet,
        
        -- Section 2: Verleggingsregelingen binnenland (CORRECTED - only 2a)
        SUM(i.rubriek_2a_omzet) as section_2a_omzet,
        SUM(i.rubriek_2a_btw) as section_2a_btw,
        
        -- Section 3: Prestaties naar/in het buitenland (CORRECTED mappings + 3c)
        SUM(i.rubriek_3a_omzet) as section_3a_omzet, -- Non-EU exports (CORRECTED)
        SUM(i.rubriek_3b_omzet) as section_3b_omzet, -- EU supplies (CORRECTED)
        SUM(i.rubriek_3c_omzet) as section_3c_omzet  -- EU installations (NEW)
        
    FROM invoices i
    WHERE i.status NOT IN ('draft', 'cancelled')
    GROUP BY i.tenant_id, EXTRACT(year FROM i.invoice_date), EXTRACT(quarter FROM i.invoice_date)
),
expense_totals AS (
    SELECT 
        e.tenant_id,
        EXTRACT(year FROM e.expense_date) as year,
        EXTRACT(quarter FROM e.expense_date) as quarter,
        
        -- Section 5b: Total deductible input VAT (CORRECTED - simplified aggregation)
        SUM(e.section_5b_voorbelasting) as section_5b_total,
        
        -- Additional breakdowns for analysis
        SUM(CASE WHEN e.acquisition_type = 'domestic' THEN e.section_5b_voorbelasting ELSE 0 END) as domestic_input_vat,
        SUM(CASE WHEN e.acquisition_type IN ('eu_goods', 'eu_services') THEN e.reverse_charge_deductible ELSE 0 END) as eu_acquisition_input_vat,
        SUM(CASE WHEN e.acquisition_type IN ('import_goods', 'import_services') THEN e.section_5b_voorbelasting ELSE 0 END) as import_input_vat
        
    FROM expenses e
    WHERE e.status NOT IN ('draft', 'cancelled')
      AND e.is_vat_deductible = true
    GROUP BY e.tenant_id, EXTRACT(year FROM e.expense_date), EXTRACT(quarter FROM e.expense_date)
),
trade_totals AS (
    SELECT 
        t.tenant_id,
        EXTRACT(year FROM t.transaction_date) as year,
        EXTRACT(quarter FROM t.transaction_date) as quarter,
        
        -- Section 4: Prestaties vanuit het buitenland
        SUM(CASE WHEN t.btw_rubriek = '4a' THEN t.net_amount ELSE 0 END) as section_4a_omzet,
        SUM(CASE WHEN t.btw_rubriek = '4a' THEN t.vat_amount ELSE 0 END) as section_4a_btw,
        SUM(CASE WHEN t.btw_rubriek = '4b' THEN t.net_amount ELSE 0 END) as section_4b_omzet,
        SUM(CASE WHEN t.btw_rubriek = '4b' THEN t.vat_amount ELSE 0 END) as section_4b_btw
        
    FROM international_trade_transactions t
    WHERE t.btw_section = 4 -- Imports
    GROUP BY t.tenant_id, EXTRACT(year FROM t.transaction_date), EXTRACT(quarter FROM t.transaction_date)
),
corrections_totals AS (
    SELECT 
        c.tenant_id,
        c.correction_period_year as year,
        c.correction_period_quarter as quarter,
        
        SUM(c.correction_amount) as total_corrections
        
    FROM vat_corrections c
    WHERE c.processed = true
    GROUP BY c.tenant_id, c.correction_period_year, c.correction_period_quarter
)
SELECT 
    COALESCE(inv.tenant_id, exp.tenant_id, tr.tenant_id, corr.tenant_id) as tenant_id,
    COALESCE(inv.year, exp.year, tr.year, corr.year) as year,
    COALESCE(inv.quarter, exp.quarter, tr.quarter, corr.quarter) as quarter,
    
    -- Section 1: Prestaties binnenland (CORRECTED STRUCTURE)
    COALESCE(inv.section_1a_omzet, 0) as rubriek_1a_omzet,
    COALESCE(inv.section_1a_btw, 0) as rubriek_1a_btw,
    COALESCE(inv.section_1b_omzet, 0) as rubriek_1b_omzet,
    COALESCE(inv.section_1b_btw, 0) as rubriek_1b_btw,
    COALESCE(inv.section_1c_omzet, 0) as rubriek_1c_omzet,
    COALESCE(inv.section_1c_btw, 0) as rubriek_1c_btw,
    0 as rubriek_1d_btw, -- Private use corrections (typically year-end only)
    COALESCE(inv.section_1e_omzet, 0) as rubriek_1e_omzet,
    
    -- Section 2: Verleggingsregelingen binnenland (CORRECTED - only 2a)
    COALESCE(inv.section_2a_omzet, 0) as rubriek_2a_omzet,
    COALESCE(inv.section_2a_btw, 0) as rubriek_2a_btw,
    
    -- Section 3: Prestaties naar/in het buitenland (CORRECTED MAPPINGS)
    COALESCE(inv.section_3a_omzet, 0) as rubriek_3a_omzet, -- Non-EU exports (CORRECTED)
    COALESCE(inv.section_3b_omzet, 0) as rubriek_3b_omzet, -- EU supplies (CORRECTED)  
    COALESCE(inv.section_3c_omzet, 0) as rubriek_3c_omzet, -- EU installations (NEW)
    
    -- Section 4: Prestaties vanuit het buitenland
    COALESCE(tr.section_4a_omzet, 0) as rubriek_4a_omzet,
    COALESCE(tr.section_4a_btw, 0) as rubriek_4a_btw,
    COALESCE(tr.section_4b_omzet, 0) as rubriek_4b_omzet,
    COALESCE(tr.section_4b_btw, 0) as rubriek_4b_btw,
    
    -- Section 5: BTW Berekening (CORRECTED OFFICIAL STRUCTURE)
    (COALESCE(inv.section_1a_btw, 0) + COALESCE(inv.section_1b_btw, 0) + COALESCE(inv.section_1c_btw, 0) + 
     COALESCE(inv.section_2a_btw, 0) + COALESCE(tr.section_4a_btw, 0) + COALESCE(tr.section_4b_btw, 0)) as rubriek_5a_verschuldigde_btw,
    COALESCE(exp.section_5b_total, 0) as rubriek_5b_voorbelasting,
    
    -- Additional corrections
    COALESCE(corr.total_corrections, 0) as suppletie_corrections,
    
    -- Final calculation 
    (COALESCE(inv.section_1a_btw, 0) + COALESCE(inv.section_1b_btw, 0) + COALESCE(inv.section_1c_btw, 0) + 
     COALESCE(inv.section_2a_btw, 0) + COALESCE(tr.section_4a_btw, 0) + COALESCE(tr.section_4b_btw, 0)) -
    COALESCE(exp.section_5b_total, 0) + COALESCE(corr.total_corrections, 0) as net_vat_payable,
    
    -- Breakdown for analysis
    COALESCE(exp.domestic_input_vat, 0) as domestic_input_vat_detail,
    COALESCE(exp.eu_acquisition_input_vat, 0) as eu_acquisition_input_vat_detail,
    COALESCE(exp.import_input_vat, 0) as import_input_vat_detail

FROM invoice_totals inv
FULL OUTER JOIN expense_totals exp USING (tenant_id, year, quarter)
FULL OUTER JOIN trade_totals tr USING (tenant_id, year, quarter)
FULL OUTER JOIN corrections_totals corr USING (tenant_id, year, quarter);

-- =====================================================
-- ICP VALIDATION VIEW (CORRECTED for 3b validation)
-- =====================================================

-- Enhanced ICP view with CORRECTED BTW Section 3b validation
CREATE OR REPLACE VIEW icp_btw_validation AS
WITH icp_totals AS (
    SELECT 
        icp.tenant_id,
        icp.year,
        icp.quarter,
        SUM(icp.net_amount) as total_icp_amount,
        COUNT(*) as total_icp_transactions,
        COUNT(DISTINCT icp.customer_country) as countries_count
    FROM icp_declarations icp
    GROUP BY icp.tenant_id, icp.year, icp.quarter
),
btw_3b_totals AS (
    SELECT 
        bf.tenant_id,
        bf.year,
        bf.quarter,
        bf.rubriek_3b_omzet as btw_3b_amount
    FROM btw_form_calculation bf
    WHERE bf.rubriek_3b_omzet > 0
)
SELECT 
    COALESCE(icp.tenant_id, btw.tenant_id) as tenant_id,
    COALESCE(icp.year, btw.year) as year,
    COALESCE(icp.quarter, btw.quarter) as quarter,
    
    -- ICP totals
    COALESCE(icp.total_icp_amount, 0) as icp_total,
    COALESCE(icp.total_icp_transactions, 0) as icp_transaction_count,
    COALESCE(icp.countries_count, 0) as icp_countries,
    
    -- BTW 3b totals (CORRECTED - now properly matches EU supplies)
    COALESCE(btw.btw_3b_amount, 0) as btw_3b_total,
    
    -- Validation results
    ABS(COALESCE(icp.total_icp_amount, 0) - COALESCE(btw.btw_3b_amount, 0)) <= 0.01 as amounts_match,
    ABS(COALESCE(icp.total_icp_amount, 0) - COALESCE(btw.btw_3b_amount, 0)) as difference,
    
    -- Status flags
    (COALESCE(icp.total_icp_amount, 0) > 0 AND COALESCE(btw.btw_3b_amount, 0) = 0) as icp_without_btw,
    (COALESCE(btw.btw_3b_amount, 0) > 0 AND COALESCE(icp.total_icp_amount, 0) = 0) as btw_without_icp,
    (COALESCE(icp.total_icp_amount, 0) > 0 AND COALESCE(btw.btw_3b_amount, 0) > 0) as both_present

FROM icp_totals icp
FULL OUTER JOIN btw_3b_totals btw USING (tenant_id, year, quarter);

-- =====================================================
-- BTW FORM VALIDATION FUNCTION (CORRECTED)
-- =====================================================

-- Comprehensive validation function using CORRECTED structure
CREATE OR REPLACE FUNCTION validate_corrected_btw_form(
    p_tenant_id UUID,
    p_year INTEGER,
    p_quarter INTEGER
)
RETURNS jsonb AS $$
DECLARE
    btw_data RECORD;
    icp_validation RECORD;
    validation_result jsonb := '{}';
    issues text[] := '{}';
    warnings text[] := '{}';
    info_items text[] := '{}';
BEGIN
    -- Get BTW form data
    SELECT * INTO btw_data
    FROM btw_form_calculation bf
    WHERE bf.tenant_id = p_tenant_id
      AND bf.year = p_year
      AND bf.quarter = p_quarter;
      
    -- Get ICP validation data
    SELECT * INTO icp_validation
    FROM icp_btw_validation iv
    WHERE iv.tenant_id = p_tenant_id
      AND iv.year = p_year
      AND iv.quarter = p_quarter;
    
    IF btw_data IS NULL THEN
        issues := issues || ARRAY['No BTW data found for specified period'];
        RETURN jsonb_build_object('valid', false, 'issues', issues);
    END IF;
    
    -- CRITICAL VALIDATION: ICP vs BTW 3b consistency (CORRECTED validation)
    IF btw_data.rubriek_3b_omzet > 0 THEN
        IF icp_validation IS NULL OR icp_validation.icp_total = 0 THEN
            issues := issues || ARRAY['BTW rubriek 3b has EU supplies but no ICP declaration found'];
        ELSIF NOT icp_validation.amounts_match THEN
            issues := issues || ARRAY[format('ICP total (%s) does not match BTW rubriek 3b (%s) - difference: %s',
                icp_validation.icp_total::text,
                btw_data.rubriek_3b_omzet::text,
                icp_validation.difference::text)];
        ELSE
            info_items := info_items || ARRAY['ICP and BTW rubriek 3b amounts match correctly'];
        END IF;
    END IF;
    
    -- Validation: Check rubriek calculations
    DECLARE
        calculated_5a NUMERIC(12,2);
        reported_5a NUMERIC(12,2) := btw_data.rubriek_5a_verschuldigde_btw;
    BEGIN
        calculated_5a := btw_data.rubriek_1a_btw + btw_data.rubriek_1b_btw + btw_data.rubriek_1c_btw +
                        btw_data.rubriek_2a_btw + btw_data.rubriek_4a_btw + btw_data.rubriek_4b_btw;
        
        IF ABS(calculated_5a - reported_5a) > 0.01 THEN
            issues := issues || ARRAY[format('Section 5a calculation error: calculated %s, reported %s',
                calculated_5a::text, reported_5a::text)];
        END IF;
    END;
    
    -- Validation: Zero amounts check
    IF btw_data.rubriek_5a_verschuldigde_btw = 0 AND btw_data.rubriek_5b_voorbelasting = 0 THEN
        warnings := warnings || ARRAY['Both output VAT (5a) and input VAT (5b) are zero - verify this is correct'];
    END IF;
    
    -- Validation: EU transactions require VAT numbers
    IF btw_data.rubriek_3b_omzet > 0 THEN
        IF EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.tenant_id = p_tenant_id
              AND i.export_classification = 'eu_b2b'
              AND EXTRACT(year FROM i.invoice_date) = p_year
              AND EXTRACT(quarter FROM i.invoice_date) = p_quarter
              AND (i.customer_vat_number IS NULL OR LENGTH(i.customer_vat_number) < 9)
        ) THEN
            warnings := warnings || ARRAY['Some EU B2B invoices (rubriek 3b) are missing valid VAT numbers'];
        END IF;
    END IF;
    
    -- Validation: Negative amounts
    IF btw_data.net_vat_payable < 0 THEN
        info_items := info_items || ARRAY[format('VAT refund due: %s (negative net payable)', 
            ABS(btw_data.net_vat_payable)::text)];
    END IF;
    
    -- Large correction warnings
    IF btw_data.suppletie_corrections != 0 THEN
        IF ABS(btw_data.suppletie_corrections) > 1000 THEN
            warnings := warnings || ARRAY[format('Large suppletie correction: %s - verify accuracy', 
                btw_data.suppletie_corrections::text)];
        ELSE
            info_items := info_items || ARRAY['Suppletie corrections included in calculation'];
        END IF;
    END IF;
    
    -- Build final validation result
    validation_result := jsonb_build_object(
        'valid', array_length(issues, 1) IS NULL,
        'issues', issues,
        'warnings', warnings,
        'info', info_items,
        'validated_at', NOW(),
        'period', jsonb_build_object('year', p_year, 'quarter', p_quarter),
        'btw_summary', jsonb_build_object(
            'rubriek_5a_verschuldigde_btw', btw_data.rubriek_5a_verschuldigde_btw,
            'rubriek_5b_voorbelasting', btw_data.rubriek_5b_voorbelasting,
            'net_vat_payable', btw_data.net_vat_payable,
            'rubriek_3b_omzet', btw_data.rubriek_3b_omzet
        ),
        'icp_validation', CASE 
            WHEN icp_validation IS NOT NULL THEN jsonb_build_object(
                'icp_total', icp_validation.icp_total,
                'btw_3b_total', icp_validation.btw_3b_total,
                'amounts_match', icp_validation.amounts_match,
                'difference', icp_validation.difference
            )
            ELSE NULL
        END
    );
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CORRECTED BTW FORM GENERATION FUNCTION
-- =====================================================

-- Generate complete BTW form JSON with CORRECTED structure
CREATE OR REPLACE FUNCTION generate_corrected_btw_form(
    p_tenant_id UUID,
    p_year INTEGER,
    p_quarter INTEGER
)
RETURNS jsonb AS $$
DECLARE
    form_data RECORD;
    validation_result jsonb;
    final_form jsonb;
BEGIN
    -- Get calculated form data
    SELECT * INTO form_data
    FROM btw_form_calculation
    WHERE tenant_id = p_tenant_id
      AND year = p_year
      AND quarter = p_quarter;
    
    -- Run validation
    validation_result := validate_corrected_btw_form(p_tenant_id, p_year, p_quarter);
    
    -- Build complete form response
    final_form := jsonb_build_object(
        'tenant_id', p_tenant_id,
        'period', jsonb_build_object('year', p_year, 'quarter', p_quarter),
        'generated_at', NOW(),
        'form_structure', 'corrected_official_btw_form_v2',
        
        -- Section 1: Prestaties binnenland
        'section_1', jsonb_build_object(
            'rubriek_1a', jsonb_build_object('omzet', COALESCE(form_data.rubriek_1a_omzet, 0), 'btw', COALESCE(form_data.rubriek_1a_btw, 0)),
            'rubriek_1b', jsonb_build_object('omzet', COALESCE(form_data.rubriek_1b_omzet, 0), 'btw', COALESCE(form_data.rubriek_1b_btw, 0)),
            'rubriek_1c', jsonb_build_object('omzet', COALESCE(form_data.rubriek_1c_omzet, 0), 'btw', COALESCE(form_data.rubriek_1c_btw, 0)),
            'rubriek_1d', jsonb_build_object('btw', COALESCE(form_data.rubriek_1d_btw, 0)),
            'rubriek_1e', jsonb_build_object('omzet', COALESCE(form_data.rubriek_1e_omzet, 0))
        ),
        
        -- Section 2: Verleggingsregelingen binnenland  
        'section_2', jsonb_build_object(
            'rubriek_2a', jsonb_build_object('omzet', COALESCE(form_data.rubriek_2a_omzet, 0), 'btw', COALESCE(form_data.rubriek_2a_btw, 0))
        ),
        
        -- Section 3: Prestaties naar/in het buitenland (CORRECTED)
        'section_3', jsonb_build_object(
            'rubriek_3a', jsonb_build_object('omzet', COALESCE(form_data.rubriek_3a_omzet, 0), 'description', 'Non-EU exports'),
            'rubriek_3b', jsonb_build_object('omzet', COALESCE(form_data.rubriek_3b_omzet, 0), 'description', 'EU supplies - must match ICP'),
            'rubriek_3c', jsonb_build_object('omzet', COALESCE(form_data.rubriek_3c_omzet, 0), 'description', 'EU installations/distance sales')
        ),
        
        -- Section 4: Prestaties vanuit het buitenland
        'section_4', jsonb_build_object(
            'rubriek_4a', jsonb_build_object('omzet', COALESCE(form_data.rubriek_4a_omzet, 0), 'btw', COALESCE(form_data.rubriek_4a_btw, 0)),
            'rubriek_4b', jsonb_build_object('omzet', COALESCE(form_data.rubriek_4b_omzet, 0), 'btw', COALESCE(form_data.rubriek_4b_btw, 0))
        ),
        
        -- Section 5: BTW Berekening (CORRECTED OFFICIAL STRUCTURE)
        'section_5', jsonb_build_object(
            'rubriek_5a_verschuldigde_btw', COALESCE(form_data.rubriek_5a_verschuldigde_btw, 0),
            'rubriek_5b_voorbelasting', COALESCE(form_data.rubriek_5b_voorbelasting, 0)
        ),
        
        -- Final calculations
        'calculations', jsonb_build_object(
            'suppletie_corrections', COALESCE(form_data.suppletie_corrections, 0),
            'net_vat_payable', COALESCE(form_data.net_vat_payable, 0)
        ),
        
        -- Validation results
        'validation', validation_result
    );
    
    RETURN final_form;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Indexes for optimal reporting performance
CREATE INDEX IF NOT EXISTS idx_invoices_btw_reporting_corrected ON invoices(tenant_id, invoice_date, export_classification) 
    WHERE status NOT IN ('draft', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_expenses_5b_reporting ON expenses(tenant_id, expense_date, section_5b_voorbelasting) 
    WHERE status NOT IN ('draft', 'cancelled') AND is_vat_deductible = true;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON VIEW btw_form_calculation IS 'CORRECTED BTW form calculation with official rubriek structure and proper 3a/3b mappings';
COMMENT ON VIEW icp_btw_validation IS 'CORRECTED ICP validation view that properly matches against BTW Section 3b (EU supplies)';
COMMENT ON FUNCTION validate_corrected_btw_form IS 'Comprehensive validation using CORRECTED BTW form structure and ICP-3b validation';
COMMENT ON FUNCTION generate_corrected_btw_form IS 'Generate complete BTW form JSON with CORRECTED official structure';