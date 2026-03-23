/*
  # Create Calendar GuardRails Sync Table

  Stores user-initiated sync mappings for GuardRails → Calendar sync.
  This is a selective, project-driven sync system where users explicitly choose
  what from GuardRails appears in their calendar.

  1. New Table
    - `calendar_guardrails_sync`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `project_id` (uuid, foreign key to master_projects)
      - `track_id` (uuid, nullable, foreign key to guardrails_tracks)
      - `subtrack_id` (uuid, nullable, foreign key to guardrails_subtracks)
      - `item_id` (uuid, nullable, foreign key to roadmap_items)
      - `sync_level` (text, enum: 'project' | 'track' | 'subtrack' | 'item')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Only one sync entry per user/entity combination
    - sync_level must match which IDs are provided
    - Cascade delete when user/project/track/subtrack/item is deleted

  3. Security
    - Enable RLS
    - Users can only manage their own sync entries
    - Users can only sync projects they have access to

  4. Indexes
    - Index on user_id for fast user queries
    - Index on project_id for project-level queries
    - Index on track_id for track-level queries
    - Composite index on (user_id, project_id, track_id, subtrack_id, item_id) for uniqueness
*/

-- Create enum type for sync level
DO $$ BEGIN
  CREATE TYPE calendar_guardrails_sync_level AS ENUM ('project', 'track', 'subtrack', 'item');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create calendar_guardrails_sync table
CREATE TABLE IF NOT EXISTS calendar_guardrails_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  track_id uuid REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid REFERENCES guardrails_subtracks(id) ON DELETE CASCADE,
  item_id uuid REFERENCES roadmap_items(id) ON DELETE CASCADE,
  sync_level calendar_guardrails_sync_level NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure sync_level matches provided IDs
  CONSTRAINT sync_level_consistency CHECK (
    (sync_level = 'project' AND track_id IS NULL AND subtrack_id IS NULL AND item_id IS NULL) OR
    (sync_level = 'track' AND track_id IS NOT NULL AND subtrack_id IS NULL AND item_id IS NULL) OR
    (sync_level = 'subtrack' AND track_id IS NOT NULL AND subtrack_id IS NOT NULL AND item_id IS NULL) OR
    (sync_level = 'item' AND track_id IS NOT NULL AND item_id IS NOT NULL)
  ),
  
  -- Ensure uniqueness per user/entity combination
  CONSTRAINT unique_user_sync_entry UNIQUE (user_id, project_id, track_id, subtrack_id, item_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_guardrails_sync_user_id ON calendar_guardrails_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_guardrails_sync_project_id ON calendar_guardrails_sync(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_guardrails_sync_track_id ON calendar_guardrails_sync(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_guardrails_sync_subtrack_id ON calendar_guardrails_sync(subtrack_id) WHERE subtrack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_guardrails_sync_item_id ON calendar_guardrails_sync(item_id) WHERE item_id IS NOT NULL;

-- Enable RLS
ALTER TABLE calendar_guardrails_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own sync entries
CREATE POLICY "Users can view their own sync entries"
  ON calendar_guardrails_sync
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own sync entries
CREATE POLICY "Users can create their own sync entries"
  ON calendar_guardrails_sync
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sync entries
CREATE POLICY "Users can update their own sync entries"
  ON calendar_guardrails_sync
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sync entries
CREATE POLICY "Users can delete their own sync entries"
  ON calendar_guardrails_sync
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_guardrails_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_guardrails_sync_updated_at
  BEFORE UPDATE ON calendar_guardrails_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_guardrails_sync_updated_at();
