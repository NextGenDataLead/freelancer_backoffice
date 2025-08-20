-- Migration: 003 - All Tables
-- Creates all tables with primary keys and unique constraints, but no foreign keys yet

-- Create tenants table (organization/company level)
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

-- Create profiles table (user data - single source of truth)
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

-- Create organizations table (sub-organizations within tenants)
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

-- Create organization memberships (many-to-many relationship)
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

-- Create password reset tokens table
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

-- Create deletion requests table for GDPR account deletion workflow
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

-- Create GDPR audit logs table for compliance tracking
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

-- Create documents table with vector embeddings
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

-- Create notifications table
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

-- Create notification events table for tracking notification lifecycle
CREATE TABLE IF NOT EXISTS "public"."notification_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid",
    "event_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notification_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'read'::"text", 'dismissed'::"text", 'clicked'::"text"])))
);

ALTER TABLE "public"."notification_events" OWNER TO "postgres";

-- Add primary keys and unique constraints
ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_subdomain_key" UNIQUE ("subdomain");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_clerk_user_id_key" UNIQUE ("clerk_user_id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");

ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_clerk_org_id_key" UNIQUE ("clerk_org_id");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");

ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_hash_key" UNIQUE ("token_hash");

ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."gdpr_audit_logs"
    ADD CONSTRAINT "gdpr_audit_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notification_events"
    ADD CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id");