/*
  # Fix Fridge Widgets Soft Delete RLS Policy

  1. Problem
    - Soft deleting widgets (UPDATE to set deleted_at) fails WITH CHECK clause
    - The WITH CHECK requires user_can_access_space for the "new" row
    - When marking as deleted, this check should be relaxed

  2. Solution
    - Update the UPDATE policy's WITH CHECK to allow soft deletes
    - If deleted_at is being set (soft delete), only check USING clause
    - If deleted_at is NOT being set (normal update), enforce space access on new row

  3. Changes
    - Drop existing UPDATE policy
    - Create new UPDATE policy with conditional WITH CHECK
*/

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Create new UPDATE policy that allows soft deletes
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id))
  WITH CHECK (
    -- Allow soft delete (setting deleted_at) if user had access to original row
    deleted_at IS NOT NULL 
    OR 
    -- For regular updates, ensure user still has access to the space
    user_can_access_space(auth.uid(), space_id)
  );
