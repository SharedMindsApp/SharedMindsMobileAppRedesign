/*
  # Final Cleanup of All fw_* Policies
  
  Remove ALL remaining fw_* policies that are conflicting with the correct policies.
  These old policies have incorrect logic and must be removed.
  
  1. Changes
    - Drop all fw_select, fw_insert, fw_update, fw_delete policies
    - Keep only the correctly named policies
*/

-- Drop all fw_* policies
DROP POLICY IF EXISTS "fw_select" ON fridge_widgets CASCADE;
DROP POLICY IF EXISTS "fw_insert" ON fridge_widgets CASCADE;
DROP POLICY IF EXISTS "fw_update" ON fridge_widgets CASCADE;
DROP POLICY IF EXISTS "fw_delete" ON fridge_widgets CASCADE;
