-- Migration: 007 - Dutch ZZP Financial Suite Schema
-- Adds comprehensive financial management tables for Dutch freelancers (ZZP'ers)
-- Extends existing multi-tenant architecture with invoicing, expenses, VAT, and compliance

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- Create enum types for better type safety and performance
CREATE TYPE "public"."invoice_status" AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE "public"."vat_type" AS ENUM ('standard', 'reverse_charge', 'exempt', 'reduced');
CREATE TYPE "public"."expense_category" AS ENUM ('office_supplies', 'travel', 'meals', 'marketing', 'software', 'equipment', 'insurance', 'professional_services', 'other');
CREATE TYPE "public"."business_type" AS ENUM ('sole_trader', 'partnership', 'bv', 'other');

-- Extend profiles table with ZZP-specific information
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "kvk_number" character varying(8);
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "btw_number" character varying(20);
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "business_name" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "business_type" "public"."business_type" DEFAULT 'sole_trader';
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "financial_year_start" date DEFAULT date_trunc('year', CURRENT_DATE);
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "kor_enabled" boolean DEFAULT false;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "hourly_rate" numeric(10,2);

-- Add comments for new profile columns
COMMENT ON COLUMN "public"."profiles"."kvk_number" IS 'Dutch Chamber of Commerce registration number';
COMMENT ON COLUMN "public"."profiles"."btw_number" IS 'Dutch VAT identification number';
COMMENT ON COLUMN "public"."profiles"."business_name" IS 'Registered business name';
COMMENT ON COLUMN "public"."profiles"."business_type" IS 'Type of business entity';
COMMENT ON COLUMN "public"."profiles"."financial_year_start" IS 'Start date of financial year';
COMMENT ON COLUMN "public"."profiles"."kor_enabled" IS 'Using Kleineondernemersregeling (small business scheme)';
COMMENT ON COLUMN "public"."profiles"."hourly_rate" IS 'Default hourly rate in EUR';

-- Create clients table for customer/supplier management
CREATE TABLE "public"."clients" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "name" text NOT NULL,
    "company_name" text,
    "email" text,
    "phone" text,
    "address" text,
    "postal_code" character varying(10),
    "city" text,
    "country_code" character varying(2) DEFAULT 'NL',
    "vat_number" text,
    "is_business" boolean DEFAULT true,
    "is_supplier" boolean DEFAULT false,
    "default_payment_terms" integer DEFAULT 30,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."clients" OWNER TO "postgres";

COMMENT ON TABLE "public"."clients" IS 'Customer and supplier management with EU VAT support';
COMMENT ON COLUMN "public"."clients"."vat_number" IS 'EU VAT identification number for reverse charge';
COMMENT ON COLUMN "public"."clients"."is_business" IS 'True for B2B clients, false for B2C';
COMMENT ON COLUMN "public"."clients"."is_supplier" IS 'True if this client is also a supplier';
COMMENT ON COLUMN "public"."clients"."default_payment_terms" IS 'Default payment terms in days';

-- Create VAT rates table for dynamic rate management
CREATE TABLE "public"."vat_rates" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "country_code" character varying(2) NOT NULL,
    "rate_type" "public"."vat_type" NOT NULL,
    "rate" numeric(5,4) NOT NULL,
    "effective_from" date NOT NULL,
    "effective_to" date,
    "description" text,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."vat_rates" OWNER TO "postgres";

COMMENT ON TABLE "public"."vat_rates" IS 'VAT rates by country and type with historical tracking';

-- Create invoices table
CREATE TABLE "public"."invoices" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "client_id" uuid NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "invoice_date" date DEFAULT CURRENT_DATE NOT NULL,
    "due_date" date NOT NULL,
    "status" "public"."invoice_status" DEFAULT 'draft',
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "vat_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "vat_type" "public"."vat_type" DEFAULT 'standard' NOT NULL,
    "vat_rate" numeric(5,4) DEFAULT 0.21 NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR',
    "reference" text,
    "notes" text,
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "pdf_url" text,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."invoices" OWNER TO "postgres";

COMMENT ON TABLE "public"."invoices" IS 'Invoice management with Dutch VAT compliance';
COMMENT ON COLUMN "public"."invoices"."vat_type" IS 'Type of VAT calculation applied';
COMMENT ON COLUMN "public"."invoices"."vat_rate" IS 'VAT rate used at time of invoice creation';

-- Create invoice line items table
CREATE TABLE "public"."invoice_items" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" uuid NOT NULL,
    "description" text NOT NULL,
    "quantity" numeric(10,3) DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."invoice_items" OWNER TO "postgres";

COMMENT ON TABLE "public"."invoice_items" IS 'Individual line items for invoices';

-- Create expenses table
CREATE TABLE "public"."expenses" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "supplier_id" uuid,
    "expense_date" date DEFAULT CURRENT_DATE NOT NULL,
    "description" text NOT NULL,
    "category" "public"."expense_category" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "vat_amount" numeric(12,2) DEFAULT 0,
    "total_amount" numeric(12,2) NOT NULL,
    "vat_rate" numeric(5,4) DEFAULT 0.21,
    "is_deductible" boolean DEFAULT true,
    "receipt_url" text,
    "ocr_data" jsonb,
    "ocr_confidence" numeric(3,2),
    "manual_verification_required" boolean DEFAULT true,
    "verified_at" timestamp with time zone,
    "verified_by" uuid,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."expenses" OWNER TO "postgres";

COMMENT ON TABLE "public"."expenses" IS 'Expense tracking with OCR integration and VAT handling';
COMMENT ON COLUMN "public"."expenses"."ocr_data" IS 'Raw OCR extraction data from receipt processing';
COMMENT ON COLUMN "public"."expenses"."ocr_confidence" IS 'OCR confidence score (0.0 - 1.0)';

-- Create time entries table
CREATE TABLE "public"."time_entries" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "client_id" uuid,
    "project_name" text,
    "description" text NOT NULL,
    "entry_date" date DEFAULT CURRENT_DATE NOT NULL,
    "hours" numeric(8,2) NOT NULL,
    "hourly_rate" numeric(10,2),
    "billable" boolean DEFAULT true,
    "invoiced" boolean DEFAULT false,
    "invoice_id" uuid,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."time_entries" OWNER TO "postgres";

COMMENT ON TABLE "public"."time_entries" IS 'Time tracking for billable hours';

-- Create kilometer entries table
CREATE TABLE "public"."kilometer_entries" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "created_by" uuid NOT NULL,
    "client_id" uuid,
    "entry_date" date DEFAULT CURRENT_DATE NOT NULL,
    "from_address" text NOT NULL,
    "to_address" text NOT NULL,
    "distance_km" numeric(8,2) NOT NULL,
    "business_purpose" text NOT NULL,
    "is_business" boolean DEFAULT true,
    "rate_per_km" numeric(6,4) DEFAULT 0.19,
    "total_amount" numeric(10,2),
    "invoiced" boolean DEFAULT false,
    "invoice_id" uuid,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."kilometer_entries" OWNER TO "postgres";

COMMENT ON TABLE "public"."kilometer_entries" IS 'Kilometer tracking for travel expenses';
COMMENT ON COLUMN "public"."kilometer_entries"."rate_per_km" IS 'Rate per kilometer in EUR (Dutch tax rate)';

-- Create financial reports table for cached calculations
CREATE TABLE "public"."financial_reports" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "report_type" text NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "data" jsonb NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "generated_by" uuid NOT NULL
);

