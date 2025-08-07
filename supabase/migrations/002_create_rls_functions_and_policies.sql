-- Migration: Create RLS functions and policies
-- Created: 2025-08-02
-- Description: Create helper functions and RLS policies for tenant isolation

BEGIN;

-- Policies for user_profiles
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

-- Policies for organizations
CREATE POLICY "Authenticated users can create organizations" ON public.organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Organization owners can update their organization" ON public.organizations FOR UPDATE USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'));
CREATE POLICY "Users can view organizations they are members of" ON public.organizations FOR SELECT USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

-- Policies for organization_members
CREATE POLICY "Organization admins can manage members" ON public.organization_members FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'));
CREATE POLICY "Users can update their own membership" ON public.organization_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view members of their organizations" ON public.organization_members FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

COMMIT;
