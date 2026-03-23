-- Create table for scheduled/recurring fitness sessions
-- Allows users to schedule sessions with recurrence patterns and sync to calendars

CREATE TABLE IF NOT EXISTS fitness_scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_domain TEXT NOT NULL, -- e.g., 'martial_arts', 'gym', 'running'
  activity_name TEXT NOT NULL, -- e.g., 'Boxing', 'Upper Body', 'BJJ'
  session_type TEXT, -- Optional subcategory
  
  -- Scheduling
  start_datetime TIMESTAMPTZ NOT NULL, -- When the first session occurs
  duration_minutes INTEGER, -- Duration of session
  timezone TEXT DEFAULT 'UTC',
  
  -- Recurrence pattern
  recurrence_type TEXT NOT NULL, -- 'none', 'daily', 'weekly', 'monthly', 'custom'
  recurrence_config JSONB, -- Detailed recurrence settings:
  --   weekly: { daysOfWeek: [1,3,5], interval: 1 }  (1=Monday, etc.)
  --   monthly: { dayOfMonth: 15, interval: 1 }
  --   custom: { frequency: 'weekly', daysOfWeek: [1,3], interval: 1 }
  
  -- End date/time
  end_date DATE, -- Last date for recurrence (null = no end date)
  occurrence_count INTEGER, -- Number of occurrences (alternative to end_date)
  
  -- Calendar sync
  calendar_sync_enabled BOOLEAN DEFAULT false,
  calendar_sync_id TEXT, -- External calendar event ID after sync
  calendar_type TEXT, -- 'personal', 'shared', 'google', 'apple', 'outlook'
  
  -- Notes and metadata
  notes TEXT,
  auto_log_enabled BOOLEAN DEFAULT false, -- Automatically create session entry at scheduled time
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fitness_scheduled_sessions_user ON fitness_scheduled_sessions(user_id);
CREATE INDEX idx_fitness_scheduled_sessions_domain ON fitness_scheduled_sessions(activity_domain);
CREATE INDEX idx_fitness_scheduled_sessions_active ON fitness_scheduled_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_fitness_scheduled_sessions_start ON fitness_scheduled_sessions(user_id, start_datetime);

-- RLS Policies
ALTER TABLE fitness_scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled sessions"
  ON fitness_scheduled_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled sessions"
  ON fitness_scheduled_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled sessions"
  ON fitness_scheduled_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled sessions"
  ON fitness_scheduled_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_fitness_scheduled_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fitness_scheduled_sessions_updated_at
  BEFORE UPDATE ON fitness_scheduled_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_fitness_scheduled_sessions_updated_at();

-- Comments
COMMENT ON TABLE fitness_scheduled_sessions IS 'Scheduled and recurring fitness sessions with calendar sync support';
COMMENT ON COLUMN fitness_scheduled_sessions.recurrence_config IS 'JSONB configuration for recurrence patterns: weekly {daysOfWeek: [1,3,5], interval: 1}, monthly {dayOfMonth: 15, interval: 1}';
COMMENT ON COLUMN fitness_scheduled_sessions.calendar_sync_id IS 'External calendar event ID after successful sync';
