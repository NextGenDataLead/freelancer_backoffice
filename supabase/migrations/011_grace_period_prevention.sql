-- Migration: Add grace period data creation prevention
-- Created: 2025-08-11
-- Description: Prevent data creation during grace period while allowing read access and deletion cancellation

BEGIN;

-- Function to check if current user has pending deletion request
CREATE OR REPLACE FUNCTION has_pending_deletion()
RETURNS boolean
LANGUAGE sql
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

-- Function to check if current user can create data (not in grace period)
CREATE OR REPLACE FUNCTION can_create_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT has_pending_deletion();
$$;

-- Update INSERT policies to prevent data creation during grace period

-- Organizations: Prevent creation during grace period
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id() 
    AND can_create_data()
  );

-- Profiles: Allow profile creation (needed for new users) but prevent updates during grace period
-- Note: Profile creation is needed for user sync, so we don't block it
-- But we'll add a separate policy for updates

-- Documents: Prevent creation during grace period  
DROP POLICY IF EXISTS "documents_tenant_isolation" ON documents;
CREATE POLICY "documents_select_policy" ON documents
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "documents_insert_policy" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id() 
    AND can_create_data()
  );

CREATE POLICY "documents_update_policy" ON documents
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (
    tenant_id = get_current_tenant_id() 
    AND can_create_data()
  );

CREATE POLICY "documents_delete_policy" ON documents
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Organization memberships: Prevent creation during grace period
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_memberships;
CREATE POLICY "organization_memberships_select" ON organization_memberships
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "organization_memberships_insert" ON organization_memberships
  FOR INSERT TO authenticated
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
  FOR UPDATE TO authenticated
  USING (
    user_id = get_current_user_profile()
    OR (
      organization_id IN (
        SELECT om.organization_id FROM organization_memberships om
        JOIN organizations o ON o.id = om.organization_id
        WHERE o.tenant_id = get_current_tenant_id()
          AND om.user_id = get_current_user_profile() 
          AND om.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    can_create_data()
    OR user_id = get_current_user_profile() -- Allow users to leave/cancel own deletion
  );

CREATE POLICY "organization_memberships_delete" ON organization_memberships
  FOR DELETE TO authenticated
  USING (
    user_id = get_current_user_profile()
    OR (
      organization_id IN (
        SELECT om.organization_id FROM organization_memberships om
        JOIN organizations o ON o.id = om.organization_id
        WHERE o.tenant_id = get_current_tenant_id()
          AND om.user_id = get_current_user_profile() 
          AND om.role IN ('owner', 'admin')
      )
    )
  );

-- Update storage policies to prevent uploads during grace period
DROP POLICY IF EXISTS "document_upload_policy" ON storage.objects;
CREATE POLICY "document_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = get_current_tenant_id()::text
    AND can_create_data()
  );

DROP POLICY IF EXISTS "avatar_upload_policy" ON storage.objects;
CREATE POLICY "avatar_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = get_current_user_profile()::text
    AND can_create_data()
  );

-- GDPR export uploads are still allowed (users can export data during grace period)
-- Deletion requests are still allowed (users can cancel deletion during grace period)

-- Add helpful comment
COMMENT ON FUNCTION has_pending_deletion() IS 'Checks if current user has pending deletion request during grace period';
COMMENT ON FUNCTION can_create_data() IS 'Returns false if user is in grace period, preventing new data creation while allowing cancellation';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_status ON deletion_requests(user_id, status) WHERE status = 'pending';

COMMIT;