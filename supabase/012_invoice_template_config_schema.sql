-- Invoice Template Configuration - MVP Schema
-- Migration 012: Simple template configuration for single professional template
-- Generated with Claude Code (https://claude.ai/code)

-- =============================================================================
-- INVOICE TEMPLATE CONFIGURATION (MVP)
-- =============================================================================

-- Simple template configuration table for MVP
CREATE TABLE public.invoice_template_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name varchar(100) DEFAULT 'Professional Template',
    description text DEFAULT 'Professional invoice template with Dutch VAT compliance',
    
    -- Brand Settings
    brand_settings jsonb NOT NULL DEFAULT '{
        "logo_url": null,
        "business_name_override": null,
        "primary_color": "#2563eb",
        "secondary_color": "#64748b", 
        "accent_color": "#0ea5e9",
        "text_color": "#1f2937",
        "background_color": "#ffffff",
        "font_family": "Inter",
        "show_logo": true,
        "logo_width": "120px",
        "logo_position": "left"
    }'::jsonb,
    
    -- Layout Settings
    layout_settings jsonb NOT NULL DEFAULT '{
        "format": "A4",
        "orientation": "portrait",
        "margins": {
            "top": "20mm",
            "right": "20mm", 
            "bottom": "20mm",
            "left": "20mm"
        },
        "header_style": "modern",
        "footer_style": "simple", 
        "color_scheme": "blue",
        "spacing": "comfortable",
        "border_style": "subtle"
    }'::jsonb,
    
    -- Compliance and Legal Settings
    compliance_settings jsonb NOT NULL DEFAULT '{
        "language": "nl",
        "currency": "EUR",
        "date_format": "DD-MM-YYYY", 
        "number_format": "nl-NL",
        "vat_display": "detailed",
        "show_payment_terms": true,
        "include_kvk": true,
        "include_btw": true,
        "eu_compliant": true,
        "show_reverse_charge_notice": true,
        "payment_qr_code": false
    }'::jsonb,
    
    -- Advanced Features
    features jsonb NOT NULL DEFAULT '{
        "watermark_enabled": false,
        "watermark_text": "CONCEPT",
        "custom_footer_text": null,
        "show_page_numbers": false,
        "include_terms_conditions": false,
        "email_template": "professional"
    }'::jsonb,
    
    -- Template Status
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone
);

-- =============================================================================
-- INDEXES AND CONSTRAINTS
-- =============================================================================

-- Indexes for performance
CREATE INDEX idx_invoice_template_config_tenant_id ON public.invoice_template_config(tenant_id);
CREATE INDEX idx_invoice_template_config_created_by ON public.invoice_template_config(created_by);
CREATE INDEX idx_invoice_template_config_active ON public.invoice_template_config(tenant_id, is_active) WHERE is_active = true;

-- GIN indexes for JSONB columns for efficient JSON queries
CREATE INDEX idx_invoice_template_config_brand_settings ON public.invoice_template_config USING gin(brand_settings);
CREATE INDEX idx_invoice_template_config_layout_settings ON public.invoice_template_config USING gin(layout_settings);

-- Ensure only one default template per tenant
CREATE UNIQUE INDEX idx_invoice_template_config_default_unique 
ON public.invoice_template_config(tenant_id) 
WHERE is_default = true;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.invoice_template_config ENABLE ROW LEVEL SECURITY;

-- Users can view their tenant's template configs
CREATE POLICY "Users can view own tenant template configs" ON public.invoice_template_config
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Users can create template configs for their tenant
CREATE POLICY "Users can create template configs for own tenant" ON public.invoice_template_config
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND created_by = auth.uid()
    );

-- Users can update their tenant's template configs
CREATE POLICY "Users can update own tenant template configs" ON public.invoice_template_config
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- Users can delete their tenant's template configs
CREATE POLICY "Users can delete own tenant template configs" ON public.invoice_template_config
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE TRIGGER update_invoice_template_config_updated_at
    BEFORE UPDATE ON public.invoice_template_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update last_used_at when template is used
