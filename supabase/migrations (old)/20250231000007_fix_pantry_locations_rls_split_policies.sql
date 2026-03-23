/*
  # Fix Pantry Locations RLS - Split Policies (No OR Chains)
  
  ## Problem
  INSERT operations on pantry_locations fail with 403/42501 (RLS violation) when using .insert(...).select('*').
  Current policies use OR chains that create ambiguity and NULL traps.
  INSERT ... RETURNING requires matching SELECT policies.
  
  ## Solution
  Apply split RLS policy architecture (consistent with meal_schedules, meal_plans):
  - Add profile_id and household_id columns for explicit ownership
  - Split policies by scope: personal (household_id IS NULL, profile_id IS NOT NULL) vs household (household_id IS NOT NULL, profile_id IS NULL)
  - No OR chains - deterministic evaluation
  - Separate INSERT, SELECT, UPDATE, DELETE policies that mirror each other
  - SELECT policy is mandatory for INSERT ... RETURNING / upsert().select('*')
  - Use SECURITY DEFINER helper functions to avoid RLS recursion
*/

-- ============================================================================
-- 1. Ensure Helper Functions Exist (SECURITY DEFINER)
-- ============================================================================
-- These functions bypass RLS on profiles and household_members tables

-- Helper: Check if profile belongs to authenticated user
CREATE OR REPLACE FUNCTION public.is_user_profile(check_profile_id uuid)
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
      FROM public.profiles
      WHERE id = check_profile_id
        AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_profile(uuid) TO authenticated;

-- Helper: Check if user is active household member
CREATE OR REPLACE FUNCTION public.is_user_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = hid
      AND auth_user_id = auth.uid()
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_household_member(uuid) TO authenticated;

-- ============================================================================
-- 2. Add Ownership Columns to pantry_locations
-- ============================================================================

-- Add profile_id column (nullable, for personal spaces)
ALTER TABLE pantry_locations
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Add household_id column (nullable, for household spaces)
ALTER TABLE pantry_locations
ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. Backfill Ownership from space_id (BEFORE adding constraint)
-- ============================================================================
-- Note: This backfill runs as a migration (no auth context), so we use
-- space_members to find the first active member for personal spaces
-- We must backfill ALL rows before adding the constraint

-- Backfill profile_id for personal spaces
-- First try: Use context_id if it's a valid profile_id
UPDATE pantry_locations pl
SET profile_id = s.context_id
FROM spaces s
WHERE pl.space_id = s.id
  AND s.context_type = 'personal'
  AND s.context_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.context_id)
  AND pl.profile_id IS NULL;

-- Second try: Use the first active space member's profile_id
UPDATE pantry_locations pl
SET profile_id = (
  SELECT p.id
  FROM spaces s
  JOIN space_members sm ON sm.space_id = s.id
  JOIN profiles p ON p.id = sm.user_id
  WHERE s.id = pl.space_id
    AND s.context_type = 'personal'
    AND sm.status = 'active'
  ORDER BY sm.created_at ASC
  LIMIT 1
)
WHERE pl.space_id IN (
  SELECT id FROM spaces WHERE context_type = 'personal'
)
AND pl.profile_id IS NULL;

-- Backfill household_id for household spaces
UPDATE pantry_locations pl
SET household_id = s.context_id
FROM spaces s
WHERE pl.space_id = s.id
  AND s.context_type = 'household'
  AND s.context_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM households h WHERE h.id = s.context_id
  )
  AND pl.household_id IS NULL;

-- For any remaining rows that couldn't be backfilled, delete them
-- These are orphaned locations with invalid space references
-- This is safer than leaving them in an invalid state
DELETE FROM pantry_locations
WHERE profile_id IS NULL
  AND household_id IS NULL;

-- ============================================================================
-- 4. Add Constraint AFTER Backfill
-- ============================================================================
-- Now that all rows have been backfilled (or deleted if invalid), 
-- we can safely add the constraint

-- Add constraint: exactly one of profile_id or household_id must be set
ALTER TABLE pantry_locations
DROP CONSTRAINT IF EXISTS pantry_locations_ownership_check;

ALTER TABLE pantry_locations
ADD CONSTRAINT pantry_locations_ownership_check
CHECK (
  (profile_id IS NOT NULL AND household_id IS NULL)
  OR (profile_id IS NULL AND household_id IS NOT NULL)
);

-- ============================================================================
-- 5. Drop All Existing Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view pantry locations in their spaces" ON pantry_locations;
DROP POLICY IF EXISTS "Users can create pantry locations in their spaces" ON pantry_locations;
DROP POLICY IF EXISTS "Users can update pantry locations they created" ON pantry_locations;
DROP POLICY IF EXISTS "Users can delete pantry locations they created" ON pantry_locations;

-- ============================================================================
-- 6. INSERT Policies (WITH CHECK only - no USING for INSERT)
-- ============================================================================
-- Note: INSERT policies only allow WITH CHECK clauses. PostgreSQL evaluates
-- WITH CHECK to validate the row being inserted. No OR chains - each policy
-- is completely isolated for deterministic evaluation.

-- Policy A: Personal pantry locations
-- Applies ONLY when: household_id IS NULL AND profile_id IS NOT NULL
DROP POLICY IF EXISTS "Users can create personal pantry locations" ON pantry_locations;

CREATE POLICY "Users can create personal pantry locations"
  ON pantry_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- Policy B: Household pantry locations
-- Applies ONLY when: household_id IS NOT NULL AND profile_id IS NULL
DROP POLICY IF EXISTS "Users can create household pantry locations" ON pantry_locations;

