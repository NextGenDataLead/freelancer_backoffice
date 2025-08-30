-- Migration: BTW integration triggers and automation
-- Phase 2: Final integration with automated calculations and data consistency
-- Generated with Claude Code (https://claude.ai/code)

-- =====================================================
-- AUTOMATED BTW CALCULATIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update KOR revenue tracking when invoices change
CREATE OR REPLACE FUNCTION update_kor_revenue_tracking()
RETURNS TRIGGER AS $$
DECLARE
    invoice_year INTEGER;
    invoice_quarter INTEGER;
    revenue_change NUMERIC(12,2);
BEGIN
    -- Determine the change in revenue
    IF TG_OP = 'INSERT' THEN
        revenue_change = NEW.subtotal;
        invoice_year = EXTRACT(year FROM NEW.invoice_date);
        invoice_quarter = EXTRACT(quarter FROM NEW.invoice_date);
    ELSIF TG_OP = 'UPDATE' THEN
        revenue_change = NEW.subtotal - OLD.subtotal;
        invoice_year = EXTRACT(year FROM NEW.invoice_date);
        invoice_quarter = EXTRACT(quarter FROM NEW.invoice_date);
    ELSIF TG_OP = 'DELETE' THEN
        revenue_change = -OLD.subtotal;
        invoice_year = EXTRACT(year FROM OLD.invoice_date);
        invoice_quarter = EXTRACT(quarter FROM OLD.invoice_date);
    END IF;
    
    -- Skip if not a paid invoice or if revenue change is zero
    IF TG_OP != 'DELETE' THEN
        IF NEW.status NOT IN ('paid', 'sent') OR revenue_change = 0 THEN
            RETURN COALESCE(NEW, OLD);
        END IF;
    ELSIF OLD.status NOT IN ('paid', 'sent') OR revenue_change = 0 THEN
        RETURN OLD;
    END IF;
    
    -- Update KOR revenue tracking
    INSERT INTO kor_revenue_tracking (tenant_id, year, quarter, quarterly_revenue, cumulative_revenue)
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id), 
        invoice_year, 
        invoice_quarter, 
        revenue_change, 
        revenue_change
    )
    ON CONFLICT (tenant_id, year, quarter) 
    DO UPDATE SET 
        quarterly_revenue = kor_revenue_tracking.quarterly_revenue + revenue_change,
        cumulative_revenue = (
            SELECT SUM(quarterly_revenue) 
            FROM kor_revenue_tracking krt2 
            WHERE krt2.tenant_id = EXCLUDED.tenant_id 
            AND krt2.year = EXCLUDED.year 
            AND krt2.quarter <= EXCLUDED.quarter
        );
    
    -- Check if threshold is exceeded
    UPDATE kor_revenue_tracking SET 
        threshold_exceeded = (cumulative_revenue > (
            SELECT annual_revenue_threshold 
            FROM kor_settings 
            WHERE tenant_id = kor_revenue_tracking.tenant_id
        )),
        threshold_exceeded_date = CASE 
            WHEN cumulative_revenue > (
                SELECT annual_revenue_threshold 
                FROM kor_settings 
                WHERE tenant_id = kor_revenue_tracking.tenant_id
            ) AND threshold_exceeded = false THEN CURRENT_DATE
            ELSE threshold_exceeded_date
        END
    WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND year = invoice_year 
      AND quarter = invoice_quarter;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for KOR revenue tracking
CREATE TRIGGER update_kor_revenue_tracking_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_kor_revenue_tracking();

-- =====================================================
-- AUTOMATED TRADE TRANSACTION CREATION
-- =====================================================

