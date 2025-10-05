-- Migration: Add working days per week target to profit_targets table
-- Description: Enables dynamic daily consistency scoring based on user's actual working schedule
-- Date: 2025-10-04

-- Add target_working_days_per_week column
ALTER TABLE profit_targets
ADD COLUMN IF NOT EXISTS target_working_days_per_week INTEGER[] DEFAULT '{1,2,3,4,5}';

-- Add comment explaining the column
COMMENT ON COLUMN profit_targets.target_working_days_per_week IS
  'Array of ISO weekday numbers (1=Monday, 2=Tuesday, ..., 7=Sunday) representing the user''s working days.
   Used to calculate expected working days per month and dynamic daily consistency targets.
   Default: {1,2,3,4,5} represents Monday through Friday.';

-- Add constraint to ensure only valid weekday numbers (1-7)
ALTER TABLE profit_targets
ADD CONSTRAINT valid_working_days
CHECK (
  target_working_days_per_week IS NULL OR
  (
    target_working_days_per_week <@ ARRAY[1,2,3,4,5,6,7] AND
    array_length(target_working_days_per_week, 1) >= 1 AND
    array_length(target_working_days_per_week, 1) <= 7
  )
);

COMMENT ON CONSTRAINT valid_working_days ON profit_targets IS
  'Ensures working days array contains only valid ISO weekday numbers (1-7) and has at least 1 day selected';

-- Set default Monday-Friday for all existing records that don't have a value
UPDATE profit_targets
SET target_working_days_per_week = '{1,2,3,4,5}'
WHERE target_working_days_per_week IS NULL;

-- Add target_billable_ratio if it doesn't exist (safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profit_targets'
    AND column_name = 'target_billable_ratio'
  ) THEN
    ALTER TABLE profit_targets
    ADD COLUMN target_billable_ratio INTEGER DEFAULT 90;

    COMMENT ON COLUMN profit_targets.target_billable_ratio IS
      'Target percentage of tracked hours that should be billable (50-100).
       Used to calculate billable ratio health score.';
  END IF;
END $$;
