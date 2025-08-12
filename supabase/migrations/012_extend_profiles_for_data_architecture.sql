-- Migration: Extend profiles table to support Supabase as single source of truth
-- Purpose: Add fields that were previously stored in Clerk metadata for revised data architecture
-- Author: Claude Code
-- Date: 2025-08-12

-- Add username field for user identity (previously stored in Clerk)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add anonymization tracking for GDPR soft deletion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add index for username lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Add index for anonymized users (for analytics queries on deleted users)
CREATE INDEX IF NOT EXISTS idx_profiles_anonymized ON profiles(anonymized_at) WHERE anonymized_at IS NOT NULL;

-- Add documentation comments
COMMENT ON COLUMN profiles.username IS 'Unique username for user identity, migrated from Clerk metadata';
COMMENT ON COLUMN profiles.anonymized_at IS 'Timestamp when user data was anonymized for GDPR compliance';
COMMENT ON COLUMN profiles.deletion_reason IS 'Reason provided when user requested account deletion';

-- Update the profiles table comment to reflect new architecture
COMMENT ON TABLE profiles IS 'User profiles - single source of truth for all user business data. Clerk handles authentication only.';

-- Note: After running this migration, you should:
-- 1. Create the metadata migration endpoint to move existing Clerk data
-- 2. Update user-sync.ts to preserve these new fields
-- 3. Implement soft deletion with anonymization