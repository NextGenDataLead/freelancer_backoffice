-- Migration: 011 - Client Invoicing Configuration Fields
-- Adds invoicing frequency and automation fields to clients table

-- Create invoicing frequency enum
CREATE TYPE "public"."invoicing_frequency" AS ENUM ('weekly', 'monthly', 'on_demand');

-- Add invoicing configuration fields to clients table
ALTER TABLE "public"."clients" 
ADD COLUMN IF NOT EXISTS "invoicing_frequency" "public"."invoicing_frequency" DEFAULT 'on_demand' NOT NULL,
ADD COLUMN IF NOT EXISTS "last_invoiced_date" date,
ADD COLUMN IF NOT EXISTS "next_invoice_due_date" date,
ADD COLUMN IF NOT EXISTS "auto_invoice_enabled" boolean DEFAULT false NOT NULL;

-- Add comments for new fields
COMMENT ON COLUMN "public"."clients"."invoicing_frequency" IS 'How often this client should be invoiced';
COMMENT ON COLUMN "public"."clients"."last_invoiced_date" IS 'Date when this client was last invoiced';
COMMENT ON COLUMN "public"."clients"."next_invoice_due_date" IS 'Next scheduled invoice date';
COMMENT ON COLUMN "public"."clients"."auto_invoice_enabled" IS 'Whether to automatically create invoices for this client';

-- Create index for querying clients ready for invoicing
CREATE INDEX "clients_invoicing_frequency_idx" ON "public"."clients" USING "btree" ("invoicing_frequency");
CREATE INDEX "clients_next_invoice_due_date_idx" ON "public"."clients" USING "btree" ("next_invoice_due_date");

-- Create function to calculate next invoice due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_invoice_due_date(
    frequency invoicing_frequency,
    last_invoiced date DEFAULT CURRENT_DATE
)
RETURNS date AS $$
BEGIN
    CASE frequency
        WHEN 'weekly' THEN 
            RETURN last_invoiced + INTERVAL '1 week';
        WHEN 'monthly' THEN 
            RETURN last_invoiced + INTERVAL '1 month';
        WHEN 'on_demand' THEN 
            RETURN NULL;
        ELSE 
            RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_invoice_due_date(invoicing_frequency, date) IS 'Calculates next invoice due date based on frequency and last invoiced date';

-- Create function to update next invoice due date when frequency changes
CREATE OR REPLACE FUNCTION update_next_invoice_due_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if invoicing_frequency changed or last_invoiced_date changed
    IF (NEW.invoicing_frequency != OLD.invoicing_frequency) OR 
       (NEW.last_invoiced_date != OLD.last_invoiced_date) OR
       (NEW.last_invoiced_date IS NOT NULL AND OLD.last_invoiced_date IS NULL) THEN
        
        NEW.next_invoice_due_date = calculate_next_invoice_due_date(
            NEW.invoicing_frequency, 
            COALESCE(NEW.last_invoiced_date, CURRENT_DATE)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update next invoice due date
CREATE TRIGGER trigger_update_next_invoice_due_date
    BEFORE UPDATE ON "public"."clients"
    FOR EACH ROW
    EXECUTE FUNCTION update_next_invoice_due_date();

-- Create view for clients ready for invoicing
CREATE OR REPLACE VIEW client_invoicing_summary AS
SELECT 
    c.*,
    COALESCE(time_summary.unbilled_hours, 0) as unbilled_hours,
    COALESCE(time_summary.unbilled_amount, 0) as unbilled_amount,
    COALESCE(invoice_summary.last_invoice_date, c.last_invoiced_date) as last_invoice_date,
    CASE 
        WHEN COALESCE(invoice_summary.last_invoice_date, c.last_invoiced_date) IS NULL THEN NULL
        ELSE CURRENT_DATE - COALESCE(invoice_summary.last_invoice_date, c.last_invoiced_date)
    END as days_since_last_invoice,
    
    -- Ready for invoicing logic
    CASE 
        WHEN time_summary.unbilled_hours > 0 AND (
            c.invoicing_frequency = 'on_demand' OR
            c.next_invoice_due_date <= CURRENT_DATE OR
            c.next_invoice_due_date IS NULL
        ) THEN true
        ELSE false
    END as ready_for_invoicing,
    
    -- Overdue for invoicing logic
    CASE 
        WHEN c.next_invoice_due_date IS NOT NULL AND 
             c.next_invoice_due_date < CURRENT_DATE AND 
             time_summary.unbilled_hours > 0 THEN true
        ELSE false
    END as overdue_for_invoicing

FROM clients c

-- Left join with unbilled time entries summary
LEFT JOIN (
    SELECT 
        te.client_id,
        SUM(te.hours) as unbilled_hours,
        SUM(te.hours * COALESCE(te.hourly_rate, p.hourly_rate, 0)) as unbilled_amount
    FROM time_entries te
    LEFT JOIN profiles p ON p.tenant_id = te.tenant_id
    WHERE te.billable = true 
      AND te.invoiced = false
      AND te.client_id IS NOT NULL
    GROUP BY te.client_id
) time_summary ON time_summary.client_id = c.id

-- Left join with last invoice date from invoices table
LEFT JOIN (
    SELECT 
        i.client_id,
        MAX(i.invoice_date) as last_invoice_date
    FROM invoices i
    WHERE i.status != 'cancelled'
    GROUP BY i.client_id
) invoice_summary ON invoice_summary.client_id = c.id;

COMMENT ON VIEW client_invoicing_summary IS 'View showing clients with their invoicing readiness and unbilled time summary';