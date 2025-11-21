-- Migration: Automatic Time Entry Status Updates
-- Description: Automatically updates time entry computed statuses based on invoicing frequency rules
-- This runs daily to keep "Ready to Invoice" status current

-- =============================================================================
-- ADD COMPUTED STATUS COLUMNS
-- =============================================================================

-- Add computed status columns to time_entries table
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS computed_status TEXT,
ADD COLUMN IF NOT EXISTS computed_status_color TEXT,
ADD COLUMN IF NOT EXISTS status_last_calculated TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_time_entries_computed_status
ON time_entries(computed_status, computed_status_color);

CREATE INDEX IF NOT EXISTS idx_time_entries_status_calculated
ON time_entries(status_last_calculated);

COMMENT ON COLUMN time_entries.computed_status IS
  'Computed status: factureerbaar, niet-factureerbaar, or gefactureerd. Updated daily by cron job.';

COMMENT ON COLUMN time_entries.computed_status_color IS
  'Status color indicator: green (ready to invoice), orange (not yet due), red (non-billable), purple (invoiced)';

COMMENT ON COLUMN time_entries.status_last_calculated IS
  'Timestamp when status was last calculated. Used to track freshness of computed values.';

-- =============================================================================
-- STATUS CALCULATION FUNCTION
-- =============================================================================

