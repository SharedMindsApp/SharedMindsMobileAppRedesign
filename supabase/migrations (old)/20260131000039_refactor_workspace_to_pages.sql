/*
  # Refactor Workspace to Page-Centric Model
  
  This migration refactors the Workspace system to use a page-centric hierarchical model,
  similar to Notion, where Pages are the root navigational and structural unit.
  
  Changes:
  1. Create pages table for hierarchical page structure
  2. Update workspace_units to reference page_id instead of workspace_id
  3. Migrate existing workspaces to pages
  4. Update RLS policies
  5. Keep workspaces table for backward compatibility (can be removed later)
  
  Architecture:
  Space
  └── Pages (tree structure)
      └── Page
          ├── Workspace content units
          └── Child Pages (recursive)
*/

-- Step 1: Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Page',
  order_index numeric NOT NULL DEFAULT 0, -- Fractional indexing for efficient reordering
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Step 2: Add page_id column to workspace_units (nullable initially for migration)
ALTER TABLE workspace_units 
ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES pages(id) ON DELETE CASCADE;

-- Step 3: Create index for page_id
CREATE INDEX IF NOT EXISTS idx_workspace_units_page_id ON workspace_units(page_id) WHERE deleted_at IS NULL;

-- Step 4: Create index for parent_page_id
CREATE INDEX IF NOT EXISTS idx_pages_parent_page_id ON pages(parent_page_id) WHERE archived_at IS NULL;

-- Step 5: Create index for space_id in pages
CREATE INDEX IF NOT EXISTS idx_pages_space_id ON pages(space_id) WHERE archived_at IS NULL;

-- Step 6: Migrate existing workspaces to pages
-- Create a page for each existing workspace
INSERT INTO pages (id, space_id, title, order_index, created_by, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  w.space_id,
  COALESCE(w.title, 'Workspace') as title,
  ROW_NUMBER() OVER (PARTITION BY w.space_id ORDER BY w.created_at)::numeric as order_index,
  w.created_by,
  w.created_at,
  w.updated_at
FROM workspaces w
WHERE w.archived_at IS NULL
ON CONFLICT DO NOTHING;

-- Step 7: Update workspace_units to reference pages
-- Link workspace_units to the newly created pages
UPDATE workspace_units wu
SET page_id = p.id
FROM workspaces w
JOIN pages p ON p.space_id = w.space_id 
  AND p.title = COALESCE(w.title, 'Workspace')
  AND p.created_by = w.created_by
WHERE wu.workspace_id = w.id
  AND wu.deleted_at IS NULL
  AND w.archived_at IS NULL;

-- Step 8: Make page_id NOT NULL after migration
-- First, handle any orphaned units (shouldn't happen, but defensive)
UPDATE workspace_units
SET deleted_at = now()
WHERE page_id IS NULL AND deleted_at IS NULL;

-- Now make it NOT NULL
ALTER TABLE workspace_units
ALTER COLUMN page_id SET NOT NULL;

-- Step 9: Add updated_at trigger for pages
CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_pages_updated_at();

-- Step 10: RLS Policies for pages

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view pages in spaces they have access to
CREATE POLICY "Users can view pages in accessible spaces"
  ON pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = pages.space_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Policy: Users can create pages in spaces they can edit
CREATE POLICY "Users can create pages in editable spaces"
  ON pages FOR INSERT
  WITH CHECK (
    created_by = get_current_profile_id()
    AND EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = pages.space_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Policy: Users can update pages in spaces they can edit
CREATE POLICY "Users can update pages in editable spaces"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = pages.space_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Policy: Users can archive pages in spaces they can edit
CREATE POLICY "Users can archive pages in editable spaces"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = pages.space_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Step 11: Update workspace_units RLS to check page access
-- Drop existing workspace_units policies
DROP POLICY IF EXISTS "Users can view workspace units in accessible workspaces" ON workspace_units;
DROP POLICY IF EXISTS "Users can create workspace units in editable workspaces" ON workspace_units;
DROP POLICY IF EXISTS "Users can update workspace units in editable workspaces" ON workspace_units;
DROP POLICY IF EXISTS "Users can delete workspace units in editable workspaces" ON workspace_units;

-- New policy: Users can view workspace units in accessible pages
CREATE POLICY "Users can view workspace units in accessible pages"
  ON workspace_units FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM pages p
      JOIN space_members sm ON sm.space_id = p.space_id
      WHERE p.id = workspace_units.page_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- New policy: Users can create workspace units in editable pages
CREATE POLICY "Users can create workspace units in editable pages"
  ON workspace_units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      JOIN space_members sm ON sm.space_id = p.space_id
      WHERE p.id = workspace_units.page_id
      AND p.archived_at IS NULL
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- New policy: Users can update workspace units in editable pages
CREATE POLICY "Users can update workspace units in editable pages"
  ON workspace_units FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM pages p
      JOIN space_members sm ON sm.space_id = p.space_id
      WHERE p.id = workspace_units.page_id
      AND p.archived_at IS NULL
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      JOIN space_members sm ON sm.space_id = p.space_id
      WHERE p.id = workspace_units.page_id
      AND p.archived_at IS NULL
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- New policy: Users can delete workspace units in editable pages
CREATE POLICY "Users can delete workspace units in editable pages"
  ON workspace_units FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM pages p
      JOIN space_members sm ON sm.space_id = p.space_id
      WHERE p.id = workspace_units.page_id
      AND p.archived_at IS NULL
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      JOIN space_members sm ON sm.space_id = p.space_id
      WHERE p.id = workspace_units.page_id
      AND p.archived_at IS NULL
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
    )
  );

-- Step 12: Add comments
COMMENT ON TABLE pages IS 'Hierarchical pages within spaces. Pages contain workspace content units and can have child pages.';
COMMENT ON COLUMN pages.parent_page_id IS 'Parent page ID for hierarchical structure. NULL for top-level pages.';
COMMENT ON COLUMN pages.order_index IS 'Fractional index for efficient reordering within parent.';
COMMENT ON COLUMN workspace_units.page_id IS 'Page that contains this workspace unit. Replaces workspace_id.';

-- Step 13: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
