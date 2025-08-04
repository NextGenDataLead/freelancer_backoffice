-- Migration: Create RLS functions and policies
-- Created: 2025-08-02
-- Description: Create helper functions and RLS policies for tenant isolation

BEGIN;

-- Helper function to get current tenant from JWT
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    ((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata')::jsonb ->> 'tenant_id'),
    ''
  )::UUID
$$;

-- Helper function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS UUID
LANGUAGE SQL STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM profiles 
  WHERE clerk_user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
$$;

-- Tenant isolation policies
CREATE POLICY "tenant_isolation_select" ON tenants
  FOR SELECT TO authenticated
  USING (id = get_current_tenant_id());

-- Profiles policies
CREATE POLICY "profiles_tenant_isolation" ON profiles
  FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Organizations policies
CREATE POLICY "organizations_tenant_isolation" ON organizations
  FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Organization memberships policies
CREATE POLICY "org_memberships_access" ON organization_memberships
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = get_current_user_profile()
    )
  );

-- Admin access: Admins and owners can manage organizations
CREATE POLICY "admin_full_access" ON organizations
  FOR ALL TO authenticated
  USING (
    tenant_id = get_current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = get_current_user_profile()
      AND profiles.tenant_id = get_current_tenant_id()
      AND profiles.role IN ('admin', 'owner')
    )
  );

COMMIT;