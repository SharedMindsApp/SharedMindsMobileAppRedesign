/*
  # Add Source Attribution to Calendar Events (PROMPT 2)

  1. New Columns
    - `source_type` (text, type of Guardrails entity: 'roadmap_event', 'task', 'mindmesh_event', or NULL for manual)
    - `source_entity_id` (uuid, ID of the source entity in Guardrails)
    - `source_project_id` (uuid, foreign key to master_projects)
    - `source_track_id` (uuid, foreign key to guardrails_tracks, nullable)

  2. Constraints
    - Unique constraint on (source_type, source_entity_id) to prevent duplicates
    - source_entity_id requires source_type (can't have entity_id without type)
    - Valid source_type values

  3. Purpose
    - Enables Guardrails → Calendar one-way sync
    - Tracks provenance of calendar events
    - Ensures idempotent sync (one calendar event per Guardrails entity)
    - Allows deletion when Guardrails entity is deleted

  ❌ NO automatic syncing logic in this migration
  ❌ NO triggers that create calendar events
  ❌ NO changes to existing calendar event behavior
  ✅ Foundation only for sync service (PROMPT 2)
*/

-- Add source attribution columns to calendar_events
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS source_type text
  CHECK (source_type IN ('roadmap_event', 'task', 'mindmesh_event') OR source_type IS NULL),
ADD COLUMN IF NOT EXISTS source_entity_id uuid,
ADD COLUMN IF NOT EXISTS source_project_id uuid
  REFERENCES master_projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_track_id uuid
  REFERENCES guardrails_tracks(id) ON DELETE SET NULL;

-- Add constraint: if source_entity_id is provided, source_type must be provided
ALTER TABLE calendar_events
ADD CONSTRAINT source_entity_requires_type
  CHECK (
    (source_entity_id IS NULL) OR
    (source_entity_id IS NOT NULL AND source_type IS NOT NULL)
  );

-- Add unique constraint to prevent duplicate calendar events from same source
-- This ensures idempotent sync: one calendar event per Guardrails entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_source_unique
  ON calendar_events(source_type, source_entity_id)
  WHERE source_type IS NOT NULL AND source_entity_id IS NOT NULL;

-- Add indexes for querying by source
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_project
  ON calendar_events(source_project_id)
  WHERE source_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_source_track
  ON calendar_events(source_track_id)
  WHERE source_track_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_source_type
  ON calendar_events(source_type)
  WHERE source_type IS NOT NULL;

-- Note: All existing calendar events have NULL source fields (manually created)
-- This is correct: only Guardrails sync will populate these fields
