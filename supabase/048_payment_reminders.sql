-- Migration: 048 - Payment Reminder System
-- Adds payment reminder tracking and template management for invoice collections

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- ============================================
-- PAYMENT REMINDERS TABLE
-- ============================================
-- Tracks all payment reminders sent for invoices with escalation tracking

CREATE TABLE IF NOT EXISTS "public"."payment_reminders" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "invoice_id" uuid NOT NULL,
    "sent_by" uuid NOT NULL,
    "reminder_level" integer NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_sent_to" text NOT NULL,
    "email_subject" text NOT NULL,
    "email_body" text NOT NULL,
    "delivery_status" text DEFAULT 'sent',
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."payment_reminders" OWNER TO "postgres";

COMMENT ON TABLE "public"."payment_reminders" IS 'Tracks payment reminders sent for overdue invoices with delivery tracking';
COMMENT ON COLUMN "public"."payment_reminders"."reminder_level" IS '1=gentle reminder, 2=follow-up, 3=final notice';
COMMENT ON COLUMN "public"."payment_reminders"."delivery_status" IS 'Email delivery status: sent, delivered, bounced, failed';
COMMENT ON COLUMN "public"."payment_reminders"."opened_at" IS 'Timestamp when email was opened (if tracking enabled)';
COMMENT ON COLUMN "public"."payment_reminders"."clicked_at" IS 'Timestamp when link in email was clicked (if tracking enabled)';

-- ============================================
-- REMINDER TEMPLATES TABLE
-- ============================================
-- Stores customizable email templates for different reminder levels

CREATE TABLE IF NOT EXISTS "public"."reminder_templates" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "name" text NOT NULL,
    "reminder_level" integer NOT NULL,
    "subject" text NOT NULL,
    "body" text NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."reminder_templates" OWNER TO "postgres";

COMMENT ON TABLE "public"."reminder_templates" IS 'Customizable email templates for payment reminders with merge field support';
COMMENT ON COLUMN "public"."reminder_templates"."reminder_level" IS '1=gentle reminder, 2=follow-up, 3=final notice';
COMMENT ON COLUMN "public"."reminder_templates"."is_default" IS 'Whether this is the default template for this reminder level';

-- ============================================
-- PRIMARY KEYS
-- ============================================

ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."reminder_templates"
    ADD CONSTRAINT "reminder_templates_pkey" PRIMARY KEY ("id");

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_sent_by_fkey"
    FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."reminder_templates"
    ADD CONSTRAINT "reminder_templates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX "idx_payment_reminders_invoice" ON "public"."payment_reminders"("invoice_id");
CREATE INDEX "idx_payment_reminders_tenant" ON "public"."payment_reminders"("tenant_id");
CREATE INDEX "idx_payment_reminders_sent_at" ON "public"."payment_reminders"("sent_at");
CREATE INDEX "idx_reminder_templates_tenant" ON "public"."reminder_templates"("tenant_id");
CREATE INDEX "idx_reminder_templates_level" ON "public"."reminder_templates"("reminder_level");

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE "public"."payment_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reminder_templates" ENABLE ROW LEVEL SECURITY;

-- Payment Reminders Policies
CREATE POLICY "Users can view reminders for their tenant"
    ON "public"."payment_reminders"
    FOR SELECT
    USING ("tenant_id" IN (
        SELECT "tenant_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()
    ));

CREATE POLICY "Users can create reminders for their tenant"
    ON "public"."payment_reminders"
    FOR INSERT
    WITH CHECK ("tenant_id" IN (
        SELECT "tenant_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()
    ));

-- Reminder Templates Policies
CREATE POLICY "Users can view templates for their tenant"
    ON "public"."reminder_templates"
    FOR SELECT
    USING ("tenant_id" IN (
        SELECT "tenant_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()
    ));

CREATE POLICY "Users can manage templates for their tenant"
    ON "public"."reminder_templates"
    FOR ALL
    USING ("tenant_id" IN (
        SELECT "tenant_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()
    ));

-- ============================================
-- DEFAULT REMINDER TEMPLATES
-- ============================================
-- Insert default templates for system tenant (will be copied per tenant on first use)

-- We'll seed these via the application on first tenant creation or manual import
-- For now, create a template seeding function