CREATE OR REPLACE FUNCTION public.update_template_last_used()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be called from the invoice generation process
    UPDATE public.invoice_template_config
    SET last_used_at = now()
    WHERE tenant_id = NEW.tenant_id AND is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTIONS FOR TEMPLATE MANAGEMENT
-- =============================================================================

-- Function to get active template config for a tenant
CREATE OR REPLACE FUNCTION public.get_active_template_config(p_tenant_id uuid)
RETURNS public.invoice_template_config AS $$
DECLARE
    template_config public.invoice_template_config;
BEGIN
    SELECT * INTO template_config
    FROM public.invoice_template_config
    WHERE tenant_id = p_tenant_id 
    AND is_active = true
    ORDER BY is_default DESC, updated_at DESC
    LIMIT 1;
    
    RETURN template_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default template config for new tenants
CREATE OR REPLACE FUNCTION public.create_default_template_config(
    p_tenant_id uuid,
    p_created_by uuid
)
RETURNS uuid AS $$
DECLARE
    new_config_id uuid;
BEGIN
    INSERT INTO public.invoice_template_config (
        tenant_id,
        created_by,
        name,
        description,
        is_active,
        is_default
    ) VALUES (
        p_tenant_id,
        p_created_by,
        'Professional Template',
        'Professional invoice template with Dutch VAT compliance and modern design',
        true,
        true
    ) RETURNING id INTO new_config_id;
    
    RETURN new_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTIONS FOR DEFAULT TEMPLATE CREATION
-- =============================================================================

-- Function to create default template config for existing tenants (one-time setup)
CREATE OR REPLACE FUNCTION public.create_default_templates_for_existing_tenants()
RETURNS void AS $$
DECLARE
    tenant_record RECORD;
    admin_user_id uuid;
BEGIN
    -- Loop through all existing tenants that don't have a template config
    FOR tenant_record IN 
        SELECT t.id as tenant_id, t.name
        FROM public.tenants t
        WHERE NOT EXISTS (
            SELECT 1 FROM public.invoice_template_config 
            WHERE tenant_id = t.id
        )
    LOOP
        -- Get the first admin/owner user for this tenant
        SELECT p.id INTO admin_user_id
        FROM public.profiles p
        WHERE p.tenant_id = tenant_record.tenant_id
        AND p.role IN ('owner', 'admin')
        AND p.is_active = true
        ORDER BY p.created_at ASC
        LIMIT 1;
        
        -- If no admin found, skip this tenant
        IF admin_user_id IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Create default template config for this tenant
        INSERT INTO public.invoice_template_config (
            tenant_id,
            created_by,
            name,
            description,
            is_active,
            is_default
        ) VALUES (
            tenant_record.tenant_id,
            admin_user_id,
            'Professional Template',
            'Professional invoice template with Dutch VAT compliance and modern design',
            true,
            true
        );
        
        RAISE NOTICE 'Created default template for tenant: %', tenant_record.name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to create defaults for existing tenants
DO $$
BEGIN
    PERFORM public.create_default_templates_for_existing_tenants();
    RAISE NOTICE 'Default template creation completed for existing tenants.';
END $$;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.invoice_template_config IS 'MVP: Single configurable professional invoice template per tenant';

COMMENT ON COLUMN public.invoice_template_config.brand_settings IS 'Brand customization: logo, colors, fonts, business name override';
COMMENT ON COLUMN public.invoice_template_config.layout_settings IS 'Layout configuration: format, margins, header/footer styles, spacing';
COMMENT ON COLUMN public.invoice_template_config.compliance_settings IS 'Legal compliance: language, VAT display, Dutch/EU requirements';
COMMENT ON COLUMN public.invoice_template_config.features IS 'Advanced features: watermarks, QR codes, custom footer, email templates';