/*
  # Phase 1: Create Guardrails Domain Tables
  
  This migration creates first-class domain tables for Guardrails Tasks and Events.
  These tables own semantics, lifecycle, and validation - NOT visual hierarchy.
  
  Phase 0 Rule: Domain entities own meaning. Roadmap owns projection.
  
  1. guardrails_tasks - Task domain entity
  2. guardrails_events - Event domain entity
  3. RLS policies using existing permission helpers
  4. Indexes for performance
  5. Triggers for updated_at
*/

-- ============================================================================
-- 1. guardrails_tasks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS guardrails_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project assignment (required for project-scoped tasks)
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- Future: side project container (nullable for now)
  side_project_id uuid NULL,
  
  -- Core semantics
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'pending',
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Lifecycle timestamps
  completed_at timestamptz NULL,
  due_at timestamptz NULL,
  
  -- Type-specific metadata (extensible)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  
  -- Constraints
  CONSTRAINT guardrails_tasks_status_check CHECK (
    status IN ('not_started', 'pending', 'in_progress', 'blocked', 'on_hold', 'completed', 'cancelled')
  ),
  CONSTRAINT guardrails_tasks_completed_logic CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- Indexes for guardrails_tasks
CREATE INDEX IF NOT EXISTS idx_guardrails_tasks_project 
  ON guardrails_tasks(master_project_id) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_tasks_status 
  ON guardrails_tasks(master_project_id, status) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_tasks_due_at 
  ON guardrails_tasks(due_at) 
  WHERE archived_at IS NULL AND due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_tasks_created_by 
  ON guardrails_tasks(created_by) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_tasks_updated_at 
  ON guardrails_tasks(updated_at) 
  WHERE archived_at IS NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_guardrails_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guardrails_tasks_updated_at ON guardrails_tasks;
CREATE TRIGGER trigger_update_guardrails_tasks_updated_at
  BEFORE UPDATE ON guardrails_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_guardrails_tasks_updated_at();

-- ============================================================================
-- 2. guardrails_events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS guardrails_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project assignment
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- Future: side project container
  side_project_id uuid NULL,
  
  -- Core semantics
  title text NOT NULL,
  description text NULL,
  
  -- Temporal properties
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  timezone text NULL DEFAULT 'UTC',
  
  -- Location
  location text NULL,
  
  -- Type-specific metadata (recurrence, attendees, etc.)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  
  -- Constraints
  CONSTRAINT guardrails_events_temporal_check CHECK (
    (start_at IS NULL AND end_at IS NULL) OR
    (start_at IS NOT NULL AND (end_at IS NULL OR end_at >= start_at))
  )
);

-- Indexes for guardrails_events
CREATE INDEX IF NOT EXISTS idx_guardrails_events_project 
  ON guardrails_events(master_project_id) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_events_start_at 
  ON guardrails_events(start_at) 
  WHERE archived_at IS NULL AND start_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_events_end_at 
  ON guardrails_events(end_at) 
  WHERE archived_at IS NULL AND end_at IS NOT NULL;

-- Date range for calendar sync
CREATE INDEX IF NOT EXISTS idx_guardrails_events_date_range 
  ON guardrails_events USING GIST (
    tstzrange(start_at, end_at, '[]')
  ) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_events_created_by 
  ON guardrails_events(created_by) 
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_events_updated_at 
  ON guardrails_events(updated_at) 
  WHERE archived_at IS NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_guardrails_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guardrails_events_updated_at ON guardrails_events;
CREATE TRIGGER trigger_update_guardrails_events_updated_at
  BEFORE UPDATE ON guardrails_events
  FOR EACH ROW
  EXECUTE FUNCTION update_guardrails_events_updated_at();

-- ============================================================================
-- 3. RLS Policies for guardrails_tasks
-- ============================================================================

ALTER TABLE guardrails_tasks ENABLE ROW LEVEL SECURITY;

-- View tasks in projects user can view
CREATE POLICY "Users can view tasks in their projects"
  ON guardrails_tasks FOR SELECT
  TO authenticated
  USING (
    user_can_view_project(auth.uid(), master_project_id)
  );

-- Create tasks in projects user can edit
CREATE POLICY "Editors can create tasks"
  ON guardrails_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_edit_project(auth.uid(), master_project_id)
  );

-- Update tasks in projects user can edit
CREATE POLICY "Editors can update tasks"
  ON guardrails_tasks FOR UPDATE
  TO authenticated
  USING (
    user_can_edit_project(auth.uid(), master_project_id)
  )
  WITH CHECK (
    user_can_edit_project(auth.uid(), master_project_id)
  );

-- Archive tasks in projects user can edit (soft delete via archived_at)
-- Note: RLS policies cannot use OLD in WITH CHECK, so we validate edit permission only
-- The USING clause ensures user has edit permission, and WITH CHECK validates the same.
-- Archive validation logic (checking that only archived_at changed) should be handled
-- at the application/service layer if needed, not in RLS policies.
CREATE POLICY "Editors can archive tasks"
  ON guardrails_tasks FOR UPDATE
  TO authenticated
  USING (
    user_can_edit_project(auth.uid(), master_project_id)
  )
  WITH CHECK (
    user_can_edit_project(auth.uid(), master_project_id)
  );

-- ============================================================================
-- 4. RLS Policies for guardrails_events
-- ============================================================================

ALTER TABLE guardrails_events ENABLE ROW LEVEL SECURITY;

-- View events in projects user can view
CREATE POLICY "Users can view events in their projects"
  ON guardrails_events FOR SELECT
  TO authenticated
  USING (
    user_can_view_project(auth.uid(), master_project_id)
  );

-- Create events in projects user can edit
CREATE POLICY "Editors can create events"
  ON guardrails_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_can_edit_project(auth.uid(), master_project_id)
  );

-- Update events in projects user can edit
CREATE POLICY "Editors can update events"
  ON guardrails_events FOR UPDATE
  TO authenticated
  USING (
    user_can_edit_project(auth.uid(), master_project_id)
  )
  WITH CHECK (
    user_can_edit_project(auth.uid(), master_project_id)
  );

-- Archive events in projects user can edit
-- Note: RLS policies cannot use OLD in WITH CHECK, so we validate edit permission only
CREATE POLICY "Editors can archive events"
  ON guardrails_events FOR UPDATE
  TO authenticated
  USING (
    user_can_edit_project(auth.uid(), master_project_id)
  )
  WITH CHECK (
    user_can_edit_project(auth.uid(), master_project_id)
  );
