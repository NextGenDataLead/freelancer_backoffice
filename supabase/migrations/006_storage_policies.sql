-- Migration: Storage RLS policies
-- Created: 2025-08-02
-- Description: Create RLS policies for storage buckets

BEGIN;

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