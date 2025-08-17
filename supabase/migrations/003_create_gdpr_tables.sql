-- Migration: Create GDPR compliance tables for data protection and user rights
-- This creates tables for deletion requests and audit logging

-- Create deletion requests table for GDPR account deletion workflow
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ NOT NULL, -- When deletion will occur (grace period)
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    cancellation_token VARCHAR(255), -- Token for user to cancel deletion
    metadata JSONB DEFAULT '{}'
);

-- Create GDPR audit logs table for compliance tracking
CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Can be NULL after user deletion
    action TEXT NOT NULL CHECK (action IN ('data_export', 'data_access', 'deletion_requested', 'deletion_completed', 'consent_given', 'consent_withdrawn')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_for ON deletion_requests(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_cancellation_token ON deletion_requests(cancellation_token);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_user_id ON gdpr_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_action ON gdpr_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_logs_timestamp ON gdpr_audit_logs(timestamp);

-- Enable Row Level Security
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deletion requests
CREATE POLICY "deletion_requests_user_access" ON deletion_requests
FOR ALL
TO authenticated
USING (user_id = get_current_user_profile());

-- RLS Policies for GDPR audit logs (users can only view their own logs)
CREATE POLICY "gdpr_audit_logs_user_access" ON gdpr_audit_logs
FOR SELECT
TO authenticated
USING (user_id = get_current_user_profile());