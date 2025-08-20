-- Migration: 008 - ZZP Financial Schema - Foreign Keys and RLS Policies
-- Adds foreign key relationships, indexes, and Row Level Security policies for financial tables

-- ====================
-- FOREIGN KEY RELATIONSHIPS
-- ====================

-- Clients relationships
ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");

-- Invoices relationships
ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");

-- Invoice items relationships
ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;

-- Expenses relationships
ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."clients"("id");
ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id");

-- Time entries relationships
ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");
ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");

-- Kilometer entries relationships
ALTER TABLE ONLY "public"."kilometer_entries"
    ADD CONSTRAINT "kilometer_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."kilometer_entries"
    ADD CONSTRAINT "kilometer_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."kilometer_entries"
    ADD CONSTRAINT "kilometer_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");
ALTER TABLE ONLY "public"."kilometer_entries"
    ADD CONSTRAINT "kilometer_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");

-- Financial reports relationships
ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id");

-- Transaction log relationships
ALTER TABLE ONLY "public"."transaction_log"
    ADD CONSTRAINT "transaction_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."transaction_log"
    ADD CONSTRAINT "transaction_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Clients indexes
CREATE INDEX IF NOT EXISTS "idx_clients_tenant_id" ON "public"."clients" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_clients_created_by" ON "public"."clients" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_clients_email" ON "public"."clients" USING "btree" ("email") WHERE ("email" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_clients_vat_number" ON "public"."clients" USING "btree" ("vat_number") WHERE ("vat_number" IS NOT NULL);

-- VAT rates indexes
CREATE INDEX IF NOT EXISTS "idx_vat_rates_country_type" ON "public"."vat_rates" USING "btree" ("country_code", "rate_type");
CREATE INDEX IF NOT EXISTS "idx_vat_rates_effective" ON "public"."vat_rates" USING "btree" ("effective_from", "effective_to");

-- Invoices indexes
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_id" ON "public"."invoices" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_client_id" ON "public"."invoices" USING "btree" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_created_by" ON "public"."invoices" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_invoices_invoice_date" ON "public"."invoices" USING "btree" ("invoice_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date") WHERE ("status" IN ('sent', 'overdue'));

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice_id" ON "public"."invoice_items" USING "btree" ("invoice_id");

-- Expenses indexes
CREATE INDEX IF NOT EXISTS "idx_expenses_tenant_id" ON "public"."expenses" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_created_by" ON "public"."expenses" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_expenses_expense_date" ON "public"."expenses" USING "btree" ("expense_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_expenses_category" ON "public"."expenses" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "idx_expenses_verification" ON "public"."expenses" USING "btree" ("manual_verification_required", "verified_at");

-- Time entries indexes
CREATE INDEX IF NOT EXISTS "idx_time_entries_tenant_id" ON "public"."time_entries" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_created_by" ON "public"."time_entries" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_time_entries_client_id" ON "public"."time_entries" USING "btree" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_entry_date" ON "public"."time_entries" USING "btree" ("entry_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_time_entries_billable" ON "public"."time_entries" USING "btree" ("billable", "invoiced");

-- Kilometer entries indexes
CREATE INDEX IF NOT EXISTS "idx_kilometer_entries_tenant_id" ON "public"."kilometer_entries" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_kilometer_entries_created_by" ON "public"."kilometer_entries" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_kilometer_entries_entry_date" ON "public"."kilometer_entries" USING "btree" ("entry_date" DESC);
CREATE INDEX IF NOT EXISTS "idx_kilometer_entries_business" ON "public"."kilometer_entries" USING "btree" ("is_business", "invoiced");

-- Financial reports indexes
CREATE INDEX IF NOT EXISTS "idx_financial_reports_tenant_id" ON "public"."financial_reports" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_financial_reports_type_period" ON "public"."financial_reports" USING "btree" ("report_type", "period_start", "period_end");

-- Transaction log indexes
CREATE INDEX IF NOT EXISTS "idx_transaction_log_tenant_id" ON "public"."transaction_log" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_log_entity" ON "public"."transaction_log" USING "btree" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_log_changed_at" ON "public"."transaction_log" USING "btree" ("changed_at" DESC);

-- ====================
-- ROW LEVEL SECURITY POLICIES
-- ====================

-- Clients policies
CREATE POLICY "clients_tenant_isolation" ON "public"."clients" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "clients_insert_policy" ON "public"."clients" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "clients_update_policy" ON "public"."clients" 
    FOR UPDATE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"())) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

-- VAT rates policies (read-only for all authenticated users)
CREATE POLICY "vat_rates_select_policy" ON "public"."vat_rates" 
    FOR SELECT TO "authenticated" 
    USING (true);

-- Invoices policies
CREATE POLICY "invoices_tenant_isolation" ON "public"."invoices" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "invoices_insert_policy" ON "public"."invoices" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "invoices_update_policy" ON "public"."invoices" 
    FOR UPDATE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"())) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

-- Invoice items policies (inherit from invoice policies)
CREATE POLICY "invoice_items_select_policy" ON "public"."invoice_items" 
    FOR SELECT TO "authenticated" 
    USING ((EXISTS (
        SELECT 1 FROM "public"."invoices" "i" 
        WHERE ("i"."id" = "invoice_items"."invoice_id" 
        AND "i"."tenant_id" = "public"."get_current_tenant_id"()))));

CREATE POLICY "invoice_items_insert_policy" ON "public"."invoice_items" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((EXISTS (
        SELECT 1 FROM "public"."invoices" "i" 
        WHERE ("i"."id" = "invoice_items"."invoice_id" 
        AND "i"."tenant_id" = "public"."get_current_tenant_id"()))));

CREATE POLICY "invoice_items_update_policy" ON "public"."invoice_items" 
    FOR UPDATE TO "authenticated" 
    USING ((EXISTS (
        SELECT 1 FROM "public"."invoices" "i" 
        WHERE ("i"."id" = "invoice_items"."invoice_id" 
        AND "i"."tenant_id" = "public"."get_current_tenant_id"()))))
    WITH CHECK ((EXISTS (
        SELECT 1 FROM "public"."invoices" "i" 
        WHERE ("i"."id" = "invoice_items"."invoice_id" 
        AND "i"."tenant_id" = "public"."get_current_tenant_id"()))));

CREATE POLICY "invoice_items_delete_policy" ON "public"."invoice_items" 
    FOR DELETE TO "authenticated" 
    USING ((EXISTS (
        SELECT 1 FROM "public"."invoices" "i" 
        WHERE ("i"."id" = "invoice_items"."invoice_id" 
        AND "i"."tenant_id" = "public"."get_current_tenant_id"()))));

-- Expenses policies
CREATE POLICY "expenses_tenant_isolation" ON "public"."expenses" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "expenses_insert_policy" ON "public"."expenses" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "expenses_update_policy" ON "public"."expenses" 
    FOR UPDATE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"())) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

-- Time entries policies
CREATE POLICY "time_entries_tenant_isolation" ON "public"."time_entries" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "time_entries_insert_policy" ON "public"."time_entries" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "time_entries_update_policy" ON "public"."time_entries" 
    FOR UPDATE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"())) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

-- Kilometer entries policies
CREATE POLICY "kilometer_entries_tenant_isolation" ON "public"."kilometer_entries" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "kilometer_entries_insert_policy" ON "public"."kilometer_entries" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

CREATE POLICY "kilometer_entries_update_policy" ON "public"."kilometer_entries" 
    FOR UPDATE TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"())) 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

-- Financial reports policies
CREATE POLICY "financial_reports_tenant_isolation" ON "public"."financial_reports" 
    TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

CREATE POLICY "financial_reports_insert_policy" ON "public"."financial_reports" 
    FOR INSERT TO "authenticated" 
    WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) AND "public"."can_create_data"()));

-- Transaction log policies (read-only for tenant users)
CREATE POLICY "transaction_log_tenant_isolation" ON "public"."transaction_log" 
    FOR SELECT TO "authenticated" 
    USING (("tenant_id" = "public"."get_current_tenant_id"()));

-- ====================
-- TRIGGERS FOR UPDATED_AT
-- ====================

CREATE OR REPLACE TRIGGER "update_clients_updated_at" 
    BEFORE UPDATE ON "public"."clients" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_invoices_updated_at" 
    BEFORE UPDATE ON "public"."invoices" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_expenses_updated_at" 
    BEFORE UPDATE ON "public"."expenses" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_time_entries_updated_at" 
    BEFORE UPDATE ON "public"."time_entries" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_kilometer_entries_updated_at" 
    BEFORE UPDATE ON "public"."kilometer_entries" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();