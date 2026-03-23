/*
  # Fix widget deletion by allowing SELECT during soft delete
  
  1. Problem
    - SELECT policy blocks deleted rows (deleted_at IS NOT NULL)
    - UPDATE policy USING clause needs to SELECT the row first
    - This creates a chicken-and-egg problem for soft deletes
    
  2. Solution
    - Remove deleted_at check from SELECT policy
    - Let application code filter out deleted widgets
    - This allows UPDATE to find and modify rows for soft delete
    
  3. Security
    - Users can still only see widgets in spaces they have access to
    - Application layer filters deleted widgets from normal views
    - Trash viewer intentionally shows deleted widgets
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "View widgets in accessible spaces" ON fridge_widgets;

-- Recreate SELECT policy WITHOUT deleted_at filter
-- This allows the UPDATE operation to find rows for soft deletion
CREATE POLICY "View widgets in accessible spaces"
  ON fridge_widgets
  FOR SELECT
  TO authenticated
  USING (
    user_can_access_space(auth.uid(), space_id)
  );