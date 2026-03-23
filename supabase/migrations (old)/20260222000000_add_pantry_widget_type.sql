/*
  # Add Pantry Widget Type
  
  This migration adds 'pantry' to the fridge_widgets_widget_type_check constraint.
  
  The pantry widget is part of the Unified Food System and allows users to track
  food items they have at home (in fridge, freezer, or cupboard).
  
  ## Changes
  - Drop existing widget_type check constraint
  - Recreate with 'pantry' included in allowed values
*/

-- Step 1: Drop the existing constraint
ALTER TABLE fridge_widgets DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

-- Step 2: Add the updated check constraint with 'pantry' included
-- Cast to text to handle both enum and text column types
DO $$
BEGIN
  ALTER TABLE fridge_widgets ADD CONSTRAINT fridge_widgets_widget_type_check 
    CHECK (widget_type::text IN (
      'note', 
      'task', 
      'calendar', 
      'achievements', 
      'photo', 
      'insight', 
      'reminder', 
      'agreement',
      'meal_planner', 
      'grocery_list', 
      'pantry',
      'stack_card', 
      'files', 
      'collections',
      'tables', 
      'todos', 
      'tracker_app', 
      'tracker_quicklink', 
      'journal', 
      'workspace', 
      'custom'
    )) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, skip
    NULL;
  WHEN OTHERS THEN
    -- If adding fails for any other reason, re-raise the error
    RAISE;
END $$;

-- Step 3: Validate the constraint (optional - wrapped in exception handler)
DO $$
BEGIN
  BEGIN
    ALTER TABLE fridge_widgets VALIDATE CONSTRAINT fridge_widgets_widget_type_check;
    RAISE NOTICE 'Constraint validated successfully';
  EXCEPTION
    WHEN OTHERS THEN
      -- If validation fails, the constraint is still in place (with NOT VALID)
      -- It will prevent new invalid widgets from being created
      RAISE WARNING 'Constraint validation skipped. Constraint is still active for new rows. Error: %', SQLERRM;
  END;
END $$;

-- Comments
COMMENT ON CONSTRAINT fridge_widgets_widget_type_check ON fridge_widgets IS 
  'Updated constraint: added pantry widget type for Unified Food System';
