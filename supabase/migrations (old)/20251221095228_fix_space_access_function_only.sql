/*
  # Fix Space Access Function for NULL owner_id
  
  ## Summary
  Updates the user_can_access_space function to handle personal spaces with NULL owner_id
  by checking space_members table as fallback.
  
  ## Problem
  - Personal spaces have owner_id = NULL
  - space_members has correct ownership data
  - RLS was failing because it only checked owner_id
  
  ## Solution
  - Check space_members when owner_id is NULL for personal spaces
  - This allows widgets to be created in personal spaces
*/

CREATE OR REPLACE FUNCTION user_can_access_space(p_user_id uuid, p_space_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_space_type text;
  v_owner_id uuid;
  v_is_member boolean;
BEGIN
  -- If space_id is null, deny access
  IF p_space_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- If user_id is null, deny access
  IF p_user_id IS NULL THEN
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
    -- If owner_id is set, use it
    IF v_owner_id IS NOT NULL THEN
      RETURN v_owner_id = p_user_id;
    END IF;
    
    -- Fallback: check space_members for owner role
    SELECT EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = p_space_id
      AND user_id = p_user_id
      AND role = 'owner'
      AND status = 'active'
    ) INTO v_is_member;
    
    RETURN v_is_member;
  END IF;
  
  -- Shared space: check membership (any active member)
  SELECT EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = p_user_id
    AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;
