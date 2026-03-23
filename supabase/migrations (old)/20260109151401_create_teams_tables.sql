/*
  # Create Teams Tables
  
  1. New Tables
    - `teams` - Team entities (work teams, clubs, hobby groups)
    - `team_members` - Membership in teams with roles
  
  2. Indexes
    - team_members(team_id)
    - team_members(user_id)
  
  3. Security
    - Enable RLS on both tables
    - Minimal policies for now (read access for members)
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
-- Team owners and members can view their teams
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Users can create teams
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for team_members
-- Team members can view other members of their teams
CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Team owners/admins can add members, or users can add themselves when creating a team
CREATE POLICY "Team owners can add members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is adding themselves (team creator)
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    ))
    OR
    -- User is an existing owner/admin adding someone else
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Comments
COMMENT ON TABLE teams IS 'Teams represent work teams, clubs, hobby groups, etc. Distinct from households.';
COMMENT ON TABLE team_members IS 'Membership in teams with roles: owner, admin, member, viewer';
COMMENT ON COLUMN teams.is_archived IS 'Soft delete flag for teams';
