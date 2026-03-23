/*
  # Add Port-Based Connections to Node Links

  ## Summary
  Adds source_port_id and target_port_id fields to guardrails_node_links table
  to enable precise port-to-port connections in the Mind Mesh canvas.

  ## Changes
  1. Add source_port_id field (optional, defaults to null for backward compatibility)
  2. Add target_port_id field (optional, defaults to null for backward compatibility)
  3. Add indexes for port lookups

  ## Behavior
  - Links can now specify exact ports for connections
  - Null port IDs fall back to center-to-center connections
  - Port IDs are stored as text to match port definition IDs ('input-top', 'output-bottom', etc.)
*/

-- Add port ID fields to guardrails_node_links
ALTER TABLE guardrails_node_links
ADD COLUMN IF NOT EXISTS source_port_id text,
ADD COLUMN IF NOT EXISTS target_port_id text;

-- Add indexes for port-based lookups
CREATE INDEX IF NOT EXISTS idx_guardrails_node_links_source_port
  ON guardrails_node_links(from_node_id, source_port_id)
  WHERE source_port_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guardrails_node_links_target_port
  ON guardrails_node_links(to_node_id, target_port_id)
  WHERE target_port_id IS NOT NULL;

COMMENT ON COLUMN guardrails_node_links.source_port_id IS
  'Port ID on source container (e.g., ''output-top'', ''output-bottom''). Null = center connection.';

COMMENT ON COLUMN guardrails_node_links.target_port_id IS
  'Port ID on target container (e.g., ''input-top'', ''input-bottom''). Null = center connection.';
