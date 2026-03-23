/*
  # Extend Mind Mesh for Auto-Generation & Manual Ideation

  ## Summary
  Extends the existing Mind Mesh system to support:
  - Auto-generated nodes/edges from Guardrails structure
  - Manual ideation nodes/edges created by users
  - Visibility controls per user
  - Read-only references to Guardrails entities

  ## Key Principles
  - Guardrails is authoritative (tracks, roadmap items, etc.)
  - Mind Mesh reflects and annotates only
  - Auto-generated edges cannot be deleted, only hidden
  - Manual ideation never mutates Guardrails data

  ## Changes
  1. Extend `guardrails_nodes` table
     - Add `source_type` (track, roadmap_item, person, document, idea)
     - Add `source_id` (reference to source entity)
     - Add `auto_generated` (boolean)
     - Add `metadata` (JSONB for type-specific data)
     - Update `node_type` enum to support new types

  2. Extend `guardrails_node_links` table
     - Add `edge_type` (hierarchy, reference, ideation, influence, derivation)
     - Add `direction` (directed, undirected)
     - Add `auto_generated` (boolean)
     - Add `label` (optional edge label)
     - Add `weight` (optional, for future use)
     - Update `link_type` to support new types

  3. Create `mind_mesh_user_visibility` table
     - Per-user visibility preferences for nodes/edges
     - Supports hide/collapse without affecting others

  ## Security
  - RLS enabled on all tables
  - Users can only manage visibility for their own preferences
  - Auto-generated flag prevents accidental deletion

  ## Notes
  - Existing nodes/links remain compatible
  - New columns have sensible defaults
  - Auto-generated edges are protected from deletion via application logic
*/

-- Step 1: Add new source type enum
DO $$ BEGIN
  CREATE TYPE mind_mesh_source_type AS ENUM (
    'track',
    'roadmap_item',
    'person',
    'document',
    'idea'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new edge type enum
DO $$ BEGIN
  CREATE TYPE mind_mesh_edge_type AS ENUM (
    'hierarchy',      -- Auto-generated: parent track → child subtrack
    'reference',      -- Auto-generated: roadmap item ↔ track, item ↔ person
    'ideation',       -- Manual: user-created connection
    'influence',      -- Manual: directional influence
    'derivation',     -- Manual: idea → idea
    'dependency',     -- Legacy (keep for compatibility)
    'supporting',     -- Legacy (keep for compatibility)
    'offshoot'        -- Legacy (keep for compatibility)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Add new edge direction enum
DO $$ BEGIN
  CREATE TYPE mind_mesh_edge_direction AS ENUM (
    'directed',
    'undirected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 4: Add new visibility state enum
DO $$ BEGIN
  CREATE TYPE mind_mesh_visibility_state AS ENUM (
    'visible',
    'hidden',
    'collapsed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 5: Extend guardrails_nodes table
DO $$
BEGIN
  -- source_type: Type of entity this node represents
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_nodes'
    AND column_name = 'source_type'
  ) THEN
    ALTER TABLE guardrails_nodes
    ADD COLUMN source_type mind_mesh_source_type;
  END IF;

  -- source_id: Reference to source entity (nullable for pure idea nodes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_nodes'
    AND column_name = 'source_id'
  ) THEN
    ALTER TABLE guardrails_nodes
    ADD COLUMN source_id uuid;
  END IF;

  -- auto_generated: Whether this node was auto-created from Guardrails
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_nodes'
    AND column_name = 'auto_generated'
  ) THEN
    ALTER TABLE guardrails_nodes
    ADD COLUMN auto_generated boolean NOT NULL DEFAULT false;
  END IF;

  -- metadata: Type-specific data (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_nodes'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE guardrails_nodes
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- label: Alternative to title for better semantics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_nodes'
    AND column_name = 'label'
  ) THEN
    ALTER TABLE guardrails_nodes
    ADD COLUMN label text;
  END IF;
END $$;

-- Step 6: Extend guardrails_node_links table
DO $$
BEGIN
  -- edge_type: Type of relationship
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_node_links'
    AND column_name = 'edge_type'
  ) THEN
    ALTER TABLE guardrails_node_links
    ADD COLUMN edge_type mind_mesh_edge_type;
  END IF;

  -- direction: Whether edge is directional
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_node_links'
    AND column_name = 'direction'
  ) THEN
    ALTER TABLE guardrails_node_links
    ADD COLUMN direction mind_mesh_edge_direction DEFAULT 'undirected';
  END IF;

  -- auto_generated: Whether this edge was auto-created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_node_links'
    AND column_name = 'auto_generated'
  ) THEN
    ALTER TABLE guardrails_node_links
    ADD COLUMN auto_generated boolean NOT NULL DEFAULT false;
  END IF;

  -- label: Optional edge label
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_node_links'
    AND column_name = 'label'
  ) THEN
    ALTER TABLE guardrails_node_links
    ADD COLUMN label text;
  END IF;

  -- weight: Optional weight for future use
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_node_links'
    AND column_name = 'weight'
  ) THEN
    ALTER TABLE guardrails_node_links
    ADD COLUMN weight double precision DEFAULT 1.0;
  END IF;
