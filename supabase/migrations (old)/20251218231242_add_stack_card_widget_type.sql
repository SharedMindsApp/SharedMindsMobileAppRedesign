/*
  # Add stack_card Widget Type

  1. Changes
    - Drop existing widget_type check constraint
    - Add new check constraint that includes 'stack_card' type
  
  2. Notes
    - Adds support for Stack Cards widget in the fridge canvas and spaces
    - Maintains all existing widget types while adding the new one
*/

-- Drop the existing check constraint
ALTER TABLE fridge_widgets 
DROP CONSTRAINT IF EXISTS fridge_widgets_widget_type_check;

-- Add new check constraint with stack_card included
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
  'stack_card'
));