ALTER TABLE "public"."financial_reports" OWNER TO "postgres";

COMMENT ON TABLE "public"."financial_reports" IS 'Cached financial reports and VAT calculations';

-- Create transaction log for audit trail
CREATE TABLE "public"."transaction_log" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" uuid NOT NULL,
    "action" text NOT NULL,
    "old_data" jsonb,
    "new_data" jsonb,
    "changed_by" uuid NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" inet,
    "user_agent" text
);

ALTER TABLE "public"."transaction_log" OWNER TO "postgres";

COMMENT ON TABLE "public"."transaction_log" IS 'Immutable audit log for all financial transactions';

-- Add primary keys
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."vat_rates" ADD CONSTRAINT "vat_rates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."invoices" ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."invoice_items" ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."expenses" ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."time_entries" ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."kilometer_entries" ADD CONSTRAINT "kilometer_entries_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."financial_reports" ADD CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."transaction_log" ADD CONSTRAINT "transaction_log_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."invoices" ADD CONSTRAINT "invoices_tenant_invoice_number_key" UNIQUE ("tenant_id", "invoice_number");
ALTER TABLE ONLY "public"."financial_reports" ADD CONSTRAINT "financial_reports_tenant_type_period_key" UNIQUE ("tenant_id", "report_type", "period_start", "period_end");

-- Insert default Dutch VAT rates
INSERT INTO "public"."vat_rates" ("country_code", "rate_type", "rate", "effective_from", "description") VALUES
('NL', 'standard', 0.21, '2024-01-01', 'Dutch standard VAT rate 21%'),
('NL', 'reduced', 0.09, '2024-01-01', 'Dutch reduced VAT rate 9%'),
('NL', 'exempt', 0.0, '2024-01-01', 'VAT exempt'),
('NL', 'reverse_charge', 0.0, '2024-01-01', 'Reverse charge - VAT handled by customer');

-- Enable Row Level Security on all new tables
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vat_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."kilometer_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."financial_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transaction_log" ENABLE ROW LEVEL SECURITY;