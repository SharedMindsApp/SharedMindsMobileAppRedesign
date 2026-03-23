/*
  # Force Cleanup of Fridge Widgets INSERT Policy
  
  Remove the fw_insert policy that still exists despite previous cleanup attempts.
  Ensure only the correct "Users can create household widgets" policy remains.
  
  1. Changes
    - Drop fw_insert policy
    - Verify correct INSERT policy is in place
*/

-- Force drop the fw_insert policy
DROP POLICY IF EXISTS "fw_insert" ON fridge_widgets CASCADE;

-- Double-check the correct policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fridge_widgets' 
    AND policyname = 'Users can create household widgets'
    AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Users can create household widgets"
      ON fridge_widgets FOR INSERT
      TO authenticated
      WITH CHECK (
        -- User must be an active member of the household
        EXISTS (
          SELECT 1 FROM household_members hm
          JOIN profiles p ON p.id = hm.user_id
          WHERE hm.household_id = fridge_widgets.household_id
            AND p.user_id = auth.uid()
            AND hm.status = 'active'
        )
        AND
        -- created_by must be the user's profile ID
        created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      );
  END IF;
END $$;
