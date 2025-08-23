-- Migration: 010 - Invoice Payments RLS Policies
-- Adds Row Level Security policies for invoice_payments table

-- Enable RLS on invoice_payments table
ALTER TABLE "public"."invoice_payments" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payments for invoices in their tenant
CREATE POLICY "Users can view invoice payments in their tenant" ON "public"."invoice_payments"
    FOR SELECT 
    USING (
        -- User must be authenticated
        auth.uid() IS NOT NULL 
        AND 
        -- Payment must belong to user's tenant
        tenant_id IN (
            SELECT tenant_id 
            FROM profiles 
            WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
        )
    );

-- Policy: Users can create payments for invoices in their tenant (if not in grace period)
CREATE POLICY "Users can create invoice payments in their tenant" ON "public"."invoice_payments"
    FOR INSERT 
    WITH CHECK (
        -- User must be authenticated
        auth.uid() IS NOT NULL 
        AND 
        -- Payment must belong to user's tenant
        tenant_id IN (
            SELECT tenant_id 
            FROM profiles 
            WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
        )
        AND
        -- User must not be in grace period (can create data)
        NOT EXISTS (
            SELECT 1 
            FROM deletion_requests dr
            JOIN profiles p ON p.id = dr.user_id
            WHERE p.clerk_user_id = (auth.jwt() ->> 'sub')::text
            AND dr.status = 'pending'
            AND dr.scheduled_for > CURRENT_TIMESTAMP
        )
    );

-- Policy: Users can update payments for invoices in their tenant (if not in grace period)
CREATE POLICY "Users can update invoice payments in their tenant" ON "public"."invoice_payments"
    FOR UPDATE 
    USING (
        -- User must be authenticated
        auth.uid() IS NOT NULL 
        AND 
        -- Payment must belong to user's tenant
        tenant_id IN (
            SELECT tenant_id 
            FROM profiles 
            WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
        )
        AND
        -- User must not be in grace period
        NOT EXISTS (
            SELECT 1 
            FROM deletion_requests dr
            JOIN profiles p ON p.id = dr.user_id
            WHERE p.clerk_user_id = (auth.jwt() ->> 'sub')::text
            AND dr.status = 'pending'
            AND dr.scheduled_for > CURRENT_TIMESTAMP
        )
    )
    WITH CHECK (
        -- Payment must belong to user's tenant
        tenant_id IN (
            SELECT tenant_id 
            FROM profiles 
            WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
        )
    );

-- Policy: Users can delete payments for invoices in their tenant (if not in grace period)
CREATE POLICY "Users can delete invoice payments in their tenant" ON "public"."invoice_payments"
    FOR DELETE 
    USING (
        -- User must be authenticated
        auth.uid() IS NOT NULL 
        AND 
        -- Payment must belong to user's tenant
        tenant_id IN (
            SELECT tenant_id 
            FROM profiles 
            WHERE clerk_user_id = (auth.jwt() ->> 'sub')::text
        )
        AND
        -- User must not be in grace period
        NOT EXISTS (
            SELECT 1 
            FROM deletion_requests dr
            JOIN profiles p ON p.id = dr.user_id
            WHERE p.clerk_user_id = (auth.jwt() ->> 'sub')::text
            AND dr.status = 'pending'
            AND dr.scheduled_for > CURRENT_TIMESTAMP
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."invoice_payments" TO "authenticated";