-- Migration: Create RLS policies for notifications
-- Created: 2025-08-08
-- Description: Create Row Level Security policies for notifications and notification_events tables

BEGIN;

-- Notifications table policies

-- Users can only see their own notifications within their tenant
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id() 
    AND user_id = get_current_user_profile()
  );

-- Users can insert notifications within their tenant (simplified for now)
CREATE POLICY "Users can create notifications in tenant" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (
    tenant_id = get_current_tenant_id() 
    AND user_id = get_current_user_profile()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id() 
    AND user_id = get_current_user_profile()
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE TO authenticated
  USING (
    tenant_id = get_current_tenant_id() 
    AND user_id = get_current_user_profile()
  );

-- System can manage all notifications (for automated cleanup)
CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Notification events table policies

-- Users can view events for their own notifications
CREATE POLICY "Users can view own notification events" ON notification_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.id = notification_events.notification_id 
        AND n.tenant_id = get_current_tenant_id()
        AND n.user_id = get_current_user_profile()
    )
  );

-- Users can create events for their own notifications
CREATE POLICY "Users can create notification events" ON notification_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.id = notification_events.notification_id 
        AND n.tenant_id = get_current_tenant_id()
        AND n.user_id = get_current_user_profile()
    )
  );

-- System can manage all notification events
CREATE POLICY "System can manage notification events" ON notification_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;