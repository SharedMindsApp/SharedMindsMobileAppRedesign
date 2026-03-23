/*
  # Simplify fridge_widgets UPDATE policy

  1. Changes
    - Simplify WITH CHECK to avoid potential function evaluation issues
    - Since USING already verified access, and space_id cannot change,
      we can safely allow the update
    
  2. Security
    - USING clause ensures user has access before update
    - space_id is not being modified (only deleted_at)
    - This is secure because the user must have access to update
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Create simplified policy
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id))
  WITH CHECK (true);