/*
  # Create External Links Reference System

  ## Summary
  Creates a system for storing references to external URLs (articles, videos, resources)
  that can be organized in collections without duplicating content.

  ## New Tables
  1. `external_links` - Stores external URL references
    - Core URL metadata (url, title, description, domain)
    - Optional metadata (thumbnail, author, content_type)
    - Space association (space_id, space_type)
    - Audit fields (created_by_user_id, timestamps)

  2. `link_tags` - User-specific tags for external links
    - User-scoped tagging system
    - Similar to file_tags pattern

  3. `link_tag_assignments` - Many-to-many junction
    - Links external_links to link_tags

  4. `collection_external_links` - Many-to-many for collections
    - Links external_links to collections
    - Tracks who added the link and when

  ## Security
  - Full RLS on all tables
  - Space-based access control matching files system
  - Users can only manage links in spaces they have access to

  ## Key Principles
  - Links are references, not content
  - Collections provide context, not ownership
  - Links can appear in multiple collections
  - No auto-filing or auto-tagging
*/

-- Step 1: Create external_links table
CREATE TABLE IF NOT EXISTS external_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid,
  space_type text NOT NULL CHECK (space_type IN ('personal', 'shared')),
  
  -- Core link data
  url text NOT NULL,
  title text NOT NULL,
  description text,
  domain text NOT NULL,
  
  -- Optional metadata
  thumbnail_url text,
  author text,
  content_type text CHECK (content_type IN ('video', 'article', 'social', 'documentation', 'recipe', 'other')),
  
  -- Audit fields
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint: personal space links don't have space_id, shared space links do
  CONSTRAINT valid_space CHECK (
    (space_type = 'personal' AND space_id IS NULL) OR
    (space_type = 'shared' AND space_id IS NOT NULL)
  ),
  
  -- Prevent duplicate URLs in the same space
  UNIQUE NULLS NOT DISTINCT (space_id, url)
);

-- Step 2: Create link_tags table (user-specific tags for links)
CREATE TABLE IF NOT EXISTS link_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Step 3: Create link_tag_assignments junction table
CREATE TABLE IF NOT EXISTS link_tag_assignments (
  link_id uuid NOT NULL REFERENCES external_links(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES link_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (link_id, tag_id)
);

-- Step 4: Create collection_external_links junction table
CREATE TABLE IF NOT EXISTS collection_external_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  link_id uuid NOT NULL REFERENCES external_links(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  display_order integer DEFAULT 0,
  
  UNIQUE(collection_id, link_id)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_links_space ON external_links(space_id, space_type) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_links_user_id ON external_links(user_id);
CREATE INDEX IF NOT EXISTS idx_external_links_domain ON external_links(domain);
CREATE INDEX IF NOT EXISTS idx_external_links_created_at ON external_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_tags_user_id ON link_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_name ON link_tags(name);
CREATE INDEX IF NOT EXISTS idx_link_tag_assignments_link_id ON link_tag_assignments(link_id);
CREATE INDEX IF NOT EXISTS idx_link_tag_assignments_tag_id ON link_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_collection_external_links_collection ON collection_external_links(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_external_links_link ON collection_external_links(link_id);

-- Step 6: Enable RLS
ALTER TABLE external_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_external_links ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for external_links

-- Users can view their own personal links
CREATE POLICY "Users can view own personal links"
  ON external_links FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND space_type = 'personal'
  );

-- Users can view links in shared spaces they're members of
CREATE POLICY "Users can view shared space links"
  ON external_links FOR SELECT
  TO authenticated
  USING (
    space_type = 'shared' AND
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = external_links.space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

-- Users can create links in their personal space
CREATE POLICY "Users can create personal links"
  ON external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND space_type = 'personal'
  );

-- Users can create links in shared spaces they're members of
CREATE POLICY "Users can create shared space links"
  ON external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    space_type = 'shared' AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = external_links.space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

-- Users can update links they created
CREATE POLICY "Users can update own links"
  ON external_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete links they created
CREATE POLICY "Users can delete own links"
  ON external_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 8: RLS Policies for link_tags

-- Users can view their own tags
CREATE POLICY "Users can view own link tags"
  ON link_tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create tags
CREATE POLICY "Users can create link tags"
  ON link_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tags
CREATE POLICY "Users can update own link tags"
  ON link_tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tags
CREATE POLICY "Users can delete own link tags"
  ON link_tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 9: RLS Policies for link_tag_assignments

-- Users can view tag assignments for links they can see
CREATE POLICY "Users can view link tag assignments"
  ON link_tag_assignments FOR SELECT
  TO authenticated
  USING (
    link_id IN (SELECT id FROM external_links)
  );

-- Users can add tags to links they created
CREATE POLICY "Users can add tags to own links"
  ON link_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM external_links
      WHERE external_links.id = link_tag_assignments.link_id
      AND external_links.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM link_tags
      WHERE link_tags.id = link_tag_assignments.tag_id
      AND link_tags.user_id = auth.uid()
    )
  );

-- Users can remove tags from links they created
CREATE POLICY "Users can remove tags from own links"
  ON link_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM external_links
      WHERE external_links.id = link_tag_assignments.link_id
      AND external_links.user_id = auth.uid()
    )
  );

-- Step 10: RLS Policies for collection_external_links

-- Users can view collection-link associations for collections they can see
CREATE POLICY "Users can view collection external links"
  ON collection_external_links FOR SELECT
  TO authenticated
  USING (
    collection_id IN (SELECT id FROM collections)
  );

-- Users can add links to collections in their personal space
CREATE POLICY "Users can add links to personal collections"
  ON collection_external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections 
      WHERE space_type = 'personal'
      AND user_id = auth.uid()
    )
    AND added_by = auth.uid()
  );

-- Users can add links to shared space collections
CREATE POLICY "Users can add links to shared collections"
  ON collection_external_links FOR INSERT
  TO authenticated
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections 
      WHERE space_type = 'shared'
      AND space_id IN (
        SELECT space_id FROM space_members 
        WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND status = 'active'
      )
    )
    AND added_by = auth.uid()
  );

-- Users can remove links they added from collections
CREATE POLICY "Users can remove links from collections"
  ON collection_external_links FOR DELETE
  TO authenticated
  USING (
    added_by = auth.uid()
    OR collection_id IN (
      SELECT id FROM collections 
      WHERE space_type = 'personal'
      AND user_id = auth.uid()
    )
  );

-- Step 11: Update timestamp trigger
CREATE OR REPLACE FUNCTION update_external_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_external_links_updated_at
  BEFORE UPDATE ON external_links
  FOR EACH ROW
  EXECUTE FUNCTION update_external_links_updated_at();

-- Step 12: Comments for documentation
COMMENT ON TABLE external_links IS
  'Stores references to external URLs. Links are references, not content.';

COMMENT ON TABLE link_tags IS
  'User-specific tags for organizing external links.';

COMMENT ON TABLE link_tag_assignments IS
  'Many-to-many relationship between external links and tags.';

COMMENT ON TABLE collection_external_links IS
  'Many-to-many relationship between collections and external links. Collections provide context, not ownership.';

COMMENT ON COLUMN external_links.space_type IS
  'Type of space: personal (user-only) or shared (team space)';

COMMENT ON COLUMN external_links.url IS
  'The external URL being referenced.';

COMMENT ON COLUMN external_links.domain IS
  'Extracted domain name for grouping and display.';
