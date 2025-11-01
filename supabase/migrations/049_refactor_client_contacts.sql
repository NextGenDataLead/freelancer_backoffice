-- Migration: Refactor Client Contacts Structure
-- Description: Remove name from clients table, make company_name required,
--              split client_contacts.name into first_name and last_name
-- Date: 2025-01-29

-- Step 0: Drop views that depend on the name columns
DROP VIEW IF EXISTS client_with_primary_contact CASCADE;
DROP VIEW IF EXISTS client_invoicing_summary CASCADE;

-- Step 1: Update existing client_contacts table structure
-- Add new columns for first_name and last_name
ALTER TABLE client_contacts
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Step 2: Migrate existing data - split name into first_name and last_name
-- For existing contacts, try to split the name intelligently
UPDATE client_contacts
SET
  first_name = CASE
    WHEN name ~ '\s' THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name ~ '\s' THEN trim(substring(name from position(' ' in name) + 1))
    ELSE 'Contactpersoon'
  END
WHERE name IS NOT NULL;

-- Step 3: For any contacts without a name, generate arbitrary names
UPDATE client_contacts
SET
  first_name = 'Contact',
  last_name = 'Persoon'
WHERE first_name IS NULL OR last_name IS NULL;

-- Step 4: Make first_name and last_name NOT NULL
ALTER TABLE client_contacts
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Step 5: Drop the old name column
ALTER TABLE client_contacts
DROP COLUMN name;

-- Step 6: Update clients table - set placeholder company names where NULL
UPDATE clients
SET company_name = COALESCE(name, 'Bedrijf ' || substring(id::text from 1 for 8))
WHERE company_name IS NULL;

-- Step 7: Make company_name NOT NULL in clients table
ALTER TABLE clients
ALTER COLUMN company_name SET NOT NULL;

-- Step 8: Drop the name column from clients table
ALTER TABLE clients
DROP COLUMN name;

-- Step 9: Add helpful indexes for contact names
CREATE INDEX IF NOT EXISTS idx_client_contacts_first_name ON client_contacts(first_name);
CREATE INDEX IF NOT EXISTS idx_client_contacts_last_name ON client_contacts(last_name);

-- Step 10: Update RLS policies if needed (contacts should already have proper policies)
-- The existing RLS policies on client_contacts should still work correctly

-- Step 11: Add comment to document the change
COMMENT ON COLUMN clients.company_name IS 'Company name (required) - single source of truth for client identification';
COMMENT ON COLUMN client_contacts.first_name IS 'Contact person first name (required)';
COMMENT ON COLUMN client_contacts.last_name IS 'Contact person last name (required)';

-- Step 12: Recreate the views with updated schema
CREATE VIEW client_with_primary_contact AS
SELECT
  c.id,
  c.tenant_id,
  c.created_by,
  c.company_name,
  c.email,
  c.phone,
  c.address,
  c.postal_code,
  c.city,
  c.country_code,
  c.vat_number,
  c.is_business,
  c.is_supplier,
  c.default_payment_terms,
  c.notes,
  c.created_at,
  c.updated_at,
  c.invoicing_frequency,
  c.last_invoiced_date,
  c.next_invoice_due_date,
  c.auto_invoice_enabled,
  c.active,
  c.hourly_rate,
  c.status,
  CONCAT(pc.first_name, ' ', pc.last_name) AS primary_contact_name,
  pc.email AS primary_contact_email,
  pc.phone AS primary_contact_phone,
  CONCAT(ac.first_name, ' ', ac.last_name) AS admin_contact_name,
  ac.email AS admin_contact_email,
  ac.phone AS admin_contact_phone
FROM clients c
LEFT JOIN client_contacts pc ON c.id = pc.client_id AND pc.contact_type = 'primary'
LEFT JOIN client_contacts ac ON c.id = ac.client_id AND ac.contact_type = 'administration';

CREATE VIEW client_invoicing_summary AS
SELECT
  c.id,
  c.tenant_id,
  c.created_by,
  c.company_name,
  c.email,
  c.phone,
  c.address,
  c.postal_code,
  c.city,
  c.country_code,
  c.vat_number,
  c.is_business,
  c.is_supplier,
  c.default_payment_terms,
  c.notes,
  c.created_at,
  c.updated_at,
  c.invoicing_frequency,
  c.last_invoiced_date,
  c.next_invoice_due_date,
  c.auto_invoice_enabled,
  COALESCE(time_summary.unbilled_hours, 0) AS unbilled_hours,
  COALESCE(time_summary.unbilled_amount, 0) AS unbilled_amount,
  COALESCE(invoice_summary.last_invoice_date, c.last_invoiced_date) AS last_invoice_date,
  CASE
    WHEN COALESCE(invoice_summary.last_invoice_date, c.last_invoiced_date) IS NULL THEN NULL
    ELSE CURRENT_DATE - COALESCE(invoice_summary.last_invoice_date, c.last_invoiced_date)
  END AS days_since_last_invoice,
  CASE
    WHEN time_summary.unbilled_hours > 0
      AND (c.invoicing_frequency = 'on_demand'
        OR c.next_invoice_due_date <= CURRENT_DATE
        OR c.next_invoice_due_date IS NULL)
    THEN true
    ELSE false
  END AS ready_for_invoicing,
  CASE
    WHEN c.next_invoice_due_date IS NOT NULL
      AND c.next_invoice_due_date < CURRENT_DATE
      AND time_summary.unbilled_hours > 0
    THEN true
    ELSE false
  END AS overdue_for_invoicing
FROM clients c
LEFT JOIN (
  SELECT
    te.client_id,
    SUM(te.hours) AS unbilled_hours,
    SUM(te.hours * COALESCE(te.hourly_rate, p.hourly_rate, 0)) AS unbilled_amount
  FROM time_entries te
  LEFT JOIN profiles p ON p.tenant_id = te.tenant_id
  WHERE te.billable = true
    AND te.invoiced = false
    AND te.client_id IS NOT NULL
  GROUP BY te.client_id
) time_summary ON time_summary.client_id = c.id
LEFT JOIN (
  SELECT
    i.client_id,
    MAX(i.invoice_date) AS last_invoice_date
  FROM invoices i
  WHERE i.status != 'cancelled'
  GROUP BY i.client_id
) invoice_summary ON invoice_summary.client_id = c.id;

-- Verification queries (for testing):
-- SELECT company_name, id FROM clients WHERE company_name IS NULL; -- Should return 0 rows
-- SELECT first_name, last_name, client_id FROM client_contacts WHERE first_name IS NULL OR last_name IS NULL; -- Should return 0 rows
-- SELECT c.company_name, cc.first_name, cc.last_name FROM clients c LEFT JOIN client_contacts cc ON c.id = cc.client_id LIMIT 10;