-- Function to automatically create trade transactions for international invoices
CREATE OR REPLACE FUNCTION create_trade_transaction_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process international transactions
    IF NEW.export_type IN ('eu_goods', 'eu_services', 'non_eu') THEN
        INSERT INTO trade_transactions (
            tenant_id,
            transaction_type,
            document_type,
            document_id,
            partner_country,
            partner_vat_number,
            partner_name,
            commodity_code,
            net_amount,
            vat_amount,
            transaction_date,
            btw_rubriek
        ) VALUES (
            NEW.tenant_id,
            CASE 
                WHEN NEW.export_type = 'non_eu' THEN 'export'
                ELSE 'eu_supply'
            END,
            'invoice',
            NEW.id,
            NEW.place_of_supply_country,
            NEW.customer_vat_number,
            (SELECT name FROM clients WHERE id = NEW.client_id),
            CASE WHEN NEW.transaction_nature = 'goods' THEN 'GOODS' ELSE 'SERVICES' END,
            NEW.subtotal,
            NEW.vat_amount,
            NEW.invoice_date,
            NEW.btw_rubriek
        )
        ON CONFLICT (tenant_id, document_type, document_id) 
        DO UPDATE SET
            partner_country = EXCLUDED.partner_country,
            partner_vat_number = EXCLUDED.partner_vat_number,
            partner_name = EXCLUDED.partner_name,
            net_amount = EXCLUDED.net_amount,
            vat_amount = EXCLUDED.vat_amount,
            transaction_date = EXCLUDED.transaction_date,
            btw_rubriek = EXCLUDED.btw_rubriek;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automated trade transaction creation
CREATE TRIGGER create_trade_transaction_trigger
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_trade_transaction_from_invoice();

-- =====================================================
-- BTW FORM VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate BTW form completeness and accuracy
CREATE OR REPLACE FUNCTION validate_btw_form_data(
    p_tenant_id UUID,
    p_year INTEGER,
    p_quarter INTEGER
)
RETURNS jsonb AS $$
DECLARE
    validation_result jsonb := '{}';
    btw_data jsonb;
    icp_total NUMERIC(12,2);
    issues text[] := '{}';
    warnings text[] := '{}';
    info text[] := '{}';
BEGIN
    -- Get BTW form data
    SELECT to_jsonb(bf.*) INTO btw_data
    FROM btw_complete_form_data bf
    WHERE bf.tenant_id = p_tenant_id
      AND bf.year = p_year
      AND bf.quarter = p_quarter;
    
    IF btw_data IS NULL THEN
        issues := issues || 'No BTW data found for the specified period';
        RETURN jsonb_build_object(
            'valid', false,
            'issues', issues,
            'warnings', warnings,
            'info', info
        );
    END IF;
    
    -- Validation Rule 1: ICP vs BTW 3a consistency
    IF (btw_data->>'rubriek_3a_amount')::numeric > 0 THEN
        SELECT COALESCE(SUM(net_amount), 0) INTO icp_total
        FROM icp_complete_declaration
        WHERE tenant_id = p_tenant_id
          AND year = p_year
          AND quarter = p_quarter;
          
        IF ABS((btw_data->>'rubriek_3a_amount')::numeric - icp_total) > 0.01 THEN
            issues := issues || format('ICP total (%s) does not match BTW rubriek 3a (%s)', 
                icp_total::text, (btw_data->>'rubriek_3a_amount')::text);
        ELSE
            info := info || 'ICP and BTW rubriek 3a amounts are consistent';
        END IF;
    END IF;
    
    -- Validation Rule 2: Check for missing VAT numbers on EU B2B transactions
    IF EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.tenant_id = p_tenant_id
          AND i.export_type IN ('eu_goods', 'eu_services')
          AND EXTRACT(year FROM i.invoice_date) = p_year
          AND EXTRACT(quarter FROM i.invoice_date) = p_quarter
          AND (i.customer_vat_number IS NULL OR LENGTH(i.customer_vat_number) < 9)
    ) THEN
        warnings := warnings || 'Some EU B2B invoices are missing valid VAT numbers';
    END IF;
    
    -- Validation Rule 3: KOR threshold check
    IF EXISTS (
        SELECT 1 FROM kor_qualification_status ks
        WHERE ks.tenant_id = p_tenant_id
          AND ks.kor_enabled = true
          AND ks.threshold_exceeded_this_year = true
    ) THEN
        warnings := warnings || 'KOR threshold exceeded - review eligibility for small business scheme';
    END IF;
    
    -- Validation Rule 4: Zero amounts in key rubrieken
    IF (btw_data->>'rubriek_6_total_output_vat')::numeric = 0 
       AND (btw_data->>'rubriek_7_total_input_vat')::numeric = 0 THEN
        warnings := warnings || 'Both output VAT and input VAT are zero - verify this is correct';
    END IF;
    
    -- Validation Rule 5: Large corrections
    IF (btw_data->>'suppletie_amount')::numeric != 0 THEN
        IF ABS((btw_data->>'suppletie_amount')::numeric) > 1000 THEN
            warnings := warnings || 'Large suppletie correction detected - verify accuracy';
        ELSE
            info := info || 'Suppletie correction included in calculation';
        END IF;
    END IF;
    
    -- Validation Rule 6: Rubriek 8 calculation check
    DECLARE
        calculated_balance NUMERIC(12,2);
        reported_balance NUMERIC(12,2);
    BEGIN
        calculated_balance := (btw_data->>'rubriek_6_total_output_vat')::numeric - 
                             (btw_data->>'rubriek_7_total_input_vat')::numeric;
        reported_balance := (btw_data->>'rubriek_8_net_vat_payable')::numeric;
        
        IF ABS(calculated_balance - reported_balance) > 0.01 THEN
            issues := issues || format('Rubriek 8 calculation error: calculated %s, reported %s',
                calculated_balance::text, reported_balance::text);
        END IF;
    END;
    
    -- Final validation result
    validation_result := jsonb_build_object(
        'valid', array_length(issues, 1) IS NULL,
        'issues', issues,
        'warnings', warnings,
        'info', info,
        'validated_at', NOW(),
        'period', jsonb_build_object('year', p_year, 'quarter', p_quarter),
        'summary', jsonb_build_object(
            'total_issues', COALESCE(array_length(issues, 1), 0),
            'total_warnings', COALESCE(array_length(warnings, 1), 0),
            'has_data', true,
            'output_vat', (btw_data->>'rubriek_6_total_output_vat')::numeric,
            'input_vat', (btw_data->>'rubriek_7_total_input_vat')::numeric,
            'net_payable', (btw_data->>'rubriek_8_net_vat_payable')::numeric
        )
    );
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATA MIGRATION AND CLEANUP FUNCTIONS
-- =====================================================

