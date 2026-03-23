/**
 * Extend Activities for Household & Team Ownership
 * 
 * This migration extends the activities table to support ownership by:
 * - Users (existing, default)
 * - Households
 * - Teams (optionally scoped to team groups)
 * 
 * It also creates a tracker_participants table for opt-in participation.
 * 
 * Backward compatible: existing activities remain user-owned.
 * 
 * Note: Uses is_user_household_member() helper function which checks auth_user_id
 * in household_members table (not user_id which references profiles).
 */

-- ============================================================================
-- 1. Add Ownership Columns to Activities
-- ============================================================================

-- Add owner_type column (defaults to 'user' for backward compatibility)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'user' NOT NULL
CHECK (owner_type IN ('user', 'household', 'team'));

-- Add owner_id column (nullable, will be populated based on owner_type)
-- Note: For backward compatibility, existing owner_id column remains
-- We'll use a computed approach: if owner_type='user', use owner_id
-- If owner_type='household', use household_owner_id
-- If owner_type='team', use team_owner_id

-- Add household_owner_id (nullable, for household-owned activities)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS household_owner_id uuid REFERENCES households(id) ON DELETE CASCADE;

-- Add team_owner_id (nullable, for team-owned activities)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS team_owner_id uuid REFERENCES teams(id) ON DELETE CASCADE;

-- Add team_group_id (optional, for team group-scoped activities)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS team_group_id uuid REFERENCES team_groups(id) ON DELETE SET NULL;

-- Add index for household-owned activities
CREATE INDEX IF NOT EXISTS idx_activities_household_owner_id 
ON activities(household_owner_id) 
WHERE household_owner_id IS NOT NULL;

-- Add index for team-owned activities
CREATE INDEX IF NOT EXISTS idx_activities_team_owner_id 
ON activities(team_owner_id) 
WHERE team_owner_id IS NOT NULL;

-- Add index for owner_type lookups
CREATE INDEX IF NOT EXISTS idx_activities_owner_type 
ON activities(owner_type);

-- ============================================================================
-- 2. Create Tracker Participants Table (Opt-In Participation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tracker_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to activity (habit, task, goal)
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- User participating
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participation mode
  participation_mode text NOT NULL DEFAULT 'individual'
    CHECK (participation_mode IN ('individual', 'collective')),
  
  -- Visibility preferences
  visibility jsonb DEFAULT '{
    "show_daily_status": true,
    "show_streaks": false,
    "show_totals": true
  }'::jsonb,
  
  -- Timestamps
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint: one participation record per user per activity
  UNIQUE (activity_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tracker_participants_activity_id 
ON tracker_participants(activity_id);

CREATE INDEX IF NOT EXISTS idx_tracker_participants_user_id 
ON tracker_participants(user_id);

-- ============================================================================
-- 3. Add Constraints to Ensure Data Integrity
-- ============================================================================

-- Ensure owner_id is set when owner_type='user'
ALTER TABLE activities
ADD CONSTRAINT check_user_owner_id 
CHECK (
  (owner_type = 'user' AND owner_id IS NOT NULL) OR
  (owner_type != 'user')
);

-- Ensure household_owner_id is set when owner_type='household'
ALTER TABLE activities
ADD CONSTRAINT check_household_owner_id 
CHECK (
  (owner_type = 'household' AND household_owner_id IS NOT NULL) OR
  (owner_type != 'household')
);

-- Ensure team_owner_id is set when owner_type='team'
ALTER TABLE activities
ADD CONSTRAINT check_team_owner_id 
CHECK (
  (owner_type = 'team' AND team_owner_id IS NOT NULL) OR
  (owner_type != 'team')
);

-- Ensure only one owner type is set
ALTER TABLE activities
ADD CONSTRAINT check_single_owner_type 
CHECK (
  (owner_type = 'user' AND household_owner_id IS NULL AND team_owner_id IS NULL) OR
  (owner_type = 'household' AND owner_id IS NULL AND team_owner_id IS NULL) OR
  (owner_type = 'team' AND owner_id IS NULL AND household_owner_id IS NULL)
);

-- ============================================================================
-- 4. Enable RLS on Tracker Participants
-- ============================================================================

ALTER TABLE tracker_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of activities they participate in or own
CREATE POLICY "Users can view participants of their activities"
ON tracker_participants FOR SELECT
TO authenticated
USING (
  -- User is a participant
  user_id = auth.uid() OR
  -- User owns the activity (user-owned)
  EXISTS (
    SELECT 1 FROM activities
    WHERE activities.id = tracker_participants.activity_id
    AND activities.owner_type = 'user'
    AND activities.owner_id = auth.uid()
  ) OR
  -- User is a household member (household-owned)
  EXISTS (
    SELECT 1 FROM activities
    WHERE activities.id = tracker_participants.activity_id
    AND activities.owner_type = 'household'
    AND public.is_user_household_member(activities.household_owner_id)
  ) OR
  -- User is a team member (team-owned)
  EXISTS (
    SELECT 1 FROM activities
    JOIN team_members ON team_members.team_id = activities.team_owner_id
    WHERE activities.id = tracker_participants.activity_id
    AND activities.owner_type = 'team'
    AND team_members.user_id = auth.uid()
  )
);

-- Users can join activities they're eligible for
CREATE POLICY "Users can join eligible activities"
ON tracker_participants FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (
    -- User owns the activity
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = tracker_participants.activity_id
      AND activities.owner_type = 'user'
      AND activities.owner_id = auth.uid()
    ) OR
    -- User is a household member
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = tracker_participants.activity_id
      AND activities.owner_type = 'household'
      AND public.is_user_household_member(activities.household_owner_id)
    ) OR
    -- User is a team member
    EXISTS (
      SELECT 1 FROM activities
      JOIN team_members ON team_members.team_id = activities.team_owner_id
      WHERE activities.id = tracker_participants.activity_id
      AND activities.owner_type = 'team'
      AND team_members.user_id = auth.uid()
    )
  )
);

