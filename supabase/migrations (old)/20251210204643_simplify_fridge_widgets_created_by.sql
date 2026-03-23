/*
  # Simplify fridge_widgets created_by to reference profiles

  1. Changes
    - Drop the foreign key constraint to the old members table
    - Make created_by reference profiles.id directly
    - This simplifies the relationship and avoids cross-table confusion

  2. Security
    - Maintains data integrity with proper foreign key
    - Simpler to understand and use
*/

-- Drop the old foreign key constraint
ALTER TABLE fridge_widgets 
DROP CONSTRAINT IF EXISTS fridge_widgets_created_by_fkey;

-- Add new foreign key pointing to profiles
ALTER TABLE fridge_widgets
ADD CONSTRAINT fridge_widgets_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;
