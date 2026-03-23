/*
  # Fix Meal Schedules INSERT RLS Policy to Support Space-Based Access

  ## Problem
  The INSERT policy for meal_schedules only checks profile_id and household_id,
  but doesn't have a fallback to check space_id access. This can cause failures
  when the space context doesn't match the expected profile_id/household_id setup.

  ## Solution
  Update the INSERT policy to also allow inserts based on space_id access,
  similar to how the SELECT policy works. This provides a fallback mechanism.
*/

-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION is_user_profile(check_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    check_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = check_profile_id
      AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION is_user_profile(uuid) TO authenticated;

DROP FUNCTION IF EXISTS is_user_household_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_user_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = hid
    AND auth_user_id = auth.uid()
    AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION is_user_household_member(uuid) TO authenticated;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert meal schedules in their spaces" ON meal_schedules;

-- Create updated INSERT policy with space_id fallback
CREATE POLICY "Users can insert meal schedules in their spaces"
  ON meal_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Option 1: Personal space - profile_id matches user's profile
    (
      profile_id IS NOT NULL
      AND household_id IS NULL
      AND is_user_profile(profile_id)
    )
    OR
    -- Option 2: Household space - user is a member
    (
      household_id IS NOT NULL
      AND profile_id IS NULL
      AND is_user_household_member(household_id)
    )
    OR
    -- Option 3: Space-based access (fallback for personal spaces)
    -- This allows inserts when the user has access to the space, even if profile_id/household_id don't match exactly
    EXISTS (
      SELECT 1
      FROM spaces s
      WHERE s.id = meal_schedules.space_id
      AND (
        -- Personal space: check if user owns it
        (
          s.context_type = 'personal'
          AND s.context_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          )
        )
        OR
        -- Household space: check if user is a member
        (
          s.context_type = 'household'
          AND s.context_id IS NOT NULL
          AND is_user_household_member(s.context_id)
        )
        OR
        -- Team space: check if user is a member (if teams exist)
        (
          s.context_type = 'team'
          AND s.context_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE tm.team_id = s.context_id
            AND is_user_profile(tm.user_id)
            AND tm.status = 'active'
          )
        )
      )
    )
  );

-- Update comment
COMMENT ON POLICY "Users can insert meal schedules in their spaces" ON meal_schedules IS
  'Allows authenticated users to create meal schedules in spaces they have access to. Supports profile_id/household_id checks and space_id-based access as fallback. Uses SECURITY DEFINER helper functions to avoid RLS recursion.';
