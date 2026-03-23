/*
  # Fix Team Members INSERT Policy Infinite Recursion (Final Fix)
  
  The INSERT policy for team_members was causing infinite recursion because:
  1. When creating a new team, there are no team_members yet
  2. The policy checks for existing owners in team_members, which fails for new teams
  3. The policy requires invited_by to be set, but team creators don't set it for themselves
  
  Previous fix (20260110000002) attempted to solve this but may not have been applied correctly.
  
  Solution: 
  - Allow team creators to insert themselves as first owner (checking teams.created_by)
  - Allow existing owners/admins to insert new members (checking team_members)
  - Make invited_by optional for team creators adding themselves
  - Use SECURITY DEFINER helper function to avoid RLS recursion
*/

-- Drop all existing INSERT policies on team_members to avoid conflicts
DROP POLICY IF EXISTS "Team owners can invite members" ON team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON team_members;

-- Also need to fix the SELECT policy which is also recursive
-- The SELECT policy queries team_members, which triggers itself
DROP POLICY IF EXISTS "Active members can view team members" ON team_members;

-- Create a new INSERT policy that handles both cases correctly
-- Uses SECURITY DEFINER helper to avoid RLS recursion
-- IMPORTANT: This function queries team_members, which has a recursive SELECT policy.
-- SECURITY DEFINER should bypass RLS, but to be safe, we check teams.created_by first.
CREATE OR REPLACE FUNCTION can_insert_team_member(
  p_team_id uuid,
  p_user_id uuid,
  p_role text,
  p_invited_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_current_profile_id uuid;
  v_team_created_by uuid;
  v_member_count integer;
  v_current_user_role text;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO v_current_profile_id
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF v_current_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get team creator (bypasses RLS via SECURITY DEFINER)
  SELECT created_by INTO v_team_created_by
  FROM teams
  WHERE id = p_team_id
    AND archived_at IS NULL;
  
  IF v_team_created_by IS NULL THEN
    RETURN false;
  END IF;
  
  -- Case 1: Team creator adding themselves as first owner
  IF p_user_id = v_current_profile_id 
     AND p_role = 'owner' 
     AND v_team_created_by = v_current_profile_id THEN
    
    -- Check if this is the first member (bypasses RLS via SECURITY DEFINER)
    SELECT COUNT(*) INTO v_member_count
    FROM team_members
    WHERE team_id = p_team_id;
    
    -- If no members exist, this is the creator adding themselves
    IF v_member_count = 0 THEN
      -- Allow invited_by to be NULL or set to self
      RETURN p_invited_by IS NULL OR p_invited_by = v_current_profile_id;
    END IF;
  END IF;
  
  -- Case 2: Existing owner/admin adding someone else
  -- Query team_members - SECURITY DEFINER should bypass RLS policies
  -- Use a direct query without subqueries to minimize RLS evaluation
  SELECT tm.role INTO v_current_user_role
  FROM team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.user_id = v_current_profile_id
    AND tm.status = 'active'
  LIMIT 1;
  
  -- Check if user is owner or admin
  IF v_current_user_role IN ('owner', 'admin') THEN
    -- invited_by must be set to current user
    RETURN p_invited_by = v_current_profile_id;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION can_insert_team_member IS 'Checks if current user can insert a team member. Handles team creator adding themselves and existing owners inviting others. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Fix the SELECT policy to avoid recursion
-- Use a SECURITY DEFINER helper function that bypasses RLS
CREATE OR REPLACE FUNCTION is_active_team_member(
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
  -- This function bypasses RLS via SECURITY DEFINER
  -- Query team_members directly without triggering RLS policies
  RETURN EXISTS (
    SELECT 1 
    FROM team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION is_active_team_member IS 'Checks if user is an active team member. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- Recreate the SELECT policy using the helper function
CREATE POLICY "Active members can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    is_active_team_member(
      team_id,
      get_current_profile_id()
    )
  );

-- Create the INSERT policy using the helper function
CREATE POLICY "Team owners can invite members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    can_insert_team_member(
      team_id,
      user_id,
      role::text,
      invited_by
    )
  );

COMMENT ON POLICY "Team owners can invite members" ON team_members IS 
  'Allows team creators to add themselves as first owner, and existing owners/admins to invite new members. Prevents infinite recursion by checking teams.created_by for first owner.';

-- ============================================================================
-- Fix teams INSERT policy
-- ============================================================================

-- The INSERT policy might be failing if get_current_profile_id() returns NULL
-- Let's ensure the policy works correctly
-- Drop ALL possible INSERT policies on teams to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "team_insert_policy" ON teams;

-- Create a helper function for teams INSERT that's more robust
-- This function bypasses RLS to check if user can create a team
CREATE OR REPLACE FUNCTION can_create_team(
  p_created_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_profile_id uuid;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  
  -- User must be authenticated
  IF v_current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get current user's profile ID directly (bypasses RLS via SECURITY DEFINER)
  -- We query profiles directly instead of using get_current_profile_id() 
  -- to ensure we have full control
  SELECT id INTO v_current_profile_id
  FROM profiles
  WHERE user_id = v_current_user_id
  LIMIT 1;
  
  -- User must have a profile
  IF v_current_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- created_by must be provided and must match the current user's profile ID
  IF p_created_by IS NULL THEN
    RETURN false;
  END IF;
  
  -- Final check: created_by must match current user's profile ID
  RETURN p_created_by = v_current_profile_id;
END;
$$;

COMMENT ON FUNCTION can_create_team IS 'Checks if current user can create a team. Uses SECURITY DEFINER to bypass RLS.';

-- Recreate the INSERT policy using the helper function
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    can_create_team(created_by)
  );

-- ============================================================================
-- Create team orchestration RPC (atomic, RLS-safe)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_team(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_team_id uuid;
BEGIN
  -- Resolve caller profile
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Create team (RLS-safe because created_by matches profile)
  INSERT INTO teams (name, description, created_by)
  VALUES (p_name, p_description, v_profile_id)
  RETURNING id INTO v_team_id;

  -- Materialise ownership immediately
  INSERT INTO team_members (team_id, user_id, role, status)
  VALUES (v_team_id, v_profile_id, 'owner', 'active');

  RETURN v_team_id;
END;
$function$;

-- ============================================================================
-- Verification Queries (Run these in Supabase SQL Editor to verify the fix)
-- ============================================================================
-- 
-- 1. Check if the function exists:
--    SELECT proname FROM pg_proc WHERE proname = 'can_create_team';
--
-- 2. Check if the policy exists:
--    SELECT policyname, cmd FROM pg_policies 
--    WHERE tablename = 'teams' AND cmd = 'INSERT';
--
-- 3. Test the function (replace YOUR_PROFILE_ID with your actual profile ID):
--    SELECT can_create_team('YOUR_PROFILE_ID'::uuid);
--
-- 4. Check current user's profile ID:
--    SELECT get_current_profile_id();
--
-- ============================================================================
