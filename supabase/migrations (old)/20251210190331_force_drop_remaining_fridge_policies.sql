/*
  # Force Drop Remaining Fridge Widget Policies

  The previous migration missed some policies with different names.
  This migration explicitly drops the remaining policies found in pg_policies.

  1. Changes
    - DROP remaining policies: fw_select, fw_insert, fw_insert_test, fw_update, fw_delete
  
  2. Result
    - Both tables will have absolutely NO policies
*/

-- Drop the remaining policies that were found
DROP POLICY IF EXISTS "fw_select" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_insert" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_insert_test" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_update" ON fridge_widgets;
DROP POLICY IF EXISTS "fw_delete" ON fridge_widgets;
