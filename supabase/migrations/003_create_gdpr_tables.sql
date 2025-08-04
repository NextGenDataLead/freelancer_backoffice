-- Migration: Create GDPR compliance tables
-- Created: 2025-08-02
-- Description: Create tables for GDPR compliance (password reset, deletion requests, audit logs)

BEGIN;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  UNIQUE(token_hash)
);

-- Indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used = FALSE;

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- GDPR account deletion requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  cancellation_token VARCHAR(64),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for deletion requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON deletion_requests(scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- GDPR audit logs table
CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('data_export', 'data_access', 'deletion_requested', 'deletion_completed', 'consent_given', 'consent_withdrawn')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for GDPR audit logs
CREATE INDEX IF NOT EXISTS idx_gdpr_logs_user_id ON gdpr_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_logs_action ON gdpr_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_logs_timestamp ON gdpr_audit_logs(timestamp);

-- Enable RLS
ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for GDPR tables
CREATE POLICY "password_reset_tokens_user_access" ON password_reset_tokens
  FOR ALL TO authenticated
  USING (user_id = get_current_user_profile());

CREATE POLICY "deletion_requests_user_access" ON deletion_requests
  FOR ALL TO authenticated
  USING (user_id = get_current_user_profile());

CREATE POLICY "gdpr_audit_logs_user_access" ON gdpr_audit_logs
  FOR SELECT TO authenticated
  USING (user_id = get_current_user_profile());

COMMIT;