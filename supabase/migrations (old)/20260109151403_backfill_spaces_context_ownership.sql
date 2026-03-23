/*
  # Backfill Spaces Context Ownership
  
  Migrates existing spaces.space_type values to context_type and context_id.
  
  Mapping:
  - space_type = 'personal' → context_type = 'personal', context_id = null
  - space_type = 'household' → context_type = 'household', context_id = household_id (if exists)
  - space_type = 'shared' → context_type = 'household', context_id = household_id (temporary, flag for review)
  
  Note: space_type column is preserved for now.
*/

-- Step 1: Migrate 'personal' spaces
UPDATE spaces
SET 
  context_type = 'personal',
  context_id = NULL
WHERE space_type = 'personal'
  AND (context_type IS NULL OR context_type != 'personal');

-- Step 2: Migrate 'household' spaces
-- Try to find household_id from space_members or other relationships
-- Only update if we can actually find a household_id
UPDATE spaces
SET 
  context_type = 'household',
  context_id = found_household_id
FROM (
  SELECT 
    s.id as space_id,
    (
      -- Try to find household_id from space_members -> profiles -> household_members
      -- space_members.user_id is profiles.id
      -- profiles.user_id is auth.users.id
      -- household_members.auth_user_id is auth.users.id
      SELECT DISTINCT hm.household_id
      FROM space_members sm
      JOIN profiles p ON p.id = sm.user_id
      JOIN household_members hm ON hm.auth_user_id = p.user_id
      WHERE sm.space_id = s.id
      AND (hm.status = 'active' OR hm.status IS NULL)
      LIMIT 1
    ) as found_household_id
  FROM spaces s
  WHERE s.space_type = 'household'
    AND (s.context_type IS NULL OR s.context_type != 'household')
) as household_lookup
WHERE spaces.id = household_lookup.space_id
  AND household_lookup.found_household_id IS NOT NULL;

-- Step 3: Migrate 'shared' spaces (temporarily treat as household)
-- This is a temporary mapping - these should be reviewed later
-- Only update if we can actually find a household_id
UPDATE spaces
SET 
  context_type = 'household',
  context_id = found_household_id
FROM (
  SELECT 
    s.id as space_id,
    (
      -- Try to find household_id from space_members -> profiles -> household_members
      -- space_members.user_id is profiles.id
      -- profiles.user_id is auth.users.id
      -- household_members.auth_user_id is auth.users.id
      SELECT DISTINCT hm.household_id
      FROM space_members sm
      JOIN profiles p ON p.id = sm.user_id
      JOIN household_members hm ON hm.auth_user_id = p.user_id
      WHERE sm.space_id = s.id
      AND (hm.status = 'active' OR hm.status IS NULL)
      LIMIT 1
    ) as found_household_id
  FROM spaces s
  WHERE s.space_type = 'shared'
    AND (s.context_type IS NULL OR s.context_type != 'household')
) as household_lookup
WHERE spaces.id = household_lookup.space_id
  AND household_lookup.found_household_id IS NOT NULL;

-- Step 4: Handle spaces where we couldn't find a household_id
-- If context_type is 'household' but context_id is NULL, default to 'personal'
-- (This handles edge cases where relationships are missing)
UPDATE spaces
SET 
  context_type = 'personal',
  context_id = NULL
WHERE context_type = 'household' AND context_id IS NULL;

-- Step 5: Handle any remaining spaces without context_type
-- Default to 'personal' if we can't determine context
UPDATE spaces
SET 
  context_type = 'personal',
  context_id = NULL
WHERE context_type IS NULL;

-- Step 6: Ensure context_id is NULL for personal spaces
UPDATE spaces
SET context_id = NULL
WHERE context_type = 'personal' AND context_id IS NOT NULL;

-- Step 7: Make context_type NOT NULL now that we've backfilled
DO $$
BEGIN
  -- First, ensure all rows have context_type
  UPDATE spaces SET context_type = 'personal' WHERE context_type IS NULL;
  
  -- Then make it NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' 
    AND column_name = 'context_type'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE spaces ALTER COLUMN context_type SET NOT NULL;
  END IF;
END $$;

-- Add comment about the backfill
COMMENT ON COLUMN spaces.context_type IS 'Type of context that owns this space: personal, household, or team. Backfilled from space_type.';
COMMENT ON COLUMN spaces.context_id IS 'ID of the context entity (null for personal, household_id or team_id for shared spaces). Backfilled from existing relationships.';
