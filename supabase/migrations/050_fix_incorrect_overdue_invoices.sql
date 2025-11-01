-- Migration: Fix Incorrectly Marked Overdue Invoices
-- Description: One-time fix for invoices incorrectly marked as overdue
-- This corrects invoices that have a future due date but are marked as overdue

-- Function to fix incorrectly marked overdue invoices
-- Uses get_current_date() to respect development mode
CREATE OR REPLACE FUNCTION fix_incorrect_overdue_invoices()
RETURNS TABLE(
  fixed_count INTEGER,
  fixed_invoice_numbers TEXT[],
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fixed_count INTEGER;
  v_fixed_numbers TEXT[];
  v_details JSONB;
  v_current_date DATE;
BEGIN
  -- Get current date (respects development mode)
  v_current_date := get_current_date();

  -- Fix invoices that are marked as overdue but have a future due date
  WITH fixed AS (
    UPDATE invoices
    SET
      status = 'sent',
      updated_at = NOW()
    WHERE
      status IN ('overdue', 'overdue_reminder_1', 'overdue_reminder_2', 'overdue_reminder_3')
      AND due_date >= v_current_date  -- Due date is today or in the future
    RETURNING
      id,
      invoice_number,
      due_date,
      status AS old_status
  ),
  summary AS (
    SELECT
      COUNT(*)::INTEGER AS count,
      ARRAY_AGG(invoice_number ORDER BY invoice_number) AS numbers,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'invoice_number', invoice_number,
          'due_date', due_date,
          'was_status', old_status
        ) ORDER BY invoice_number
      ) AS detail
    FROM fixed
  )
  SELECT count, numbers, detail
  INTO v_fixed_count, v_fixed_numbers, v_details
  FROM summary;

  -- Log the operation
  RAISE NOTICE 'Fixed % invoices that were incorrectly marked as overdue (using date: %): %',
    COALESCE(v_fixed_count, 0),
    v_current_date,
    COALESCE(v_fixed_numbers::TEXT, 'none');

  RETURN QUERY SELECT
    COALESCE(v_fixed_count, 0),
    v_fixed_numbers,
    v_details;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_incorrect_overdue_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_incorrect_overdue_invoices() TO service_role;

-- Run the fix immediately
SELECT * FROM fix_incorrect_overdue_invoices();

-- Comment on the function for documentation
COMMENT ON FUNCTION fix_incorrect_overdue_invoices() IS
  'One-time fix function to correct invoices that were incorrectly marked as overdue but have a future due date. Can be run manually if needed.';
