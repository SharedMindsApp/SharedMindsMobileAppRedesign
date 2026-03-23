/*
  # Fix User Active Projects RLS Policies
  
  Fixes RLS policies that were blocking INSERT/UPDATE operations.
  The issue was in the WITH CHECK clause - in subqueries, we need to reference
  the NEW row's column explicitly. Using a helper function with SECURITY INVOKER
  (runs as the current user, respects RLS) to check project access.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own active project" ON public.user_active_projects;
DROP POLICY IF EXISTS "Users can update their own active project" ON public.user_active_projects;

-- Drop function if it exists (for idempotency)
DROP FUNCTION IF EXISTS user_has_access_to_project(uuid, uuid);

-- Create a helper function to check project access
-- SECURITY INVOKER means it runs as the current user (respects RLS)
CREATE OR REPLACE FUNCTION user_has_access_to_project(p_user_id uuid, p_project_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user has access via project_users table
  -- Since this is SECURITY INVOKER, RLS on project_users will apply
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

-- Fixed INSERT policy - use the helper function
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

-- Fixed UPDATE policy
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

COMMENT ON FUNCTION user_has_access_to_project(uuid, uuid) IS 
  'Helper function to check if a user has access to a project via project_users table. Used in RLS policies. SECURITY INVOKER ensures it respects RLS.';
