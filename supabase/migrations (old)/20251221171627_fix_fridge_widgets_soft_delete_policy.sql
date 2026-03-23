/*
  # Fix fridge_widgets soft delete policy
  
  1. Changes
    - Add proper WITH CHECK clause to UPDATE policy
    - Allow soft deletes by permitting deleted_at changes
    - Ensure users can delete (soft delete) widgets they created or have access to
    
  2. Security
    - Users can only update widgets in spaces they have access to
    - After update, the widget must still be in an accessible space
    - Soft deletes are permitted (setting deleted_at)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Create comprehensive UPDATE policy
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    -- After update, widget must still be in an accessible space
    user_can_access_space(auth.uid(), space_id)
  );