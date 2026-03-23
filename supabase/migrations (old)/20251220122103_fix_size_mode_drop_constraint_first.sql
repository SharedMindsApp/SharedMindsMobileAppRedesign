/*
  # Fix Size Mode Constraint - Drop First, Then Update

  1. Changes
    - Drop the old constraint first
    - Update any 'full' values to 'large' (application uses 'large' not 'full')
    - Add the new constraint that allows 'icon', 'mini', 'large', 'xlarge'
  
  2. Security
    - No security changes (RLS already enabled)
  
  3. Notes
    - The application uses 'icon', 'mini', 'large', 'xlarge' but database allowed 'icon', 'mini', 'full'
    - This migration migrates 'full' to 'large' and updates the constraint
*/

-- First drop the old constraint
ALTER TABLE fridge_widget_layouts 
DROP CONSTRAINT IF EXISTS fridge_widget_layouts_size_mode_check;

-- Now update any 'full' values to 'large' to match application code
UPDATE fridge_widget_layouts 
SET size_mode = 'large' 
WHERE size_mode = 'full';

-- Add the correct constraint that matches the application
ALTER TABLE fridge_widget_layouts 
ADD CONSTRAINT fridge_widget_layouts_size_mode_check 
CHECK (size_mode IN ('icon', 'mini', 'large', 'xlarge'));
