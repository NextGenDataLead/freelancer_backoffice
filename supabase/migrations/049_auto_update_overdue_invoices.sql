-- Migration: Automatic Invoice Status Updates
-- Description: Automatically updates invoice statuses from 'sent' to 'overdue' when past due date
-- This function is designed to work with the development date system in the application

-- =============================================================================
-- DEVELOPMENT DATE SYSTEM
-- =============================================================================
-- This creates a database-level development date system that syncs with your
-- application's getCurrentDate() function.
--
-- USAGE:
-- Development: UPDATE development_settings SET dev_date = '2025-09-20', enabled = TRUE;
-- Production:  UPDATE development_settings SET enabled = FALSE;
--
-- When enabled = FALSE, the system automatically uses the real CURRENT_DATE.
-- =============================================================================

-- Create development settings table
CREATE TABLE IF NOT EXISTS development_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  dev_date DATE NOT NULL DEFAULT CURRENT_DATE,
  enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Set development date (change this to match your getCurrentDate() value)
INSERT INTO development_settings (id, dev_date, enabled, notes)
VALUES (1, '2025-09-20', TRUE, 'Development mode - synced with getCurrentDate() in src/lib/current-date.ts')
ON CONFLICT (id) DO UPDATE
SET
  dev_date = EXCLUDED.dev_date,
  enabled = EXCLUDED.enabled,
  updated_at = NOW(),
  notes = EXCLUDED.notes;

-- Function to get current date (respects development mode)
-- This replaces CURRENT_DATE in all invoice-related queries
CREATE OR REPLACE FUNCTION get_current_date()
RETURNS DATE
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (SELECT dev_date FROM development_settings WHERE id = 1 AND enabled = TRUE),
    CURRENT_DATE
  )
$$;

COMMENT ON FUNCTION get_current_date() IS
  'Returns development date if enabled, otherwise returns CURRENT_DATE. Use this instead of CURRENT_DATE in invoice queries.';

COMMENT ON TABLE development_settings IS
  'Controls development date mode. Set enabled=TRUE for development, FALSE for production.';

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to update overdue invoices
-- This function updates all 'sent' invoices that are past their due date to 'overdue' status
-- Uses get_current_date() to respect development mode
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS TABLE(updated_count INTEGER, updated_invoice_numbers TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
  v_updated_numbers TEXT[];
  v_current_date DATE;
BEGIN
  -- Get current date (respects development mode)
  v_current_date := get_current_date();

  -- Update invoices that are sent but past their due date
  WITH updated AS (
    UPDATE invoices
    SET
      status = 'overdue',
      updated_at = NOW()
    WHERE
      status = 'sent'
      AND due_date < v_current_date
    RETURNING id, invoice_number
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(invoice_number ORDER BY invoice_number)
  INTO
    v_updated_count,
    v_updated_numbers
  FROM updated;

  -- Log the operation
  RAISE NOTICE 'Updated % invoices to overdue status (using date: %): %',
    COALESCE(v_updated_count, 0),
    v_current_date,
    COALESCE(v_updated_numbers::TEXT, 'none');

  RETURN QUERY SELECT v_updated_count, v_updated_numbers;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_overdue_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_invoices() TO service_role;

-- Schedule the function to run daily at 1:00 AM (GMT)
-- This cron expression means: minute=0, hour=1, every day of month, every month, every day of week
SELECT cron.schedule(
  'update-overdue-invoices-daily',  -- job name
  '0 1 * * *',                       -- run at 1:00 AM daily
  $$SELECT update_overdue_invoices();$$
);

-- Comment on the function for documentation
COMMENT ON FUNCTION update_overdue_invoices() IS
  'Automatically updates invoices from sent to overdue status when past due date. Scheduled to run daily at 1:00 AM GMT via pg_cron.';
