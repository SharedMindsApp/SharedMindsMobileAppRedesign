/*
  # Add track_category_id to universal_track_info

  Links each track to its purpose category.
*/

-- Add track_category_id column
ALTER TABLE universal_track_info
ADD COLUMN IF NOT EXISTS track_category_id uuid
REFERENCES project_track_categories(id)
ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_universal_track_info_track_category
  ON universal_track_info(track_category_id);
