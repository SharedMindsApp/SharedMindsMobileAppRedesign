/*
  # Remove workspace_id NOT NULL Constraint from workspace_units
  
  The workspace_units table was refactored to use page_id instead of workspace_id,
  but the NOT NULL constraint on workspace_id was never removed. This migration
  fixes that by making workspace_id nullable and removing the constraint.
  
  After this migration:
  - workspace_id can be NULL (for backward compatibility, but not used)
  - page_id is required (NOT NULL)
  - All new units use page_id only
*/

-- Step 1: Make workspace_id nullable (remove NOT NULL constraint)
-- First, ensure all existing units have page_id (they should from previous migration)
-- If any don't, soft-delete them
UPDATE workspace_units
SET deleted_at = now()
WHERE page_id IS NULL AND deleted_at IS NULL;

-- Now make workspace_id nullable
ALTER TABLE workspace_units
ALTER COLUMN workspace_id DROP NOT NULL;

-- Step 2: Remove the foreign key constraint on workspace_id
-- Find and drop the foreign key constraint (name may vary)
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the foreign key constraint name for workspace_id -> workspaces
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'workspace_units'::regclass
    AND contype = 'f'
    AND confrelid = 'workspaces'::regclass;
  
  -- Drop the constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE workspace_units DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Step 3: Add a comment explaining the deprecation
COMMENT ON COLUMN workspace_units.workspace_id IS 'DEPRECATED: Use page_id instead. This column is kept for backward compatibility but should not be used for new records.';

-- Step 4: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
