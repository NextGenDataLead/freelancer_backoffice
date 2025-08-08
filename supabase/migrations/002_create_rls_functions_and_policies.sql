-- Migration: Create RLS functions
-- Created: 2025-08-02
-- Description: Create helper functions for tenant isolation (policies created in 010_create_all_policies.sql)

BEGIN;

-- Helper function to get current tenant ID from JWT claims
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    ((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata')::jsonb ->> 'tenant_id'),
    ''
  )::UUID
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to get current user profile ID
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS UUID AS $$
  SELECT id FROM profiles 
  WHERE clerk_user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMIT;
