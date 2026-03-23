/*
  # Phase 1: Granular Calendar Sync Settings (Guardrails Sync Foundations)

  This migration introduces granular sync intent storage at four levels:
  - Project-level sync settings
  - Track-level sync settings
  - Subtrack-level sync settings
  - Event-level sync settings

  IMPORTANT: This is architecture-only. No behavior changes yet.
  - Tables are created but empty by default
  - No automatic syncing
  - No UI changes
  - Existing global sync continues to work as fallback

  1. New Tables
    - `project_calendar_sync_settings` - Project-level sync configuration
    - `track_calendar_sync_settings` - Track-level sync configuration
    - `subtrack_calendar_sync_settings` - Subtrack-level sync configuration
    - `event_calendar_sync_settings` - Event-level sync configuration

  2. Schema Extensions
    - Add `source_subtrack_id` to `calendar_events` (for explainability only)

  3. Principles
    - Explicit opt-in (sync_enabled = false by default)
    - User-scoped (users control their own sync settings)
    - Inheritance support (inherit_from_parent boolean)
    - Target calendar selection (personal | shared | both)
    - Uniqueness per scope (one setting per user/scope combination)

  4. Security
    - RLS enabled on all tables
    - Users can only access their own settings

  5. Anti-Goals
    - ❌ Does NOT replace calendar_sync_settings
    - ❌ Does NOT auto-create rows
    - ❌ Does NOT migrate existing data
    - ❌ Does NOT change existing sync behavior
*/

-- ============================================================================
-- Project-Level Sync Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- Sync configuration
  sync_enabled boolean NOT NULL DEFAULT false,  -- Explicit opt-in
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  -- Target calendar selection
  target_calendar_type text NOT NULL DEFAULT 'personal' 
    CHECK (target_calendar_type IN ('personal', 'shared', 'both')),
  target_space_id uuid NULL REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Inheritance
  inherit_from_global boolean NOT NULL DEFAULT true,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Uniqueness: one setting per user/project
  UNIQUE(user_id, project_id)
);

-- ============================================================================
-- Track-Level Sync Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS track_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  
  -- Sync configuration
  sync_enabled boolean NOT NULL DEFAULT false,  -- Explicit opt-in
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  -- Target calendar selection
  target_calendar_type text NOT NULL DEFAULT 'personal'
    CHECK (target_calendar_type IN ('personal', 'shared', 'both')),
  target_space_id uuid NULL REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Inheritance
  inherit_from_project boolean NOT NULL DEFAULT true,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Uniqueness: one setting per user/project/track
  UNIQUE(user_id, project_id, track_id)
);

-- ============================================================================
-- Subtrack-Level Sync Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS subtrack_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES guardrails_tracks(id) ON DELETE CASCADE,
  subtrack_id uuid NOT NULL REFERENCES guardrails_subtracks(id) ON DELETE CASCADE,
  
  -- Sync configuration
  sync_enabled boolean NOT NULL DEFAULT false,  -- Explicit opt-in
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,
  
  -- Target calendar selection
  target_calendar_type text NOT NULL DEFAULT 'personal'
    CHECK (target_calendar_type IN ('personal', 'shared', 'both')),
  target_space_id uuid NULL REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Inheritance
  inherit_from_track boolean NOT NULL DEFAULT true,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Uniqueness: one setting per user/project/track/subtrack
  UNIQUE(user_id, project_id, track_id, subtrack_id)
);

-- ============================================================================
-- Event-Level Sync Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,  -- References roadmap_items.id, taskflow_tasks.id, or mindmesh nodes
  
  -- Entity type (determines which table event_id references)
  entity_type text NOT NULL 
    CHECK (entity_type IN ('roadmap_event', 'task', 'mindmesh_event')),
  
  -- Optional hierarchy context (for explainability)
  track_id uuid NULL REFERENCES guardrails_tracks(id) ON DELETE SET NULL,
  subtrack_id uuid NULL REFERENCES guardrails_subtracks(id) ON DELETE SET NULL,
  
  -- Sync configuration
  sync_enabled boolean NOT NULL DEFAULT false,  -- Explicit opt-in
  
  -- Target calendar selection
  target_calendar_type text NOT NULL DEFAULT 'personal'
    CHECK (target_calendar_type IN ('personal', 'shared', 'both')),
  target_space_id uuid NULL REFERENCES spaces(id) ON DELETE SET NULL,
  
  -- Inheritance
  inherit_from_subtrack boolean NULL DEFAULT NULL,  -- NULL = check subtrack, false = don't inherit
  inherit_from_track boolean NULL DEFAULT NULL,     -- NULL = check track, false = don't inherit
  inherit_from_project boolean NULL DEFAULT NULL,    -- NULL = check project, false = don't inherit
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Uniqueness: one setting per user/event
  UNIQUE(user_id, project_id, event_id, entity_type)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Project-level indexes
