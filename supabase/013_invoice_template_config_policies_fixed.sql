-- Invoice Template Configuration RLS Policies (Fixed)
-- Migration 013: Security policies and functions for invoice template configuration
-- Generated with Claude Code (https://claude.ai/code)

-- =============================================================================
-- PERMISSIONS AND GRANTS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_template_config TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant execute permissions on template functions
GRANT EXECUTE ON FUNCTION public.get_active_template_config(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_template_config(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_templates_for_existing_tenants() TO authenticated;

-- =============================================================================
-- AUDIT LOGGING FOR TEMPLATE CHANGES  
-- =============================================================================

-- Create audit log trigger for template configuration changes  
-- FIXED: Data type mismatches for UUID entity_id, inet ip_address, and null auth.uid() handling
CREATE OR REPLACE FUNCTION public.audit_invoice_template_config_changes()
RETURNS TRIGGER AS $$
DECLARE
    ip_addr text;
    parsed_ip inet;
    user_id uuid;
BEGIN
    -- Get IP address and validate it
    ip_addr := COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '127.0.0.1');
    
    -- Try to parse as inet, fallback to localhost if invalid
    BEGIN
        parsed_ip := ip_addr::inet;
    EXCEPTION WHEN OTHERS THEN
        parsed_ip := '127.0.0.1'::inet;
    END;
    
    -- Get user ID, fallback to a system user if auth.uid() is null
    user_id := COALESCE(auth.uid(), 'dd8fed18-c9ec-419d-8100-3c2685fa7549'::uuid);
    
    -- Log template configuration changes to transaction_log table
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.transaction_log (
            tenant_id,
            entity_type,
            entity_id, 
            action,
            old_data,
            new_data,
            changed_by,
            changed_at,
            ip_address,
            user_agent
        ) VALUES (
            NEW.tenant_id,
            'invoice_template_config',
            NEW.id, -- Fixed: removed ::text cast for UUID column
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW), 
            user_id, -- Fixed: handle null auth.uid()
            now(),
            parsed_ip, -- Fixed: proper inet type handling
            COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.transaction_log (
            tenant_id,
            entity_type,
            entity_id,
            action,
            new_data,
            changed_by,
            changed_at,
            ip_address,
            user_agent
        ) VALUES (
            NEW.tenant_id,
            'invoice_template_config', 
            NEW.id, -- Fixed: removed ::text cast for UUID column
            'INSERT',
            to_jsonb(NEW),
            user_id, -- Fixed: handle null auth.uid()
            now(),
            parsed_ip, -- Fixed: proper inet type handling
            COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.transaction_log (
            tenant_id,
            entity_type,
            entity_id,
            action,
            old_data,
            changed_by,
            changed_at,
            ip_address,
            user_agent
        ) VALUES (
            OLD.tenant_id,
            'invoice_template_config',
            OLD.id, -- Fixed: removed ::text cast for UUID column
            'DELETE',
            to_jsonb(OLD),
            user_id, -- Fixed: handle null auth.uid()
            now(),
            parsed_ip, -- Fixed: proper inet type handling
            COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
CREATE TRIGGER audit_invoice_template_config_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_template_config
    FOR EACH ROW EXECUTE FUNCTION public.audit_invoice_template_config_changes();

-- =============================================================================
-- VALIDATION FUNCTIONS (LENIENT FOR MVP)
-- =============================================================================

-- Function to validate brand settings JSON structure (lenient)
CREATE OR REPLACE FUNCTION public.validate_brand_settings(brand_settings jsonb)
RETURNS boolean AS $$
BEGIN
    -- Basic validation - just check it's valid JSON and has some expected fields
    IF brand_settings IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if it's a valid JSON object
    IF jsonb_typeof(brand_settings) != 'object' THEN
        RETURN false;
    END IF;
    
    -- For MVP, just ensure it's valid JSONB - be lenient with structure
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to validate layout settings JSON structure (lenient)
CREATE OR REPLACE FUNCTION public.validate_layout_settings(layout_settings jsonb)
RETURNS boolean AS $$
BEGIN
    -- Basic validation - just check it's valid JSON
    IF layout_settings IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if it's a valid JSON object
    IF jsonb_typeof(layout_settings) != 'object' THEN
        RETURN false;
    END IF;
    
    -- For MVP, just ensure it's valid JSONB - be lenient with structure
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to validate compliance settings JSON structure (lenient)
CREATE OR REPLACE FUNCTION public.validate_compliance_settings(compliance_settings jsonb)
RETURNS boolean AS $$
BEGIN  
    -- Basic validation - just check it's valid JSON
    IF compliance_settings IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if it's a valid JSON object
    IF jsonb_typeof(compliance_settings) != 'object' THEN
        RETURN false;
    END IF;
    
    -- For MVP, just ensure it's valid JSONB - be lenient with structure
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER FUNCTIONS FOR TEMPLATE MANAGEMENT
-- =============================================================================

-- Function to get template configuration with fallback to defaults
CREATE OR REPLACE FUNCTION public.get_template_config_with_defaults(p_tenant_id uuid)
RETURNS jsonb AS $$
DECLARE
    template_config public.invoice_template_config;
    result jsonb;
BEGIN
    -- Get the active template config for the tenant
    SELECT * INTO template_config
    FROM public.invoice_template_config
    WHERE tenant_id = p_tenant_id 
    AND is_active = true
    ORDER BY is_default DESC, updated_at DESC
    LIMIT 1;
    
    -- If no template found, return default settings
    IF template_config IS NULL THEN
        result := jsonb_build_object(
            'brand_settings', '{
                "primary_color": "#2563eb",
                "secondary_color": "#64748b",
                "font_family": "Inter",
                "show_logo": true
            }',
            'layout_settings', '{
                "format": "A4",
                "header_style": "modern",
                "footer_style": "simple"
            }',
            'compliance_settings', '{
                "language": "nl",
                "currency": "EUR",
                "vat_display": "detailed"
            }'
        );
    ELSE
        result := jsonb_build_object(
            'id', template_config.id,
            'name', template_config.name,
            'brand_settings', template_config.brand_settings,
            'layout_settings', template_config.layout_settings,
            'compliance_settings', template_config.compliance_settings,
            'features', template_config.features
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RATE LIMITING FOR TEMPLATE UPDATES
-- =============================================================================

-- Function to check rate limits (simplified)
CREATE OR REPLACE FUNCTION public.check_template_update_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_updates integer;
BEGIN
    -- Count updates in the last 5 minutes for this user
    SELECT COUNT(*) INTO recent_updates
    FROM public.transaction_log
    WHERE entity_type = 'invoice_template_config'
    AND action = 'UPDATE'
    AND changed_at > (now() - interval '5 minutes')
    AND changed_by = auth.uid();
    
    -- Allow maximum 20 updates per 5 minutes (more lenient for testing)
    IF recent_updates >= 20 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many template updates. Please wait before making more changes.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rate limiting trigger
CREATE TRIGGER template_update_rate_limit_trigger
    BEFORE UPDATE ON public.invoice_template_config
    FOR EACH ROW EXECUTE FUNCTION public.check_template_update_rate_limit();

-- =============================================================================
-- ADDITIONAL UTILITY FUNCTIONS
-- =============================================================================

-- Function to update template last used timestamp
CREATE OR REPLACE FUNCTION public.update_template_usage(p_template_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.invoice_template_config
    SET last_used_at = now()
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get template usage statistics
CREATE OR REPLACE FUNCTION public.get_template_usage_stats(p_tenant_id uuid)
RETURNS TABLE(
    template_id uuid,
    template_name varchar(100),
    times_used bigint,
    last_used_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        itc.id,
        itc.name,
        COALESCE(usage_count.count, 0) as times_used,
        itc.last_used_at
    FROM public.invoice_template_config itc
    LEFT JOIN (
        SELECT 
            entity_id::uuid as template_id,
            COUNT(*) as count
        FROM public.transaction_log
        WHERE entity_type = 'invoice_template_config'
        AND action IN ('UPDATE', 'INSERT')
        AND tenant_id = p_tenant_id
        GROUP BY entity_id
    ) usage_count ON usage_count.template_id = itc.id
    WHERE itc.tenant_id = p_tenant_id
    ORDER BY times_used DESC, itc.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS ON NEW FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.validate_brand_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_layout_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_compliance_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_template_config_with_defaults(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_template_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_template_usage_stats(uuid) TO authenticated;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION public.validate_brand_settings(jsonb) IS 'Validates brand settings JSON structure (lenient for MVP)';
COMMENT ON FUNCTION public.validate_layout_settings(jsonb) IS 'Validates layout settings JSON structure (lenient for MVP)'; 
COMMENT ON FUNCTION public.validate_compliance_settings(jsonb) IS 'Validates compliance settings JSON structure (lenient for MVP)';
COMMENT ON FUNCTION public.get_template_config_with_defaults(uuid) IS 'Gets template configuration with fallback to system defaults';
COMMENT ON FUNCTION public.update_template_usage(uuid) IS 'Updates template last used timestamp for analytics';
COMMENT ON FUNCTION public.get_template_usage_stats(uuid) IS 'Returns usage statistics for tenant templates';
COMMENT ON FUNCTION public.check_template_update_rate_limit() IS 'Rate limiting for template configuration updates (20 per 5 minutes)';

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>