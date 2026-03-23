/*
  # Enhance Teams Permissions System
  
  1. Updates to teams table
    - Change created_by to reference profiles.id instead of auth.users.id
    - Replace is_archived with archived_at timestamp
    - Add updated_at trigger
  
  2. Updates to team_members table
    - Add status enum (pending, active, left)
    - Add invited_by field
    - Add updated_at field
    - Change user_id to reference profiles.id instead of auth.users.id
    - Add constraint: only one owner per team
  
  3. Enhanced RLS Policies
    - Teams: SELECT (active members), INSERT (authenticated), UPDATE (owner), DELETE (owner)
    - Team members: SELECT (active members), INSERT (owner invites), UPDATE (owner/admin/self), DELETE (owner/self)
  
  4. Permission Helper Function
    - has_team_permission(team_id, user_id, required_role)
    - Checks team_members with status = 'active'
    - Role hierarchy: owner > admin > member > viewer
*/

-- ============================================================================
-- STEP 1: Update teams table
-- ============================================================================

-- Drop existing policies that reference auth.uid() directly or created_by
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;

-- Add archived_at column (replace is_archived)
DO $$
BEGIN
  -- Add archived_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN archived_at timestamptz;
  END IF;
  
  -- Migrate is_archived to archived_at
  UPDATE teams SET archived_at = now() WHERE is_archived = true AND archived_at IS NULL;
  
  -- Drop is_archived column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE teams DROP COLUMN is_archived;
  END IF;
END $$;

-- Update created_by to reference profiles.id instead of auth.users.id
-- First, we need to create a helper function to get profile_id from user_id
DO $$
BEGIN
  -- Check if created_by exists and what it references
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'created_by'
  ) THEN
    -- Check if it already references profiles by checking constraint_column_usage
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'teams'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'profiles'
        AND EXISTS (
          SELECT 1 FROM information_schema.key_column_usage kcu
          WHERE kcu.constraint_name = tc.constraint_name
            AND kcu.table_name = 'teams'
            AND kcu.column_name = 'created_by'
        )
    ) THEN
      -- Create temporary column
      ALTER TABLE teams ADD COLUMN created_by_profile_id uuid;
      
      -- Migrate data: get profile_id from user_id
      UPDATE teams t
      SET created_by_profile_id = (
        SELECT p.id FROM profiles p
        WHERE p.user_id = t.created_by
        LIMIT 1
      )
      WHERE t.created_by IS NOT NULL;
      
      -- Drop old foreign key constraint if it exists
      ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_fkey;
      
      -- Drop old column and rename new one
      ALTER TABLE teams DROP COLUMN created_by;
      ALTER TABLE teams RENAME COLUMN created_by_profile_id TO created_by;
      ALTER TABLE teams ADD CONSTRAINT teams_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Update team_members table
-- ============================================================================

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE team_member_status AS ENUM ('pending', 'active', 'left');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Team members can view team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;

-- Add missing columns to team_members
DO $$
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE team_members ADD COLUMN status team_member_status DEFAULT 'active';
    -- Set all existing members to active
    UPDATE team_members SET status = 'active' WHERE status IS NULL;
    ALTER TABLE team_members ALTER COLUMN status SET NOT NULL;
  END IF;
  
  -- Add invited_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE team_members ADD COLUMN invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE team_members ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  -- Update role column to use enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' 
    AND column_name = 'role'
    AND data_type = 'text'
  ) THEN
    -- Create temporary column with enum type
    ALTER TABLE team_members ADD COLUMN role_enum team_member_role;
    UPDATE team_members SET role_enum = role::team_member_role WHERE role IN ('owner', 'admin', 'member', 'viewer');
    ALTER TABLE team_members DROP COLUMN role;
    ALTER TABLE team_members RENAME COLUMN role_enum TO role;
    ALTER TABLE team_members ALTER COLUMN role SET NOT NULL;
  END IF;
  
  -- Update user_id to reference profiles.id instead of auth.users.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'user_id'
  ) THEN
    -- Check if it already references profiles
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'team_members'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_name = 'profiles'
    ) THEN
      -- Create temporary column
      ALTER TABLE team_members ADD COLUMN user_profile_id uuid;
      
      -- Migrate data: get profile_id from user_id
      UPDATE team_members tm
      SET user_profile_id = (
        SELECT p.id FROM profiles p
        WHERE p.user_id = tm.user_id
        LIMIT 1
      )
      WHERE tm.user_id IS NOT NULL;
      
      -- Drop old column and rename new one
      ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
      ALTER TABLE team_members DROP COLUMN user_id;
      ALTER TABLE team_members RENAME COLUMN user_profile_id TO user_id;
      ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Rename joined_at to created_at if needed (for consistency with household_members)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'joined_at'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'team_members' AND column_name = 'created_at'
    )
  ) THEN
    ALTER TABLE team_members RENAME COLUMN joined_at TO created_at;
  END IF;
END $$;

-- Add constraint: only one owner per team
-- Use a unique partial index to enforce this
DO $$
BEGIN
  -- Drop existing constraint if it exists (from previous attempt)
  DROP INDEX IF EXISTS idx_team_members_one_owner_per_team;
  
  -- Create unique partial index: only one active owner per team
  CREATE UNIQUE INDEX idx_team_members_one_owner_per_team
    ON team_members (team_id)
    WHERE role = 'owner' AND status = 'active';
END $$;

-- ============================================================================
-- STEP 3: Helper function to get current user's profile_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT id INTO profile_id
  FROM profiles
  WHERE user_id = auth.uid();
  
  RETURN profile_id;
END;
$$;

-- ============================================================================
-- STEP 4: Enhanced RLS Policies for teams
-- ============================================================================