CREATE OR REPLACE FUNCTION "public"."seed_default_reminder_templates"(
    "p_tenant_id" uuid
)
RETURNS void
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    -- Check if templates already exist for this tenant
    IF EXISTS (
        SELECT 1 FROM "public"."reminder_templates"
        WHERE "tenant_id" = "p_tenant_id"
    ) THEN
        RETURN;
    END IF;

    -- Level 1: Gentle Reminder
    INSERT INTO "public"."reminder_templates" (
        "tenant_id",
        "name",
        "reminder_level",
        "subject",
        "body",
        "is_default"
    ) VALUES (
        "p_tenant_id",
        'Friendly Payment Reminder',
        1,
        'Friendly reminder: Invoice {{invoice_number}} is now due',
        E'Dear {{admin_name}},\n\n' ||
        E'This is a friendly reminder that invoice {{invoice_number}} dated {{invoice_date}} is now due for payment.\n\n' ||
        E'Invoice Details:\n' ||
        E'- Invoice Number: {{invoice_number}}\n' ||
        E'- Amount: {{total_amount}}\n' ||
        E'- Due Date: {{due_date}}\n' ||
        E'- Days Overdue: {{days_overdue}}\n\n' ||
        E'If you have already processed this payment, please disregard this reminder. Otherwise, we would appreciate your prompt attention to this matter.\n\n' ||
        E'If you have any questions or concerns about this invoice, please don\'t hesitate to contact us.\n\n' ||
        E'Best regards,\n{{business_name}}',
        true
    );

    -- Level 2: Follow-up Reminder
    INSERT INTO "public"."reminder_templates" (
        "tenant_id",
        "name",
        "reminder_level",
        "subject",
        "body",
        "is_default"
    ) VALUES (
        "p_tenant_id",
        'Follow-up Payment Reminder',
        2,
        'Follow-up: Invoice {{invoice_number}} - Payment Required',
        E'Dear {{admin_name}},\n\n' ||
        E'We are writing to follow up on our previous reminder regarding invoice {{invoice_number}}, which is now {{days_overdue}} days overdue.\n\n' ||
        E'Invoice Details:\n' ||
        E'- Invoice Number: {{invoice_number}}\n' ||
        E'- Amount: {{total_amount}}\n' ||
        E'- Original Due Date: {{due_date}}\n' ||
        E'- Days Overdue: {{days_overdue}}\n\n' ||
        E'We would greatly appreciate your immediate attention to settling this outstanding balance. If there are any issues preventing payment, please contact us so we can work together to resolve them.\n\n' ||
        E'If payment has been made, please send us the payment reference so we can update our records.\n\n' ||
        E'Thank you for your cooperation.\n\n' ||
        E'Best regards,\n{{business_name}}',
        true
    );

    -- Level 3: Final Notice
    INSERT INTO "public"."reminder_templates" (
        "tenant_id",
        "name",
        "reminder_level",
        "subject",
        "body",
        "is_default"
    ) VALUES (
        "p_tenant_id",
        'Final Payment Notice',
        3,
        'FINAL NOTICE: Invoice {{invoice_number}} - Immediate Payment Required',
        E'Dear {{admin_name}},\n\n' ||
        E'This is a final notice regarding the seriously overdue payment for invoice {{invoice_number}}.\n\n' ||
        E'Invoice Details:\n' ||
        E'- Invoice Number: {{invoice_number}}\n' ||
        E'- Amount: {{total_amount}}\n' ||
        E'- Original Due Date: {{due_date}}\n' ||
        E'- Days Overdue: {{days_overdue}}\n\n' ||
        E'Despite our previous reminders, we have not yet received payment for this invoice. We require immediate payment to avoid further action.\n\n' ||
        E'Please arrange payment within 48 hours. If we do not receive payment or hear from you within this timeframe, we will be forced to consider additional collection measures.\n\n' ||
        E'If there are extenuating circumstances, please contact us immediately to discuss payment arrangements.\n\n' ||
        E'We trust this matter will be resolved promptly.\n\n' ||
        E'Regards,\n{{business_name}}',
        true
    );
END;
$$;

COMMENT ON FUNCTION "public"."seed_default_reminder_templates" IS 'Seeds default payment reminder templates for a tenant';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION "public"."seed_default_reminder_templates" TO "authenticated";