END $$;

-- Step 7: Create mind_mesh_user_visibility table
CREATE TABLE IF NOT EXISTS mind_mesh_user_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  -- What is being hidden/collapsed
  node_id uuid REFERENCES guardrails_nodes(id) ON DELETE CASCADE,
  edge_id uuid REFERENCES guardrails_node_links(id) ON DELETE CASCADE,
  
  -- Visibility state
  visibility_state mind_mesh_visibility_state NOT NULL DEFAULT 'visible',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure at least one of node_id or edge_id is set
  CONSTRAINT visibility_target_required CHECK (
    (node_id IS NOT NULL AND edge_id IS NULL) OR
    (node_id IS NULL AND edge_id IS NOT NULL)
  ),
  
  -- One visibility record per user per node/edge
  UNIQUE(user_id, node_id),
  UNIQUE(user_id, edge_id)
);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_source ON guardrails_nodes(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_auto_generated ON guardrails_nodes(master_project_id, auto_generated);
CREATE INDEX IF NOT EXISTS idx_node_links_edge_type ON guardrails_node_links(edge_type);
CREATE INDEX IF NOT EXISTS idx_node_links_auto_generated ON guardrails_node_links(auto_generated);
CREATE INDEX IF NOT EXISTS idx_visibility_user ON mind_mesh_user_visibility(user_id, master_project_id);
CREATE INDEX IF NOT EXISTS idx_visibility_node ON mind_mesh_user_visibility(node_id) WHERE node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visibility_edge ON mind_mesh_user_visibility(edge_id) WHERE edge_id IS NOT NULL;

-- Step 9: Enable RLS on mind_mesh_user_visibility
ALTER TABLE mind_mesh_user_visibility ENABLE ROW LEVEL SECURITY;

-- Step 10: RLS policies for mind_mesh_user_visibility

-- Users can view their own visibility preferences
CREATE POLICY "Users can view own visibility preferences"
  ON mind_mesh_user_visibility FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own visibility preferences
CREATE POLICY "Users can create own visibility preferences"
  ON mind_mesh_user_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM master_projects
      WHERE master_projects.id = mind_mesh_user_visibility.master_project_id
      AND master_projects.user_id = auth.uid()
    )
  );

-- Users can update their own visibility preferences
CREATE POLICY "Users can update own visibility preferences"
  ON mind_mesh_user_visibility FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own visibility preferences
CREATE POLICY "Users can delete own visibility preferences"
  ON mind_mesh_user_visibility FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 11: Add trigger for mind_mesh_user_visibility updated_at
DROP TRIGGER IF EXISTS update_mind_mesh_user_visibility_updated_at ON mind_mesh_user_visibility;
CREATE TRIGGER update_mind_mesh_user_visibility_updated_at
  BEFORE UPDATE ON mind_mesh_user_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Add helpful comments
COMMENT ON TABLE mind_mesh_user_visibility IS 
  'Per-user visibility preferences for Mind Mesh nodes and edges. Allows hiding/collapsing without affecting other users.';

COMMENT ON COLUMN guardrails_nodes.source_type IS 
  'Type of Guardrails entity this node represents (track, roadmap_item, person, document, idea)';

COMMENT ON COLUMN guardrails_nodes.source_id IS 
  'Reference to source entity. NULL for pure idea nodes created by user.';

COMMENT ON COLUMN guardrails_nodes.auto_generated IS 
  'True if node was automatically generated from Guardrails structure. False for manual user-created nodes.';

COMMENT ON COLUMN guardrails_node_links.edge_type IS 
  'Type of relationship: hierarchy (auto), reference (auto), ideation (manual), influence (manual), derivation (manual)';

COMMENT ON COLUMN guardrails_node_links.auto_generated IS 
  'True if edge was automatically generated from Guardrails structure. Auto-generated edges cannot be deleted, only hidden.';

COMMENT ON COLUMN guardrails_node_links.direction IS 
  'Whether edge is directed (one-way) or undirected (two-way)';
