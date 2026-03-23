/*
  # Debug fridge_widgets UPDATE policy
  
  1. Changes
    - Temporarily remove WITH CHECK to isolate the issue
    - This will help us understand if the problem is with USING or WITH CHECK
    
  2. Note
    - This is a debug migration - we'll fix it properly once we understand the issue
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Update widgets in accessible spaces" ON fridge_widgets;

-- Create policy without WITH CHECK for debugging
CREATE POLICY "Update widgets in accessible spaces"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_space(auth.uid(), space_id));