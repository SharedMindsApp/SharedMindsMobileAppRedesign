/*
  # Add meal_planner Widget Type

  1. Changes
    - Drop existing widget_type check constraint
    - Add new check constraint that includes 'meal_planner' type
  
  2. Notes
    - Adds support for the meal planner widget in the fridge canvas
    - Maintains all existing widget types while adding the new one
*/

-- Drop the existing check constraint
ALTER TABLE fridge_widgets 
DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

-- Add new check constraint with meal_planner included
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
  'achievements'
));
