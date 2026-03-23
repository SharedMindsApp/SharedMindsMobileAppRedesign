/*
  # Add Offshoot Support Across All Guardrails Modules

  1. Modifications
    - Add `is_offshoot` boolean to roadmap_items
    - Add `offshoot_color` to roadmap_items for visual distinction
    - Ensure side_ideas table has offshoot support
    - Add indexes for offshoot queries

  2. Purpose
    - Unified offshoot tracking across Roadmap, TaskFlow, and Mind Mesh
    - Visual distinction with coral orange (#FF7F50) color
    - Enable cross-module synchronization

  3. Performance
    - Index on is_offshoot for fast filtering
*/

-- Add offshoot support to roadmap_items
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS is_offshoot boolean DEFAULT false;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS offshoot_color text DEFAULT '#FF7F50';

-- Update existing guardrails_nodes to have proper color default for offshoots
ALTER TABLE guardrails_nodes ALTER COLUMN color SET DEFAULT '#ffffff';

-- Add indexes for offshoot queries
CREATE INDEX IF NOT EXISTS idx_roadmap_items_offshoot ON roadmap_items(section_id, is_offshoot) WHERE is_offshoot = true;
CREATE INDEX IF NOT EXISTS idx_nodes_offshoot_enhanced ON guardrails_nodes(master_project_id, is_offshoot, created_at) WHERE is_offshoot = true;
CREATE INDEX IF NOT EXISTS idx_side_ideas_project ON side_ideas(master_project_id, created_at);

-- Create a function to auto-set offshoot color when marking as offshoot
CREATE OR REPLACE FUNCTION set_offshoot_color()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_offshoot = true AND (NEW.color IS NULL OR NEW.color = '#ffffff') THEN
    NEW.color := '#FF7F50';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for guardrails_nodes
DROP TRIGGER IF EXISTS trigger_set_node_offshoot_color ON guardrails_nodes;
CREATE TRIGGER trigger_set_node_offshoot_color
  BEFORE INSERT OR UPDATE ON guardrails_nodes
  FOR EACH ROW
  WHEN (NEW.is_offshoot = true)
  EXECUTE FUNCTION set_offshoot_color();

-- Add trigger for roadmap_items
DROP TRIGGER IF EXISTS trigger_set_roadmap_offshoot_color ON roadmap_items;
CREATE TRIGGER trigger_set_roadmap_offshoot_color
  BEFORE INSERT OR UPDATE ON roadmap_items
  FOR EACH ROW
  WHEN (NEW.is_offshoot = true)
  EXECUTE FUNCTION set_offshoot_color();

-- Create a view for unified offshoot tracking across all modules
CREATE OR REPLACE VIEW guardrails_offshoots_unified AS
SELECT 
  n.id,
  n.master_project_id,
  'node' as source_type,
  n.title,
  n.content as description,
  n.color,
  n.track_id,
  n.subtrack_id,
  n.created_at,
  n.updated_at
FROM guardrails_nodes n
WHERE n.is_offshoot = true

UNION ALL

SELECT 
  ri.id,
  rs.master_project_id,
  'roadmap_item' as source_type,
  ri.title,
  ri.description,
  ri.color,
  ri.track_id,
  ri.subtrack_id,
  ri.created_at,
  ri.created_at as updated_at
FROM roadmap_items ri
JOIN roadmap_sections rs ON ri.section_id = rs.id
WHERE ri.is_offshoot = true

UNION ALL

SELECT 
  si.id,
  si.master_project_id,
  'side_idea' as source_type,
  si.title,
  si.description,
  NULL as color,
  si.track_id,
  si.subtrack_id,
  si.created_at,
  si.created_at as updated_at
FROM side_ideas si
WHERE si.is_promoted = false;
