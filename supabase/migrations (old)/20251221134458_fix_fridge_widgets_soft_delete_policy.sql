/*
  # Fix fridge_widgets soft delete policy

  1. Changes
    - Update the UPDATE policy WITH CHECK to properly allow soft deletes
    - The issue was that when soft deleting (setting deleted_at), the policy
      still required space access check which could fail
    - Now we only check space access when NOT soft deleting (deleted_at IS NULL)
    
  2. Security
    - Maintains security by ensuring users can only update widgets in spaces they have access to
    - Allows soft deletes (setting deleted_at) without requiring ongoing space access
    - This is safe because the USING clause already verified access before the update
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Recreate with fixed logic
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id))
  WITH CHECK (
    -- Allow soft delete (setting deleted_at) without additional checks
    -- OR require space access for other updates (when keeping deleted_at NULL)
    (deleted_at IS NOT NULL) OR 
    (deleted_at IS NULL AND user_can_access_space(auth.uid(), space_id))
  );