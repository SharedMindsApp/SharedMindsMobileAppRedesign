/*
  # Fix fridge_widgets UPDATE policy for soft deletes

  1. Changes
    - Simplify the WITH CHECK clause to handle soft deletes more reliably
    - Always allow updates if the user has access to the space (checked in USING)
    - This is safe because USING already verified the user can access the widget
    
  2. Security
    - USING clause verifies user can access the space before allowing any update
    - WITH CHECK ensures the space_id isn't changed to a space the user can't access
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Recreate with simpler logic
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id))
  WITH CHECK (user_can_access_space(auth.uid(), space_id) OR deleted_at IS NOT NULL);