CREATE INDEX IF NOT EXISTS idx_project_sync_user_project 
  ON project_calendar_sync_settings(user_id, project_id);

-- Track-level indexes
CREATE INDEX IF NOT EXISTS idx_track_sync_user_track 
  ON track_calendar_sync_settings(user_id, project_id, track_id);

-- Subtrack-level indexes
CREATE INDEX IF NOT EXISTS idx_subtrack_sync_user_subtrack 
  ON subtrack_calendar_sync_settings(user_id, project_id, track_id, subtrack_id);

-- Event-level indexes
CREATE INDEX IF NOT EXISTS idx_event_sync_user_event 
  ON event_calendar_sync_settings(user_id, project_id, event_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_event_sync_track 
  ON event_calendar_sync_settings(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_sync_subtrack 
  ON event_calendar_sync_settings(subtrack_id) WHERE subtrack_id IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE project_calendar_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_calendar_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtrack_calendar_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- Project-level RLS policies
CREATE POLICY "Users can read own project sync settings"
  ON project_calendar_sync_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project sync settings"
  ON project_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project sync settings"
  ON project_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project sync settings"
  ON project_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Track-level RLS policies
CREATE POLICY "Users can read own track sync settings"
  ON track_calendar_sync_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own track sync settings"
  ON track_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own track sync settings"
  ON track_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own track sync settings"
  ON track_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Subtrack-level RLS policies
CREATE POLICY "Users can read own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subtrack sync settings"
  ON subtrack_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Event-level RLS policies
CREATE POLICY "Users can read own event sync settings"
  ON event_calendar_sync_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own event sync settings"
  ON event_calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event sync settings"
  ON event_calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own event sync settings"
  ON event_calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Updated_at Triggers
-- ============================================================================

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_granular_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
CREATE TRIGGER update_project_sync_settings_updated_at
  BEFORE UPDATE ON project_calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_granular_sync_settings_updated_at();

CREATE TRIGGER update_track_sync_settings_updated_at
  BEFORE UPDATE ON track_calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_granular_sync_settings_updated_at();

CREATE TRIGGER update_subtrack_sync_settings_updated_at
  BEFORE UPDATE ON subtrack_calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_granular_sync_settings_updated_at();

CREATE TRIGGER update_event_sync_settings_updated_at
  BEFORE UPDATE ON event_calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_granular_sync_settings_updated_at();

-- ============================================================================
-- Extend calendar_events for Explainability
-- ============================================================================

-- Add source_subtrack_id to calendar_events (for explainability only, not authority)
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS source_subtrack_id uuid 
  REFERENCES guardrails_subtracks(id) ON DELETE SET NULL;

-- Add index for querying by subtrack
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_subtrack
  ON calendar_events(source_subtrack_id)
  WHERE source_subtrack_id IS NOT NULL;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE project_calendar_sync_settings IS 
  'Project-level Guardrails calendar sync settings. Explicit opt-in only (sync_enabled = false by default).';

COMMENT ON TABLE track_calendar_sync_settings IS 
  'Track-level Guardrails calendar sync settings. Can inherit from project-level settings.';

COMMENT ON TABLE subtrack_calendar_sync_settings IS 
  'Subtrack-level Guardrails calendar sync settings. Can inherit from track-level settings.';

COMMENT ON TABLE event_calendar_sync_settings IS 
  'Event-level Guardrails calendar sync settings. Most specific level, can inherit from subtrack/track/project.';

COMMENT ON COLUMN calendar_events.source_subtrack_id IS 
  'Subtrack ID for explainability only. Does not determine sync intent.';
