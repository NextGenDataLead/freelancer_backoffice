-- Migration: BTW reporting views and functions
-- Phase 2: Creates optimized views and functions for complete BTW form generation
-- Generated with Claude Code (https://claude.ai/code)

-- =====================================================
-- COMPREHENSIVE BTW REPORTING VIEWS
-- =====================================================

-- View for complete BTW form data (all rubrieken)
CREATE OR REPLACE VIEW btw_complete_form_data AS
WITH quarterly_data AS (
    SELECT 
        i.tenant_id,
        EXTRACT(year FROM i.invoice_date) as year,
        EXTRACT(quarter FROM i.invoice_date) as quarter,
        
        -- Rubriek 1a: Standard rate revenue
        SUM(CASE WHEN i.btw_rubriek = '1a' THEN i.subtotal ELSE 0 END) as rubriek_1a_amount,
        SUM(CASE WHEN i.btw_rubriek = '1a' THEN i.vat_amount ELSE 0 END) as rubriek_1b_vat,
        
        -- Rubriek 1c: Reduced rate revenue  
        SUM(CASE WHEN i.btw_rubriek = '1c' THEN i.subtotal ELSE 0 END) as rubriek_1c_amount,
        SUM(CASE WHEN i.btw_rubriek = '1c' THEN i.vat_amount ELSE 0 END) as rubriek_1d_vat,
        
        -- Rubriek 1e: Zero rate
        SUM(CASE WHEN i.btw_rubriek = '1e' THEN i.subtotal ELSE 0 END) as rubriek_1e_amount,
        
        -- Rubriek 2a/2b: Domestic reverse charge
        SUM(CASE WHEN i.btw_rubriek = '2a' THEN i.subtotal ELSE 0 END) as rubriek_2a_amount,
        SUM(CASE WHEN i.btw_rubriek = '2b' THEN i.subtotal ELSE 0 END) as rubriek_2b_amount,
        
        -- Rubriek 3a: EU B2B services/goods
        SUM(CASE WHEN i.btw_rubriek = '3a' THEN i.subtotal ELSE 0 END) as rubriek_3a_amount,
        
        -- Rubriek 3b: Non-EU exports
        SUM(CASE WHEN i.btw_rubriek = '3b' THEN i.subtotal ELSE 0 END) as rubriek_3b_amount
        
    FROM invoices i
    WHERE i.status NOT IN ('draft', 'cancelled')
    GROUP BY i.tenant_id, EXTRACT(year FROM i.invoice_date), EXTRACT(quarter FROM i.invoice_date)
),
expense_data AS (
    SELECT 
        e.tenant_id,
        EXTRACT(year FROM e.expense_date) as year,
        EXTRACT(quarter FROM e.expense_date) as quarter,
        
        -- Rubriek 5a: Standard rate input VAT
        SUM(CASE WHEN e.btw_rubriek = '5a' AND e.is_vat_deductible THEN e.vat_amount ELSE 0 END) as rubriek_5a_vat,
        
        -- Rubriek 5b: Reduced rate input VAT
        SUM(CASE WHEN e.btw_rubriek = '5b' AND e.is_vat_deductible THEN e.vat_amount ELSE 0 END) as rubriek_5b_vat,
        
        -- Rubriek 5c: Zero/other rate input VAT
        SUM(CASE WHEN e.btw_rubriek = '5c' AND e.is_vat_deductible THEN e.vat_amount ELSE 0 END) as rubriek_5c_vat,
        
        -- Rubriek 5d: Reverse charge input VAT
        SUM(CASE WHEN e.btw_rubriek = '5d' AND e.is_vat_deductible 
            THEN COALESCE(e.vat_amount, 0) + COALESCE(e.acquisition_vat_amount, 0) + COALESCE(e.import_vat_amount, 0) 
            ELSE 0 END) as rubriek_5d_vat,
        
        -- Rubriek 5e: Other deductible VAT
        SUM(CASE WHEN e.btw_rubriek = '5e' AND e.is_vat_deductible THEN e.vat_amount ELSE 0 END) as rubriek_5e_vat,
        
        -- Rubriek 5f: Private use adjustments
        SUM(CASE WHEN e.btw_rubriek = '5f' AND e.is_vat_deductible THEN e.vat_amount ELSE 0 END) as rubriek_5f_vat,
        
        -- Rubriek 5g: Investment corrections
        SUM(CASE WHEN e.btw_rubriek = '5g' AND e.is_vat_deductible 
            THEN COALESCE(e.vat_amount, 0) + COALESCE(e.investment_correction_amount, 0) 
            ELSE 0 END) as rubriek_5g_vat
            
    FROM expenses e
    WHERE e.status NOT IN ('draft', 'cancelled')
    GROUP BY e.tenant_id, EXTRACT(year FROM e.expense_date), EXTRACT(quarter FROM e.expense_date)
),
trade_data AS (
    SELECT 
        t.tenant_id,
        EXTRACT(year FROM t.transaction_date) as year,
        EXTRACT(quarter FROM t.transaction_date) as quarter,
        
        -- Rubriek 4a: EU acquisitions
        SUM(CASE WHEN t.btw_rubriek = '4a' THEN t.net_amount ELSE 0 END) as rubriek_4a_amount,
        
        -- Rubriek 4b: Import services
        SUM(CASE WHEN t.btw_rubriek = '4b' THEN t.net_amount ELSE 0 END) as rubriek_4b_amount,
        
        -- Invoerbtw: Import VAT
        SUM(CASE WHEN t.btw_rubriek = 'Inv' THEN t.vat_amount ELSE 0 END) as invoerbtw_amount
        
    FROM trade_transactions t
    GROUP BY t.tenant_id, EXTRACT(year FROM t.transaction_date), EXTRACT(quarter FROM t.transaction_date)
),
corrections_data AS (
    SELECT 
        c.tenant_id,
        EXTRACT(year FROM c.correction_date) as year,
        EXTRACT(quarter FROM c.correction_date) as quarter,
        
        -- Suppletie corrections (previous periods)
        SUM(CASE WHEN c.correction_type = 'suppletie' THEN c.correction_amount ELSE 0 END) as suppletie_amount
        
    FROM vat_corrections c
    WHERE c.processed = true
    GROUP BY c.tenant_id, EXTRACT(year FROM c.correction_date), EXTRACT(quarter FROM c.correction_date)
),
oss_data AS (
    SELECT 
        o.tenant_id,
        o.year,
        o.quarter,
        
        -- OSS sales
        SUM(o.net_amount) as oss_sales_amount,
        SUM(o.local_vat_amount) as oss_vat_amount
        
    FROM oss_transactions o
    GROUP BY o.tenant_id, o.year, o.quarter
)
SELECT 
    COALESCE(qd.tenant_id, ed.tenant_id, td.tenant_id, cd.tenant_id, od.tenant_id) as tenant_id,
    COALESCE(qd.year, ed.year, td.year, cd.year, od.year) as year,
    COALESCE(qd.quarter, ed.quarter, td.quarter, cd.quarter, od.quarter) as quarter,
    
    -- Section 1: Prestaties binnenland
    COALESCE(qd.rubriek_1a_amount, 0) as rubriek_1a_amount,
    COALESCE(qd.rubriek_1b_vat, 0) as rubriek_1b_vat,
    COALESCE(qd.rubriek_1c_amount, 0) as rubriek_1c_amount, 
    COALESCE(qd.rubriek_1d_vat, 0) as rubriek_1d_vat,
    COALESCE(qd.rubriek_1e_amount, 0) as rubriek_1e_amount,
    
    -- Section 2: Verleggingsregelingen binnenland
    COALESCE(qd.rubriek_2a_amount, 0) as rubriek_2a_amount,
    COALESCE(qd.rubriek_2b_amount, 0) as rubriek_2b_amount,
    
    -- Section 3: Prestaties naar/in het buitenland
    COALESCE(qd.rubriek_3a_amount, 0) as rubriek_3a_amount,
    COALESCE(qd.rubriek_3b_amount, 0) as rubriek_3b_amount,
    
    -- Section 4: Prestaties vanuit het buitenland
    COALESCE(td.rubriek_4a_amount, 0) as rubriek_4a_amount,
    COALESCE(td.rubriek_4b_amount, 0) as rubriek_4b_amount,
    COALESCE(td.invoerbtw_amount, 0) as invoerbtw_amount,
    
    -- Section 5: Voorbelasting
    COALESCE(ed.rubriek_5a_vat, 0) as rubriek_5a_vat,
    COALESCE(ed.rubriek_5b_vat, 0) as rubriek_5b_vat,
    COALESCE(ed.rubriek_5c_vat, 0) as rubriek_5c_vat,
    COALESCE(ed.rubriek_5d_vat, 0) as rubriek_5d_vat,
    COALESCE(ed.rubriek_5e_vat, 0) as rubriek_5e_vat,
    COALESCE(ed.rubriek_5f_vat, 0) as rubriek_5f_vat,
    COALESCE(ed.rubriek_5g_vat, 0) as rubriek_5g_vat,
    
    -- Additional fields
    COALESCE(od.oss_sales_amount, 0) as oss_sales_amount,
    COALESCE(od.oss_vat_amount, 0) as oss_vat_amount,
    COALESCE(cd.suppletie_amount, 0) as suppletie_amount,
    
    -- Calculated totals
    (COALESCE(qd.rubriek_1b_vat, 0) + COALESCE(qd.rubriek_1d_vat, 0)) as rubriek_6_total_output_vat,
    (COALESCE(ed.rubriek_5a_vat, 0) + COALESCE(ed.rubriek_5b_vat, 0) + COALESCE(ed.rubriek_5c_vat, 0) + 
     COALESCE(ed.rubriek_5d_vat, 0) + COALESCE(ed.rubriek_5e_vat, 0) + COALESCE(ed.rubriek_5f_vat, 0) + 
     COALESCE(ed.rubriek_5g_vat, 0)) as rubriek_7_total_input_vat,
    
    -- Final balance (Rubriek 8)
    ((COALESCE(qd.rubriek_1b_vat, 0) + COALESCE(qd.rubriek_1d_vat, 0)) - 
     (COALESCE(ed.rubriek_5a_vat, 0) + COALESCE(ed.rubriek_5b_vat, 0) + COALESCE(ed.rubriek_5c_vat, 0) + 
      COALESCE(ed.rubriek_5d_vat, 0) + COALESCE(ed.rubriek_5e_vat, 0) + COALESCE(ed.rubriek_5f_vat, 0) + 
      COALESCE(ed.rubriek_5g_vat, 0))) as rubriek_8_net_vat_payable

FROM quarterly_data qd
FULL OUTER JOIN expense_data ed USING (tenant_id, year, quarter)
FULL OUTER JOIN trade_data td USING (tenant_id, year, quarter)
FULL OUTER JOIN corrections_data cd USING (tenant_id, year, quarter)
FULL OUTER JOIN oss_data od USING (tenant_id, year, quarter);

-- =====================================================
-- ICP REPORTING VIEW (Enhanced)
-- =====================================================

-- Enhanced ICP view with complete validation
CREATE OR REPLACE VIEW icp_complete_declaration AS
SELECT 
    i.tenant_id,
    EXTRACT(year FROM i.invoice_date) as year,
    EXTRACT(quarter FROM i.invoice_date) as quarter,
    i.place_of_supply_country as country_code,
    i.customer_vat_number,
    c.name as customer_name,
    c.country as customer_country,
    
    -- Transaction details
    COUNT(*) as transaction_count,
    SUM(i.subtotal) as net_amount,
    
    -- Service type classification
    CASE 
        WHEN i.transaction_nature = 'digital_services' THEN '240'
        WHEN i.transaction_nature = 'services' THEN '200-299'
        ELSE '200-299'
    END as transaction_type_code,
    
    -- Validation flags
    (i.customer_vat_number IS NOT NULL AND LENGTH(i.customer_vat_number) >= 9) as has_valid_vat_number,
    i.customer_vat_validated,
    (i.export_type IN ('eu_services', 'eu_goods')) as is_eu_b2b,
    
    -- Connection to BTW form
    (SELECT SUM(inv.subtotal) FROM invoices inv 
     WHERE inv.tenant_id = i.tenant_id 
     AND inv.btw_rubriek = '3a' 
     AND EXTRACT(year FROM inv.invoice_date) = EXTRACT(year FROM i.invoice_date)
     AND EXTRACT(quarter FROM inv.invoice_date) = EXTRACT(quarter FROM i.invoice_date)) as btw_3a_total

FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.export_type IN ('eu_services', 'eu_goods')
  AND i.status NOT IN ('draft', 'cancelled')
  AND i.customer_vat_number IS NOT NULL
GROUP BY 
    i.tenant_id,
    EXTRACT(year FROM i.invoice_date),
    EXTRACT(quarter FROM i.invoice_date),
    i.place_of_supply_country,
    i.customer_vat_number,
    c.name,
    c.country,
    i.transaction_nature;

-- =====================================================
-- KOR MONITORING VIEW
-- =====================================================

-- KOR threshold monitoring and qualification status
CREATE OR REPLACE VIEW kor_qualification_status AS
SELECT 
    ks.tenant_id,
    ks.enabled as kor_enabled,
    ks.annual_revenue_threshold,
    ks.current_year_revenue,
    ks.previous_year_revenue,
    
    -- Current year tracking
    rt.year,
    SUM(rt.quarterly_revenue) as year_to_date_revenue,
    MAX(rt.cumulative_revenue) as cumulative_revenue,
    
    -- Qualification status
    CASE 
        WHEN ks.current_year_revenue <= ks.annual_revenue_threshold 
         AND ks.previous_year_revenue <= ks.annual_revenue_threshold THEN true
        ELSE false
    END as qualifies_for_kor,
    
    -- Threshold monitoring
    CASE 
        WHEN MAX(rt.cumulative_revenue) > ks.annual_revenue_threshold THEN true
        ELSE false
    END as threshold_exceeded_this_year,
    
    MIN(CASE WHEN rt.threshold_exceeded THEN rt.quarter END) as threshold_exceeded_in_quarter,
    
    -- Revenue projection
    CASE 
        WHEN rt.year = EXTRACT(year FROM CURRENT_DATE) THEN
            (MAX(rt.cumulative_revenue) * 4.0 / EXTRACT(quarter FROM CURRENT_DATE))
        ELSE MAX(rt.cumulative_revenue)
    END as projected_annual_revenue

FROM kor_settings ks
LEFT JOIN kor_revenue_tracking rt ON ks.tenant_id = rt.tenant_id
WHERE rt.year IS NULL OR rt.year >= EXTRACT(year FROM CURRENT_DATE) - 1
GROUP BY 
    ks.tenant_id, ks.enabled, ks.annual_revenue_threshold, 
    ks.current_year_revenue, ks.previous_year_revenue, rt.year;

-- =====================================================
-- BTW FORM GENERATION FUNCTION
-- =====================================================

-- Function to generate complete BTW form data for a specific period
CREATE OR REPLACE FUNCTION generate_complete_btw_form(
    p_tenant_id UUID,
    p_year INTEGER,
    p_quarter INTEGER
)
RETURNS jsonb AS $$
DECLARE
    form_data jsonb;
    kor_status jsonb;
    validation_issues text[] := '{}';
BEGIN
    -- Get BTW form data
    SELECT to_jsonb(bf.*) INTO form_data
    FROM btw_complete_form_data bf
    WHERE bf.tenant_id = p_tenant_id
      AND bf.year = p_year
      AND bf.quarter = p_quarter;
    
    -- Get KOR status
    SELECT to_jsonb(ks.*) INTO kor_status
    FROM kor_qualification_status ks
    WHERE ks.tenant_id = p_tenant_id
      AND ks.year = p_year;
    
    -- Validation checks
    IF form_data IS NULL THEN
        form_data := jsonb_build_object(
            'tenant_id', p_tenant_id,
            'year', p_year,
            'quarter', p_quarter,
            'rubriek_1a_amount', 0,
            'rubriek_1b_vat', 0,
            'rubriek_1c_amount', 0,
            'rubriek_1d_vat', 0,
            'rubriek_1e_amount', 0,
            'rubriek_2a_amount', 0,
            'rubriek_2b_amount', 0,
            'rubriek_3a_amount', 0,
            'rubriek_3b_amount', 0,
            'rubriek_4a_amount', 0,
            'rubriek_4b_amount', 0,
            'invoerbtw_amount', 0,
            'rubriek_5a_vat', 0,
            'rubriek_5b_vat', 0,
            'rubriek_5c_vat', 0,
            'rubriek_5d_vat', 0,
            'rubriek_5e_vat', 0,
            'rubriek_5f_vat', 0,
            'rubriek_5g_vat', 0,
            'oss_sales_amount', 0,
            'suppletie_amount', 0,
            'rubriek_6_total_output_vat', 0,
            'rubriek_7_total_input_vat', 0,
            'rubriek_8_net_vat_payable', 0
        );
    END IF;
    
    -- Add validation checks
    IF (form_data->>'rubriek_3a_amount')::numeric > 0 THEN
        -- Check ICP declaration consistency
        IF NOT EXISTS (
            SELECT 1 FROM icp_complete_declaration icp
            WHERE icp.tenant_id = p_tenant_id 
            AND icp.year = p_year 
            AND icp.quarter = p_quarter
        ) THEN
            validation_issues := validation_issues || 'ICP declaration missing for EU B2B transactions';
        END IF;
    END IF;
    
    -- Build complete response
    RETURN jsonb_build_object(
        'form_data', form_data,
        'kor_status', kor_status,
        'validation_issues', validation_issues,
        'generated_at', NOW(),
        'period', jsonb_build_object('year', p_year, 'quarter', p_quarter)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES FOR VIEWS
-- =====================================================

-- Note: Views inherit RLS from underlying tables, but we ensure proper access
CREATE OR REPLACE FUNCTION can_access_btw_data(check_tenant_id UUID)
RETURNS boolean AS $$
BEGIN
    RETURN check_tenant_id = (SELECT tenant_id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful indexes for the reporting views
CREATE INDEX IF NOT EXISTS idx_invoices_btw_reporting ON invoices(tenant_id, btw_rubriek, invoice_date) WHERE status NOT IN ('draft', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_expenses_btw_reporting ON expenses(tenant_id, btw_rubriek, expense_date, is_vat_deductible) WHERE status NOT IN ('draft', 'cancelled');

-- Add comments for documentation
COMMENT ON VIEW btw_complete_form_data IS 'Complete BTW form data with all rubrieken calculated from invoices, expenses, and supporting tables';
COMMENT ON VIEW icp_complete_declaration IS 'Enhanced ICP declaration data with validation and BTW form connection verification';
COMMENT ON VIEW kor_qualification_status IS 'KOR (Small Business Scheme) qualification status and threshold monitoring';
COMMENT ON FUNCTION generate_complete_btw_form IS 'Generates complete BTW form JSON with validation for a specific tenant and period';