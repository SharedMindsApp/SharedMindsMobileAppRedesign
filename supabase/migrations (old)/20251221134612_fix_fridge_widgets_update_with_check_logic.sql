/*
  # Fix fridge_widgets UPDATE policy WITH CHECK clause

  1. Changes
    - The WITH CHECK clause evaluates the NEW row after the update
    - When soft deleting, deleted_at becomes NOT NULL
    - We need to allow the update if either:
      a) The user has access to the space (for normal updates)
      b) The row is being soft-deleted (deleted_at IS NOT NULL in the NEW row)
    
  2. Security
    - USING ensures user has access before any update
    - WITH CHECK ensures the updated row is valid
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Create new policy with corrected logic
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (
    -- Check access to the current (old) row
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    -- Allow if being soft-deleted OR user has access to the space
    deleted_at IS NOT NULL OR user_can_access_space(auth.uid(), space_id)
  );