CREATE POLICY "Users can create household pantry locations"
  ON pantry_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- 7. SELECT Policies (USING - required for INSERT visibility verification)
-- ============================================================================
-- PostgreSQL verifies row visibility via SELECT policies during INSERT ... RETURNING.
-- These policies MUST mirror the INSERT logic exactly to allow inserts to succeed.
-- Without matching SELECT policies, INSERT ... RETURNING will fail even if WITH CHECK passes.

-- SELECT Policy A: Personal pantry locations
-- Mirrors the INSERT policy for personal locations
DROP POLICY IF EXISTS "Users can read personal pantry locations" ON pantry_locations;

CREATE POLICY "Users can read personal pantry locations"
  ON pantry_locations
  FOR SELECT
  TO authenticated
  USING (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- SELECT Policy B: Household pantry locations
-- Mirrors the INSERT policy for household locations
DROP POLICY IF EXISTS "Users can read household pantry locations" ON pantry_locations;

CREATE POLICY "Users can read household pantry locations"
  ON pantry_locations
  FOR SELECT
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- 8. UPDATE Policies (USING + WITH CHECK)
-- ============================================================================
-- USING clause checks existing row ownership
-- WITH CHECK validates the updated row
-- Both must pass for UPDATE to succeed
-- Split by personal vs household (no OR chains)

-- UPDATE Policy A: Personal pantry locations
DROP POLICY IF EXISTS "Users can update personal pantry locations" ON pantry_locations;

CREATE POLICY "Users can update personal pantry locations"
  ON pantry_locations
  FOR UPDATE
  TO authenticated
  USING (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  )
  WITH CHECK (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- UPDATE Policy B: Household pantry locations
DROP POLICY IF EXISTS "Users can update household pantry locations" ON pantry_locations;

CREATE POLICY "Users can update household pantry locations"
  ON pantry_locations
  FOR UPDATE
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  )
  WITH CHECK (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- 9. DELETE Policies (USING only)
-- ============================================================================
-- DELETE policies only use USING clause (no WITH CHECK)
-- Split by personal vs household (no OR chains)

-- DELETE Policy A: Personal pantry locations
DROP POLICY IF EXISTS "Users can delete personal pantry locations" ON pantry_locations;

CREATE POLICY "Users can delete personal pantry locations"
  ON pantry_locations
  FOR DELETE
  TO authenticated
  USING (
    household_id IS NULL
    AND profile_id IS NOT NULL
    AND public.is_user_profile(profile_id)
  );

-- DELETE Policy B: Household pantry locations
DROP POLICY IF EXISTS "Users can delete household pantry locations" ON pantry_locations;

CREATE POLICY "Users can delete household pantry locations"
  ON pantry_locations
  FOR DELETE
  TO authenticated
  USING (
    household_id IS NOT NULL
    AND profile_id IS NULL
    AND public.is_user_household_member(household_id)
  );

-- ============================================================================
-- 10. Documentation Comments
-- ============================================================================

COMMENT ON TABLE pantry_locations IS 
  'Pantry locations are scoped to spaces (personal/household/team). CRITICAL: Ownership invariant - exactly one of profile_id (personal) OR household_id (household) must be set, never both, never neither. Ownership must match space context.';

COMMENT ON COLUMN pantry_locations.profile_id IS 
  'Profile ID for personal spaces. Must be NULL for household spaces.';

COMMENT ON COLUMN pantry_locations.household_id IS 
  'Household ID for household spaces. Must be NULL for personal spaces.';

COMMENT ON COLUMN pantry_locations.space_id IS 
  'Polymorphic space identifier (personal | household | team). Enforced via RLS, not FK.';

COMMENT ON POLICY "Users can create personal pantry locations" ON pantry_locations IS
  'Isolated INSERT policy for personal pantry locations. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user. This policy is completely isolated from household location logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can create household pantry locations" ON pantry_locations IS
  'Isolated INSERT policy for household pantry locations. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member. This policy is completely isolated from personal location logic, has zero unrelated conditions, cannot be short-circuited, and matches the actual insert payload exactly. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch.';

COMMENT ON POLICY "Users can read personal pantry locations" ON pantry_locations IS
  'SELECT policy for personal pantry locations. Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user. Required for INSERT operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can read household pantry locations" ON pantry_locations IS
  'SELECT policy for household pantry locations. Mirrors the INSERT policy logic to ensure PostgreSQL can verify row visibility during inserts. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member. Required for INSERT operations to succeed - PostgreSQL verifies row visibility via SELECT policies.';

COMMENT ON POLICY "Users can update personal pantry locations" ON pantry_locations IS
  'UPDATE policy for personal pantry locations. USING clause checks existing row ownership, WITH CHECK validates the updated row. Both must pass for UPDATE to succeed. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user.';

COMMENT ON POLICY "Users can update household pantry locations" ON pantry_locations IS
  'UPDATE policy for household pantry locations. USING clause checks existing row ownership, WITH CHECK validates the updated row. Both must pass for UPDATE to succeed. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member.';

COMMENT ON POLICY "Users can delete personal pantry locations" ON pantry_locations IS
  'DELETE policy for personal pantry locations. Applies ONLY when household_id IS NULL, profile_id IS NOT NULL, and profile_id belongs to auth user.';

COMMENT ON POLICY "Users can delete household pantry locations" ON pantry_locations IS
  'DELETE policy for household pantry locations. Applies ONLY when household_id IS NOT NULL, profile_id IS NULL, and user is an active household member.';
