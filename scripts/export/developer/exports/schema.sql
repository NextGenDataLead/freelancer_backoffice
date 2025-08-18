

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_create_data"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT NOT has_pending_deletion();
$$;


ALTER FUNCTION "public"."can_create_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_data"() IS 'Returns false if user is in grace period, preventing new data creation while allowing cancellation';



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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "scheduled_for" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "cancellation_token" character varying(64),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "deletion_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "organization_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gdpr_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "gdpr_audit_logs_action_check" CHECK (("action" = ANY (ARRAY['data_export'::"text", 'data_access'::"text", 'deletion_requested'::"text", 'deletion_completed'::"text", 'consent_given'::"text", 'consent_withdrawn'::"text"])))
);


ALTER TABLE "public"."gdpr_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "event_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notification_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'read'::"text", 'dismissed'::"text", 'clicked'::"text"])))
);


ALTER TABLE "public"."notification_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "priority" integer DEFAULT 5,
    "category" "text" DEFAULT 'general'::"text",
    CONSTRAINT "notifications_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 10))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."organization_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "clerk_org_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "token_hash" character varying(64) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "clerk_user_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_sign_in_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "username" "text",
    "anonymized_at" timestamp with time zone,
    "deletion_reason" "text",
    "onboarding_complete" boolean DEFAULT false,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles - single source of truth for all user business data. Clerk handles authentication only.';



COMMENT ON COLUMN "public"."profiles"."username" IS 'Unique username for user identity, migrated from Clerk metadata';



COMMENT ON COLUMN "public"."profiles"."anonymized_at" IS 'Timestamp when user data was anonymized for GDPR compliance';



COMMENT ON COLUMN "public"."profiles"."deletion_reason" IS 'Reason provided when user requested account deletion';



COMMENT ON COLUMN "public"."profiles"."onboarding_complete" IS 'Tracks whether the user has completed the onboarding process. Used by middleware for route protection instead of Clerk metadata.';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subdomain" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "subscription_status" "text" DEFAULT 'active'::"text",
    "billing_email" "text",
    "max_users" integer DEFAULT 10,
    "max_storage_gb" integer DEFAULT 5,
    CONSTRAINT "tenants_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gdpr_audit_logs"
    ADD CONSTRAINT "gdpr_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_events"
    ADD CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_clerk_org_id_key" UNIQUE ("clerk_org_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_clerk_user_id_key" UNIQUE ("clerk_user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_subdomain_key" UNIQUE ("subdomain");



CREATE INDEX "documents_embedding_idx" ON "public"."documents" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_deletion_requests_scheduled" ON "public"."deletion_requests" USING "btree" ("scheduled_for") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_deletion_requests_status" ON "public"."deletion_requests" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "idx_deletion_requests_user_status" ON "public"."deletion_requests" USING "btree" ("user_id", "status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_documents_organization_id" ON "public"."documents" USING "btree" ("organization_id");



CREATE INDEX "idx_documents_tenant_id" ON "public"."documents" USING "btree" ("tenant_id");



CREATE INDEX "idx_gdpr_logs_action" ON "public"."gdpr_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_gdpr_logs_timestamp" ON "public"."gdpr_audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_gdpr_logs_user_id" ON "public"."gdpr_audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_notification_events_created_at" ON "public"."notification_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notification_events_notification_id" ON "public"."notification_events" USING "btree" ("notification_id");



CREATE INDEX "idx_notification_events_type" ON "public"."notification_events" USING "btree" ("event_type");



CREATE INDEX "idx_notifications_category" ON "public"."notifications" USING "btree" ("category");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_priority" ON "public"."notifications" USING "btree" ("priority");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notifications_tenant_id" ON "public"."notifications" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_org_memberships_org_id" ON "public"."organization_memberships" USING "btree" ("organization_id");



CREATE INDEX "idx_org_memberships_user_id" ON "public"."organization_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_organizations_tenant_id" ON "public"."organizations" USING "btree" ("tenant_id");



CREATE INDEX "idx_password_reset_tokens_expires" ON "public"."password_reset_tokens" USING "btree" ("expires_at") WHERE ("used" = false);



CREATE INDEX "idx_password_reset_tokens_user_id" ON "public"."password_reset_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_anonymized" ON "public"."profiles" USING "btree" ("anonymized_at") WHERE ("anonymized_at" IS NOT NULL);



CREATE INDEX "idx_profiles_clerk_user_id" ON "public"."profiles" USING "btree" ("clerk_user_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_onboarding_complete" ON "public"."profiles" USING "btree" ("onboarding_complete");



CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_tenants_status" ON "public"."tenants" USING "btree" ("subscription_status") WHERE ("subscription_status" <> 'active'::"text");



CREATE INDEX "idx_tenants_subdomain" ON "public"."tenants" USING "btree" ("subdomain");



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_events"
    ADD CONSTRAINT "notification_events_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));



CREATE POLICY "Users can create notification events" ON "public"."notification_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."notifications" "n"
  WHERE (("n"."id" = "notification_events"."notification_id") AND ("n"."tenant_id" = "public"."get_current_tenant_id"()) AND ("n"."user_id" = "public"."get_current_user_profile"())))));



