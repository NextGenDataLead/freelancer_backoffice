-- Migration: Create RLS functions and policies for multi-tenant security
-- This creates the security functions and policies that enforce tenant isolation

-- Create RLS helper functions
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    ((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata')::jsonb ->> 'tenant_id'),
    ''
  )::UUID
$$;

CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM profiles 
  WHERE clerk_user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
$$;

CREATE OR REPLACE FUNCTION has_pending_deletion()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deletion_requests dr
    JOIN profiles p ON p.id = dr.user_id
    WHERE p.clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND dr.status = 'pending'
    AND dr.scheduled_for > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION can_create_data()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT has_pending_deletion();
$$;

-- Tenants policies
CREATE POLICY "tenant_isolation_select" ON tenants
FOR SELECT
TO authenticated
USING (id = get_current_tenant_id());

CREATE POLICY "tenant_self_insert" ON tenants
FOR INSERT
TO authenticated
WITH CHECK (id = get_current_tenant_id());

-- Profiles policies
CREATE POLICY "profiles_tenant_isolation" ON profiles
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id());

-- Critical policy for user profile creation during onboarding
CREATE POLICY "allow_user_profile_creation" ON profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = clerk_user_id OR get_current_tenant_id() IS NOT NULL);

-- Organizations policies
CREATE POLICY "organizations_tenant_isolation" ON organizations
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Authenticated users can create organizations" ON organizations
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_current_tenant_id() AND can_create_data());

CREATE POLICY "admin_full_access" ON organizations
FOR ALL
TO authenticated
USING (
  tenant_id = get_current_tenant_id() 
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = get_current_user_profile()
    AND profiles.tenant_id = get_current_tenant_id()
    AND profiles.role IN ('admin', 'owner')
  )
);

-- Organization memberships policies
CREATE POLICY "organization_memberships_select" ON organization_memberships
FOR SELECT
TO authenticated
USING (organization_id IN (
  SELECT organizations.id FROM organizations
  WHERE organizations.tenant_id = get_current_tenant_id()
));

CREATE POLICY "organization_memberships_insert" ON organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM organization_memberships om
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.tenant_id = get_current_tenant_id()
    AND om.user_id = get_current_user_profile()
    AND om.role IN ('owner', 'admin')
  )
  AND can_create_data()
);

CREATE POLICY "organization_memberships_update" ON organization_memberships
FOR UPDATE
TO authenticated
USING (
  user_id = get_current_user_profile()
  OR organization_id IN (
    SELECT om.organization_id FROM organization_memberships om
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.tenant_id = get_current_tenant_id()
    AND om.user_id = get_current_user_profile()
    AND om.role IN ('owner', 'admin')
  )
)
WITH CHECK (can_create_data() OR user_id = get_current_user_profile());

CREATE POLICY "organization_memberships_delete" ON organization_memberships
FOR DELETE
TO authenticated
USING (
  user_id = get_current_user_profile()
  OR organization_id IN (
    SELECT om.organization_id FROM organization_memberships om
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.tenant_id = get_current_tenant_id()
    AND om.user_id = get_current_user_profile()
    AND om.role IN ('owner', 'admin')
  )
);

-- Additional policy for viewing organization memberships
CREATE POLICY "org_memberships_access" ON organization_memberships
FOR SELECT
TO authenticated
USING (organization_id IN (
  SELECT organization_memberships.organization_id FROM organization_memberships
  WHERE organization_memberships.user_id = get_current_user_profile()
));

-- Password reset tokens policies
CREATE POLICY "password_reset_tokens_user_access" ON password_reset_tokens
FOR ALL
TO authenticated
USING (user_id = get_current_user_profile());