-- Function to calculate time entry status based on business rules
-- Matches logic from src/lib/utils/time-entry-status.ts
CREATE OR REPLACE FUNCTION calculate_time_entry_status(
  p_entry_date DATE,
  p_billable BOOLEAN,
  p_invoiced BOOLEAN,
  p_invoice_id UUID,
  p_invoicing_frequency TEXT,
  p_current_date DATE
)
RETURNS TABLE(status TEXT, color TEXT, reason TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_days_diff INTEGER;
  v_days_remaining INTEGER;
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_entry_month INTEGER;
  v_entry_year INTEGER;
  v_is_previous_month BOOLEAN;
BEGIN
  -- Status 1: Already invoiced (purple)
  IF p_invoiced = TRUE OR p_invoice_id IS NOT NULL THEN
    RETURN QUERY SELECT
      'gefactureerd'::TEXT,
      'purple'::TEXT,
      CASE
        WHEN p_invoice_id IS NOT NULL THEN 'Invoiced on invoice ' || p_invoice_id::TEXT
        ELSE 'Already invoiced'
      END;
    RETURN;
  END IF;

  -- Status 2: Not billable (red)
  IF p_billable = FALSE THEN
    RETURN QUERY SELECT
      'niet-factureerbaar'::TEXT,
      'red'::TEXT,
      'Marked as non-billable'::TEXT;
    RETURN;
  END IF;

  -- Status 3: Billable - check frequency rules
  -- Default to on_demand if frequency is NULL
  p_invoicing_frequency := COALESCE(p_invoicing_frequency, 'on_demand');

  CASE p_invoicing_frequency
    -- On-demand: Always ready (green)
    WHEN 'on_demand' THEN
      RETURN QUERY SELECT
        'factureerbaar'::TEXT,
        'green'::TEXT,
        'Client invoices on demand - always ready'::TEXT;

    -- Weekly: Ready if >= 7 days old
    WHEN 'weekly' THEN
      v_days_diff := p_current_date - p_entry_date;

      IF v_days_diff >= 7 THEN
        RETURN QUERY SELECT
          'factureerbaar'::TEXT,
          'green'::TEXT,
          'Weekly invoicing - entry is ' || v_days_diff || ' days old'::TEXT;
      ELSE
        v_days_remaining := 7 - v_days_diff;
        RETURN QUERY SELECT
          'factureerbaar'::TEXT,
          'orange'::TEXT,
          'Weekly invoicing - ' || v_days_remaining || ' days remaining'::TEXT;
      END IF;

    -- Monthly: Ready if from previous month
    WHEN 'monthly' THEN
      v_current_year := EXTRACT(YEAR FROM p_current_date);
      v_current_month := EXTRACT(MONTH FROM p_current_date);
      v_entry_year := EXTRACT(YEAR FROM p_entry_date);
      v_entry_month := EXTRACT(MONTH FROM p_entry_date);

      v_is_previous_month := (v_entry_year < v_current_year) OR
                             (v_entry_year = v_current_year AND v_entry_month < v_current_month);

      IF v_is_previous_month THEN
        RETURN QUERY SELECT
          'factureerbaar'::TEXT,
          'green'::TEXT,
          'Monthly invoicing - entry from ' || TO_CHAR(p_entry_date, 'Month YYYY')::TEXT;
      ELSE
        RETURN QUERY SELECT
          'factureerbaar'::TEXT,
          'orange'::TEXT,
          'Monthly invoicing - will be billable next month'::TEXT;
      END IF;

    -- Unknown frequency: Default to ready (green)
    ELSE
      RETURN QUERY SELECT
        'factureerbaar'::TEXT,
        'green'::TEXT,
        'Unknown invoicing frequency'::TEXT;
  END CASE;
END;
$$;

COMMENT ON FUNCTION calculate_time_entry_status IS
  'Calculates time entry status (factureerbaar/niet-factureerbaar/gefactureerd) and color (green/orange/red/purple) based on business rules';

-- =============================================================================
-- BULK STATUS UPDATE FUNCTION
-- =============================================================================

-- Function to update all time entry statuses
-- Returns count of updated entries
CREATE OR REPLACE FUNCTION update_time_entry_statuses()
RETURNS TABLE(
  updated_count INTEGER,
  ready_to_invoice_count INTEGER,
  not_due_count INTEGER,
  non_billable_count INTEGER,
  invoiced_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date DATE;
  v_updated_count INTEGER;
  v_ready_count INTEGER := 0;
  v_not_due_count INTEGER := 0;
  v_non_billable_count INTEGER := 0;
  v_invoiced_count INTEGER := 0;
BEGIN
  -- Get current date (respects development mode if get_current_date() function exists)
  BEGIN
    v_current_date := get_current_date();
  EXCEPTION WHEN undefined_function THEN
    v_current_date := CURRENT_DATE;
  END;

  -- Update all time entries with computed status
  WITH status_updates AS (
    SELECT
      te.id,
      te.entry_date,
      te.billable,
      te.invoiced,
      te.invoice_id,
      COALESCE(c.invoicing_frequency::TEXT, 'on_demand') as invoicing_frequency
    FROM time_entries te
    LEFT JOIN clients c ON c.id = te.client_id
  ),
  calculated_statuses AS (
    SELECT
      su.id,
      (calculate_time_entry_status(
        su.entry_date,
        su.billable,
        su.invoiced,
        su.invoice_id,
        su.invoicing_frequency,
        v_current_date
      )).*
    FROM status_updates su
  ),
  updated AS (
    UPDATE time_entries te
    SET
      computed_status = cs.status,
      computed_status_color = cs.color,
      status_last_calculated = NOW()
    FROM calculated_statuses cs
    WHERE te.id = cs.id
    RETURNING te.computed_status, te.computed_status_color
  )
  SELECT
    COUNT(*)::INTEGER,
    COUNT(CASE WHEN computed_status = 'factureerbaar' AND computed_status_color = 'green' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN computed_status = 'factureerbaar' AND computed_status_color = 'orange' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN computed_status = 'niet-factureerbaar' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN computed_status = 'gefactureerd' THEN 1 END)::INTEGER
  INTO
    v_updated_count,
    v_ready_count,
    v_not_due_count,
    v_non_billable_count,
    v_invoiced_count
  FROM updated;

  -- Log the operation
  RAISE NOTICE 'Updated % time entry statuses (date: %) - Ready: %, Not Due: %, Non-billable: %, Invoiced: %',
    COALESCE(v_updated_count, 0),
    v_current_date,
    v_ready_count,
    v_not_due_count,
    v_non_billable_count,
    v_invoiced_count;

  RETURN QUERY SELECT
    v_updated_count,
    v_ready_count,
    v_not_due_count,
    v_non_billable_count,
    v_invoiced_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_time_entry_status TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_time_entry_status TO service_role;
GRANT EXECUTE ON FUNCTION update_time_entry_statuses TO authenticated;
GRANT EXECUTE ON FUNCTION update_time_entry_statuses TO service_role;

COMMENT ON FUNCTION update_time_entry_statuses IS
  'Updates all time entry computed statuses based on current date and client invoicing frequency. Scheduled to run daily at 2:00 AM GMT via pg_cron.';

-- =============================================================================
-- SCHEDULE CRON JOB
-- =============================================================================

-- Schedule the function to run daily at 2:00 AM (GMT)
-- Runs after invoice updates (which run at 1:00 AM)
SELECT cron.schedule(
  'update-time-entry-statuses-daily',  -- job name
  '0 2 * * *',                          -- run at 2:00 AM daily
  $$SELECT update_time_entry_statuses();$$
);

-- =============================================================================
-- INITIAL STATUS CALCULATION
-- =============================================================================

-- Run initial status calculation for all existing entries
SELECT update_time_entry_statuses();

-- =============================================================================
-- TRIGGER FOR NEW/UPDATED ENTRIES
-- =============================================================================

-- Create trigger function to update status when entry is modified
CREATE OR REPLACE FUNCTION trigger_update_time_entry_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_date DATE;
  v_client_frequency TEXT;
  v_status_result RECORD;
BEGIN
  -- Get current date
  BEGIN
    v_current_date := get_current_date();
  EXCEPTION WHEN undefined_function THEN
    v_current_date := CURRENT_DATE;
  END;

  -- Get client's invoicing frequency
  SELECT COALESCE(invoicing_frequency::TEXT, 'on_demand')
  INTO v_client_frequency
  FROM clients
  WHERE id = NEW.client_id;

  -- Calculate status
  SELECT * INTO v_status_result
  FROM calculate_time_entry_status(
    NEW.entry_date,
    COALESCE(NEW.billable, TRUE),
    COALESCE(NEW.invoiced, FALSE),
    NEW.invoice_id,
    v_client_frequency,
    v_current_date
  );

  -- Update computed status fields
  NEW.computed_status := v_status_result.status;
  NEW.computed_status_color := v_status_result.color;
  NEW.status_last_calculated := NOW();

  RETURN NEW;
END;
$$;

-- Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS time_entry_status_update ON time_entries;
CREATE TRIGGER time_entry_status_update
  BEFORE INSERT OR UPDATE OF entry_date, billable, invoiced, invoice_id, client_id
  ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_time_entry_status();

COMMENT ON TRIGGER time_entry_status_update ON time_entries IS
  'Automatically updates computed_status when time entry is created or modified';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Show current status distribution
SELECT
  computed_status,
  computed_status_color,
  COUNT(*) as count
FROM time_entries
GROUP BY computed_status, computed_status_color
ORDER BY computed_status, computed_status_color;
