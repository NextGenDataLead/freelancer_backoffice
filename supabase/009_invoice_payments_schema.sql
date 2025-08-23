-- Migration: 009 - Invoice Payments Schema
-- Adds payment tracking functionality for invoices
-- Supports partial payments and payment history

-- Add paid_amount column to invoices table
ALTER TABLE "public"."invoices" 
ADD COLUMN IF NOT EXISTS "paid_amount" numeric(12,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN "public"."invoices"."paid_amount" IS 'Total amount paid towards this invoice';

-- Create payment method enum
CREATE TYPE "public"."payment_method" AS ENUM ('bank_transfer', 'credit_card', 'cash', 'paypal', 'other');

-- Create invoice_payments table
CREATE TABLE "public"."invoice_payments" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL,
    "recorded_by" uuid NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_date" date DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" "public"."payment_method" DEFAULT 'bank_transfer' NOT NULL,
    "reference" text,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."invoice_payments" OWNER TO "postgres";

COMMENT ON TABLE "public"."invoice_payments" IS 'Payment records for invoices with partial payment support';
COMMENT ON COLUMN "public"."invoice_payments"."payment_date" IS 'Date the payment was received/made';
COMMENT ON COLUMN "public"."invoice_payments"."payment_method" IS 'Method used for payment';
COMMENT ON COLUMN "public"."invoice_payments"."reference" IS 'Payment reference number or transaction ID';

-- Add primary key and constraints for invoice_payments
ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id");

-- Add check constraints
ALTER TABLE "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_amount_positive" CHECK (amount > 0);

-- Add foreign key constraints
ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

-- Create indexes for performance
CREATE INDEX "invoice_payments_invoice_id_idx" ON "public"."invoice_payments" USING "btree" ("invoice_id");
CREATE INDEX "invoice_payments_tenant_id_idx" ON "public"."invoice_payments" USING "btree" ("tenant_id");
CREATE INDEX "invoice_payments_payment_date_idx" ON "public"."invoice_payments" USING "btree" ("payment_date");

-- Add check constraint to invoices to ensure paid_amount doesn't exceed total_amount
ALTER TABLE "public"."invoices"
    ADD CONSTRAINT "invoices_paid_amount_check" CHECK (paid_amount <= total_amount);

-- Create a function to update invoice status when payments are made
CREATE OR REPLACE FUNCTION update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice paid_amount and status
    UPDATE invoices 
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM invoice_payments 
            WHERE invoice_id = NEW.invoice_id
        ),
        status = CASE 
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payments 
                WHERE invoice_id = NEW.invoice_id
            ) >= total_amount THEN 'paid'
            WHEN status = 'draft' THEN 'sent' -- Auto-mark as sent when payment received
            ELSE status
        END,
        paid_at = CASE 
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payments 
                WHERE invoice_id = NEW.invoice_id
            ) >= total_amount THEN CURRENT_TIMESTAMP
            ELSE paid_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update invoice status on payment
CREATE TRIGGER trigger_update_invoice_status_on_payment
    AFTER INSERT ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_status_on_payment();

-- Create a function to recalculate invoice totals when payments are deleted
CREATE OR REPLACE FUNCTION recalculate_invoice_on_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice paid_amount and status
    UPDATE invoices 
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM invoice_payments 
            WHERE invoice_id = OLD.invoice_id
        ),
        status = CASE 
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payments 
                WHERE invoice_id = OLD.invoice_id
            ) >= total_amount THEN 'paid'
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payments 
                WHERE invoice_id = OLD.invoice_id
            ) = 0 AND status = 'paid' THEN 'sent' -- Revert to sent if no payments
            ELSE status
        END,
        paid_at = CASE 
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payments 
                WHERE invoice_id = OLD.invoice_id
            ) < total_amount THEN NULL -- Clear paid_at if not fully paid
            ELSE paid_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.invoice_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment deletion
CREATE TRIGGER trigger_recalculate_invoice_on_payment_delete
    AFTER DELETE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_on_payment_delete();