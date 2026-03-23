/*
  # Create Collections System

  1. New Tables
    - `collections`
      - `id` (uuid, primary key) - Unique collection identifier
      - `space_id` (uuid, nullable) - Links to space (null for personal)
      - `space_type` (text) - 'personal' or 'shared'
      - `user_id` (uuid, foreign key) - Owner/creator of the collection
      - `parent_id` (uuid, nullable) - For nested collections
      - `name` (text) - Collection name
      - `description` (text, nullable) - Optional description
      - `color` (text) - Visual theme color
      - `icon` (text) - Lucide icon name
      - `display_order` (integer) - For manual ordering
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `collection_references`
      - `id` (uuid, primary key) - Unique reference identifier
      - `collection_id` (uuid, foreign key) - Links to collection
      - `entity_type` (text) - Type: 'link', 'file', 'table', 'note'
      - `entity_id` (uuid, nullable) - ID of referenced item (null for links)
      - `link_url` (text, nullable) - For external links
      - `link_title` (text, nullable) - Display title for links
      - `link_description` (text, nullable) - Optional link description
      - `display_order` (integer) - For manual ordering within collection
      - `added_by` (uuid, foreign key) - User who added the reference
      - `created_at` (timestamptz) - When reference was added

  2. Security
    - Enable RLS on both tables
    - Users can manage collections in spaces they have access to
    - References inherit collection permissions
    - Shared space collections visible to all members

  3. Indexes
    - Index on space_id and space_type for collections
    - Index on user_id for personal collections
    - Index on parent_id for nested collections
    - Index on collection_id for references
    - Index on entity_type and entity_id for lookups

  4. Notes
    - Collections are views, not containers
    - References point to existing items, never duplicate them
    - Same item can appear in multiple collections
    - Deleting a reference doesn't delete the original item
    - Nesting is visual hierarchy only
*/

-- Create entity_type enum
DO $$ BEGIN
  CREATE TYPE collection_entity_type AS ENUM ('link', 'file', 'table', 'note');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid,
  space_type text NOT NULL CHECK (space_type IN ('personal', 'shared')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT 'blue',
  icon text DEFAULT 'folder',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_space CHECK (
    (space_type = 'personal' AND space_id IS NULL) OR
    (space_type = 'shared' AND space_id IS NOT NULL)
  )
);

-- Create collection_references table
CREATE TABLE IF NOT EXISTS collection_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  entity_type collection_entity_type NOT NULL,
  entity_id uuid,
  link_url text,
  link_title text,
  link_description text,
  display_order integer DEFAULT 0,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_reference CHECK (
    (entity_type = 'link' AND link_url IS NOT NULL AND link_title IS NOT NULL) OR
    (entity_type IN ('file', 'table', 'note') AND entity_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_space ON collections(space_id, space_type);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_parent ON collections(parent_id);
CREATE INDEX IF NOT EXISTS idx_collections_display_order ON collections(display_order);

CREATE INDEX IF NOT EXISTS idx_collection_refs_collection ON collection_references(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_refs_entity ON collection_references(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_collection_refs_display_order ON collection_references(display_order);

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections

-- Personal collections: Users can view their own
CREATE POLICY "Users can view own personal collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    space_type = 'personal' AND user_id = auth.uid()
  );

-- Shared collections: Users can view if they're a member of the space
CREATE POLICY "Users can view shared space collections"
  ON collections FOR SELECT
  TO authenticated
  USING (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can create collections in their personal space
CREATE POLICY "Users can create personal collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    space_type = 'personal' AND user_id = auth.uid()
  );

-- Users can create collections in shared spaces they're members of
CREATE POLICY "Users can create shared space collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    space_type = 'shared' AND
    user_id = auth.uid() AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can update their own personal collections
CREATE POLICY "Users can update own personal collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (space_type = 'personal' AND user_id = auth.uid())
  WITH CHECK (space_type = 'personal' AND user_id = auth.uid());

-- Users can update shared space collections if they're members
CREATE POLICY "Users can update shared space collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own personal collections
CREATE POLICY "Users can delete own personal collections"
  ON collections FOR DELETE
  TO authenticated
  USING (space_type = 'personal' AND user_id = auth.uid());

-- Users can delete shared space collections if they're members
CREATE POLICY "Users can delete shared space collections"
  ON collections FOR DELETE
  TO authenticated
  USING (
    space_type = 'shared' AND
    space_id IN (
      SELECT space_id FROM space_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for collection_references

-- Users can view references in collections they can access
CREATE POLICY "Users can view references in accessible collections"
  ON collection_references FOR SELECT
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
    )
  );

-- Users can add references to collections they can access
CREATE POLICY "Users can add references to accessible collections"
  ON collection_references FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid() AND
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
    )
  );

-- Users can update references in collections they can access
CREATE POLICY "Users can update references in accessible collections"
  ON collection_references FOR UPDATE
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
    )
  );

-- Users can remove references from collections they can access
CREATE POLICY "Users can remove references from accessible collections"
  ON collection_references FOR DELETE
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE
        (space_type = 'personal' AND user_id = auth.uid()) OR
        (space_type = 'shared' AND space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        ))
    )
  );

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();
