/*
  # Mind Mesh V2 Core Data Model

  ## Summary
  Creates the core data model for Mind Mesh V2, a visual cognition system
  tightly integrated with Guardrails project management.

  ## Core Concepts
  - **Containers**: Hold meaning/content (boxes)
  - **Nodes**: Represent relationships (connectors, no meaning)
  - **Ports**: Connection points on containers
  - **Guardrails Authority**: Tracks, items, people remain authoritative

  ## Key Principles
  1. Containers hold meaning, nodes hold relationships only
  2. Containers can be nested and reference Guardrails entities
  3. Nodes connect ports, not containers directly
  4. Multiple nodes between same containers allowed
  5. Auto-generated connections supported

  ## Changes
  1. Create mindmesh_workspaces table (one per project)
  2. Create mindmesh_containers table (holds meaning)
  3. Create mindmesh_container_references table (links to Guardrails)
  4. Create mindmesh_ports table (connection points)
  5. Create mindmesh_nodes table (relationships only)
  6. Create mindmesh_container_visibility table (per-user)
  7. Create mindmesh_canvas_locks table (edit locking)
  8. Add constraints, indexes, triggers
*/

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Guardrails entity types for container references
DO $$ BEGIN
  CREATE TYPE mindmesh_entity_type AS ENUM (
    'track',
    'roadmap_item',
    'person',
    'widget',
    'domain',
    'project'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Port types
DO $$ BEGIN
  CREATE TYPE mindmesh_port_type AS ENUM (
    'free',    -- No type constraint
    'input',   -- Input port
    'output'   -- Output port
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Relationship types (same as existing mind mesh)
DO $$ BEGIN
  CREATE TYPE mindmesh_relationship_type AS ENUM (
    'expands',
    'inspires',
    'depends_on',
    'references',
    'hierarchy',
    'composition',
    'generic'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Relationship direction
DO $$ BEGIN
  CREATE TYPE mindmesh_relationship_direction AS ENUM (
    'forward',       -- source → target
    'backward',      -- source ← target
    'bidirectional'  -- source ↔ target
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Container visibility state
DO $$ BEGIN
  CREATE TYPE mindmesh_container_visibility_state AS ENUM (
    'visible',
    'hidden',
    'collapsed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- WORKSPACE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_workspace_per_project UNIQUE (master_project_id)
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_workspaces_project
  ON mindmesh_workspaces(master_project_id);

COMMENT ON TABLE mindmesh_workspaces IS
  'One workspace per project. Contains all Mind Mesh V2 containers, nodes, and ports for a project.';

-- ============================================================================
-- CONTAINER (holds meaning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES mindmesh_workspaces(id) ON DELETE CASCADE,

  -- Content (must have at least one)
  title text,
  body text,

  -- Nesting
  parent_container_id uuid REFERENCES mindmesh_containers(id) ON DELETE SET NULL,

  -- Ghost state (read-only)
  is_ghost boolean NOT NULL DEFAULT false,

  -- Visual properties
  x_position numeric NOT NULL DEFAULT 0,
  y_position numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 300,
  height numeric NOT NULL DEFAULT 200,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraint: must have title OR body
  CONSTRAINT container_has_content CHECK (title IS NOT NULL OR body IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_containers_workspace
  ON mindmesh_containers(workspace_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_containers_parent
  ON mindmesh_containers(parent_container_id)
  WHERE parent_container_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mindmesh_containers_ghost
  ON mindmesh_containers(workspace_id, is_ghost)
  WHERE is_ghost = true;

COMMENT ON TABLE mindmesh_containers IS
  'Containers hold meaning/content. Can be nested, can reference Guardrails entities, can be ghosts (read-only).';

COMMENT ON COLUMN mindmesh_containers.is_ghost IS
  'Ghost containers are read-only representations, typically generated from Guardrails entities.';

COMMENT ON CONSTRAINT container_has_content ON mindmesh_containers IS
  'Containers must have at least one of: title or body.';

-- ============================================================================
-- CONTAINER REFERENCE (links to Guardrails)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_container_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES mindmesh_containers(id) ON DELETE CASCADE,

  -- Guardrails entity reference
  entity_type mindmesh_entity_type NOT NULL,
  entity_id uuid NOT NULL,

  -- Primary flag (exactly one primary per container if any)
  is_primary boolean NOT NULL DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),

  -- Unique constraint: one reference per entity per container
  CONSTRAINT unique_container_entity_reference UNIQUE (container_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_refs_container
  ON mindmesh_container_references(container_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_refs_entity
  ON mindmesh_container_references(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_refs_primary
  ON mindmesh_container_references(container_id, is_primary)
  WHERE is_primary = true;

COMMENT ON TABLE mindmesh_container_references IS
  'Explicit references from containers to Guardrails entities. Multiple references allowed, exactly one primary if any exist.';

-- ============================================================================
-- PORT (connection points on containers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_ports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES mindmesh_containers(id) ON DELETE CASCADE,

  -- Port type
  port_type mindmesh_port_type NOT NULL DEFAULT 'free',

  -- Optional label
  label text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_ports_container
  ON mindmesh_ports(container_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_ports_type
  ON mindmesh_ports(container_id, port_type);

COMMENT ON TABLE mindmesh_ports IS
  'Connection points on containers. Support free, input, and output types.';

-- ============================================================================
-- NODE (relationship-only, no meaning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES mindmesh_workspaces(id) ON DELETE CASCADE,

  -- Connection (two ports)
  source_port_id uuid NOT NULL REFERENCES mindmesh_ports(id) ON DELETE CASCADE,
  target_port_id uuid NOT NULL REFERENCES mindmesh_ports(id) ON DELETE CASCADE,

  -- Relationship semantics
  relationship_type mindmesh_relationship_type NOT NULL DEFAULT 'generic',
  relationship_direction mindmesh_relationship_direction NOT NULL DEFAULT 'forward',

  -- Auto-generated flag
  auto_generated boolean NOT NULL DEFAULT false,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),

  -- Constraint: source and target must be different
  CONSTRAINT node_different_ports CHECK (source_port_id != target_port_id)
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_nodes_workspace
  ON mindmesh_nodes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_nodes_source_port
  ON mindmesh_nodes(source_port_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_nodes_target_port
  ON mindmesh_nodes(target_port_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_nodes_auto_generated
  ON mindmesh_nodes(workspace_id, auto_generated)
  WHERE auto_generated = true;

COMMENT ON TABLE mindmesh_nodes IS
  'Nodes represent relationships between containers. Hold no meaning, only connections. Auto-delete if ports are deleted (CASCADE).';

COMMENT ON COLUMN mindmesh_nodes.auto_generated IS
  'Auto-generated nodes are created automatically by the system (e.g., from Guardrails hierarchy).';

-- ============================================================================
-- CONTAINER VISIBILITY (per-user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_container_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES mindmesh_containers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  visibility_state mindmesh_container_visibility_state NOT NULL DEFAULT 'visible',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One visibility setting per user per container
  CONSTRAINT unique_user_container_visibility UNIQUE (container_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_visibility_container
  ON mindmesh_container_visibility(container_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_visibility_user
  ON mindmesh_container_visibility(user_id);

COMMENT ON TABLE mindmesh_container_visibility IS
  'Per-user visibility settings for containers. Allows users to hide or collapse containers without affecting others.';

-- ============================================================================
-- CANVAS LOCK (workspace-level)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mindmesh_canvas_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES mindmesh_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lock expiry (for automatic unlock)
  expires_at timestamptz NOT NULL,

  created_at timestamptz DEFAULT now(),

  -- Only one lock per workspace
  CONSTRAINT unique_workspace_lock UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_mindmesh_locks_workspace
  ON mindmesh_canvas_locks(workspace_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_locks_user
  ON mindmesh_canvas_locks(user_id);

CREATE INDEX IF NOT EXISTS idx_mindmesh_locks_expiry
  ON mindmesh_canvas_locks(expires_at);

COMMENT ON TABLE mindmesh_canvas_locks IS
  'Workspace-level edit lock. One user at a time can hold the lock. Prevents concurrent editing conflicts.';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: updated_at for workspaces
CREATE OR REPLACE FUNCTION update_mindmesh_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mindmesh_workspaces_updated_at ON mindmesh_workspaces;
CREATE TRIGGER mindmesh_workspaces_updated_at
  BEFORE UPDATE ON mindmesh_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_mindmesh_workspace_updated_at();

-- Trigger: updated_at for containers
CREATE OR REPLACE FUNCTION update_mindmesh_container_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mindmesh_containers_updated_at ON mindmesh_containers;
CREATE TRIGGER mindmesh_containers_updated_at
  BEFORE UPDATE ON mindmesh_containers
  FOR EACH ROW
  EXECUTE FUNCTION update_mindmesh_container_updated_at();

-- Trigger: updated_at for visibility
CREATE OR REPLACE FUNCTION update_mindmesh_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mindmesh_visibility_updated_at ON mindmesh_container_visibility;
CREATE TRIGGER mindmesh_visibility_updated_at
  BEFORE UPDATE ON mindmesh_container_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_mindmesh_visibility_updated_at();

-- Trigger: ensure only one primary reference per container
CREATE OR REPLACE FUNCTION ensure_single_primary_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary THEN
    -- Unset other primaries for this container
    UPDATE mindmesh_container_references
    SET is_primary = false
    WHERE container_id = NEW.container_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_reference_trigger ON mindmesh_container_references;
CREATE TRIGGER ensure_single_primary_reference_trigger
  BEFORE INSERT OR UPDATE ON mindmesh_container_references
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_reference();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Workspaces: users can access workspaces for their projects
ALTER TABLE mindmesh_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces for their projects"
  ON mindmesh_workspaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = mindmesh_workspaces.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces for their projects"
  ON mindmesh_workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = mindmesh_workspaces.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspaces for their projects"
  ON mindmesh_workspaces
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = mindmesh_workspaces.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Containers: users can access containers in their workspaces
ALTER TABLE mindmesh_containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view containers in their workspaces"
  ON mindmesh_containers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_containers.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create containers in their workspaces"
  ON mindmesh_containers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_containers.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update containers in their workspaces"
  ON mindmesh_containers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_containers.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete containers in their workspaces"
  ON mindmesh_containers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_containers.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

-- Container References: inherit permissions from container
ALTER TABLE mindmesh_container_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view references for their containers"
  ON mindmesh_container_references
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_container_references.container_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create references for their containers"
  ON mindmesh_container_references
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_container_references.container_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update references for their containers"
  ON mindmesh_container_references
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_container_references.container_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete references for their containers"
  ON mindmesh_container_references
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_container_references.container_id
      AND mp.user_id = auth.uid()
    )
  );

-- Ports: inherit permissions from container
ALTER TABLE mindmesh_ports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ports for their containers"
  ON mindmesh_ports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_ports.container_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create ports for their containers"
  ON mindmesh_ports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_ports.container_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ports for their containers"
  ON mindmesh_ports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_ports.container_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ports for their containers"
  ON mindmesh_ports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_containers mc
      INNER JOIN mindmesh_workspaces mw ON mw.id = mc.workspace_id
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mc.id = mindmesh_ports.container_id
      AND mp.user_id = auth.uid()
    )
  );

-- Nodes: users can access nodes in their workspaces
ALTER TABLE mindmesh_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nodes in their workspaces"
  ON mindmesh_nodes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_nodes.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create nodes in their workspaces"
  ON mindmesh_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_nodes.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes in their workspaces"
  ON mindmesh_nodes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_nodes.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes in their workspaces"
  ON mindmesh_nodes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_nodes.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

-- Visibility: users can only manage their own visibility settings
ALTER TABLE mindmesh_container_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visibility settings"
  ON mindmesh_container_visibility
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own visibility settings"
  ON mindmesh_container_visibility
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own visibility settings"
  ON mindmesh_container_visibility
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own visibility settings"
  ON mindmesh_container_visibility
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Canvas Locks: users can view and create locks for their workspaces
ALTER TABLE mindmesh_canvas_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locks for their workspaces"
  ON mindmesh_canvas_locks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_canvas_locks.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create locks for their workspaces"
  ON mindmesh_canvas_locks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM mindmesh_workspaces mw
      INNER JOIN master_projects mp ON mp.id = mw.master_project_id
      WHERE mw.id = mindmesh_canvas_locks.workspace_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own locks"
  ON mindmesh_canvas_locks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
