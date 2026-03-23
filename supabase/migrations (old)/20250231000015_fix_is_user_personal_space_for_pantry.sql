/*
  # Fix is_user_personal_space Function for Pantry Items
  
  ## Problem
  The `is_user_personal_space` function requires an active space_member record,
  but for personal spaces, users should be able to access their space even if
  the space_member record is missing or inactive. Personal spaces have
  context_id = profile_id, so we can check that directly.
  
  ## Solution
  Update the function to also check if:
  - The space's context_id matches the user's profile_id
  - This allows access to personal spaces even without space_member records
  
  ## Safety
  - This is more permissive but still secure (only checks profile ownership)
  - Maintains backward compatibility with existing space_member checks
  - Only affects personal spaces (context_type = 'personal')
*/

-- Drop existing function(s) - handle both possible parameter names
DROP FUNCTION IF EXISTS is_user_personal_space(uuid) CASCADE;

-- Recreate is_user_personal_space with enhanced logic to check context_id = profile_id
CREATE FUNCTION is_user_personal_space(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check new spaces system (spaces table with context_type = 'personal')
  -- First check: via space_members (existing logic)
  SELECT EXISTS(
    SELECT 1
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    JOIN profiles p ON p.id = sm.user_id
    WHERE (s.id = check_household_id OR s.context_id = check_household_id)
    AND s.context_type = 'personal'
    AND p.user_id = auth.uid()
    AND sm.status = 'active'
  )
  OR EXISTS(
    -- Second check: direct profile_id match via context_id (for personal spaces)
    -- Personal spaces have context_id = profile_id, so we can check directly
    SELECT 1
    FROM spaces s
    JOIN profiles p ON p.id = s.context_id
    WHERE s.id = check_household_id
    AND s.context_type = 'personal'
    AND s.context_id IS NOT NULL
    AND p.user_id = auth.uid()
  )
  OR EXISTS(
    -- Fallback to old system (households table with type = 'personal')
    SELECT 1
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE h.id = check_household_id
    AND h.type = 'personal'
    AND hm.auth_user_id = auth.uid()
    AND hm.status = 'active'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_personal_space(uuid) TO authenticated;

-- Update comment
COMMENT ON FUNCTION is_user_personal_space(uuid) IS
  'Checks if a space ID belongs to a personal space owned by the current user. Checks via space_members (preferred) or directly via context_id = profile_id (fallback for personal spaces).';
