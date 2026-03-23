/*
  # Mind Mesh Duplicate Prevention (Hard Stop)

  1. Schema Changes
    - Add `workspace_id` to `mindmesh_container_references` (denormalized from container)
    - Backfill existing references with workspace_id from their containers
    - Add partial unique constraint on (workspace_id, entity_type, entity_id) where is_primary = true
  
  2. Purpose
    - Enforce 1:1 mapping: exactly ONE primary container per entity per workspace
    - Make duplicate creation impossible at database level
    - Prevent race conditions during concurrent ghost materialization
  
  3. Security
    - No RLS changes needed (references inherit container permissions)
  
  4. Notes
    - This is a NON-NULLABLE column with backfill, so existing data must be updated first
    - The partial unique constraint only applies to primary references (is_primary = true)
    - Integrated entities (tracks, subtracks, roadmap items, events) always use is_primary = true
*/

-- Step 1: Add workspace_id column (nullable initially for backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mindmesh_container_references'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE mindmesh_container_references 
    ADD COLUMN workspace_id uuid;
  END IF;
END $$;

-- Step 2: Backfill workspace_id from containers
UPDATE mindmesh_container_references r
SET workspace_id = c.workspace_id
FROM mindmesh_containers c
WHERE r.container_id = c.id
  AND r.workspace_id IS NULL;

-- Step 3: Make workspace_id NOT NULL
ALTER TABLE mindmesh_container_references 
ALTER COLUMN workspace_id SET NOT NULL;

-- Step 4: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mindmesh_container_references_workspace_id_fkey'
  ) THEN
    ALTER TABLE mindmesh_container_references
    ADD CONSTRAINT mindmesh_container_references_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES mindmesh_workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Drop old constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_primary_entity_reference'
  ) THEN
    ALTER TABLE mindmesh_container_references
    DROP CONSTRAINT unique_primary_entity_reference;
  END IF;
END $$;

-- Step 6: Add new partial unique constraint (HARD STOP for duplicates)
-- This enforces: exactly ONE primary container per entity per workspace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_primary_entity_per_workspace'
  ) THEN
    CREATE UNIQUE INDEX unique_primary_entity_per_workspace
    ON mindmesh_container_references (workspace_id, entity_type, entity_id)
    WHERE is_primary = true;
  END IF;
END $$;

-- Step 7: Add index for performance (querying references by workspace)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_mindmesh_references_workspace_entity'
  ) THEN
    CREATE INDEX idx_mindmesh_references_workspace_entity
    ON mindmesh_container_references (workspace_id, entity_type, entity_id);
  END IF;
END $$;