CREATE POLICY "Users can create notifications in tenant" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"())));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"()))) WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"())));



CREATE POLICY "Users can view own notification events" ON "public"."notification_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."notifications" "n"
  WHERE (("n"."id" = "notification_events"."notification_id") AND ("n"."tenant_id" = "public"."get_current_tenant_id"()) AND ("n"."user_id" = "public"."get_current_user_profile"())))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"())));



CREATE POLICY "admin_full_access" ON "public"."organizations" TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "public"."get_current_user_profile"()) AND ("profiles"."tenant_id" = "public"."get_current_tenant_id"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])))))));



CREATE POLICY "allow_user_profile_creation" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."uid"())::"text" = "clerk_user_id") OR ("public"."get_current_tenant_id"() IS NOT NULL)));



ALTER TABLE "public"."deletion_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deletion_requests_user_access" ON "public"."deletion_requests" TO "authenticated" USING (("user_id" = "public"."get_current_user_profile"()));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete_policy" ON "public"."documents" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "documents_insert_policy" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));



CREATE POLICY "documents_select_policy" ON "public"."documents" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "documents_update_policy" ON "public"."documents" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"())) WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));



ALTER TABLE "public"."gdpr_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gdpr_audit_logs_user_access" ON "public"."gdpr_audit_logs" FOR SELECT TO "authenticated" USING (("user_id" = "public"."get_current_user_profile"()));



ALTER TABLE "public"."notification_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_memberships_access" ON "public"."organization_memberships" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_memberships_1"."organization_id"
   FROM "public"."organization_memberships" "organization_memberships_1"
  WHERE ("organization_memberships_1"."user_id" = "public"."get_current_user_profile"()))));



ALTER TABLE "public"."organization_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_memberships_delete" ON "public"."organization_memberships" FOR DELETE TO "authenticated" USING ((("user_id" = "public"."get_current_user_profile"()) OR ("organization_id" IN ( SELECT "om"."organization_id"
   FROM ("public"."organization_memberships" "om"
     JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id")))
  WHERE (("o"."tenant_id" = "public"."get_current_tenant_id"()) AND ("om"."user_id" = "public"."get_current_user_profile"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



CREATE POLICY "organization_memberships_insert" ON "public"."organization_memberships" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "om"."organization_id"
   FROM ("public"."organization_memberships" "om"
     JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id")))
  WHERE (("o"."tenant_id" = "public"."get_current_tenant_id"()) AND ("om"."user_id" = "public"."get_current_user_profile"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) AND "public"."can_create_data"()));



CREATE POLICY "organization_memberships_select" ON "public"."organization_memberships" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."tenant_id" = "public"."get_current_tenant_id"()))));



CREATE POLICY "organization_memberships_update" ON "public"."organization_memberships" FOR UPDATE TO "authenticated" USING ((("user_id" = "public"."get_current_user_profile"()) OR ("organization_id" IN ( SELECT "om"."organization_id"
   FROM ("public"."organization_memberships" "om"
     JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id")))
  WHERE (("o"."tenant_id" = "public"."get_current_tenant_id"()) AND ("om"."user_id" = "public"."get_current_user_profile"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))) WITH CHECK (("public"."can_create_data"() OR ("user_id" = "public"."get_current_user_profile"())));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_tenant_isolation" ON "public"."organizations" TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "password_reset_tokens_user_access" ON "public"."password_reset_tokens" TO "authenticated" USING (("user_id" = "public"."get_current_user_profile"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_tenant_isolation" ON "public"."profiles" TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "tenant_isolation_select" ON "public"."tenants" FOR SELECT TO "authenticated" USING (("id" = "public"."get_current_tenant_id"()));



CREATE POLICY "tenant_self_insert" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK (("id" = "public"."get_current_tenant_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."documents";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organization_memberships";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organizations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."can_create_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_category" "text", "p_priority" integer, "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_category" "text", "p_priority" integer, "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_category" "text", "p_priority" integer, "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_pending_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."has_pending_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_pending_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";






























GRANT ALL ON TABLE "public"."deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."gdpr_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."gdpr_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."gdpr_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notification_events" TO "anon";
GRANT ALL ON TABLE "public"."notification_events" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_events" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_memberships" TO "anon";
GRANT ALL ON TABLE "public"."organization_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
