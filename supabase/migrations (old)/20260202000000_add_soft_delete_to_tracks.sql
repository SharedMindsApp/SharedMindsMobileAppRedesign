/*
  # Add Soft Delete to Tracks System
  
  This migration adds soft delete functionality to tracks and subtracks.
  
  Changes:
  1. Add deleted_at column to guardrails_tracks
  2. Create index for efficient filtering
  3. Create function to permanently delete tracks after 7 days
  4. Schedule cleanup job (optional, can be set up in Supabase Dashboard)
*/

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_tracks' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE guardrails_tracks
    ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create index for efficient filtering of non-deleted tracks
CREATE INDEX IF NOT EXISTS idx_guardrails_tracks_deleted_at
  ON guardrails_tracks(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Function to permanently delete tracks that have been in recycle bin for 7+ days
CREATE OR REPLACE FUNCTION permanently_delete_old_tracks()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Permanently delete tracks that were deleted more than 7 days ago
  -- This will cascade to related data (documents, research, financials, roadmap items)
  WITH deleted_tracks AS (
    DELETE FROM guardrails_tracks
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_tracks;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To schedule this function, use pg_cron extension in Supabase Dashboard:
-- SELECT cron.schedule('cleanup-deleted-tracks', '0 2 * * *', 'SELECT permanently_delete_old_tracks();');
-- This runs daily at 2 AM UTC

-- ============================================================================
-- Update RPC Functions to Exclude Deleted Tracks
-- ============================================================================

-- Update get_tracks_tree to exclude deleted tracks
CREATE OR REPLACE FUNCTION get_tracks_tree(project_id uuid)
RETURNS TABLE (
  id uuid,
  master_project_id uuid,
  parent_track_id uuid,
  name text,
  description text,
  color text,
  ordering_index integer,
  metadata jsonb,
  depth integer,
  path text[],
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE track_tree AS (
    -- Base case: top-level tracks (exclude deleted)
    SELECT
      t.id,
      t.master_project_id,
      t.parent_track_id,
      t.name,
      t.description,
      t.color,
      t.ordering_index,
      t.metadata,
      0 as depth,
      ARRAY[t.name] as path,
      t.created_at,
      t.updated_at
    FROM guardrails_tracks t
    WHERE t.master_project_id = project_id
      AND t.parent_track_id IS NULL
      AND t.deleted_at IS NULL

    UNION ALL

    -- Recursive case: child tracks (exclude deleted)
    SELECT
      t.id,
      t.master_project_id,
      t.parent_track_id,
      t.name,
      t.description,
      t.color,
      t.ordering_index,
      t.metadata,
      tt.depth + 1,
      tt.path || t.name,
      t.created_at,
      t.updated_at
    FROM guardrails_tracks t
    JOIN track_tree tt ON t.parent_track_id = tt.id
    WHERE t.master_project_id = project_id
      AND t.deleted_at IS NULL
  )
  SELECT * FROM track_tree
  ORDER BY path, ordering_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_track_children to exclude deleted tracks
CREATE OR REPLACE FUNCTION get_track_children(track_id uuid)
RETURNS TABLE (
  id uuid,
  master_project_id uuid,
  parent_track_id uuid,
  name text,
  description text,
  color text,
  ordering_index integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.master_project_id,
    t.parent_track_id,
    t.name,
    t.description,
    t.color,
    t.ordering_index,
    t.metadata,
    t.created_at,
    t.updated_at
  FROM guardrails_tracks t
  WHERE t.parent_track_id = track_id
    AND t.deleted_at IS NULL
  ORDER BY t.ordering_index, t.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_track_ancestry_path to exclude deleted tracks
CREATE OR REPLACE FUNCTION get_track_ancestry_path(track_id uuid)
RETURNS text AS $$
DECLARE
  path_parts text[];
  current_id uuid;
  current_name text;
  parent_id uuid;
  depth_limit integer := 100;
  current_depth integer := 0;
BEGIN
  current_id := track_id;

  WHILE current_id IS NOT NULL AND current_depth < depth_limit LOOP
    SELECT name, parent_track_id INTO current_name, parent_id
    FROM guardrails_tracks
    WHERE id = current_id
      AND deleted_at IS NULL;

    IF current_name IS NULL THEN
      EXIT;
    END IF;

    path_parts := array_prepend(current_name, path_parts);
    current_id := parent_id;
    current_depth := current_depth + 1;
  END LOOP;

  RETURN array_to_string(path_parts, ' > ');
END;
$$ LANGUAGE plpgsql;
