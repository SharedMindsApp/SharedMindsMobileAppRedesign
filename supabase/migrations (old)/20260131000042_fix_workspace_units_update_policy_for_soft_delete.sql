-- Fix Workspace Units UPDATE Policy to Allow Soft Deletes
-- 
-- The current UPDATE policy's WITH CHECK clause is too restrictive for soft deletes.
-- When soft-deleting (setting deleted_at), we need to allow the update even if
-- the page is archived, as long as the user had edit access when the unit existed.
--
-- This migration updates the UPDATE policy to:
-- 1. Allow updates to non-deleted units if user can edit the page
-- 2. Allow soft-deletes (setting deleted_at) if user can view the page (less restrictive)
-- 3. Prevent other updates to already-deleted units

-- Step 1: Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update workspace units" ON workspace_units;

-- Step 2: Create a more permissive UPDATE policy
-- The policy needs to handle both regular updates and soft deletes
-- USING clause: Check the OLD row - allow if user can edit the page
-- WITH CHECK clause: Check the NEW row - allow if:
--   - It's a soft delete (deleted_at IS NOT NULL) and user can view the page, OR
--   - It's a regular update (deleted_at IS NULL) and user can edit the page
CREATE POLICY "Users can update workspace units"
  ON workspace_units FOR UPDATE
  USING (
    -- For the old row: user must be able to edit the page
    can_edit_page(page_id)
  )
  WITH CHECK (
    -- For the new row: allow soft deletes with view permission, regular updates with edit permission
    (deleted_at IS NOT NULL AND can_view_page(page_id))
    OR
    (deleted_at IS NULL AND can_edit_page(page_id))
  );

-- Step 3: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
