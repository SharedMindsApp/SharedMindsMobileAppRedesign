/*
  # Cleanup Fridge Widgets RLS Policies

  Remove all duplicate and incorrect policies, keeping only the corrected ones.
  The issue was that old policies were checking hm.user_id = auth.uid(),
  but household_members.user_id is actually a profile.id.

  1. Changes
    - Drop all old fw_* policies (incorrect)
    - Keep the corrected policies that properly check profile IDs
*/

-- Drop all old fw_* policies (they have incorrect logic)
DROP POLICY IF EXISTS "fw_select" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_insert" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_update" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_delete" ON fridge_widgets;

-- The correct policies are already in place:
-- - "Users can create household widgets" (INSERT)
-- - "Users can delete own widgets" (DELETE)
-- - "Users can update own widgets" (UPDATE)
-- - "Users can update household widgets" (UPDATE)

-- We just need to ensure SELECT policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fridge_widgets' 
    AND policyname = 'Users can view household widgets'
  ) THEN
    CREATE POLICY "Users can view household widgets"
      ON fridge_widgets FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM household_members hm
          JOIN profiles p ON p.id = hm.user_id
          WHERE hm.household_id = fridge_widgets.household_id
            AND p.user_id = auth.uid()
            AND hm.status = 'active'
        )
      );
  END IF;
END $$;
