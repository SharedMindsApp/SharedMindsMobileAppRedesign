/*
  # Simplify fridge_widget_layouts member_id to reference profiles

  1. Changes
    - Drop the foreign key constraint to the old members table
    - Make member_id reference profiles.id directly
    - This matches the fridge_widgets.created_by change for consistency

  2. Security
    - Maintains data integrity with proper foreign key
    - Consistent with fridge_widgets table
*/

-- Drop the old foreign key constraint
ALTER TABLE fridge_widget_layouts 
DROP CONSTRAINT IF EXISTS fridge_widget_layouts_member_id_fkey;

-- Add new foreign key pointing to profiles
ALTER TABLE fridge_widget_layouts
ADD CONSTRAINT fridge_widget_layouts_member_id_fkey 
FOREIGN KEY (member_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;
