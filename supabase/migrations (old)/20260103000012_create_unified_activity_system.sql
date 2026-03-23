/*
  # Create Unified Canonical Activity System

  Goal: Create a single source of truth for habits, goals, tasks, and other activities
  that projects to the calendar without duplication.

  Principles:
  - Activities are canonical (owned by widgets)
  - Calendar events are projections only
  - No hard deletes (archive/hide only)
  - Backward compatible (existing calendar events work as-is)
*/

-- ============================================================================
-- 1. Create Activity Type Enum
-- ============================================================================
CREATE TYPE activity_type AS ENUM (
  'habit',
  'goal',
  'task',
  'meeting',
  'meal',
  'reminder',
  'time_block',
  'appointment',
  'milestone',
  'travel_segment',
  'event' -- catch-all for activities without specific type
);

-- ============================================================================
-- 2. Create Activity Status Enum
-- ============================================================================
CREATE TYPE activity_status AS ENUM (
  'active',
  'completed',
  'archived',
  'inactive'
);

-- ============================================================================
-- 3. Create Schedule Type Enum
-- ============================================================================
CREATE TYPE schedule_type AS ENUM (
  'single',        -- One-time event
  'recurring',     -- Repeating pattern
  'deadline',      -- Goal deadline (no specific time)
  'time_block'     -- Flexible time block
);

-- ============================================================================
-- 4. Create Projection State Enum
-- ============================================================================
CREATE TYPE projection_state AS ENUM (
  'active',        -- Visible in calendar
  'hidden',        -- Hidden from calendar (soft delete)
  'removed'        -- Removed (user deleted projection)
);

-- ============================================================================
-- 5. Create Activities Table (Canonical Source of Truth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identity
  type activity_type NOT NULL,
  title text NOT NULL,
  description text,
  
  -- Ownership
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status
  status activity_status NOT NULL DEFAULT 'active',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb, -- Flexible storage for type-specific data
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  
  -- Constraints
  CONSTRAINT valid_archived CHECK (
    (status = 'archived' AND archived_at IS NOT NULL) OR
    (status != 'archived' AND archived_at IS NULL)
  )
);

-- ============================================================================
-- 6. Create Activity Schedules Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to activity
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Schedule configuration
  schedule_type schedule_type NOT NULL,
  start_at timestamptz,
  end_at timestamptz,
  
  -- Recurrence (for recurring schedules)
  recurrence_rule text, -- RRULE format (e.g., "FREQ=DAILY;INTERVAL=1")
  
  -- Timezone
  timezone text DEFAULT 'UTC',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_schedule_times CHECK (
    (schedule_type IN ('single', 'time_block') AND start_at IS NOT NULL) OR
    (schedule_type = 'deadline' AND start_at IS NOT NULL AND end_at IS NULL) OR
    (schedule_type = 'recurring' AND start_at IS NOT NULL)
  )
);

-- ============================================================================
-- 7. Extend Calendar Events (Additive Only)
-- ============================================================================
-- Add activity_id foreign key (nullable for backward compatibility)
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES activities(id) ON DELETE SET NULL;

-- Add projection_state (defaults to 'active' for existing events)
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS projection_state projection_state NOT NULL DEFAULT 'active';

-- Add index for activity lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_activity_id
ON calendar_events(activity_id)
WHERE activity_id IS NOT NULL;

-- Add index for projection state filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_projection_state
ON calendar_events(projection_state)
WHERE projection_state != 'active';

-- ============================================================================
-- 8. Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_owner_id ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_schedules_activity_id ON activity_schedules(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_schedules_start_at ON activity_schedules(start_at);
CREATE INDEX IF NOT EXISTS idx_activity_schedules_schedule_type ON activity_schedules(schedule_type);

-- ============================================================================
-- 9. Enable RLS
-- ============================================================================
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_schedules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS Policies for Activities
-- ============================================================================
-- Users can view their own activities
CREATE POLICY "Users can view their own activities"
  ON activities FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can create their own activities
CREATE POLICY "Users can create their own activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Users can update their own activities
CREATE POLICY "Users can update their own activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users can delete (archive) their own activities
CREATE POLICY "Users can archive their own activities"
  ON activities FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- 11. RLS Policies for Activity Schedules
-- ============================================================================
-- Users can view schedules for their activities
CREATE POLICY "Users can view schedules for their activities"
  ON activity_schedules FOR SELECT
  TO authenticated
  USING (
    activity_id IN (
      SELECT id FROM activities WHERE owner_id = auth.uid()
    )
  );

-- Users can create schedules for their activities
CREATE POLICY "Users can create schedules for their activities"
  ON activity_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    activity_id IN (
      SELECT id FROM activities WHERE owner_id = auth.uid()
    )
  );

-- Users can update schedules for their activities
CREATE POLICY "Users can update schedules for their activities"
  ON activity_schedules FOR UPDATE
  TO authenticated
  USING (
    activity_id IN (
      SELECT id FROM activities WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    activity_id IN (
      SELECT id FROM activities WHERE owner_id = auth.uid()
    )
  );

-- Users can delete schedules for their activities
CREATE POLICY "Users can delete schedules for their activities"
  ON activity_schedules FOR DELETE
  TO authenticated
  USING (
    activity_id IN (
      SELECT id FROM activities WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 12. Helper Functions
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for activities
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_updated_at();

-- Trigger for activity_schedules
DROP TRIGGER IF EXISTS update_activity_schedules_updated_at ON activity_schedules;
CREATE TRIGGER update_activity_schedules_updated_at
  BEFORE UPDATE ON activity_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_updated_at();

-- Function to archive activity (soft delete)
CREATE OR REPLACE FUNCTION archive_activity(activity_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE activities
  SET status = 'archived',
      archived_at = now(),
      updated_at = now()
  WHERE id = activity_uuid AND owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hide calendar projection (soft delete from calendar)
CREATE OR REPLACE FUNCTION hide_calendar_projection(event_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE calendar_events
  SET projection_state = 'hidden',
      updated_at = now()
  WHERE id = event_uuid
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. Comments for Documentation
-- ============================================================================
COMMENT ON TABLE activities IS 
  'Canonical source of truth for all activities (habits, goals, tasks, etc). 
   Activities are owned by widgets/systems, not the calendar.';

COMMENT ON TABLE activity_schedules IS 
  'Scheduling information for activities. One activity can have multiple schedules.
   Calendar events are projections generated from these schedules.';

COMMENT ON COLUMN calendar_events.activity_id IS 
  'Foreign key to activities table. If set, this calendar event is a projection
   of an activity schedule. NULL means this is a standalone calendar event.';

COMMENT ON COLUMN calendar_events.projection_state IS 
  'State of calendar projection: active (visible), hidden (soft deleted from calendar),
   removed (user explicitly removed projection).';






