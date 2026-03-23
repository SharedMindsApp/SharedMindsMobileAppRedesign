/*
  # Add Schedule Activation and Date Range Support
  
  Adds support for:
  - Active/inactive schedules (is_active)
  - Start and end dates for schedules (start_date, end_date)
  - Better schedule management with date-based activation
*/

-- Add new columns to meal_schedules
ALTER TABLE meal_schedules
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Add index for efficient active schedule queries
CREATE INDEX IF NOT EXISTS idx_meal_schedules_is_active ON meal_schedules(space_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_meal_schedules_date_range ON meal_schedules(space_id, start_date, end_date) WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- Add constraint to ensure end_date is after start_date
ALTER TABLE meal_schedules
  ADD CONSTRAINT meal_schedules_date_range_check CHECK (
    start_date IS NULL OR end_date IS NULL OR end_date >= start_date
  );

-- Comment
COMMENT ON COLUMN meal_schedules.is_active IS 'Whether this schedule is currently active. Only active schedules are used in the meal planner.';
COMMENT ON COLUMN meal_schedules.start_date IS 'Optional start date for when this schedule becomes active. NULL means no start date restriction.';
COMMENT ON COLUMN meal_schedules.end_date IS 'Optional end date for when this schedule becomes inactive. NULL means no end date restriction.';
