/*
  # Add Tracker App Widget Types
  
  This migration adds two new widget types for Tracker Studio integration:
  1. tracker_app - Full-featured tracker app in Spaces
  2. tracker_quicklink - Quick link app that shows all trackers
  
  These allow users to add trackers as standalone apps in Spaces.
*/

-- Add new widget types to the enum
ALTER TYPE widget_type ADD VALUE IF NOT EXISTS 'tracker_app';
ALTER TYPE widget_type ADD VALUE IF NOT EXISTS 'tracker_quicklink';

-- Update the check constraint to include new widget types
ALTER TABLE fridge_widgets DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

ALTER TABLE fridge_widgets ADD CONSTRAINT fridge_widgets_widget_type_check 
  CHECK (widget_type IN (
    'note', 'task', 'calendar', 'goal', 'habit', 'habit_tracker', 
    'achievements', 'photo', 'insight', 'reminder', 'agreement',
    'meal_planner', 'grocery_list', 'stack_card', 'files', 'collections',
    'tables', 'todos', 'tracker', 'tracker_app', 'tracker_quicklink', 'custom'
  ));

-- Comments
COMMENT ON TYPE widget_type IS 'Widget types now include tracker_app and tracker_quicklink for Tracker Studio integration';
