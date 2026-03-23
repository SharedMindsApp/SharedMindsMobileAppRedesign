/*
  # Unified Context Tagging System

  Creates a canonical tagging system that allows flexible, many-to-many relationships
  across Habits, Goals, Projects, Trips, and Calendar views without hard dependencies.

  Principles:
  - Tags are connections, not ownership
  - No circular hard dependencies
  - No data duplication
  - Tags are many-to-many
  - Tags are contextual, not hierarchical
  - Removing a tag NEVER deletes data
*/

-- ============================================================================
-- 1. Create Tags Table (Canonical Tag Definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (owner_id, name)
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_tags_owner ON tags (owner_id);

-- Comments
COMMENT ON TABLE tags IS 
  'Canonical tag definitions. Tags are owned by users and can be applied to any entity type.';
COMMENT ON COLUMN tags.owner_id IS 
  'User who owns this tag. Only the owner can modify it.';
COMMENT ON COLUMN tags.name IS 
  'Tag name (unique per owner).';
COMMENT ON COLUMN tags.color IS 
  'Optional color for UI display (hex code or Tailwind class).';
COMMENT ON COLUMN tags.icon IS 
  'Optional icon identifier (e.g., lucide-react icon name).';

-- ============================================================================
-- 2. Create Tag Links Table (Polymorphic Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('habit', 'goal', 'project', 'trip', 'activity', 'task', 'meeting')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (tag_id, entity_type, entity_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tag_links_entity ON tag_links (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_tag ON tag_links (tag_id);

-- Comments
COMMENT ON TABLE tag_links IS 
  'Polymorphic many-to-many links between tags and entities. No foreign keys to entity tables (intentional).';
COMMENT ON COLUMN tag_links.entity_type IS 
  'Type of entity being tagged: habit, goal, project, trip, activity, task, meeting.';
COMMENT ON COLUMN tag_links.entity_id IS 
  'ID of the entity (references different tables based on entity_type).';
COMMENT ON COLUMN tag_links.tag_id IS 
  'Tag being applied. Deleting a tag cascades to remove all links.';

-- ============================================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_links ENABLE ROW LEVEL SECURITY;

-- Tags: Users can view their own tags
DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Tags: Users can create their own tags
DROP POLICY IF EXISTS "Users can create their own tags" ON tags;
CREATE POLICY "Users can create their own tags" ON tags
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Tags: Users can update their own tags
DROP POLICY IF EXISTS "Users can update their own tags" ON tags;
CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Tags: Users can delete their own tags (cascades to tag_links)
DROP POLICY IF EXISTS "Users can delete their own tags" ON tags;
CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Tag Links: Users can view links for tags they own
DROP POLICY IF EXISTS "Users can view links for their own tags" ON tag_links;
CREATE POLICY "Users can view links for their own tags" ON tag_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = tag_links.tag_id
      AND tags.owner_id = auth.uid()
    )
  );

-- Tag Links: Users can create links for their own tags
DROP POLICY IF EXISTS "Users can create links for their own tags" ON tag_links;
CREATE POLICY "Users can create links for their own tags" ON tag_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = tag_links.tag_id
      AND tags.owner_id = auth.uid()
    )
  );

-- Tag Links: Users can delete links for their own tags
DROP POLICY IF EXISTS "Users can delete links for their own tags" ON tag_links;
CREATE POLICY "Users can delete links for their own tags" ON tag_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = tag_links.tag_id
      AND tags.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Helper Functions (Optional, for convenience)
-- ============================================================================

-- Function to get all tags for a user
CREATE OR REPLACE FUNCTION get_user_tags(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.color, t.icon, t.created_at
  FROM tags t
  WHERE t.owner_id = p_user_id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tags for an entity
CREATE OR REPLACE FUNCTION get_entity_tags(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.color, t.icon, t.created_at
  FROM tags t
  INNER JOIN tag_links tl ON t.id = tl.tag_id
  WHERE tl.entity_type = p_entity_type
    AND tl.entity_id = p_entity_id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get entities for a tag
CREATE OR REPLACE FUNCTION get_tagged_entities(
  p_tag_id UUID,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT tl.entity_type, tl.entity_id
  FROM tag_links tl
  WHERE tl.tag_id = p_tag_id
    AND (p_entity_type IS NULL OR tl.entity_type = p_entity_type)
  ORDER BY tl.entity_type, tl.entity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Comments on Functions
-- ============================================================================

COMMENT ON FUNCTION get_user_tags IS 
  'Returns all tags owned by a user.';
COMMENT ON FUNCTION get_entity_tags IS 
  'Returns all tags applied to a specific entity.';
COMMENT ON FUNCTION get_tagged_entities IS 
  'Returns all entities tagged with a specific tag, optionally filtered by entity_type.';






