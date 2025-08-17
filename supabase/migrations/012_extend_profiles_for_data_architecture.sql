-- Migration: Extend profiles table for enhanced data architecture
-- This migration adds additional fields that were added during development

-- Add any missing columns that were added during development
-- (Most fields should already exist from 001_create_core_schema.sql, this is for safety)

-- Add onboarding_complete column to profiles table for tracking onboarding status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Add index for performance on onboarding status queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete 
ON public.profiles(onboarding_complete);

-- Update existing profiles to have onboarding_complete = true if they have tenant_id
-- Assume they have completed onboarding if they have tenant_id set
UPDATE public.profiles 
SET onboarding_complete = true 
WHERE tenant_id IS NOT NULL AND onboarding_complete = false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_complete IS 'Tracks whether the user has completed the onboarding process. Used by middleware for route protection instead of Clerk metadata.';

-- Add updated_at trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create additional utility functions for data management
CREATE OR REPLACE FUNCTION get_user_data_for_export(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_data JSONB;
    profile_data JSONB;
    org_data JSONB[];
    notification_data JSONB[];
BEGIN
    -- Get profile data
    SELECT to_jsonb(p) INTO profile_data
    FROM profiles p
    WHERE p.id = p_user_id;
    
    -- Get organization memberships
    SELECT array_agg(to_jsonb(om) || to_jsonb(o))
    INTO org_data
    FROM organization_memberships om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = p_user_id;
    
    -- Get notifications (last 90 days)
    SELECT array_agg(to_jsonb(n))
    INTO notification_data
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND n.created_at > NOW() - INTERVAL '90 days';
    
    -- Combine all data
    user_data := jsonb_build_object(
        'profile', profile_data,
        'organizations', COALESCE(org_data, ARRAY[]::JSONB[]),
        'notifications', COALESCE(notification_data, ARRAY[]::JSONB[]),
        'export_timestamp', NOW(),
        'export_version', '1.0'
    );
    
    -- Log the export
    PERFORM log_gdpr_action(
        p_user_id,
        'data_export',
        NULL,
        NULL,
        jsonb_build_object('data_size_bytes', length(user_data::text))
    );
    
    RETURN user_data;
END;
$$;

-- Create function to anonymize user data (for GDPR deletion)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    anonymized_email TEXT;
BEGIN
    -- Generate anonymized email
    SELECT 'deleted-user-' || encode(gen_random_bytes(8), 'hex') || '@anonymous.local'
    INTO anonymized_email;
    
    -- Anonymize profile data
    UPDATE profiles
    SET 
        email = anonymized_email,
        first_name = 'Deleted',
        last_name = 'User',
        avatar_url = NULL,
        username = NULL,
        preferences = '{}',
        anonymized_at = NOW(),
        is_active = FALSE
    WHERE id = p_user_id;
    
    -- Anonymize notification data (keep for analytics but remove personal info)
    UPDATE notifications
    SET 
        title = 'Deleted User Notification',
        message = 'Content removed for privacy',
        data = '{}'
    WHERE user_id = p_user_id;
    
    -- Log the anonymization
    PERFORM log_gdpr_action(
        p_user_id,
        'deletion_completed',
        NULL,
        NULL,
        jsonb_build_object(
            'anonymization_completed', true,
            'anonymized_email', anonymized_email
        )
    );
    
    RETURN TRUE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_data_for_export(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_user_data(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION log_gdpr_action(UUID, TEXT, INET, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_deletion_request(TEXT, INET, TEXT) TO anon;