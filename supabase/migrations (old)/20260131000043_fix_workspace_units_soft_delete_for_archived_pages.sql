-- Fix Workspace Units UPDATE Policy to Allow Soft Deletes for Archived Pages
-- 
-- When archiving a page, we need to soft-delete all its workspace units.
-- The current policy's USING clause requires can_edit_page(page_id), which
-- fails for archived pages (can_edit_page checks archived_at IS NULL).
--
-- This migration updates the UPDATE policy to:
-- 1. Allow soft deletes (setting deleted_at) if user can view the page (works for archived pages)
-- 2. Allow regular updates if user can edit the page (requires page not archived)
-- 3. The USING clause checks the OLD row state
-- 4. The WITH CHECK clause checks the NEW row state

-- Step 1: Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update workspace units" ON workspace_units;

-- Step 2: Create a more permissive UPDATE policy
-- USING clause: Check the OLD row - allow if:
--   - User can edit the page (for regular updates), OR
--   - User can view the page (for soft deletes - allows archived pages)
-- WITH CHECK clause: Check the NEW row - allow if:
--   - It's a soft delete (deleted_at IS NOT NULL) and user can view the page, OR
--   - It's a regular update (deleted_at IS NULL) and user can edit the page
CREATE POLICY "Users can update workspace units"
  ON workspace_units FOR UPDATE
  USING (
    -- For the old row: allow if user can edit OR view the page
    -- This allows soft-deleting units even when the page is archived
    can_edit_page(page_id) OR can_view_page(page_id)
  )
  WITH CHECK (
    -- For the new row: allow soft deletes with view permission, regular updates with edit permission
    (deleted_at IS NOT NULL AND can_view_page(page_id))
    OR
    (deleted_at IS NULL AND can_edit_page(page_id))
  );

-- Step 3: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
