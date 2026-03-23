/*
  # Add RLS Policies for Groups + Permissions + Distribution (Phase 2)
  
  This migration adds RLS policies for all Phase 1 tables using SECURITY DEFINER helper functions.
  
  Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
  
  Strategy: Option A - RLS Policies with SECURITY DEFINER Helper Functions
  
  1. Helper Functions Created
    - is_team_group_member() - Check if user can access team group
    - can_manage_team_groups() - Check if user can mutate team groups
    - is_project_owner_for_entity() - Check project ownership for entity
  
  2. Policies Created
    - team_groups: SELECT (active members), INSERT/UPDATE/DELETE (owners/admins)
    - team_group_members: SELECT (active members), INSERT/UPDATE/DELETE (owners/admins)
    - entity_permission_grants: SELECT (project members), INSERT/UPDATE/DELETE (project owners)
    - creator_rights_revocations: SELECT (project members), INSERT/DELETE (project owners)
    - task_projections: SELECT (target user), INSERT (with validation)
  
  3. Notes
    - All functions use SECURITY DEFINER to bypass RLS
    - All functions use SET search_path = public for security
    - Policies use these functions to avoid recursion
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Helper function to check if user is active team member (for group access)
CREATE OR REPLACE FUNCTION is_team_group_member(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION is_team_group_member IS 'Checks if user is an active member of a team (for group access)';

-- Helper function to check if user can manage team groups (owner/admin)
CREATE OR REPLACE FUNCTION can_manage_team_groups(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
END;
$$;

COMMENT ON FUNCTION can_manage_team_groups IS 'Checks if user can manage team groups (owner or admin)';

-- Helper function to check if user is project owner for an entity
CREATE OR REPLACE FUNCTION is_project_owner_for_entity(
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_project_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get profile_id from user_id
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get project_id based on entity_type
  IF p_entity_type = 'track' THEN
    SELECT master_project_id INTO v_project_id
    FROM guardrails_tracks
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'subtrack' THEN
    SELECT gt.master_project_id INTO v_project_id
    FROM guardrails_subtracks gs
    JOIN guardrails_tracks gt ON gt.id = gs.track_id
    WHERE gs.id = p_entity_id;
  ELSE
    RETURN false;
  END IF;
  
  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is project owner
  RETURN EXISTS (
    SELECT 1 FROM project_users
    WHERE user_id = v_profile_id
      AND master_project_id = v_project_id
      AND role = 'owner'
      AND archived_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION is_project_owner_for_entity IS 'Checks if user is project owner for a track or subtrack entity';

-- ============================================================================
-- RLS POLICIES: team_groups
-- ============================================================================

-- Active team members can view groups
CREATE POLICY "Team members can view groups"
  ON team_groups FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL AND
    is_team_group_member(team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Team owners/admins can create groups
CREATE POLICY "Team owners/admins can create groups"
  ON team_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    can_manage_team_groups(team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Team owners/admins can update groups
CREATE POLICY "Team owners/admins can update groups"
  ON team_groups FOR UPDATE
  TO authenticated
  USING (
    archived_at IS NULL AND
    can_manage_team_groups(team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    archived_at IS NULL AND
    can_manage_team_groups(team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Team owners/admins can delete groups (soft delete)
CREATE POLICY "Team owners/admins can delete groups"
  ON team_groups FOR DELETE
  TO authenticated
  USING (
    can_manage_team_groups(team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- ============================================================================
-- RLS POLICIES: team_group_members
-- ============================================================================

-- Active team members can view group members
CREATE POLICY "Team members can view group members"
  ON team_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_groups tg
      WHERE tg.id = team_group_members.group_id
        AND tg.archived_at IS NULL
        AND is_team_group_member(tg.team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
    )
  );

-- Team owners/admins can add members to groups
CREATE POLICY "Team owners/admins can add group members"
  ON team_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_groups tg
      WHERE tg.id = team_group_members.group_id
        AND tg.archived_at IS NULL
        AND can_manage_team_groups(tg.team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
    )
  );

-- Team owners/admins can remove members from groups
CREATE POLICY "Team owners/admins can remove group members"
  ON team_group_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_groups tg
      WHERE tg.id = team_group_members.group_id
        AND tg.archived_at IS NULL
        AND can_manage_team_groups(tg.team_id, (SELECT id FROM profiles WHERE user_id = auth.uid()))
    )
  );

-- ============================================================================
-- RLS POLICIES: entity_permission_grants
-- ============================================================================

-- Project members can view grants for entities they have access to
CREATE POLICY "Project members can view entity grants"
  ON entity_permission_grants FOR SELECT
  TO authenticated
  USING (
    revoked_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_users pu
      JOIN profiles p ON p.id = pu.user_id
      WHERE p.user_id = auth.uid()
        AND (
          (entity_type = 'track' AND EXISTS (
            SELECT 1 FROM guardrails_tracks gt
            WHERE gt.id = entity_permission_grants.entity_id
              AND gt.master_project_id = pu.master_project_id
          ))
          OR
          (entity_type = 'subtrack' AND EXISTS (
            SELECT 1 FROM guardrails_subtracks gs
            JOIN guardrails_tracks gt ON gt.id = gs.track_id
            WHERE gs.id = entity_permission_grants.entity_id
              AND gt.master_project_id = pu.master_project_id
          ))
        )
        AND pu.archived_at IS NULL
    )
  );

-- Project owners can create grants
CREATE POLICY "Project owners can create entity grants"
  ON entity_permission_grants FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_owner_for_entity(
      entity_type,
      entity_id,
      (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Project owners can revoke grants (soft delete)
CREATE POLICY "Project owners can revoke entity grants"
  ON entity_permission_grants FOR UPDATE
  TO authenticated
  USING (
    revoked_at IS NULL AND
    is_project_owner_for_entity(
      entity_type,
      entity_id,
      (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    is_project_owner_for_entity(
      entity_type,
      entity_id,
      (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- RLS POLICIES: creator_rights_revocations
-- ============================================================================

-- Project members can view revocations for entities they have access to
CREATE POLICY "Project members can view creator revocations"
  ON creator_rights_revocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      JOIN profiles p ON p.id = pu.user_id
      WHERE p.user_id = auth.uid()
        AND (
          (entity_type = 'track' AND EXISTS (
            SELECT 1 FROM guardrails_tracks gt
            WHERE gt.id = creator_rights_revocations.entity_id
              AND gt.master_project_id = pu.master_project_id
          ))
          OR
          (entity_type = 'subtrack' AND EXISTS (
            SELECT 1 FROM guardrails_subtracks gs
            JOIN guardrails_tracks gt ON gt.id = gs.track_id
            WHERE gs.id = creator_rights_revocations.entity_id
              AND gt.master_project_id = pu.master_project_id
          ))
        )
        AND pu.archived_at IS NULL
    )
  );

-- Project owners can create revocations
CREATE POLICY "Project owners can revoke creator rights"
  ON creator_rights_revocations FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_owner_for_entity(
      entity_type,
      entity_id,
      (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Project owners can delete revocations (restore creator rights)
CREATE POLICY "Project owners can restore creator rights"
  ON creator_rights_revocations FOR DELETE
  TO authenticated
  USING (
    is_project_owner_for_entity(
      entity_type,
      entity_id,
      (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- RLS POLICIES: task_projections
-- ============================================================================

-- Users can view their own task projections
CREATE POLICY "Users can view their task projections"
  ON task_projections FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
  );

-- Users can create task projections (validation happens in service layer)
CREATE POLICY "Users can create task projections"
  ON task_projections FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() OR target_user_id = auth.uid()
  );

-- Users can update their own task projections (accept/decline)
CREATE POLICY "Users can update their task projections"
  ON task_projections FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());
