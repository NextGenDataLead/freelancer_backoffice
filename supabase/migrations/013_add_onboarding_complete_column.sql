-- Migration: Add onboarding_complete column to profiles table
-- This allows tracking onboarding status directly in Supabase instead of Clerk metadata

-- Add onboarding_complete column to profiles table
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