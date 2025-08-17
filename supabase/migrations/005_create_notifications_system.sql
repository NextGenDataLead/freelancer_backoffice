-- Migration: Create notifications system for real-time user notifications
-- This creates tables for in-app notifications with real-time capabilities

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data for the notification
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration for temporary notifications
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=lowest, 10=highest
    category TEXT DEFAULT 'general' -- For grouping notifications
);

-- Create notification events table for tracking notification interactions
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'read', 'dismissed', 'clicked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_event_type ON notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT
TO authenticated
USING (tenant_id = get_current_tenant_id() AND user_id = get_current_user_profile());

CREATE POLICY "Users can create notifications in tenant" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE
TO authenticated
USING (tenant_id = get_current_tenant_id() AND user_id = get_current_user_profile())
WITH CHECK (tenant_id = get_current_tenant_id() AND user_id = get_current_user_profile());

CREATE POLICY "Users can delete own notifications" ON notifications
FOR DELETE
TO authenticated
USING (tenant_id = get_current_tenant_id() AND user_id = get_current_user_profile());

-- RLS Policies for notification events
CREATE POLICY "Users can view own notification events" ON notification_events
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.id = notification_events.notification_id
  AND n.tenant_id = get_current_tenant_id()
  AND n.user_id = get_current_user_profile()
));

CREATE POLICY "Users can create notification events" ON notification_events
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.id = notification_events.notification_id
  AND n.tenant_id = get_current_tenant_id()
  AND n.user_id = get_current_user_profile()
));