-- Users can update their own participation
CREATE POLICY "Users can update their own participation"
ON tracker_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can leave activities (delete their participation)
CREATE POLICY "Users can leave activities"
ON tracker_participants FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 5. Update RLS Policies for Activities (Extended)
-- ============================================================================

-- Drop existing policies (they'll be recreated with extended logic)
DROP POLICY IF EXISTS "Users can view their own activities" ON activities;
DROP POLICY IF EXISTS "Users can create their own activities" ON activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON activities;
DROP POLICY IF EXISTS "Users can archive their own activities" ON activities;

-- Users can view activities they own or participate in
CREATE POLICY "Users can view activities they own or participate in"
ON activities FOR SELECT
TO authenticated
USING (
  -- User owns the activity (user-owned)
  (owner_type = 'user' AND owner_id = auth.uid()) OR
  -- User is a household member (household-owned)
  (owner_type = 'household' AND public.is_user_household_member(activities.household_owner_id)) OR
  -- User is a team member (team-owned)
  (owner_type = 'team' AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = activities.team_owner_id
    AND team_members.user_id = auth.uid()
  )) OR
  -- User participates in the activity
  EXISTS (
    SELECT 1 FROM tracker_participants
    WHERE tracker_participants.activity_id = activities.id
    AND tracker_participants.user_id = auth.uid()
  )
);

-- Users can create activities they own
CREATE POLICY "Users can create activities they own"
ON activities FOR INSERT
TO authenticated
WITH CHECK (
  -- User-owned activity
  (owner_type = 'user' AND owner_id = auth.uid()) OR
  -- Household-owned: user must be household member
  (owner_type = 'household' AND public.is_user_household_member(activities.household_owner_id)) OR
  -- Team-owned: user must be team member
  (owner_type = 'team' AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = activities.team_owner_id
    AND team_members.user_id = auth.uid()
  ))
);

-- Users can update activities they own
CREATE POLICY "Users can update activities they own"
ON activities FOR UPDATE
TO authenticated
USING (
  -- User owns the activity (user-owned)
  (owner_type = 'user' AND owner_id = auth.uid()) OR
  -- Household-owned: user must be household admin/owner
  (owner_type = 'household' AND EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = activities.household_owner_id
    AND household_members.auth_user_id = auth.uid()
    AND household_members.status = 'active'
    AND household_members.role IN ('owner', 'admin')
  )) OR
  -- Team-owned: user must be team admin/owner
  (owner_type = 'team' AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = activities.team_owner_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  ))
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  (owner_type = 'user' AND owner_id = auth.uid()) OR
  (owner_type = 'household' AND EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = activities.household_owner_id
    AND household_members.auth_user_id = auth.uid()
    AND household_members.status = 'active'
    AND household_members.role IN ('owner', 'admin')
  )) OR
  (owner_type = 'team' AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = activities.team_owner_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  ))
);

-- Users can archive activities they own
CREATE POLICY "Users can archive activities they own"
ON activities FOR DELETE
TO authenticated
USING (
  -- User owns the activity (user-owned)
  (owner_type = 'user' AND owner_id = auth.uid()) OR
  -- Household-owned: user must be household admin/owner
  (owner_type = 'household' AND EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = activities.household_owner_id
    AND household_members.auth_user_id = auth.uid()
    AND household_members.status = 'active'
    AND household_members.role IN ('owner', 'admin')
  )) OR
  -- Team-owned: user must be team admin/owner
  (owner_type = 'team' AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = activities.team_owner_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  ))
);

-- ============================================================================
-- 6. Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN activities.owner_type IS 
  'Type of owner: user (personal), household (shared with household), or team (shared with team)';

COMMENT ON COLUMN activities.household_owner_id IS 
  'Household that owns this activity (set when owner_type = household)';

COMMENT ON COLUMN activities.team_owner_id IS 
  'Team that owns this activity (set when owner_type = team)';

COMMENT ON COLUMN activities.team_group_id IS 
  'Optional team group scope (only used when owner_type = team)';

COMMENT ON TABLE tracker_participants IS 
  'Opt-in participation in shared trackers. Users explicitly join or leave activities owned by households or teams.';

COMMENT ON COLUMN tracker_participants.participation_mode IS 
  'How participation is tracked: individual (each user tracks separately) or collective (shared completion)';

COMMENT ON COLUMN tracker_participants.visibility IS 
  'JSONB object with visibility preferences: show_daily_status, show_streaks, show_totals';
