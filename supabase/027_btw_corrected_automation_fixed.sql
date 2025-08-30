-- Migration: CORRECTED BTW automation triggers and data synchronization (FIXED)
-- Based on official Belastingdienst BTW form structure with proper calculations
-- Replaces incorrect 022_btw_integration_and_triggers.sql
-- FIXED: Resolves set-returning function error in FOR loop
-- Generated with Claude Code (https://claude.ai/code)

-- =====================================================
-- AUTOMATED BTW FORM SYNC TRIGGERS (CORRECTED)
-- =====================================================

-- Function to automatically update/create BTW form when invoices change
CREATE OR REPLACE FUNCTION sync_invoice_to_btw_form()
RETURNS TRIGGER AS $$
DECLARE
    form_year INTEGER;
    form_quarter INTEGER;
BEGIN
    -- Determine the period for the BTW form
    IF TG_OP = 'DELETE' THEN
        form_year := EXTRACT(year FROM OLD.invoice_date);
        form_quarter := EXTRACT(quarter FROM OLD.invoice_date);
    ELSE
        form_year := EXTRACT(year FROM NEW.invoice_date);
        form_quarter := EXTRACT(quarter FROM NEW.invoice_date);
    END IF;
    
    -- Skip draft/cancelled invoices
    IF TG_OP != 'DELETE' AND NEW.status IN ('draft', 'cancelled') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Insert/update the BTW form record with recalculated totals
    INSERT INTO quarterly_btw_forms (tenant_id, year, quarter)
    SELECT 
        COALESCE(NEW.tenant_id, OLD.tenant_id), 
        form_year, 
        form_quarter
    ON CONFLICT (tenant_id, year, quarter) DO NOTHING;
    
    -- Update the BTW form with recalculated values from the view
    UPDATE quarterly_btw_forms 
    SET 
        -- Section 1: Prestaties binnenland (CORRECTED)
        rubriek_1a_omzet = calc.rubriek_1a_omzet,
        rubriek_1a_btw = calc.rubriek_1a_btw,
        rubriek_1b_omzet = calc.rubriek_1b_omzet,
        rubriek_1b_btw = calc.rubriek_1b_btw,
        rubriek_1c_omzet = calc.rubriek_1c_omzet,
        rubriek_1c_btw = calc.rubriek_1c_btw,
        rubriek_1e_omzet = calc.rubriek_1e_omzet,
        
        -- Section 2: Verleggingsregelingen binnenland (CORRECTED)
        rubriek_2a_omzet = calc.rubriek_2a_omzet,
        rubriek_2a_btw = calc.rubriek_2a_btw,
        
        -- Section 3: Prestaties naar/in het buitenland (CORRECTED)
        rubriek_3a_omzet = calc.rubriek_3a_omzet, -- Non-EU exports
        rubriek_3b_omzet = calc.rubriek_3b_omzet, -- EU supplies
        rubriek_3c_omzet = calc.rubriek_3c_omzet, -- EU installations
        
        -- Section 5a: Verschuldigde BTW (CORRECTED)
        rubriek_5a_verschuldigde_btw = calc.rubriek_5a_verschuldigde_btw,
        
        -- Metadata
        updated_at = NOW(),
        form_status = CASE 
            WHEN form_status = 'submitted' THEN 'needs_resubmission'
            ELSE 'calculated'
        END,
        
        -- ICP validation field (CORRECTED to use 3b)
        icp_total_validation = calc.rubriek_3b_omzet
        
    FROM btw_form_calculation calc
    WHERE quarterly_btw_forms.tenant_id = calc.tenant_id
      AND quarterly_btw_forms.year = calc.year
      AND quarterly_btw_forms.quarter = calc.quarter
      AND quarterly_btw_forms.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND quarterly_btw_forms.year = form_year
      AND quarterly_btw_forms.quarter = form_quarter;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice BTW form sync
DROP TRIGGER IF EXISTS sync_invoice_to_btw_form_trigger ON invoices;
CREATE TRIGGER sync_invoice_to_btw_form_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_to_btw_form();

-- =====================================================
-- AUTOMATED EXPENSE TO BTW SYNC (CORRECTED)
-- =====================================================

-- Function to sync expense changes to BTW form Section 5b
CREATE OR REPLACE FUNCTION sync_expense_to_btw_form()
RETURNS TRIGGER AS $$
DECLARE
    form_year INTEGER;
    form_quarter INTEGER;
BEGIN
    -- Determine the period
    IF TG_OP = 'DELETE' THEN
        form_year := EXTRACT(year FROM OLD.expense_date);
        form_quarter := EXTRACT(quarter FROM OLD.expense_date);
    ELSE
        form_year := EXTRACT(year FROM NEW.expense_date);
        form_quarter := EXTRACT(quarter FROM NEW.expense_date);
    END IF;
    
    -- Skip draft/cancelled expenses
    IF TG_OP != 'DELETE' AND NEW.status IN ('draft', 'cancelled') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Ensure BTW form exists
    INSERT INTO quarterly_btw_forms (tenant_id, year, quarter)
    SELECT 
        COALESCE(NEW.tenant_id, OLD.tenant_id), 
        form_year, 
        form_quarter
    ON CONFLICT (tenant_id, year, quarter) DO NOTHING;
    
    -- Update Section 5b: Voorbelasting (CORRECTED - simplified aggregation)
    UPDATE quarterly_btw_forms 
    SET 
        rubriek_5b_voorbelasting = calc.rubriek_5b_voorbelasting,
        updated_at = NOW(),
        form_status = CASE 
            WHEN form_status = 'submitted' THEN 'needs_resubmission'
            ELSE 'calculated'
        END
    FROM btw_form_calculation calc
    WHERE quarterly_btw_forms.tenant_id = calc.tenant_id
      AND quarterly_btw_forms.year = calc.year
      AND quarterly_btw_forms.quarter = calc.quarter
      AND quarterly_btw_forms.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND quarterly_btw_forms.year = form_year
      AND quarterly_btw_forms.quarter = form_quarter;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expense BTW form sync
DROP TRIGGER IF EXISTS sync_expense_to_btw_form_trigger ON expenses;
CREATE TRIGGER sync_expense_to_btw_form_trigger
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION sync_expense_to_btw_form();

-- =====================================================
-- AUTOMATED ICP DECLARATION SYNC (CORRECTED)
-- =====================================================

-- Function to automatically create/update ICP declarations from EU B2B invoices
CREATE OR REPLACE FUNCTION sync_invoice_to_icp_declaration()
RETURNS TRIGGER AS $$
DECLARE
    form_year INTEGER;
    form_quarter INTEGER;
BEGIN
    -- Only process EU B2B transactions (Section 3b)
    IF TG_OP = 'DELETE' THEN
        IF OLD.export_classification != 'eu_b2b' THEN
            RETURN OLD;
        END IF;
        form_year := EXTRACT(year FROM OLD.invoice_date);
        form_quarter := EXTRACT(quarter FROM OLD.invoice_date);
    ELSE
        IF NEW.export_classification != 'eu_b2b' THEN
            RETURN NEW;
        END IF;
        form_year := EXTRACT(year FROM NEW.invoice_date);
        form_quarter := EXTRACT(quarter FROM NEW.invoice_date);
    END IF;
    
    -- Skip if no valid VAT number
    IF TG_OP != 'DELETE' AND (NEW.customer_vat_number IS NULL OR LENGTH(NEW.customer_vat_number) < 9) THEN
        RETURN NEW;
    END IF;
    
    -- Create or update ICP declaration
    IF TG_OP = 'DELETE' THEN
        -- Recalculate ICP totals without this invoice
        INSERT INTO icp_declarations (
            tenant_id, year, quarter, customer_vat_number, customer_name, customer_country, net_amount, transaction_count
        )
        SELECT 
            i.tenant_id,
            EXTRACT(year FROM i.invoice_date)::integer,
            EXTRACT(quarter FROM i.invoice_date)::integer,
            i.customer_vat_number,
            c.name,
            i.place_of_supply_country,
            SUM(i.subtotal),
            COUNT(*)
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        WHERE i.tenant_id = OLD.tenant_id
          AND i.export_classification = 'eu_b2b'
          AND i.customer_vat_number = OLD.customer_vat_number
          AND EXTRACT(year FROM i.invoice_date) = form_year
          AND EXTRACT(quarter FROM i.invoice_date) = form_quarter
          AND i.status NOT IN ('draft', 'cancelled')
          AND i.id != OLD.id
        GROUP BY i.tenant_id, EXTRACT(year FROM i.invoice_date), EXTRACT(quarter FROM i.invoice_date),
                 i.customer_vat_number, c.name, i.place_of_supply_country
        ON CONFLICT (tenant_id, year, quarter, customer_vat_number) 
        DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            customer_country = EXCLUDED.customer_country,
            net_amount = EXCLUDED.net_amount,
            transaction_count = EXCLUDED.transaction_count,
            updated_at = NOW();
            
        -- Delete ICP record if no more transactions
        DELETE FROM icp_declarations 
        WHERE tenant_id = OLD.tenant_id
          AND year = form_year
          AND quarter = form_quarter  
          AND customer_vat_number = OLD.customer_vat_number
          AND NOT EXISTS (
              SELECT 1 FROM invoices i2
              WHERE i2.tenant_id = OLD.tenant_id
                AND i2.export_classification = 'eu_b2b'
                AND i2.customer_vat_number = OLD.customer_vat_number
                AND EXTRACT(year FROM i2.invoice_date) = form_year
                AND EXTRACT(quarter FROM i2.invoice_date) = form_quarter
                AND i2.status NOT IN ('draft', 'cancelled')
          );
    ELSE
        -- Insert or update ICP declaration
        INSERT INTO icp_declarations (
            tenant_id, year, quarter, customer_vat_number, customer_name, customer_country, net_amount, transaction_count
        )
        SELECT 
            i.tenant_id,
            EXTRACT(year FROM i.invoice_date)::integer,
            EXTRACT(quarter FROM i.invoice_date)::integer,
            i.customer_vat_number,
            c.name,
            i.place_of_supply_country,
            SUM(i.subtotal),
            COUNT(*)
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        WHERE i.tenant_id = NEW.tenant_id
          AND i.export_classification = 'eu_b2b'
          AND i.customer_vat_number = NEW.customer_vat_number
          AND EXTRACT(year FROM i.invoice_date) = form_year
          AND EXTRACT(quarter FROM i.invoice_date) = form_quarter
          AND i.status NOT IN ('draft', 'cancelled')
        GROUP BY i.tenant_id, EXTRACT(year FROM i.invoice_date), EXTRACT(quarter FROM i.invoice_date),
                 i.customer_vat_number, c.name, i.place_of_supply_country
        ON CONFLICT (tenant_id, year, quarter, customer_vat_number) 
        DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            customer_country = EXCLUDED.customer_country,
            net_amount = EXCLUDED.net_amount,
            transaction_count = EXCLUDED.transaction_count,
            updated_at = NOW();
    END IF;
    
    -- Update validation status in BTW form
    UPDATE quarterly_btw_forms 
    SET 
        icp_total_validation = (
            SELECT COALESCE(SUM(net_amount), 0) 
            FROM icp_declarations 
            WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
              AND year = form_year 
              AND quarter = form_quarter
        ),
        form_status = CASE 
            WHEN form_status = 'submitted' THEN 'needs_resubmission'
            ELSE form_status
        END
    WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND year = form_year
      AND quarter = form_quarter;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ICP declaration sync
DROP TRIGGER IF EXISTS sync_invoice_to_icp_trigger ON invoices;
CREATE TRIGGER sync_invoice_to_icp_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_to_icp_declaration();

-- =====================================================
-- AUTOMATED TRADE TRANSACTION SYNC (CORRECTED)
-- =====================================================

-- Function to create trade transactions from international invoices and expenses
CREATE OR REPLACE FUNCTION sync_to_trade_transactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle invoice international transactions
    IF TG_TABLE_NAME = 'invoices' THEN
        IF NEW.export_classification IN ('eu_b2b', 'eu_installation', 'non_eu_export') THEN
            INSERT INTO international_trade_transactions (
                tenant_id, transaction_direction, partner_country, partner_vat_number, partner_name,
                net_amount, vat_amount, transaction_date, transaction_nature,
                btw_section, btw_rubriek, source_document_type, source_document_id
            ) VALUES (
                NEW.tenant_id,
                'export',
                NEW.place_of_supply_country,
                NEW.customer_vat_number,
                (SELECT name FROM clients WHERE id = NEW.client_id),
                NEW.subtotal,
                NEW.vat_amount,
                NEW.invoice_date,
                NEW.transaction_nature,
                3, -- Section 3: Exports
                CASE 
                    WHEN NEW.export_classification = 'non_eu_export' THEN '3a'
                    WHEN NEW.export_classification = 'eu_b2b' THEN '3b'
                    WHEN NEW.export_classification = 'eu_installation' THEN '3c'
                END,
                'invoice',
                NEW.id
            )
            ON CONFLICT (tenant_id, source_document_type, source_document_id)
            DO UPDATE SET
                partner_country = EXCLUDED.partner_country,
                partner_vat_number = EXCLUDED.partner_vat_number,
                partner_name = EXCLUDED.partner_name,
                net_amount = EXCLUDED.net_amount,
                vat_amount = EXCLUDED.vat_amount,
                transaction_date = EXCLUDED.transaction_date,
                btw_rubriek = EXCLUDED.btw_rubriek;
        END IF;
    
    -- Handle expense international transactions (Section 4: Imports)
    ELSIF TG_TABLE_NAME = 'expenses' THEN
        IF NEW.acquisition_type IN ('eu_goods', 'eu_services', 'import_goods', 'import_services') THEN
            INSERT INTO international_trade_transactions (
                tenant_id, transaction_direction, partner_country, partner_vat_number, partner_name,
                net_amount, vat_amount, transaction_date, transaction_nature,
                btw_section, btw_rubriek, source_document_type, source_document_id
            ) VALUES (
                NEW.tenant_id,
                'import',
                NEW.supplier_country,
                NEW.supplier_vat_number_corrected,
                NEW.vendor_name || ' (' || NEW.title || ')', -- Combine vendor name and title
                NEW.amount,
                COALESCE(NEW.reverse_charge_received, NEW.import_vat_paid, NEW.vat_amount),
                NEW.expense_date,
                CASE WHEN NEW.acquisition_type LIKE '%goods%' THEN 'goods' ELSE 'services' END,
                4, -- Section 4: Imports
                CASE 
                    WHEN NEW.acquisition_type IN ('eu_goods', 'eu_services') THEN '4a'
                    WHEN NEW.acquisition_type IN ('import_goods', 'import_services') THEN '4b'
                END,
                'expense',
                NEW.id
            )
            ON CONFLICT (tenant_id, source_document_type, source_document_id)
            DO UPDATE SET
                partner_country = EXCLUDED.partner_country,
                partner_vat_number = EXCLUDED.partner_vat_number,
                partner_name = EXCLUDED.partner_name,
                net_amount = EXCLUDED.net_amount,
                vat_amount = EXCLUDED.vat_amount,
                transaction_date = EXCLUDED.transaction_date,
                btw_rubriek = EXCLUDED.btw_rubriek;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for trade transaction sync
DROP TRIGGER IF EXISTS sync_invoice_to_trade_trigger ON invoices;
CREATE TRIGGER sync_invoice_to_trade_trigger
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_to_trade_transactions();

DROP TRIGGER IF EXISTS sync_expense_to_trade_trigger ON expenses;
CREATE TRIGGER sync_expense_to_trade_trigger
    AFTER INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION sync_to_trade_transactions();

-- =====================================================
-- BTW FORM VALIDATION AUTOMATION
-- =====================================================

-- Function to automatically validate BTW forms when updated
CREATE OR REPLACE FUNCTION auto_validate_btw_form()
RETURNS TRIGGER AS $$
DECLARE
    validation_result jsonb;
BEGIN
    -- Run validation when form is updated
    validation_result := validate_corrected_btw_form(NEW.tenant_id, NEW.year, NEW.quarter);
    
    -- Update validation fields
    NEW.validation_passed := (validation_result->>'valid')::boolean;
    NEW.validation_errors := validation_result->'issues';
    NEW.validation_warnings := validation_result->'warnings';
    NEW.updated_at := NOW();
    
    -- Set status based on validation
    IF NEW.validation_passed THEN
        IF NEW.form_status = 'calculated' THEN
            NEW.form_status := 'validated';
        END IF;
    ELSE
        IF NEW.form_status = 'validated' THEN
            NEW.form_status := 'calculated';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic BTW form validation
DROP TRIGGER IF EXISTS auto_validate_btw_form_trigger ON quarterly_btw_forms;
CREATE TRIGGER auto_validate_btw_form_trigger
    BEFORE UPDATE ON quarterly_btw_forms
    FOR EACH ROW
    EXECUTE FUNCTION auto_validate_btw_form();

-- =====================================================
-- MAINTENANCE AND CLEANUP FUNCTIONS
-- =====================================================

-- FIXED: Function to recalculate BTW forms for a period (resolves set-returning function error)
CREATE OR REPLACE FUNCTION recalculate_btw_forms_for_period(
    p_tenant_id UUID,
    p_year INTEGER,
    p_quarter INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    quarter_to_process INTEGER;
    quarters_to_process INTEGER[];
BEGIN
    -- FIXED: Build array of quarters to process instead of using generate_series in CASE
    IF p_quarter IS NULL THEN
        quarters_to_process := ARRAY[1, 2, 3, 4];
    ELSE
        quarters_to_process := ARRAY[p_quarter];
    END IF;
    
    -- Process each quarter
    FOREACH quarter_to_process IN ARRAY quarters_to_process
    LOOP
        -- Ensure BTW form exists
        INSERT INTO quarterly_btw_forms (tenant_id, year, quarter)
        VALUES (p_tenant_id, p_year, quarter_to_process)
        ON CONFLICT (tenant_id, year, quarter) DO NOTHING;
        
        -- Recalculate from views
        UPDATE quarterly_btw_forms 
        SET 
            -- Copy all calculated values from view
            rubriek_1a_omzet = calc.rubriek_1a_omzet,
            rubriek_1a_btw = calc.rubriek_1a_btw,
            rubriek_1b_omzet = calc.rubriek_1b_omzet,
            rubriek_1b_btw = calc.rubriek_1b_btw,
            rubriek_1c_omzet = calc.rubriek_1c_omzet,
            rubriek_1c_btw = calc.rubriek_1c_btw,
            rubriek_1e_omzet = calc.rubriek_1e_omzet,
            rubriek_2a_omzet = calc.rubriek_2a_omzet,
            rubriek_2a_btw = calc.rubriek_2a_btw,
            rubriek_3a_omzet = calc.rubriek_3a_omzet,
            rubriek_3b_omzet = calc.rubriek_3b_omzet,
            rubriek_3c_omzet = calc.rubriek_3c_omzet,
            rubriek_4a_omzet = calc.rubriek_4a_omzet,
            rubriek_4a_btw = calc.rubriek_4a_btw,
            rubriek_4b_omzet = calc.rubriek_4b_omzet,
            rubriek_4b_btw = calc.rubriek_4b_btw,
            rubriek_5a_verschuldigde_btw = calc.rubriek_5a_verschuldigde_btw,
            rubriek_5b_voorbelasting = calc.rubriek_5b_voorbelasting,
            suppletie_correction = calc.suppletie_corrections,
            icp_total_validation = calc.rubriek_3b_omzet,
            updated_at = NOW(),
            form_status = 'calculated'
        FROM btw_form_calculation calc
        WHERE quarterly_btw_forms.tenant_id = calc.tenant_id
          AND quarterly_btw_forms.year = calc.year
          AND quarterly_btw_forms.quarter = calc.quarter
          AND quarterly_btw_forms.tenant_id = p_tenant_id
          AND quarterly_btw_forms.year = p_year
          AND quarterly_btw_forms.quarter = quarter_to_process;
    END LOOP;
    
    RAISE NOTICE 'Recalculated BTW forms for tenant % year % quarter %', p_tenant_id, p_year, COALESCE(p_quarter::text, 'ALL');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for maintenance cleanup
CREATE OR REPLACE FUNCTION maintain_corrected_btw_system()
RETURNS void AS $$
BEGIN
    -- Clean up old validation records
    DELETE FROM invoice_btw_classification 
    WHERE classification_date < CURRENT_DATE - INTERVAL '2 years';
    
    DELETE FROM expense_vat_calculation 
    WHERE calculation_date < CURRENT_DATE - INTERVAL '2 years';
    
    -- Update validation status for all active forms
    UPDATE quarterly_btw_forms 
    SET updated_at = NOW()
    WHERE form_status IN ('calculated', 'validated')
      AND year >= EXTRACT(year FROM CURRENT_DATE) - 2;
    
    -- Cleanup orphaned trade transactions
    DELETE FROM international_trade_transactions 
    WHERE source_document_type = 'invoice' 
      AND NOT EXISTS (SELECT 1 FROM invoices WHERE id = source_document_id)
      OR source_document_type = 'expense'
      AND NOT EXISTS (SELECT 1 FROM expenses WHERE id = source_document_id);
    
    RAISE NOTICE 'BTW system maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA SYNC (FIXED - simplified approach)
-- =====================================================

-- FIXED: Sync existing data to new structure (no generate_series issues)
DO $$
DECLARE
    tenant_record RECORD;
    current_year INTEGER := EXTRACT(year FROM CURRENT_DATE)::integer;
    previous_year INTEGER := EXTRACT(year FROM CURRENT_DATE)::integer - 1;
    current_quarter INTEGER := EXTRACT(quarter FROM CURRENT_DATE)::integer;
BEGIN
    -- Process each tenant
    FOR tenant_record IN SELECT DISTINCT tenant_id FROM invoices WHERE tenant_id IS NOT NULL LOOP
        -- Recalculate current year quarters (1, 2, 3, 4)
        PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, current_year, 1);
        PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, current_year, 2);
        PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, current_year, 3);
        PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, current_year, 4);
        
        -- Recalculate previous year if we're in Q1
        IF current_quarter = 1 THEN
            PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, previous_year, 1);
            PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, previous_year, 2);
            PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, previous_year, 3);
            PERFORM recalculate_btw_forms_for_period(tenant_record.tenant_id, previous_year, 4);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Initial BTW form sync completed for all tenants';
END $$;

-- =====================================================
-- DOCUMENTATION AND FINAL COMMENTS
-- =====================================================

COMMENT ON FUNCTION sync_invoice_to_btw_form IS 'Automatically sync invoice changes to BTW forms with CORRECTED rubriek mappings';
COMMENT ON FUNCTION sync_expense_to_btw_form IS 'Sync expense changes to BTW form Section 5b (Voorbelasting) using CORRECTED structure';  
COMMENT ON FUNCTION sync_invoice_to_icp_declaration IS 'Automatically create/update ICP declarations from EU B2B invoices (Section 3b)';
COMMENT ON FUNCTION recalculate_btw_forms_for_period IS 'FIXED: Recalculate BTW forms using CORRECTED calculations for specified period';
COMMENT ON FUNCTION maintain_corrected_btw_system IS 'Maintenance function for CORRECTED BTW system cleanup and optimization';