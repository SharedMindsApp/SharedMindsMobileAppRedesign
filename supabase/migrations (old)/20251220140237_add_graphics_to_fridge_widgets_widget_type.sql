/*
  # Add 'graphics' to fridge_widgets widget_type constraint

  ## Summary
  Updates the widget_type check constraint on fridge_widgets table to include the new 'graphics' widget type.

  ## Changes
  - Drop existing widget_type check constraint
  - Recreate with 'graphics' included in allowed values
*/

-- Drop the existing check constraint
ALTER TABLE fridge_widgets DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

-- Add the updated check constraint with 'graphics' included
ALTER TABLE fridge_widgets ADD CONSTRAINT fridge_widgets_widget_type_check
  CHECK (widget_type IN (
    'note',
    'task',
    'calendar',
    'goal',
    'habit',
    'habit_tracker',
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
    'graphics',
    'custom'
  ));
