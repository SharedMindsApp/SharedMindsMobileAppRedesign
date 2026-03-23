-- Add display_order column to trackers table for manual reordering
-- This allows users to customize the order in which their trackers appear

ALTER TABLE trackers
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Set initial display_order based on creation date (newest first)
-- This ensures existing trackers have a sensible default order
UPDATE trackers
SET display_order = (
  SELECT COUNT(*) 
  FROM trackers t2 
  WHERE t2.owner_id = trackers.owner_id 
    AND t2.archived_at IS NULL
    AND t2.created_at >= trackers.created_at
);

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_trackers_owner_display_order 
ON trackers(owner_id, display_order) 
WHERE archived_at IS NULL;

-- Add comment
COMMENT ON COLUMN trackers.display_order IS 'User-defined display order for trackers. Lower values appear first.';
