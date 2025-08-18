-- Migration: 005 - Row Level Security Policies
-- Enables RLS and creates all security policies (references functions that already exist)

-- ====================
-- ENABLE ROW LEVEL SECURITY
-- ====================

ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."deletion_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gdpr_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_events" ENABLE ROW LEVEL SECURITY;

-- ====================
-- TENANT POLICIES
-- ====================

CREATE POLICY "tenant_isolation_select" ON "public"."tenants" 
    FOR SELECT TO "authenticated" 
    USING (("id" = "public"."get_current_tenant_id"()));

CREATE POLICY "tenant_self_insert" ON "public"."tenants" 
    FOR INSERT TO "authenticated" 
    WITH CHECK (("id" = "public"."get_current_tenant_id"()));

-- ====================
-- PROFILE POLICIES
-- ====================

CREATE POLICY "profiles_tenant_isolation" ON "public"."profiles" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "allow_user_profile_creation" ON "public"."profiles" 
    FOR INSERT TO "authenticated" 
    WITH CHECK (((("auth"."uid"())::"text" = "clerk_user_id") OR ("public"."get_current_tenant_id"() IS NOT NULL)));

-- ====================
-- ORGANIZATION POLICIES
-- ====================

CREATE POLICY "organizations_tenant_isolation" ON "public"."organizations" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "Authenticated users can create organizations" ON "public"."organizations" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "admin_full_access" ON "public"."organizations" 
    TO "authenticated" 
    USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND (EXISTS ( 
        SELECT 1 FROM "public"."profiles" 
        WHERE (("profiles"."id" = "public"."get_current_user_profile"()) 
        AND ("profiles"."tenant_id" = "public"."get_current_tenant_id"()) 
        AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])))))));

-- ====================
-- ORGANIZATION MEMBERSHIP POLICIES
-- ====================

CREATE POLICY "organization_memberships_select" ON "public"."organization_memberships" 
    FOR SELECT TO "authenticated" 
    USING (("organization_id" IN ( 
        SELECT "organizations"."id" FROM "public"."organizations" 
        WHERE ("organizations"."tenant_id" = "public"."get_current_tenant_id"()))));

CREATE POLICY "org_memberships_access" ON "public"."organization_memberships" 
    FOR SELECT TO "authenticated" 
    USING (("organization_id" IN ( 
        SELECT "organization_memberships_1"."organization_id" FROM "public"."organization_memberships" "organization_memberships_1" 
        WHERE ("organization_memberships_1"."user_id" = "public"."get_current_user_profile"()))));

CREATE POLICY "organization_memberships_insert" ON "public"."organization_memberships" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("organization_id" IN ( 
        SELECT "om"."organization_id" FROM ("public"."organization_memberships" "om" 
        JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id"))) 
        WHERE (("o"."tenant_id" = "public"."get_current_tenant_id"()) 
        AND ("om"."user_id" = "public"."get_current_user_profile"()) 
        AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) 
        AND "public"."can_create_data"()));

CREATE POLICY "organization_memberships_update" ON "public"."organization_memberships" 
    FOR UPDATE TO "authenticated" 
    USING ((("user_id" = "public"."get_current_user_profile"()) OR ("organization_id" IN ( 
        SELECT "om"."organization_id" FROM ("public"."organization_memberships" "om" 
        JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id"))) 
        WHERE (("o"."tenant_id" = "public"."get_current_tenant_id"()) 
        AND ("om"."user_id" = "public"."get_current_user_profile"()) 
        AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))) 
    WITH CHECK (("public"."can_create_data"() OR ("user_id" = "public"."get_current_user_profile"())));

CREATE POLICY "organization_memberships_delete" ON "public"."organization_memberships" 
    FOR DELETE TO "authenticated" 
    USING ((("user_id" = "public"."get_current_user_profile"()) OR ("organization_id" IN ( 
        SELECT "om"."organization_id" FROM ("public"."organization_memberships" "om" 
        JOIN "public"."organizations" "o" ON (("o"."id" = "om"."organization_id"))) 
        WHERE (("o"."tenant_id" = "public"."get_current_tenant_id"()) 
        AND ("om"."user_id" = "public"."get_current_user_profile"()) 
        AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));

-- ====================
-- PASSWORD RESET TOKEN POLICIES
-- ====================

CREATE POLICY "password_reset_tokens_user_access" ON "public"."password_reset_tokens" 
    TO "authenticated" 
    USING (("user_id" = "public"."get_current_user_profile"()));

-- ====================
-- GDPR POLICIES
-- ====================

CREATE POLICY "deletion_requests_user_access" ON "public"."deletion_requests" 
    TO "authenticated" 
    USING (("user_id" = "public"."get_current_user_profile"()));

CREATE POLICY "gdpr_audit_logs_user_access" ON "public"."gdpr_audit_logs" 
    FOR SELECT TO "authenticated" 
    USING (("user_id" = "public"."get_current_user_profile"()));

-- ====================
-- DOCUMENT POLICIES
-- ====================

CREATE POLICY "documents_select_policy" ON "public"."documents" 
    FOR SELECT TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "documents_insert_policy" ON "public"."documents" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "documents_update_policy" ON "public"."documents" 
    FOR UPDATE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"())) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "documents_delete_policy" ON "public"."documents" 
    FOR DELETE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

-- ====================
-- NOTIFICATION POLICIES
-- ====================

CREATE POLICY "Users can view own notifications" ON "public"."notifications" 
    FOR SELECT TO "authenticated" 
    USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"())));

CREATE POLICY "Users can create notifications in tenant" ON "public"."notifications" 
    FOR INSERT TO "authenticated" 
    WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "Users can update own notifications" ON "public"."notifications" 
    FOR UPDATE TO "authenticated" 
    USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"()))) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"())));

CREATE POLICY "Users can delete own notifications" ON "public"."notifications" 
    FOR DELETE TO "authenticated" 
    USING ((("tenant_id" = "public"."get_current_tenant_id"()) AND ("user_id" = "public"."get_current_user_profile"())));

-- ====================
-- NOTIFICATION EVENT POLICIES
-- ====================

CREATE POLICY "Users can view own notification events" ON "public"."notification_events" 
    FOR SELECT TO "authenticated" 
    USING ((EXISTS ( 
        SELECT 1 FROM "public"."notifications" "n" 
        WHERE (("n"."id" = "notification_events"."notification_id") 
        AND ("n"."tenant_id" = "public"."get_current_tenant_id"()) 
        AND ("n"."user_id" = "public"."get_current_user_profile"())))));

CREATE POLICY "Users can create notification events" ON "public"."notification_events" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((EXISTS ( 
        SELECT 1 FROM "public"."notifications" "n" 
        WHERE (("n"."id" = "notification_events"."notification_id") 
        AND ("n"."tenant_id" = "public"."get_current_tenant_id"()) 
        AND ("n"."user_id" = "public"."get_current_user_profile"())))));