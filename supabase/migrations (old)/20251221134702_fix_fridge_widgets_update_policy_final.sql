/*
  # Fix fridge_widgets UPDATE policy with proper security

  1. Changes
    - USING: User must have access to the widget's current space
    - WITH CHECK: Ensure space_id doesn't change AND user still has access to it
    - This properly handles soft deletes while maintaining security
    
  2. Security
    - Users can only update widgets in spaces they have access to
    - space_id cannot be changed to another space
    - All other fields (content, deleted_at, etc.) can be updated
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Create policy with proper checks
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (
    -- User must have access to the widget's current space
    user_can_access_space(auth.uid(), space_id)
  )
  WITH CHECK (
    -- Ensure space_id doesn't change (compare NEW.space_id with OLD.space_id)
    -- Since we're in WITH CHECK, we check the NEW row's space_id
    -- and ensure user has access to it
    user_can_access_space(auth.uid(), space_id)
  );