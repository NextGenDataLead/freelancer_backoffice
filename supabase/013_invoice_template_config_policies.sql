-- Invoice Template Configuration RLS Policies  
-- Migration 013: Security policies for invoice template configuration
-- Generated with Claude Code (https://claude.ai/code)

-- =============================================================================
-- ADDITIONAL SECURITY POLICIES
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_template_config TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant execute permissions on template functions
GRANT EXECUTE ON FUNCTION public.get_active_template_config(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_template_config(uuid, uuid) TO authenticated;

-- =============================================================================
-- AUDIT TRIGGER FOR TEMPLATE CHANGES  
-- =============================================================================

-- Create audit log trigger for template configuration changes
CREATE OR REPLACE FUNCTION public.audit_invoice_template_config_changes()
RETURNS TRIGGER AS $$
BEGIN
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
            NEW.id::text,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW), 
            auth.uid(),
            now(),
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            current_setting('request.headers', true)::json->>'user-agent'
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
            NEW.id::text,
            'INSERT',
            to_jsonb(NEW),
            auth.uid(),
            now(),
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            current_setting('request.headers', true)::json->>'user-agent'  
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
            OLD.id::text, 
            'DELETE',
            to_jsonb(OLD),
            auth.uid(),
            now(),
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            current_setting('request.headers', true)::json->>'user-agent'
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
-- HELPER FUNCTIONS FOR TEMPLATE VALIDATION
-- =============================================================================

-- Function to validate brand settings JSON structure
CREATE OR REPLACE FUNCTION public.validate_brand_settings(brand_settings jsonb)
RETURNS boolean AS $$
BEGIN
    -- Check required fields exist
    IF NOT (
        brand_settings ? 'primary_color' AND
        brand_settings ? 'secondary_color' AND 
        brand_settings ? 'font_family' AND
        brand_settings ? 'show_logo'
    ) THEN
        RETURN false;
    END IF;
    
    -- Validate color formats (basic hex color validation)
    IF NOT (
        brand_settings->>'primary_color' ~ '^#[0-9A-Fa-f]{6}$' AND
        brand_settings->>'secondary_color' ~ '^#[0-9A-Fa-f]{6}$'
    ) THEN
        RETURN false;
    END IF;
    
    -- Validate boolean fields
    IF NOT (
        jsonb_typeof(brand_settings->'show_logo') = 'boolean'
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to validate layout settings JSON structure  
CREATE OR REPLACE FUNCTION public.validate_layout_settings(layout_settings jsonb)
RETURNS boolean AS $$
BEGIN
    -- Check required fields exist
    IF NOT (
        layout_settings ? 'format' AND
        layout_settings ? 'orientation' AND
        layout_settings ? 'margins' AND
        layout_settings ? 'header_style' AND
        layout_settings ? 'footer_style'
    ) THEN
        RETURN false;
    END IF;
    
    -- Validate format values
    IF NOT (layout_settings->>'format' IN ('A4', 'Letter')) THEN
        RETURN false;
    END IF;
    
    -- Validate orientation values
    IF NOT (layout_settings->>'orientation' IN ('portrait', 'landscape')) THEN
        RETURN false;
    END IF;
    
    -- Validate header/footer styles
    IF NOT (
        layout_settings->>'header_style' IN ('modern', 'classic', 'minimal') AND
        layout_settings->>'footer_style' IN ('simple', 'detailed', 'minimal')
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to validate compliance settings JSON structure
CREATE OR REPLACE FUNCTION public.validate_compliance_settings(compliance_settings jsonb)
RETURNS boolean AS $$
BEGIN  
    -- Check required fields exist
    IF NOT (
        compliance_settings ? 'language' AND
        compliance_settings ? 'currency' AND
        compliance_settings ? 'vat_display' AND
        compliance_settings ? 'eu_compliant'
    ) THEN
        RETURN false;
    END IF;
    
    -- Validate language codes  
    IF NOT (compliance_settings->>'language' IN ('nl', 'en')) THEN
        RETURN false;
    END IF;
    
    -- Validate currency codes
    IF NOT (compliance_settings->>'currency' = 'EUR') THEN
        RETURN false; -- MVP only supports EUR
    END IF;
    
    -- Validate VAT display options
    IF NOT (compliance_settings->>'vat_display' IN ('detailed', 'summary', 'minimal')) THEN
        RETURN false;
    END IF;
    
    -- Validate boolean fields
    IF NOT (jsonb_typeof(compliance_settings->'eu_compliant') = 'boolean') THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION CONSTRAINTS
-- =============================================================================

-- Add check constraints for JSON validation
ALTER TABLE public.invoice_template_config 
ADD CONSTRAINT check_valid_brand_settings 
CHECK (public.validate_brand_settings(brand_settings));

ALTER TABLE public.invoice_template_config
ADD CONSTRAINT check_valid_layout_settings
CHECK (public.validate_layout_settings(layout_settings)); 

ALTER TABLE public.invoice_template_config
ADD CONSTRAINT check_valid_compliance_settings
CHECK (public.validate_compliance_settings(compliance_settings));

-- =============================================================================
-- TEMPLATE INITIALIZATION TRIGGER
-- =============================================================================

-- Function to automatically create default template config for new tenants
CREATE OR REPLACE FUNCTION public.initialize_template_config_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default template config when a new profile is created
    IF NEW.onboarding_complete = true AND OLD.onboarding_complete = false THEN
        PERFORM public.create_default_template_config(NEW.tenant_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table to auto-create template config
CREATE TRIGGER initialize_template_config_trigger
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.initialize_template_config_for_tenant();

-- =============================================================================
-- ADDITIONAL SECURITY MEASURES
-- =============================================================================

-- Prevent unauthorized access to system templates
CREATE POLICY "Prevent access to system templates" ON public.invoice_template_config
    FOR ALL USING (
        tenant_id != '00000000-0000-0000-0000-000000000000'::uuid
        OR auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid
    );

-- Rate limiting for template updates (prevent excessive API calls)
CREATE OR REPLACE FUNCTION public.check_template_update_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_updates integer;
BEGIN
    -- Count updates in the last 5 minutes
    SELECT COUNT(*) INTO recent_updates
    FROM public.transaction_log
    WHERE entity_type = 'invoice_template_config'
    AND entity_id = NEW.id::text
    AND action = 'UPDATE'
    AND changed_at > (now() - interval '5 minutes')
    AND changed_by = auth.uid();
    
    -- Allow maximum 10 updates per 5 minutes
    IF recent_updates >= 10 THEN
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
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION public.validate_brand_settings(jsonb) IS 'Validates brand settings JSON structure and values';
COMMENT ON FUNCTION public.validate_layout_settings(jsonb) IS 'Validates layout settings JSON structure and values'; 
COMMENT ON FUNCTION public.validate_compliance_settings(jsonb) IS 'Validates compliance settings JSON structure and values';
COMMENT ON FUNCTION public.initialize_template_config_for_tenant() IS 'Automatically creates default template config for new tenants';
COMMENT ON FUNCTION public.check_template_update_rate_limit() IS 'Rate limiting for template configuration updates';

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>