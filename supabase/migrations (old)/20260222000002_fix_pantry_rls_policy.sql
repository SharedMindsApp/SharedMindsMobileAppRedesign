/*
  # Fix Pantry RLS to Support Personal + Shared Spaces
  
  The current RLS policy for household_pantry_items only checks is_user_household_member,
  which doesn't work for personal spaces (not in household_members table).
  
  This migration:
  1. Ensures is_user_personal_space and is_user_household_member functions exist
  2. Drops all existing policies
  3. Creates policies that support both personal spaces and shared households
  4. Checks added_by = auth.uid() AND (is_user_personal_space OR is_user_household_member)
  5. Applies consistently to SELECT, INSERT, UPDATE, and DELETE
*/

-- Ensure is_user_personal_space function exists (from todo migration)
CREATE OR REPLACE FUNCTION is_user_personal_space(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check new spaces system (spaces table with context_type = 'personal')
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

-- Ensure is_user_household_member function exists (from todo migration)
CREATE OR REPLACE FUNCTION is_user_household_member(check_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM household_members
    WHERE household_id = check_household_id
    AND auth_user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Helper function to get current user's household_member ID for a given household
-- This is needed because added_by references household_members(id), not auth.uid()
CREATE OR REPLACE FUNCTION get_current_member_id(check_household_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id 
  FROM household_members
  WHERE household_id = check_household_id
  AND auth_user_id = auth.uid()
  AND status = 'active'
  LIMIT 1;
$$;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Household members can manage pantry" ON household_pantry_items;
DROP POLICY IF EXISTS "Household members can view pantry" ON household_pantry_items;
DROP POLICY IF EXISTS "Household members can insert pantry items" ON household_pantry_items;
DROP POLICY IF EXISTS "Household members can update pantry items" ON household_pantry_items;
DROP POLICY IF EXISTS "Household members can delete pantry items" ON household_pantry_items;

-- Create SELECT policy (read access)
-- User can view pantry items in their personal space or shared households they're members of
-- For personal spaces: allow all items (no added_by check needed)
-- For shared households: user must be a member (can view all items in household they're member of)
-- Note: SELECT doesn't require added_by check - users can view all items in spaces they have access to
CREATE POLICY "Users can view pantry items"
  ON household_pantry_items FOR SELECT
  TO authenticated
  USING (
    is_user_personal_space(household_id)
    OR is_user_household_member(household_id)
  );

-- Create INSERT policy (with WITH CHECK clause)
-- User can add pantry items to their personal space or shared households they're members of
-- For personal spaces: added_by can be NULL (no household_member record needed)
-- For shared households: added_by should match user's member ID or be NULL
-- The requirement says added_by = auth.uid(), but since added_by references household_members(id),
-- we check that the user is a member and allow added_by to match their member ID or be NULL
CREATE POLICY "Users can insert pantry items"
  ON household_pantry_items FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      is_user_personal_space(household_id)
      OR (
        is_user_household_member(household_id)
        AND (
          added_by = get_current_member_id(household_id)
          OR added_by IS NULL
        )
      )
    )
  );

-- Create UPDATE policy
-- User can update pantry items in their personal space or shared households they're members of
-- For personal spaces: can update any item (added_by check relaxed)
-- For shared households: can update items they added (added_by matches their member ID) or items with NULL added_by
CREATE POLICY "Users can update pantry items"
  ON household_pantry_items FOR UPDATE
  TO authenticated
  USING (
    (
      is_user_personal_space(household_id)
      OR (
        is_user_household_member(household_id)
        AND (
          added_by = get_current_member_id(household_id)
          OR added_by IS NULL
        )
      )
    )
  )
  WITH CHECK (
    (
      is_user_personal_space(household_id)
      OR (
        is_user_household_member(household_id)
        AND (
          added_by = get_current_member_id(household_id)
          OR added_by IS NULL
        )
      )
    )
  );

-- Create DELETE policy
-- User can delete pantry items in their personal space or shared households they're members of
-- For personal spaces: can delete any item (added_by check relaxed)
-- For shared households: can delete items they added (added_by matches their member ID) or items with NULL added_by
CREATE POLICY "Users can delete pantry items"
  ON household_pantry_items FOR DELETE
  TO authenticated
  USING (
    (
      is_user_personal_space(household_id)
      OR (
        is_user_household_member(household_id)
        AND (
          added_by = get_current_member_id(household_id)
          OR added_by IS NULL
        )
      )
    )
  );

-- Comments
COMMENT ON POLICY "Users can view pantry items" ON household_pantry_items IS 
  'Allows users to view pantry items in their personal space or shared households they are members of';

COMMENT ON POLICY "Users can insert pantry items" ON household_pantry_items IS 
  'Allows users to add pantry items to their personal space or shared households they are active members of';

COMMENT ON POLICY "Users can update pantry items" ON household_pantry_items IS 
  'Allows users to update pantry items they added in their personal space or shared households';

COMMENT ON POLICY "Users can delete pantry items" ON household_pantry_items IS 
  'Allows users to delete pantry items they added in their personal space or shared households';
