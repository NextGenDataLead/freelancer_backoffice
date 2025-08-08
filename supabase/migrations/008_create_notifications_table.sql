-- Migration: Create notifications table for real-time notifications
-- Created: 2025-08-08
-- Description: Create notifications table with real-time capabilities

BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user IDs are strings, not UUIDs
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb, -- Additional data for actions, URLs, etc.
  read_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL, -- For auto-expiring notifications
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest, 10 = lowest
  category TEXT DEFAULT 'general' -- For grouping notifications
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Enable real-time for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create notification events table for audit trail
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'read', 'dismissed', 'clicked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for notification events
CREATE INDEX IF NOT EXISTS idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at DESC);

-- Enable RLS on notification events
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- Function to automatically clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read and log event
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  -- Update notification
  UPDATE notifications 
  SET read_at = NOW(), updated_at = NOW()
  WHERE id = notification_id 
    AND read_at IS NULL;
  
  -- Log read event
  INSERT INTO notification_events (notification_id, event_type)
  VALUES (notification_id, 'read');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a notification (uses existing RLS functions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_category TEXT DEFAULT 'general',
  p_priority INTEGER DEFAULT 5,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  current_tenant_id UUID;
BEGIN
  -- Get current tenant ID using existing RLS function
  SELECT get_current_tenant_id() INTO current_tenant_id;
  
  -- Insert notification
  INSERT INTO notifications (
    tenant_id, user_id, type, title, message, data, 
    category, priority, expires_at
  )
  VALUES (
    current_tenant_id, p_user_id, p_type, p_title, p_message, p_data,
    p_category, p_priority, p_expires_at
  )
  RETURNING id INTO notification_id;
  
  -- Log creation event
  INSERT INTO notification_events (notification_id, event_type)
  VALUES (notification_id, 'created');
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;