-- SELECT: Active members can view their teams
CREATE POLICY "Active team members can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = get_current_profile_id()
      AND team_members.status = 'active'
    )
  );

-- INSERT: Authenticated users can create teams
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (get_current_profile_id() = created_by);

-- UPDATE: Only owners can update teams
CREATE POLICY "Team owners can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = get_current_profile_id()
      AND team_members.role = 'owner'
      AND team_members.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = get_current_profile_id()
      AND team_members.role = 'owner'
      AND team_members.status = 'active'
    )
  );

-- DELETE: Only owners can delete teams
CREATE POLICY "Team owners can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = get_current_profile_id()
      AND team_members.role = 'owner'
      AND team_members.status = 'active'
    )
  );

-- ============================================================================
-- STEP 5: Enhanced RLS Policies for team_members
-- ============================================================================

-- SELECT: Active members can view other members of their team
CREATE POLICY "Active members can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = get_current_profile_id()
      AND tm.status = 'active'
    )
  );

-- INSERT: Owners can invite anyone
CREATE POLICY "Team owners can invite members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = get_current_profile_id()
      AND tm.role = 'owner'
      AND tm.status = 'active'
    )
    AND invited_by = get_current_profile_id()
  );

-- UPDATE: Owner can change any role/status, Admin can update status (but not role), Users can update their own status
-- Note: We use a trigger to enforce role changes, as WITH CHECK cannot reference OLD
CREATE POLICY "Team members can update memberships"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    -- Owner can update anyone
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = get_current_profile_id()
      AND tm.role = 'owner'
      AND tm.status = 'active'
    )
    OR
    -- Admin can update status (but not role) of others
    (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
        AND tm.user_id = get_current_profile_id()
        AND tm.role = 'admin'
        AND tm.status = 'active'
      )
      AND team_members.user_id != get_current_profile_id()
    )
    OR
    -- Users can update their own status (accept invite / leave)
    team_members.user_id = get_current_profile_id()
  )
  WITH CHECK (
    -- Owner can update anyone
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = get_current_profile_id()
      AND tm.role = 'owner'
      AND tm.status = 'active'
    )
    OR
    -- Admin can update status (but not role) of others
    -- Role changes are prevented by trigger
    (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
        AND tm.user_id = get_current_profile_id()
        AND tm.role = 'admin'
        AND tm.status = 'active'
      )
      AND team_members.user_id != get_current_profile_id()
    )
    OR
    -- Users can update their own status (role changes prevented by trigger)
    team_members.user_id = get_current_profile_id()
  );

-- DELETE: Owner can remove anyone, Users can remove themselves
CREATE POLICY "Team members can delete memberships"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    -- Owner can remove anyone
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = get_current_profile_id()
      AND tm.role = 'owner'
      AND tm.status = 'active'
    )
    OR
    -- Users can remove themselves
    team_members.user_id = get_current_profile_id()
  );

-- ============================================================================
-- STEP 6: Permission Helper Function
-- ============================================================================

CREATE OR REPLACE FUNCTION has_team_permission(
  p_team_id uuid,
  p_user_id uuid,
  p_required_role team_member_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_member_role team_member_role;
  v_member_status team_member_status;
BEGIN
  -- Get member's role and status
  SELECT role, status INTO v_member_role, v_member_status
  FROM team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND status = 'active';
  
  -- If not an active member, no permission
  IF v_member_role IS NULL OR v_member_status != 'active' THEN
    RETURN false;
  END IF;
  
  -- Check role hierarchy: owner > admin > member > viewer
  CASE p_required_role
    WHEN 'owner' THEN
      RETURN v_member_role = 'owner';
    WHEN 'admin' THEN
      RETURN v_member_role IN ('owner', 'admin');
    WHEN 'member' THEN
      RETURN v_member_role IN ('owner', 'admin', 'member');
    WHEN 'viewer' THEN
      RETURN v_member_role IN ('owner', 'admin', 'member', 'viewer');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- ============================================================================
-- STEP 7: Updated_at triggers
-- ============================================================================

-- Trigger for teams.updated_at
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_updated_at_trigger ON teams;
CREATE TRIGGER teams_updated_at_trigger
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Trigger for team_members.updated_at
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_members_updated_at_trigger ON team_members;
CREATE TRIGGER team_members_updated_at_trigger
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

-- Trigger to prevent non-owners from changing roles
CREATE OR REPLACE FUNCTION prevent_unauthorized_role_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_current_user_role team_member_role;
BEGIN
  -- If role hasn't changed, allow
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;
  
  -- Get current user's role in this team
  SELECT role INTO v_current_user_role
  FROM team_members
  WHERE team_id = NEW.team_id
    AND user_id = get_current_profile_id()
    AND status = 'active';
  
  -- Only owners can change roles
  IF v_current_user_role != 'owner' THEN
    RAISE EXCEPTION 'Only team owners can change member roles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_changes_trigger ON team_members;
CREATE TRIGGER prevent_role_changes_trigger
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_role_changes();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE teams IS 'Teams represent work teams, clubs, hobby groups, etc. Distinct from households.';
COMMENT ON TABLE team_members IS 'Membership in teams with roles (owner, admin, member, viewer) and status (pending, active, left)';
COMMENT ON COLUMN teams.archived_at IS 'Soft delete timestamp for teams';
COMMENT ON COLUMN team_members.status IS 'Member status: pending (invited), active (member), left (left team)';
COMMENT ON COLUMN team_members.role IS 'Member role: owner (full control), admin (manage content), member (create/edit own), viewer (read-only)';
COMMENT ON FUNCTION has_team_permission IS 'Checks if a user has the required role (or higher) in a team. Role hierarchy: owner > admin > member > viewer';
