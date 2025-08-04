-- Migration: Enable real-time features
-- Created: 2025-08-02
-- Description: Enable real-time subscriptions on key tables

BEGIN;

-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

COMMIT;