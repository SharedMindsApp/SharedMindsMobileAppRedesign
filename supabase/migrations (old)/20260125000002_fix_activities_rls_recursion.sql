/**
 * Fix Infinite Recursion in Activities RLS Policies
 * 
 * The previous migration created a circular dependency:
 * - activities SELECT policy checks tracker_participants
 * - tracker_participants SELECT policy checks activities
 * 
 * This causes infinite recursion (error 42P17).
 * 
 * Solution: Break the cycle by:
 * 1. Simplifying tracker_participants SELECT to only check direct participation
 * 2. Using a security definer function for activity ownership checks
 */

-- ============================================================================
-- 1. Create Security Definer Function for Activity Access Check
-- ============================================================================

-- This function bypasses RLS to check activity ownership/membership
-- Used by tracker_participants policies to avoid recursion
CREATE OR REPLACE FUNCTION public.can_user_access_activity(
  p_activity_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_type text;
  v_owner_id uuid;
  v_household_owner_id uuid;
  v_team_owner_id uuid;
BEGIN
  -- Get activity ownership info (bypassing RLS)
  SELECT 
    owner_type,
    owner_id,
    household_owner_id,
    team_owner_id
  INTO 
    v_owner_type,
    v_owner_id,
    v_household_owner_id,
    v_team_owner_id
  FROM activities
  WHERE id = p_activity_id;
  
  -- If activity doesn't exist, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check based on owner type
  IF v_owner_type = 'user' THEN
    RETURN v_owner_id = p_user_id;
  ELSIF v_owner_type = 'household' THEN
    RETURN public.is_user_household_member(v_household_owner_id);
  ELSIF v_owner_type = 'team' THEN
    RETURN EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = v_team_owner_id
      AND team_members.user_id = p_user_id
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_access_activity(uuid, uuid) TO authenticated;

-- ============================================================================
-- 2. Fix Tracker Participants SELECT Policy (Remove Recursion)
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view participants of their activities" ON tracker_participants;

-- Create new policy that doesn't cause recursion
-- Users can see:
-- 1. Their own participation records
-- 2. Other participants if they can access the activity (using security definer function)
CREATE POLICY "Users can view participants of their activities"
ON tracker_participants FOR SELECT
TO authenticated
USING (
  -- User is a participant (can always see their own record)
  user_id = auth.uid() OR
  -- User can access the activity (using security definer function to avoid RLS recursion)
  public.can_user_access_activity(activity_id, auth.uid())
);

-- ============================================================================
-- 3. Fix Tracker Participants INSERT Policy (Remove Recursion)
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can join eligible activities" ON tracker_participants;

-- Create new policy using security definer function
CREATE POLICY "Users can join eligible activities"
ON tracker_participants FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  public.can_user_access_activity(activity_id, auth.uid())
);

-- ============================================================================
-- 4. Add Comment
-- ============================================================================

COMMENT ON FUNCTION public.can_user_access_activity(uuid, uuid) IS 
  'Security definer function to check if a user can access an activity. Bypasses RLS to prevent infinite recursion in policies.';
