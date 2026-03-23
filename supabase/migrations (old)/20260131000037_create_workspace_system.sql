/*
  # Create Workspace System
  
  This migration creates the Workspace system - a structured thinking and reference
  surface within Spaces that enables users to organize ideas, information, plans, and
  context using modular, collapsible content units.
  
  Context:
  - Workspace is a new widget type in Spaces
  - Supports progressive structure (content before schema)
  - Enables non-linear thinking and long-lived content
  - Acts as connective layer across the app (Planner, Guardrails, etc.)
  
  Architecture:
  - workspaces: Container for workspace instances
  - workspace_units: Individual content units (text, bullets, checklists, etc.)
  - workspace_references: Links to other system items (Planner, Guardrails, etc.)
  
  Design Principles:
  - Content before schema (no upfront structure required)
  - Collapse is first-class (compression is important)
  - Semantic units over cosmetic formatting
  - Reference, don't duplicate (non-destructive links)
  - Calm by default (no visual clutter)
*/

-- Step 1: Create enum for workspace unit types
DO $$ BEGIN
  CREATE TYPE workspace_unit_type AS ENUM (
    'text',
    'bullet',
    'checklist',
    'group',
    'callout',
    'reference',
    'code',
    'divider'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create enum for reference types
DO $$ BEGIN
  CREATE TYPE workspace_reference_type AS ENUM (
    'planner_event',
    'guardrails_task',
    'guardrails_roadmap',
    'goal',
    'workspace',
    'widget',
    'url'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Create enum for callout types
DO $$ BEGIN
  CREATE TYPE workspace_callout_type AS ENUM (
    'info',
    'warning',
    'success',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Step 5: Create workspace_units table
CREATE TABLE IF NOT EXISTS workspace_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES workspace_units(id) ON DELETE CASCADE,
  type workspace_unit_type NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index numeric NOT NULL DEFAULT 0, -- Use numeric for fractional indexing
  is_collapsed boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false, -- For checklist items
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Step 6: Create workspace_references table
CREATE TABLE IF NOT EXISTS workspace_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_unit_id uuid NOT NULL REFERENCES workspace_units(id) ON DELETE CASCADE,
  reference_type workspace_reference_type NOT NULL,
  reference_id uuid, -- For internal references
  reference_url text, -- For external URLs
  display_text text NOT NULL,
  preview_data jsonb, -- Cached preview data
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_space_id ON workspaces(space_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_archived_at ON workspaces(archived_at) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_units_workspace_id ON workspace_units(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_units_parent_id ON workspace_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_units_order ON workspace_units(workspace_id, parent_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workspace_units_deleted_at ON workspace_units(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_references_unit_id ON workspace_references(workspace_unit_id);
CREATE INDEX IF NOT EXISTS idx_workspace_references_type_id ON workspace_references(reference_type, reference_id);

-- Step 8: Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspaces_updated_at();

CREATE OR REPLACE FUNCTION update_workspace_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_units_updated_at
  BEFORE UPDATE ON workspace_units
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_units_updated_at();

-- Step 9: Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_references ENABLE ROW LEVEL SECURITY;

-- Step 10: RLS Policies for workspaces
-- Users can view workspaces in their spaces
CREATE POLICY "Users can view workspaces in their spaces"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = workspaces.space_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can create workspaces in their spaces
CREATE POLICY "Users can create workspaces in their spaces"
  ON workspaces FOR INSERT
  WITH CHECK (
    created_by = get_current_profile_id()
    AND EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = workspaces.space_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can update workspaces they created
CREATE POLICY "Users can update workspaces they created"
  ON workspaces FOR UPDATE
  USING (created_by = get_current_profile_id())
  WITH CHECK (created_by = get_current_profile_id());

-- Users can delete (archive) workspaces they created
CREATE POLICY "Users can archive workspaces they created"
  ON workspaces FOR UPDATE
  USING (created_by = get_current_profile_id())
  WITH CHECK (created_by = get_current_profile_id());

-- Step 11: RLS Policies for workspace_units
-- Users can view units in workspaces they can access
CREATE POLICY "Users can view workspace units"
  ON workspace_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE w.id = workspace_units.workspace_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
      AND workspace_units.deleted_at IS NULL
    )
  );

-- Users can create units in workspaces they can access
CREATE POLICY "Users can create workspace units"
  ON workspace_units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE w.id = workspace_units.workspace_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can update units in workspaces they can access
CREATE POLICY "Users can update workspace units"
  ON workspace_units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE w.id = workspace_units.workspace_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE w.id = workspace_units.workspace_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can delete (soft delete) units in workspaces they can access
CREATE POLICY "Users can delete workspace units"
  ON workspace_units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE w.id = workspace_units.workspace_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Step 12: RLS Policies for workspace_references
-- Users can view references in units they can access
CREATE POLICY "Users can view workspace references"
  ON workspace_references FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_units wu
      JOIN workspaces w ON w.id = wu.workspace_id
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE wu.id = workspace_references.workspace_unit_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can create references in units they can access
CREATE POLICY "Users can create workspace references"
  ON workspace_references FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_units wu
      JOIN workspaces w ON w.id = wu.workspace_id
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE wu.id = workspace_references.workspace_unit_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can update references in units they can access
CREATE POLICY "Users can update workspace references"
  ON workspace_references FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_units wu
      JOIN workspaces w ON w.id = wu.workspace_id
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE wu.id = workspace_references.workspace_unit_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Users can delete references in units they can access
CREATE POLICY "Users can delete workspace references"
  ON workspace_references FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_units wu
      JOIN workspaces w ON w.id = wu.workspace_id
      JOIN space_members sm ON sm.space_id = w.space_id
      WHERE wu.id = workspace_references.workspace_unit_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Step 13: Add workspace to widget_type enum
DO $$
BEGIN
  BEGIN
    ALTER TYPE widget_type ADD VALUE 'workspace';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Step 14: Force PostgREST to reload schema cache
-- This ensures the new tables are immediately visible via the Supabase API
NOTIFY pgrst, 'reload schema';

-- Step 15: Add comments
COMMENT ON TABLE workspaces IS 
  'Workspaces are structured thinking and reference surfaces within Spaces. They enable users to organize ideas, information, plans, and context using modular, collapsible content units.';

COMMENT ON TABLE workspace_units IS 
  'Individual content units within a workspace. Units can be text, bullets, checklists, groups, callouts, references, code blocks, or dividers. Units support hierarchical nesting and reordering.';

COMMENT ON TABLE workspace_references IS 
  'References from workspace units to other system items (Planner events, Guardrails tasks, goals, etc.). References are non-destructive and non-authoritative - they link to source items without owning their state.';

COMMENT ON COLUMN workspace_units.order_index IS 
  'Fractional indexing for efficient reordering. Use numeric type to allow inserting between items without renumbering.';

COMMENT ON COLUMN workspace_units.is_collapsed IS 
  'Whether this unit (if a group) is collapsed. Collapse is first-class in Workspace - compression is as important as creation.';

COMMENT ON COLUMN workspace_references.preview_data IS 
  'Cached preview data for the referenced item. This allows showing context without querying source systems on every render.';