-- Function to migrate existing data to new BTW structure
CREATE OR REPLACE FUNCTION migrate_existing_btw_data()
RETURNS void AS $$
BEGIN
    -- Update existing invoices with proper export classification
    UPDATE invoices SET
        export_type = CASE
            WHEN vat_type = 'reverse_charge' THEN 'eu_services'
            ELSE 'domestic'
        END,
        transaction_nature = 'services',
        place_of_supply_country = 'NL'
    WHERE export_type IS NULL;
    
    -- Update existing expenses with proper transaction classification  
    UPDATE expenses SET
        transaction_type = CASE
            WHEN is_reverse_charge THEN 'eu_acquisition'
            WHEN supplier_country_code != 'NL' THEN 'import'
            ELSE 'domestic'
        END
    WHERE transaction_type IS NULL;
    
    -- Create expense VAT breakdowns for existing expenses
    INSERT INTO expense_vat_breakdown (expense_id, vat_rubriek, deductible_amount, business_percentage)
    SELECT 
        id,
        btw_rubriek,
        CASE WHEN is_vat_deductible THEN vat_amount ELSE 0 END,
        business_percentage
    FROM expenses 
    WHERE btw_rubriek IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Initialize KOR settings for all existing tenants
    INSERT INTO kor_settings (tenant_id, enabled, annual_revenue_threshold)
    SELECT DISTINCT tenant_id, false, 20000.00
    FROM tenants
    ON CONFLICT (tenant_id) DO NOTHING;
    
    RAISE NOTICE 'BTW data migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATED MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to clean up old temporary data and optimize tables
