/*
  # Create User Active Projects Table
  
  Stores each user's currently active Guardrails project.
  This replaces localStorage-based storage with database persistence.
  
  Benefits:
  - Persists across devices/browsers
  - Single source of truth
  - Server-side validation of project access
  - Better for multi-device usage
  - Can add metadata (when selected, etc.)
*/

-- ============================================================================
-- user_active_projects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_active_projects (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_project_id uuid REFERENCES master_projects(id) ON DELETE SET NULL,
  
  -- Metadata
  selected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Note: Project access validation is handled in RLS policies and service layer
-- CHECK constraints cannot reference other tables efficiently with RLS

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_active_projects_user_id ON public.user_active_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_projects_project_id ON public.user_active_projects(active_project_id) WHERE active_project_id IS NOT NULL;

-- ============================================================================
-- Helper Function for RLS Policies
-- ============================================================================

-- Helper function to check project access (used in RLS policies)
CREATE OR REPLACE FUNCTION user_has_access_to_project(p_user_id uuid, p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user has access via project_users table
  -- SECURITY INVOKER means it runs as the current user (respects RLS)
  RETURN EXISTS (
    SELECT 1 
    FROM project_users pu
    WHERE pu.user_id = p_user_id
      AND pu.master_project_id = p_project_id
      AND pu.archived_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION user_has_access_to_project(uuid, uuid) TO authenticated;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.user_active_projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own active project" ON public.user_active_projects;
DROP POLICY IF EXISTS "Users can insert their own active project" ON public.user_active_projects;
DROP POLICY IF EXISTS "Users can update their own active project" ON public.user_active_projects;
DROP POLICY IF EXISTS "Users can delete their own active project" ON public.user_active_projects;

-- Users can view their own active project
CREATE POLICY "Users can view their own active project"
  ON public.user_active_projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own active project
CREATE POLICY "Users can insert their own active project"
  ON public.user_active_projects
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Can set active_project_id to NULL (clearing active project)
      active_project_id IS NULL OR
      -- OR must have access to the project (use helper function)
      user_has_access_to_project(auth.uid(), active_project_id) = true
    )
  );

-- Users can update their own active project
CREATE POLICY "Users can update their own active project"
  ON public.user_active_projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Can set active_project_id to NULL (clearing active project)
      active_project_id IS NULL OR
      -- OR must have access to the project (use helper function)
      user_has_access_to_project(auth.uid(), active_project_id) = true
    )
  );

-- Users can delete their own active project record (clears active project)
CREATE POLICY "Users can delete their own active project"
  ON public.user_active_projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Update Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_active_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS user_active_projects_updated_at ON public.user_active_projects;

CREATE TRIGGER user_active_projects_updated_at
  BEFORE UPDATE ON public.user_active_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_user_active_projects_updated_at();

-- ============================================================================
-- Helper Function: Get Active Project with Full Project Data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_active_project(p_user_id uuid)
RETURNS TABLE (
  active_project_id uuid,
  project_data jsonb
) AS $$
DECLARE
  v_active_project_id uuid;
  v_project_data jsonb;
BEGIN
  -- Get active project ID (if exists)
  SELECT uap.active_project_id INTO v_active_project_id
  FROM user_active_projects uap
  WHERE uap.user_id = p_user_id
  LIMIT 1;

  -- If active project exists and is valid, fetch full project data
  IF v_active_project_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', mp.id,
      'user_id', mp.user_id,
      'domain_id', mp.domain_id,
      'name', mp.name,
      'description', mp.description,
      'status', mp.status,
      'is_archived', mp.is_archived,
      'archived_at', mp.archived_at,
      'completed_at', mp.completed_at,
      'abandonment_reason', mp.abandonment_reason,
      'project_type_id', mp.project_type_id,
      'has_completed_wizard', COALESCE(mp.has_completed_wizard, false),
      'created_at', mp.created_at,
      'updated_at', mp.updated_at
    ) INTO v_project_data
    FROM master_projects mp
    WHERE mp.id = v_active_project_id
      AND mp.is_archived = false
    LIMIT 1;

    -- If project was archived/deleted, clear the active project reference
    IF v_project_data IS NULL THEN
      v_active_project_id := NULL;
    END IF;
  END IF;

  -- Always return exactly one row
  RETURN QUERY SELECT v_active_project_id, v_project_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_active_project(uuid) TO authenticated;

COMMENT ON TABLE public.user_active_projects IS 'Stores each user''s currently active Guardrails project. One row per user.';
COMMENT ON COLUMN public.user_active_projects.active_project_id IS 'UUID of the active project. NULL if no project is active.';
COMMENT ON COLUMN public.user_active_projects.selected_at IS 'When the user selected this project as active.';
COMMENT ON COLUMN public.user_active_projects.updated_at IS 'Last time the active project was updated.';
