/*
  # Fix Calendar Events created_by RLS Policy
  
  The `created_by` column references `profiles(id)`, but the RLS policy 
  was checking `created_by = auth.uid()` which is incorrect.
  
  This migration fixes the RLS policy to properly check against profiles.id.
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Owners can create their personal calendar events" ON calendar_events;

-- Recreate the policy with correct profile check
CREATE POLICY "Owners can create their personal calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND household_id IS NULL
    -- created_by references profiles(id), so we need to check via profiles.user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = calendar_events.created_by
      AND profiles.user_id = auth.uid()
    )
  );