CREATE OR REPLACE FUNCTION maintain_btw_tables()
RETURNS void AS $$
BEGIN
    -- Clean up old validation results (keep last 12 months)
    DELETE FROM vat_corrections 
    WHERE correction_date < CURRENT_DATE - INTERVAL '12 months'
      AND correction_type = 'error_correction'
      AND processed = true;
    
    -- Update KOR revenue tracking for current year
    INSERT INTO kor_revenue_tracking (tenant_id, year, quarter, quarterly_revenue, cumulative_revenue)
    SELECT 
        i.tenant_id,
        EXTRACT(year FROM i.invoice_date)::integer,
        EXTRACT(quarter FROM i.invoice_date)::integer,
        SUM(i.subtotal),
        SUM(i.subtotal)
    FROM invoices i
    WHERE i.status IN ('paid', 'sent')
      AND EXTRACT(year FROM i.invoice_date) = EXTRACT(year FROM CURRENT_DATE)
    GROUP BY i.tenant_id, EXTRACT(year FROM i.invoice_date), EXTRACT(quarter FROM i.invoice_date)
    ON CONFLICT (tenant_id, year, quarter)
    DO UPDATE SET 
        quarterly_revenue = EXCLUDED.quarterly_revenue,
        cumulative_revenue = EXCLUDED.quarterly_revenue;
    
    -- Update cumulative revenue calculations
    UPDATE kor_revenue_tracking SET 
        cumulative_revenue = (
            SELECT SUM(quarterly_revenue)
            FROM kor_revenue_tracking krt2
            WHERE krt2.tenant_id = kor_revenue_tracking.tenant_id
              AND krt2.year = kor_revenue_tracking.year
              AND krt2.quarter <= kor_revenue_tracking.quarter
        )
    WHERE year = EXTRACT(year FROM CURRENT_DATE);
    
    RAISE NOTICE 'BTW table maintenance completed';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL SETUP AND MIGRATION
-- =====================================================

-- Run the data migration for existing data
SELECT migrate_existing_btw_data();

-- Seed Dutch VAT rates if not already done
SELECT seed_dutch_vat_rates();

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Additional indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_invoices_btw_period ON invoices(tenant_id, EXTRACT(year FROM invoice_date), EXTRACT(quarter FROM invoice_date));
CREATE INDEX IF NOT EXISTS idx_expenses_btw_period ON expenses(tenant_id, EXTRACT(year FROM expense_date), EXTRACT(quarter FROM expense_date));
CREATE INDEX IF NOT EXISTS idx_trade_transactions_period ON trade_transactions(tenant_id, EXTRACT(year FROM transaction_date), EXTRACT(quarter FROM transaction_date));

-- Partial indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_international ON invoices(tenant_id, export_type, invoice_date) WHERE export_type != 'domestic';
CREATE INDEX IF NOT EXISTS idx_expenses_deductible_vat ON expenses(tenant_id, is_vat_deductible, expense_date) WHERE is_vat_deductible = true;
CREATE INDEX IF NOT EXISTS idx_kor_tracking_current_year ON kor_revenue_tracking(tenant_id, quarter) WHERE year = EXTRACT(year FROM CURRENT_DATE);

-- =====================================================
-- FINAL VALIDATION AND COMMENTS
-- =====================================================

-- Validate the migration was successful
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count new tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('invoice_item_vat_details', 'expense_vat_breakdown', 'vat_rate_rules', 
                         'trade_transactions', 'vat_corrections', 'kor_settings', 
                         'kor_revenue_tracking', 'oss_transactions');
    
    -- Count new views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name IN ('btw_complete_form_data', 'icp_complete_declaration', 'kor_qualification_status');
    
    -- Count new functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('generate_complete_btw_form', 'validate_btw_form_data', 
                           'migrate_existing_btw_data', 'maintain_btw_tables');
    
    RAISE NOTICE 'BTW Phase 2 migration completed: % tables, % views, % functions created', 
                 table_count, view_count, function_count;
END
$$;

-- Add final comments
COMMENT ON SCHEMA public IS 'Enhanced with complete BTW compliance Phase 2 - all Dutch VAT form rubrieken supported';

-- Log the completion
INSERT INTO financial_logs (tenant_id, entity_type, entity_id, action_type, performed_by, new_values)
SELECT 
    id as tenant_id,
    'system' as entity_type,
    'btw_migration' as entity_id,
    'phase_2_complete' as action_type,
    'system' as performed_by,
    jsonb_build_object(
        'migration_completed_at', NOW(),
        'phase', '2',
        'features_added', array[
            'complete_btw_form_support',
            'all_rubrieken_implemented', 
            'kor_monitoring',
            'oss_transactions',
            'trade_tracking',
            'vat_corrections',
            'automated_calculations'
        ]
    ) as new_values
FROM tenants
ON CONFLICT DO NOTHING;