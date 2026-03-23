/*
  # Fix Pantry Locations Foreign Key for Polymorphic Space Support
  
  The current FK constraint pantry_locations_space_id_fkey only references households(id),
  but space_id is polymorphic and can refer to:
  - Personal spaces
  - Households
  - Teams
  
  This migration:
  1. Drops the invalid FK constraint
  2. Updates RLS policies to support all space types
  3. Ensures helper functions exist for space access checks
  4. Documents the polymorphic nature of space_id
  5. Makes ensureDefaultLocations idempotent
*/

-- Drop the invalid foreign key constraint
ALTER TABLE pantry_locations
DROP CONSTRAINT IF EXISTS pantry_locations_space_id_fkey;

-- Add unique constraint on (space_id, name) to prevent duplicates
-- This makes ensureDefaultLocations idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pantry_locations_space_id_name_unique'
  ) THEN
    ALTER TABLE pantry_locations
    ADD CONSTRAINT pantry_locations_space_id_name_unique
    UNIQUE (space_id, name);
  END IF;
END $$;

-- Add comment documenting polymorphic nature
COMMENT ON COLUMN pantry_locations.space_id IS 
'Polymorphic space identifier (personal | household | team). Enforced via RLS, not FK.';

-- Ensure is_user_personal_space function exists (reuse from pantry RLS migration)
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

-- Ensure is_user_household_member function exists (reuse from pantry RLS migration)
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

-- Create is_user_team_member function (if teams exist in the system)
-- This checks if the user is a member of a team space
CREATE OR REPLACE FUNCTION is_user_team_member(check_space_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check new spaces system (spaces table with context_type = 'team')
  SELECT EXISTS(
    SELECT 1
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    JOIN profiles p ON p.id = sm.user_id
    WHERE (s.id = check_space_id OR s.context_id = check_space_id)
    AND s.context_type = 'team'
    AND p.user_id = auth.uid()
    AND sm.status = 'active'
  )
  OR EXISTS(
    -- Fallback: check if space_id is a team in households table
    SELECT 1
    FROM households h
    JOIN household_members hm ON hm.household_id = h.id
    WHERE h.id = check_space_id
    AND h.type = 'team'
    AND hm.auth_user_id = auth.uid()
    AND hm.status = 'active'
  );
$$;

-- Drop existing policies (for idempotence)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view pantry locations in their spaces" ON pantry_locations;
  DROP POLICY IF EXISTS "Users can create pantry locations in their spaces" ON pantry_locations;
  DROP POLICY IF EXISTS "Users can update pantry locations they created" ON pantry_locations;
  DROP POLICY IF EXISTS "Users can delete pantry locations they created" ON pantry_locations;
END $$;

-- RLS Policies for pantry_locations (supporting all space types)

-- SELECT: Users can view locations in spaces they have access to
CREATE POLICY "Users can view pantry locations in their spaces"
  ON pantry_locations
  FOR SELECT
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
    OR is_user_team_member(space_id)
  );

-- INSERT: Users can create locations in spaces they have access to
CREATE POLICY "Users can create pantry locations in their spaces"
  ON pantry_locations
  FOR INSERT
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
    OR is_user_team_member(space_id)
  );

-- UPDATE: Users can update locations in spaces they have access to
CREATE POLICY "Users can update pantry locations they created"
  ON pantry_locations
  FOR UPDATE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
    OR is_user_team_member(space_id)
  )
  WITH CHECK (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
    OR is_user_team_member(space_id)
  );

-- DELETE: Users can delete locations in spaces they have access to
CREATE POLICY "Users can delete pantry locations they created"
  ON pantry_locations
  FOR DELETE
  USING (
    is_user_personal_space(space_id)
    OR is_user_household_member(space_id)
    OR is_user_team_member(space_id)
  );
