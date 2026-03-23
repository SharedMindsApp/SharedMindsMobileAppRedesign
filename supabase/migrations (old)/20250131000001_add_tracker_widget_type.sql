/*
  # Add Tracker Widget Type
  
  1. Changes
    - Add 'tracker' to widget_type enum for fridge_widgets
  
  2. Notes
    - Safe migration that extends existing enum
    - Tracker widget will reference trackers table via content.tracker_id
    - Widgets are views only, no data duplication
*/

-- Add 'tracker' to the widget_type enum
ALTER TYPE widget_type ADD VALUE IF NOT EXISTS 'tracker';

-- Update widget_type check constraint to include 'tracker'
ALTER TABLE fridge_widgets 
DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

ALTER TABLE fridge_widgets
ADD CONSTRAINT fridge_widgets_widget_type_check 
CHECK (widget_type IN (
  'note', 
  'task', 
  'calendar', 
  'goal', 
  'habit', 
  'photo', 
  'insight', 
  'reminder', 
  'agreement', 
  'custom',
  'meal_planner',
  'grocery_list',
  'habit_tracker',
  'achievements',
  'stack_card',
  'files',
  'collections',
  'tables',
  'todos',
  'tracker'
));
