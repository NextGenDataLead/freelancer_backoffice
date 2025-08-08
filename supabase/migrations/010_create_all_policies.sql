-- Migration: Create all RLS policies after tables are created
-- Created: 2025-08-08
-- Description: Create all RLS policies that depend on functions and tables from previous migrations

BEGIN;

-- Policies for tenants
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT TO authenticated
  USING (id = get_current_tenant_id());

CREATE POLICY "Users can update their own tenant" ON tenants
  FOR UPDATE TO authenticated
  USING (id = get_current_tenant_id())
  WITH CHECK (id = get_current_tenant_id());

CREATE POLICY "Users can insert tenants" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (id = get_current_tenant_id());

-- Policies for profiles
CREATE POLICY "Users can view profiles in their tenant" ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id() 
    AND clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (
    tenant_id = get_current_tenant_id() 
    AND clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id() 
    AND clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  );

-- Policies for organizations
CREATE POLICY "Users can view organizations in their tenant" ON organizations
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Organization owners can update their organization" ON organizations
  FOR UPDATE TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = get_current_user_profile() 
        AND role IN ('owner', 'admin')
    )
  );

-- Policies for organization_memberships
CREATE POLICY "Users can view memberships in their tenant" ON organization_memberships
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "Organization admins can manage members" ON organization_memberships
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_memberships om
      JOIN organizations o ON o.id = om.organization_id
      WHERE o.tenant_id = get_current_tenant_id()
        AND om.user_id = get_current_user_profile() 
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their own membership" ON organization_memberships
  FOR UPDATE TO authenticated
  USING (user_id = get_current_user_profile());

-- Policies for GDPR tables
CREATE POLICY "password_reset_tokens_user_access" ON password_reset_tokens
  FOR ALL TO authenticated
  USING (user_id = get_current_user_profile());

CREATE POLICY "deletion_requests_user_access" ON deletion_requests
  FOR ALL TO authenticated
  USING (user_id = get_current_user_profile());

CREATE POLICY "gdpr_audit_logs_user_access" ON gdpr_audit_logs
  FOR SELECT TO authenticated
  USING (user_id = get_current_user_profile());

-- Policies for documents table
CREATE POLICY "documents_tenant_isolation" ON documents
  FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Storage policies (from 006_storage_policies.sql)

-- Avatar uploads: Users can upload their own avatars
CREATE POLICY "avatar_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = get_current_user_profile()::text
  );

-- Avatar access: Users can view their own and their tenant's avatars
CREATE POLICY "avatar_view_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (
      (storage.foldername(name))[1] = get_current_user_profile()::text OR
      EXISTS (
        SELECT 1 FROM profiles p1, profiles p2
        WHERE p1.id = get_current_user_profile()
        AND p2.id = (storage.foldername(name))[1]::UUID
        AND p1.tenant_id = p2.tenant_id
      )
    )
  );

-- Document uploads: Tenant isolation
CREATE POLICY "document_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_current_tenant_id()::text
  );

-- Document access: Tenant isolation
CREATE POLICY "document_view_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_current_tenant_id()::text
  );

-- GDPR exports: User can only access their own exports
CREATE POLICY "export_access_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'exports' AND
    (storage.foldername(name))[1] = get_current_user_profile()::text
  );

-- GDPR export uploads: Users can upload their own export requests
CREATE POLICY "export_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'exports' AND
    (storage.foldername(name))[1] = get_current_user_profile()::text
  );

COMMIT;