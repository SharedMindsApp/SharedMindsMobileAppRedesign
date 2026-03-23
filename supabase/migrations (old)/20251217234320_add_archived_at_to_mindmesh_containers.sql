/*
  # Add Soft-Delete Support to Mind Mesh Containers

  1. Changes
    - Add `archived_at` column to `mindmesh_containers` table
    - Allows soft-delete for duplicate container cleanup
    - NULL = active, NOT NULL = archived

  2. Notes
    - Used by one-time repair script for duplicate cleanup
    - Soft-delete is reversible (can clear archived_at to restore)
    - Does not affect existing data (all containers remain active)
*/

-- Add archived_at column for soft-delete support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mindmesh_containers' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE mindmesh_containers ADD COLUMN archived_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add index for efficient queries (find active containers)
CREATE INDEX IF NOT EXISTS idx_mindmesh_containers_archived_at
  ON mindmesh_containers(archived_at)
  WHERE archived_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN mindmesh_containers.archived_at IS 'Soft-delete timestamp. NULL = active, NOT NULL = archived. Used for duplicate cleanup.';
