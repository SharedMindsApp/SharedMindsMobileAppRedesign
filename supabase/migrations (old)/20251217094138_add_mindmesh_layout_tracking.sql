/*
  # Add Mind Mesh V2 Layout Tracking

  1. Schema Changes
    - Add `has_broken_default_layout` to `mindmesh_workspaces`
    - Add `is_auto_generated` to `mindmesh_nodes` (to track auto-generated composition nodes)
    - Add `last_layout_reset_at` to `mindmesh_workspaces` (to track when user explicitly reset)

  2. Purpose
    - Track when user has manually intervened in default layout
    - Once broken, auto-layout backs off permanently until explicit reset
    - Distinguish auto-generated nodes from user-created nodes

  3. Notes
    - Default value for `has_broken_default_layout` is `false`
    - Once set to `true`, default layout never auto-reapplies
    - Reset functions can flip back to `false` (user-invoked only)
*/

-- Add layout tracking to workspaces
ALTER TABLE mindmesh_workspaces
  ADD COLUMN IF NOT EXISTS has_broken_default_layout boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS last_layout_reset_at timestamptz;

COMMENT ON COLUMN mindmesh_workspaces.has_broken_default_layout IS 
  'True if user has manually modified layout. Once true, auto-layout backs off permanently until explicit reset.';

COMMENT ON COLUMN mindmesh_workspaces.last_layout_reset_at IS 
  'Timestamp of last explicit layout reset by user. Null if never reset.';

-- Add auto-generation tracking to nodes
ALTER TABLE mindmesh_nodes
  ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN mindmesh_nodes.is_auto_generated IS 
  'True if node was created by system to represent composition hierarchy. False if user-created.';

-- Index for querying auto-generated nodes
CREATE INDEX IF NOT EXISTS idx_mindmesh_nodes_auto_generated 
  ON mindmesh_nodes(workspace_id, is_auto_generated) 
  WHERE is_auto_generated = true;
