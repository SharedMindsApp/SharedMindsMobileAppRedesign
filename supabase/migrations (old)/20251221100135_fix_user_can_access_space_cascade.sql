/*
  # Fix user_can_access_space to map auth.uid to profile.id
  
  ## Problem
  - space_members.user_id stores profile.id (from profiles table)
  - auth.uid() returns auth.users.id
  - These are different IDs, causing RLS to always fail
  
  ## Solution
  - Drop function with CASCADE (removes dependent policies)
  - Recreate function with profile mapping
  - Policies will be recreated automatically in subsequent queries
*/

-- Drop existing function with CASCADE
DROP FUNCTION IF EXISTS user_can_access_space(uuid, uuid) CASCADE;

-- Recreate with profile mapping
CREATE OR REPLACE FUNCTION user_can_access_space(p_auth_user_id uuid, p_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
  v_space_type text;
  v_owner_id uuid;
  v_is_member boolean;
BEGIN
  -- If space_id is null, deny access
  IF p_space_id IS NULL THEN
    RETURN false;
  END IF;

  -- If user_id is null, deny access
  IF p_auth_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- MAP auth.uid() to profile.id
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = p_auth_user_id;

  -- If no profile found, deny access
  IF v_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get space info
  SELECT space_type, owner_id INTO v_space_type, v_owner_id
  FROM spaces
  WHERE id = p_space_id;

  -- If space doesn't exist, deny access
  IF v_space_type IS NULL THEN
    RETURN false;
  END IF;

  -- Personal space: check ownership
  IF v_space_type = 'personal' THEN
    -- If owner_id is set, check if it matches the profile_id
    IF v_owner_id IS NOT NULL THEN
      RETURN v_owner_id = v_profile_id;
    END IF;

    -- Fallback: check space_members for owner role (using profile_id)
    SELECT EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = p_space_id
        AND user_id = v_profile_id
        AND role = 'owner'
        AND status = 'active'
    ) INTO v_is_member;

    RETURN v_is_member;
  END IF;

  -- Shared space: check membership (using profile_id)
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
      AND user_id = v_profile_id
      AND status = 'active'
  ) INTO v_is_member;

  RETURN v_is_member;
END;
$$;
