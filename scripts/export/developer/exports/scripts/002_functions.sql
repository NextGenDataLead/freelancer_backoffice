-- Migration: 002 - All Functions
-- Creates all functions before tables are created

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- Utility function for updating timestamps
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

-- Core security functions for multi-tenant isolation
CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT NULLIF(
    ((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata')::jsonb ->> 'tenant_id'),
    ''
  )::UUID
$$;

ALTER FUNCTION "public"."get_current_tenant_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_current_user_profile"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT id FROM profiles 
  WHERE clerk_user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
$$;

ALTER FUNCTION "public"."get_current_user_profile"() OWNER TO "postgres";

-- Function to check if user has pending deletion request during grace period
CREATE OR REPLACE FUNCTION "public"."has_pending_deletion"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM deletion_requests dr
    JOIN profiles p ON p.id = dr.user_id
    WHERE p.clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND dr.status = 'pending'
    AND dr.scheduled_for > NOW()
  );
$$;

ALTER FUNCTION "public"."has_pending_deletion"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."has_pending_deletion"() IS 'Checks if current user has pending deletion request during grace period';

-- Function to prevent data creation during grace period
CREATE OR REPLACE FUNCTION "public"."can_create_data"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT NOT has_pending_deletion();
$$;

ALTER FUNCTION "public"."can_create_data"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."can_create_data"() IS 'Returns false if user is in grace period, preventing new data creation while allowing cancellation';

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW();
  END;
  $$;

ALTER FUNCTION "public"."cleanup_expired_notifications"() OWNER TO "postgres";

-- Function to create notifications with automatic event logging
CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_category" "text" DEFAULT 'general'::"text", "p_priority" integer DEFAULT 5, "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
      notification_id UUID;
      current_tenant_id UUID;
    BEGIN
      SELECT get_current_tenant_id() INTO current_tenant_id;

      INSERT INTO notifications (
        tenant_id, user_id, type, title, message, data,
        category, priority, expires_at
      )
      VALUES (
        current_tenant_id, p_user_id, p_type, p_title, p_message, p_data,
        p_category, p_priority, p_expires_at
      )
      RETURNING id INTO notification_id;

      INSERT INTO notification_events (notification_id, event_type)
      VALUES (notification_id, 'created');

      RETURN notification_id;
    END;
  $$;

ALTER FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_category" "text", "p_priority" integer, "p_expires_at" timestamp with time zone) OWNER TO "postgres";

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    UPDATE notifications
    SET read_at = NOW(), updated_at = NOW()
    WHERE id = notification_id
      AND read_at IS NULL;

    INSERT INTO notification_events (notification_id, event_type)
    VALUES (notification_id, 'read');
  END;
  $$;

ALTER FUNCTION "public"."mark_notification_read"("notification_id" "uuid") OWNER TO "postgres";