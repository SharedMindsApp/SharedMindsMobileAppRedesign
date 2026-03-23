/*
  # Add Category and Auto-Color Support to Tags

  Adds category field to tags table for entity type classification.
  Enables auto-assignment of colors based on category.
*/

-- Add category column to tags
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags (category) WHERE category IS NOT NULL;

-- Update existing tags to have category based on usage (optional, can be null)
-- This is a one-time migration for existing data
-- New tags will have category set automatically

-- Comments
COMMENT ON COLUMN tags.category IS 
  'Entity type category (goal, habit, project, trip, task, meeting, etc.). Used for auto-color assignment.';






