-- Fix Workspace Units RLS Policies
-- Creates centralized page access functions and refactors policies

-- Step 1: Create centralized page access functions

CREATE OR REPLACE FUNCTION can_view_page(_page_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pages p
    JOIN space_members sm ON sm.space_id = p.space_id
    WHERE p.id = _page_id
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION can_edit_page(_page_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pages p
    JOIN space_members sm ON sm.space_id = p.space_id
    WHERE p.id = _page_id
      AND p.archived_at IS NULL
      AND sm.user_id = get_current_profile_id()
      AND sm.status = 'active'
  );
$$;

-- Step 2: Drop all existing policies

DROP POLICY IF EXISTS "Users can view workspace units in accessible pages" ON workspace_units;
DROP POLICY IF EXISTS "Users can create workspace units in editable pages" ON workspace_units;
DROP POLICY IF EXISTS "Users can update workspace units in editable pages" ON workspace_units;
DROP POLICY IF EXISTS "Users can delete workspace units in editable pages" ON workspace_units;
DROP POLICY IF EXISTS "Users can view workspace units" ON workspace_units;
DROP POLICY IF EXISTS "Users can create workspace units" ON workspace_units;
DROP POLICY IF EXISTS "Users can update workspace units" ON workspace_units;
DROP POLICY IF EXISTS "Users can soft-delete workspace units" ON workspace_units;

-- Step 3: Recreate all policies using centralized functions

CREATE POLICY "Users can view workspace units"
  ON workspace_units FOR SELECT
  USING (
    deleted_at IS NULL
    AND can_view_page(page_id)
  );

CREATE POLICY "Users can create workspace units"
  ON workspace_units FOR INSERT
  WITH CHECK (
    can_edit_page(page_id)
  );

CREATE POLICY "Users can update workspace units"
  ON workspace_units FOR UPDATE
  USING (
    can_edit_page(page_id)
  )
  WITH CHECK (
    can_edit_page(page_id)
  );

-- Step 4: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
