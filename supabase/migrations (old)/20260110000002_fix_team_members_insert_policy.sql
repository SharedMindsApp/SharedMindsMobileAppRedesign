/*
  # Fix Team Members INSERT Policy Infinite Recursion
  
  The INSERT policy for team_members was causing infinite recursion because
  it checked for existing owners in team_members, but when creating a new team,
  there are no team_members yet.
  
  Solution: Allow team creators to insert themselves as the first owner by
  checking the teams.created_by field.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team owners can invite members" ON team_members;

-- Create a new INSERT policy that handles both cases:
-- 1. Team creator adding themselves as first owner
-- 2. Existing owners adding new members
CREATE POLICY "Team owners can invite members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Case 1: Team creator adding themselves as first owner
    (
      user_id = get_current_profile_id()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = team_members.team_id
        AND teams.created_by = get_current_profile_id()
      )
    )
    OR
    -- Case 2: Existing owner adding someone else
    (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
        AND tm.user_id = get_current_profile_id()
        AND tm.role = 'owner'
        AND tm.status = 'active'
      )
      AND invited_by = get_current_profile_id()
    )
  );
