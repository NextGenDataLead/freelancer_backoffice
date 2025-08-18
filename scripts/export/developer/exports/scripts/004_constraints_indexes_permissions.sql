-- Migration: 004 - Foreign Keys, Indexes, Triggers, and Permissions
-- Adds all structural elements now that tables exist

-- ====================
-- FOREIGN KEY RELATIONSHIPS
-- ====================

-- Profiles relationships
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

-- Organizations relationships
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

-- Organization memberships relationships
ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");

-- Password reset tokens relationships
ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Deletion requests relationships
ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Documents relationships
ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

-- Notifications relationships
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Notification events relationships
ALTER TABLE ONLY "public"."notification_events"
    ADD CONSTRAINT "notification_events_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Tenants indexes
CREATE INDEX IF NOT EXISTS "idx_tenants_subdomain" ON "public"."tenants" USING "btree" ("subdomain");
CREATE INDEX IF NOT EXISTS "idx_tenants_status" ON "public"."tenants" USING "btree" ("subscription_status") WHERE ("subscription_status" <> 'active'::"text");

-- Profiles indexes
CREATE INDEX IF NOT EXISTS "idx_profiles_tenant_id" ON "public"."profiles" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_profiles_clerk_user_id" ON "public"."profiles" USING "btree" ("clerk_user_id");
CREATE INDEX IF NOT EXISTS "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");
CREATE INDEX IF NOT EXISTS "idx_profiles_username" ON "public"."profiles" USING "btree" ("username") WHERE ("username" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_profiles_onboarding_complete" ON "public"."profiles" USING "btree" ("onboarding_complete");
CREATE INDEX IF NOT EXISTS "idx_profiles_anonymized" ON "public"."profiles" USING "btree" ("anonymized_at") WHERE ("anonymized_at" IS NOT NULL);

-- Organizations indexes
CREATE INDEX IF NOT EXISTS "idx_organizations_tenant_id" ON "public"."organizations" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");

-- Organization memberships indexes
CREATE INDEX IF NOT EXISTS "idx_org_memberships_org_id" ON "public"."organization_memberships" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_org_memberships_user_id" ON "public"."organization_memberships" USING "btree" ("user_id");

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_id" ON "public"."password_reset_tokens" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires" ON "public"."password_reset_tokens" USING "btree" ("expires_at") WHERE ("used" = false);

-- Deletion requests indexes
CREATE INDEX IF NOT EXISTS "idx_deletion_requests_user_status" ON "public"."deletion_requests" USING "btree" ("user_id", "status") WHERE ("status" = 'pending'::"text");
CREATE INDEX IF NOT EXISTS "idx_deletion_requests_status" ON "public"."deletion_requests" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));
CREATE INDEX IF NOT EXISTS "idx_deletion_requests_scheduled" ON "public"."deletion_requests" USING "btree" ("scheduled_for") WHERE ("status" = 'pending'::"text");

-- GDPR audit logs indexes
CREATE INDEX IF NOT EXISTS "idx_gdpr_logs_user_id" ON "public"."gdpr_audit_logs" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_gdpr_logs_action" ON "public"."gdpr_audit_logs" USING "btree" ("action");
CREATE INDEX IF NOT EXISTS "idx_gdpr_logs_timestamp" ON "public"."gdpr_audit_logs" USING "btree" ("timestamp");

-- Documents indexes
CREATE INDEX IF NOT EXISTS "idx_documents_tenant_id" ON "public"."documents" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_documents_organization_id" ON "public"."documents" USING "btree" ("organization_id");
CREATE INDEX "documents_embedding_idx" ON "public"."documents" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');

-- Notifications indexes
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_id" ON "public"."notifications" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");
CREATE INDEX IF NOT EXISTS "idx_notifications_category" ON "public"."notifications" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "public"."notifications" USING "btree" ("priority");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at") WHERE ("read_at" IS NULL);

-- Notification events indexes
CREATE INDEX IF NOT EXISTS "idx_notification_events_notification_id" ON "public"."notification_events" USING "btree" ("notification_id");
CREATE INDEX IF NOT EXISTS "idx_notification_events_type" ON "public"."notification_events" USING "btree" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_notification_events_created_at" ON "public"."notification_events" USING "btree" ("created_at" DESC);

-- ====================
-- TRIGGERS
-- ====================

-- Add triggers for updated_at columns
CREATE OR REPLACE TRIGGER "update_tenants_updated_at" 
    BEFORE UPDATE ON "public"."tenants" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_profiles_updated_at" 
    BEFORE UPDATE ON "public"."profiles" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_organizations_updated_at" 
    BEFORE UPDATE ON "public"."organizations" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_documents_updated_at" 
    BEFORE UPDATE ON "public"."documents" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ====================
-- PERMISSIONS
-- ====================

-- Grant schema usage permissions
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Grant function permissions
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

-- Grant table permissions
GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";

GRANT ALL ON TABLE "public"."organization_memberships" TO "anon";
GRANT ALL ON TABLE "public"."organization_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_memberships" TO "service_role";

GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";

GRANT ALL ON TABLE "public"."deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_requests" TO "service_role";

GRANT ALL ON TABLE "public"."gdpr_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."gdpr_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."gdpr_audit_logs" TO "service_role";

GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

GRANT ALL ON TABLE "public"."notification_events" TO "anon";
GRANT ALL ON TABLE "public"."notification_events" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_events" TO "service_role";

-- Set up default privileges for future objects
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

-- Set up real-time publications for live updates
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."documents";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organization_memberships";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organizations";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";