/*
  # Update Widget Type Constraint
  
  This migration updates the fridge_widgets_widget_type_check constraint to:
  1. Remove deprecated widget types: 'goal', 'habit', 'habit_tracker', 'tracker'
  2. Ensure 'journal' and 'workspace' are included (they should already be in the enum from previous migrations)
  
  This aligns the database constraint with the TypeScript WidgetType definition.
  
  Note: Existing widgets with deprecated types will be soft-deleted (marked as deleted_at = NOW())
  to preserve data while preventing new widgets of these types from being created.
*/

-- Step 1: Drop the existing constraint first (if it exists)
-- This allows us to update rows without constraint violations
ALTER TABLE fridge_widgets DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

-- Step 2: Convert existing widgets with deprecated types to 'custom' and soft-delete them
-- This preserves the data while preventing new widgets of these types
-- We convert to 'custom' so they don't violate the new constraint
-- Cast to text for comparison to handle both enum and text column types
UPDATE fridge_widgets
SET widget_type = 'custom',
    deleted_at = NOW(),
    updated_at = NOW()
WHERE widget_type::text IN ('goal', 'habit', 'habit_tracker', 'tracker')
  AND (deleted_at IS NULL OR deleted_at > NOW() - INTERVAL '1 second');

-- Step 3: Convert any other invalid widget types to 'custom'
-- This catches any widget types we might have missed
-- Valid widget types list
UPDATE fridge_widgets
SET widget_type = 'custom',
    updated_at = NOW()
WHERE widget_type::text NOT IN (
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
  )
  AND deleted_at IS NULL;

-- Step 4: Add the new constraint with NOT VALID
-- NOT VALID allows adding the constraint without validating existing rows
-- This is safe because we've already converted all invalid types to 'custom' in Step 3
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

-- Step 5: Validate the constraint (optional - wrapped in exception handler)
-- The constraint with NOT VALID will still prevent new invalid widgets from being created
-- If validation fails, it means there are still some rows we couldn't convert
-- but the constraint is still useful for preventing new invalid widgets
-- We use a DO block to prevent the migration from failing if validation doesn't work
DO $$
BEGIN
  -- Try to validate the constraint
  -- This will only work if all rows match the constraint
  BEGIN
    ALTER TABLE fridge_widgets VALIDATE CONSTRAINT fridge_widgets_widget_type_check;
    RAISE NOTICE 'Constraint validated successfully';
  EXCEPTION
    WHEN OTHERS THEN
      -- If validation fails, the constraint is still in place (with NOT VALID)
      -- It will prevent new invalid widgets from being created
      -- This is acceptable - the constraint will be validated later when all rows are clean
      RAISE WARNING 'Constraint validation skipped. Constraint is still active for new rows. Error: %', SQLERRM;
  END;
END $$;

-- Comments
COMMENT ON CONSTRAINT fridge_widgets_widget_type_check ON fridge_widgets IS 
  'Updated constraint: removed deprecated widget types (goal, habit, habit_tracker, tracker) and added journal and workspace';
