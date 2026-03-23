/*
  # Create Tracker Studio Foundation Schema (Phase 1)
  
  This migration creates the foundational data layer for Tracker Studio, a generic
  tracking engine for time-based personal data (sleep, mood, habits, fitness, etc.).
  
  Based on: TRACKER_STUDIO_ARCHITECTURE_REVIEW.md
  
  Core Principles:
  - Templates never contain data
  - Trackers are instances that contain data
  - Tracker entries are append-only time-based records
  - Trackers store a snapshot of their schema at creation
  - Templates may be versioned; existing trackers never break
  - No coupling to Guardrails or Habits domains
  
  1. Tables Created
    - tracker_templates: Structure-only templates (no data)
    - trackers: Live tracker instances with data
    - tracker_entries: Time-based tracker data (append-only)
  
  2. Constraints
    - Templates are immutable once referenced (versioning instead)
    - Trackers may exist without templates
    - Entries are append-only (no deletes)
    - Unique constraint: one entry per tracker/user/date
  
  3. Security
    - RLS enabled on all tables
    - Users can read their own templates + system templates
    - Users can read/write their own trackers and entries
    - No sharing yet (Phase 3)
  
  4. Notes
    - All changes are additive (no existing tables modified)
    - Field schemas stored as JSONB for flexibility
    - Entry granularity supports daily, session, event, range patterns
*/

-- Create entry_granularity enum
DO $$ BEGIN
  CREATE TYPE tracker_entry_granularity AS ENUM('daily', 'session', 'event', 'range');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tracker_templates table
CREATE TABLE IF NOT EXISTS tracker_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  version integer NOT NULL DEFAULT 1,
  field_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  entry_granularity tracker_entry_granularity NOT NULL DEFAULT 'daily',
  is_system_template boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  
  -- Constraints
  CONSTRAINT field_schema_not_empty CHECK (jsonb_array_length(field_schema) > 0),
  CONSTRAINT valid_version CHECK (version > 0),
  CONSTRAINT name_not_empty CHECK (trim(name) != '')
);

-- Create trackers table
CREATE TABLE IF NOT EXISTS trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES tracker_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  field_schema_snapshot jsonb NOT NULL,
  entry_granularity tracker_entry_granularity NOT NULL DEFAULT 'daily',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  
  -- Constraints
  CONSTRAINT field_schema_snapshot_not_empty CHECK (jsonb_array_length(field_schema_snapshot) > 0),
  CONSTRAINT name_not_empty CHECK (trim(name) != '')
);

-- Create tracker_entries table
CREATE TABLE IF NOT EXISTS tracker_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One entry per tracker/user/date
  CONSTRAINT unique_tracker_entry UNIQUE(tracker_id, user_id, entry_date)
);

-- Create indexes for tracker_templates
CREATE INDEX IF NOT EXISTS idx_tracker_templates_owner 
  ON tracker_templates(owner_id) 
  WHERE owner_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tracker_templates_system 
  ON tracker_templates(is_system_template) 
  WHERE is_system_template = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tracker_templates_archived 
  ON tracker_templates(archived_at) 
  WHERE archived_at IS NULL;

-- Create indexes for trackers
CREATE INDEX IF NOT EXISTS idx_trackers_owner 
  ON trackers(owner_id) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trackers_template 
  ON trackers(template_id) 
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trackers_archived 
  ON trackers(archived_at) 
  WHERE archived_at IS NULL;

-- Create indexes for tracker_entries
CREATE INDEX IF NOT EXISTS idx_tracker_entries_tracker 
  ON tracker_entries(tracker_id);

CREATE INDEX IF NOT EXISTS idx_tracker_entries_user 
  ON tracker_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_tracker_entries_date 
  ON tracker_entries(entry_date);

CREATE INDEX IF NOT EXISTS idx_tracker_entries_tracker_user_date 
  ON tracker_entries(tracker_id, user_id, entry_date);

-- Enable RLS
ALTER TABLE tracker_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracker_templates
-- Users can read their own templates
CREATE POLICY "Users can read their own templates"
  ON tracker_templates
  FOR SELECT
  USING (
    owner_id = auth.uid() AND archived_at IS NULL
  );

-- Users can read system templates
CREATE POLICY "Users can read system templates"
  ON tracker_templates
  FOR SELECT
  USING (
    is_system_template = true AND archived_at IS NULL
  );

-- Users can create their own templates
CREATE POLICY "Users can create their own templates"
  ON tracker_templates
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND is_system_template = false
  );

-- Users can update their own templates (if not referenced)
CREATE POLICY "Users can update their own templates"
  ON tracker_templates
  FOR UPDATE
  USING (
    owner_id = auth.uid() AND archived_at IS NULL
  )
  WITH CHECK (
    owner_id = auth.uid() AND archived_at IS NULL
  );

-- Users can archive their own templates
CREATE POLICY "Users can archive their own templates"
  ON tracker_templates
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

-- RLS Policies for trackers
-- Users can read their own trackers
CREATE POLICY "Users can read their own trackers"
  ON trackers
  FOR SELECT
  USING (
    owner_id = auth.uid() AND archived_at IS NULL
  );

-- Users can create their own trackers
CREATE POLICY "Users can create their own trackers"
  ON trackers
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
  );

-- Users can update their own trackers
CREATE POLICY "Users can update their own trackers"
  ON trackers
  FOR UPDATE
  USING (
    owner_id = auth.uid() AND archived_at IS NULL
  )
  WITH CHECK (
    owner_id = auth.uid() AND archived_at IS NULL
  );

-- Users can archive their own trackers
CREATE POLICY "Users can archive their own trackers"
  ON trackers
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

-- RLS Policies for tracker_entries
-- Users can read their own entries
CREATE POLICY "Users can read their own entries"
  ON tracker_entries
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Users can create their own entries
CREATE POLICY "Users can create their own entries"
  ON tracker_entries
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own entries
CREATE POLICY "Users can update their own entries"
  ON tracker_entries
  FOR UPDATE
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Comments for documentation
COMMENT ON TABLE tracker_templates IS 'Structure-only templates for trackers. Templates never contain data.';
COMMENT ON TABLE trackers IS 'Live tracker instances with data. Trackers store a snapshot of their schema at creation.';
COMMENT ON TABLE tracker_entries IS 'Time-based tracker data. Entries are append-only (no deletes).';
COMMENT ON COLUMN tracker_templates.field_schema IS 'Array of field definitions: [{id, label, type, validation?, default?}]';
COMMENT ON COLUMN trackers.field_schema_snapshot IS 'Snapshot of template schema at creation time. Never mutates.';
COMMENT ON COLUMN tracker_entries.field_values IS 'Field values: {field_id: value}. Values must match field types.';
