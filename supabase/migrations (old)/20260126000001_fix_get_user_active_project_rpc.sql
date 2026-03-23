/*
  # Fix get_user_active_project RPC Function
  
  Fixes the RPC function to remove reference to non-existent column `wizard_completed`.
  Only `has_completed_wizard` exists in the master_projects table.
*/

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

COMMENT ON FUNCTION get_user_active_project(uuid) IS 'Returns the user''s active project with full project data. Removed non-existent wizard_completed column reference.';
