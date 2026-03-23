/*
  # Add Composition Edge Type to Mind Mesh

  ## Summary
  Adds 'composition' edge type to mind_mesh_edge_type enum for representing
  parent → child roadmap item relationships in the Mind Mesh graph.

  ## Changes
  - Add 'composition' value to mind_mesh_edge_type enum

  ## Usage
  - composition edges: parent roadmap item → child roadmap item
  - Auto-generated from hierarchical roadmap items structure
  - Cannot be deleted, only hidden (like other auto-generated edges)
*/

-- Add 'composition' edge type to enum
DO $$ BEGIN
  ALTER TYPE mind_mesh_edge_type ADD VALUE IF NOT EXISTS 'composition';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- Add comment
COMMENT ON TYPE mind_mesh_edge_type IS 
  'Edge types in Mind Mesh graph: hierarchy (track→subtrack), reference (track↔item, item↔person), composition (parent item→child item), ideation/influence/derivation (manual), legacy types (dependency, supporting, offshoot)';
