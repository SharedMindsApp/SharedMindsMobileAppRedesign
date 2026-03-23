/*
  # Add Distribution Support Schema (Phase 1)
  
  This migration creates the schema for group-based distribution of tasks and calendar events.
  
  Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
  
  1. Table Created
    - task_projections: Task projections for group-based distribution
  
  2. Columns Added
    - calendar_projections.source_group_id: Optional source group for group-based distribution
  
  3. Constraints
    - One projection per user per task
    - Status lifecycle: pending, accepted, declined, revoked
    - Source group optional (nullable for backward compatibility)
  
  4. Security
    - RLS enabled on task_projections
    - Default-deny access (minimal policies in Phase 1)
    - Service layer will implement permission checks (Phase 2)
  
  5. Notes
    - No business logic in schema
    - Distribution logic happens in service layer (Phase 2)
    - All changes are additive (no existing tables modified except additive column)
*/

-- Create task_projections table
CREATE TABLE IF NOT EXISTS task_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_group_id uuid REFERENCES team_groups(id) ON DELETE SET NULL,
  can_edit boolean DEFAULT false,
  can_complete boolean DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  
  -- One projection per user per task
  CONSTRAINT unique_task_projection UNIQUE(task_id, target_user_id),
  
  -- Status constraint
  CONSTRAINT check_projection_status CHECK (status IN ('pending', 'accepted', 'declined', 'revoked'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_projections_task_id 
  ON task_projections(task_id);

CREATE INDEX IF NOT EXISTS idx_task_projections_target_user 
  ON task_projections(target_user_id, status) 
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_task_projections_source_group 
  ON task_projections(source_group_id) 
  WHERE source_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_projections_status 
  ON task_projections(status);

CREATE INDEX IF NOT EXISTS idx_task_projections_created_by 
  ON task_projections(created_by) 
  WHERE created_by IS NOT NULL;

-- Enable RLS
ALTER TABLE task_projections ENABLE ROW LEVEL SECURITY;

-- Minimal RLS policies (default-deny, service layer will handle access in Phase 2)
-- No SELECT policies in Phase 1 - service layer uses SECURITY DEFINER functions

-- Add source_group_id to calendar_projections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_projections' AND column_name = 'source_group_id'
  ) THEN
    ALTER TABLE calendar_projections
    ADD COLUMN source_group_id uuid REFERENCES team_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for source_group_id on calendar_projections
CREATE INDEX IF NOT EXISTS idx_calendar_projections_source_group 
  ON calendar_projections(source_group_id) 
  WHERE source_group_id IS NOT NULL;

-- Comments
COMMENT ON TABLE task_projections IS 'Task projections for group-based distribution. Projects tasks to users via groups.';
COMMENT ON COLUMN task_projections.task_id IS 'Task being projected (references event_tasks.id)';
COMMENT ON COLUMN task_projections.target_user_id IS 'User whose task list this projects to (references auth.users.id)';
COMMENT ON COLUMN task_projections.source_group_id IS 'Group this projection came from (references team_groups.id, nullable)';
COMMENT ON COLUMN task_projections.can_edit IS 'Whether the target user can edit the task';
COMMENT ON COLUMN task_projections.can_complete IS 'Whether the target user can mark the task as complete';
COMMENT ON COLUMN task_projections.status IS 'Projection status: pending, accepted, declined, or revoked';
COMMENT ON COLUMN calendar_projections.source_group_id IS 'Group this projection came from (references team_groups.id, nullable). Added for group-based distribution.';
