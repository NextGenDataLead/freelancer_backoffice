-- Migration: Grace period prevention system for GDPR deletion workflow
-- This migration updates the has_pending_deletion function and adds trigger for grace period enforcement

-- Update the has_pending_deletion function to be more robust
CREATE OR REPLACE FUNCTION has_pending_deletion()
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Create function to automatically set grace period when deletion is requested
CREATE OR REPLACE FUNCTION set_deletion_grace_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set grace period to 30 days from now if not explicitly set
    IF NEW.scheduled_for IS NULL THEN
        NEW.scheduled_for := NOW() + INTERVAL '30 days';
    END IF;
    
    -- Generate cancellation token if not provided
    IF NEW.cancellation_token IS NULL THEN
        NEW.cancellation_token := encode(gen_random_bytes(32), 'hex');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically set grace period
DROP TRIGGER IF EXISTS trigger_set_deletion_grace_period ON deletion_requests;
CREATE TRIGGER trigger_set_deletion_grace_period
    BEFORE INSERT ON deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_deletion_grace_period();

-- Create function to log GDPR actions
CREATE OR REPLACE FUNCTION log_gdpr_action(
    p_user_id UUID,
    p_action TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO gdpr_audit_logs (user_id, action, ip_address, user_agent, metadata)
    VALUES (p_user_id, p_action, p_ip_address, p_user_agent, p_metadata)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Create function to cancel deletion request
CREATE OR REPLACE FUNCTION cancel_deletion_request(
    p_cancellation_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deletion_row deletion_requests%ROWTYPE;
BEGIN
    -- Find and update the deletion request
    UPDATE deletion_requests 
    SET status = 'cancelled',
        metadata = metadata || jsonb_build_object(
            'cancelled_at', NOW(),
            'cancelled_by_token', true
        )
    WHERE cancellation_token = p_cancellation_token
    AND status = 'pending'
    RETURNING * INTO deletion_row;
    
    -- Check if we found and updated a row
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Log the cancellation
    PERFORM log_gdpr_action(
        deletion_row.user_id,
        'deletion_cancelled',
        p_ip_address,
        p_user_agent,
        jsonb_build_object(
            'cancellation_token_used', true,
            'original_scheduled_for', deletion_row.scheduled_for
        )
    );
    
    RETURN TRUE;
END;
$$;