-- Migration: Create invoice_item_templates table
-- Description: Store reusable invoice line item templates for faster invoice creation
-- Generated with Claude Code (https://claude.com/claude-code)

-- Create invoice_item_templates table
CREATE TABLE IF NOT EXISTS public.invoice_item_templates (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenancy
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Template metadata
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_payment_terms_days INTEGER,

    -- Template items (JSONB array of line items)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT invoice_item_templates_name_tenant_unique UNIQUE (tenant_id, name),
    CONSTRAINT invoice_item_templates_items_check CHECK (jsonb_typeof(items) = 'array'),
    CONSTRAINT invoice_item_templates_payment_terms_check CHECK (default_payment_terms_days IS NULL OR default_payment_terms_days > 0)
);

-- Add indexes for better query performance
CREATE INDEX idx_invoice_item_templates_tenant_id ON public.invoice_item_templates(tenant_id);
CREATE INDEX idx_invoice_item_templates_created_by ON public.invoice_item_templates(created_by);
CREATE INDEX idx_invoice_item_templates_created_at ON public.invoice_item_templates(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.invoice_item_templates IS 'Reusable invoice line item templates for faster invoice creation';
COMMENT ON COLUMN public.invoice_item_templates.id IS 'Unique identifier for the template';
COMMENT ON COLUMN public.invoice_item_templates.tenant_id IS 'Reference to the tenant who owns this template';
COMMENT ON COLUMN public.invoice_item_templates.created_by IS 'User who created this template';
COMMENT ON COLUMN public.invoice_item_templates.name IS 'Template name (must be unique per tenant)';
COMMENT ON COLUMN public.invoice_item_templates.description IS 'Optional description of the template';
COMMENT ON COLUMN public.invoice_item_templates.default_payment_terms_days IS 'Default payment terms in days when using this template';
COMMENT ON COLUMN public.invoice_item_templates.items IS 'JSONB array of invoice line items [{description, quantity, unit_price}]';

-- Enable Row Level Security
ALTER TABLE public.invoice_item_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view templates in their tenant
CREATE POLICY "Users can view templates in their tenant"
    ON public.invoice_item_templates
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- RLS Policy: Users can create templates in their tenant
CREATE POLICY "Users can create templates in their tenant"
    ON public.invoice_item_templates
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- RLS Policy: Users can update their own templates
CREATE POLICY "Users can update their own templates"
    ON public.invoice_item_templates
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- RLS Policy: Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
    ON public.invoice_item_templates
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_item_templates TO authenticated;
GRANT SELECT ON public.invoice_item_templates TO anon;
