/*
  # Repair Invalid Household References in Spaces
  
  ## Problem
  Some spaces have context_type = 'household' but reference non-existent households via context_id.
  This causes meal_schedules inserts to fail because:
  - The space claims to be a household space
  - But the referenced household doesn't exist
  - RLS policies fail because is_user_household_member() can't validate membership
  
  ## Solution
  Find all spaces where:
  - context_type = 'household'
  - context_id does NOT exist in households table
  
  For each invalid space, downgrade it to a personal space:
  - Set context_type = 'personal'
  - Set context_id = NULL
  
  ## Safety
  - Migration is idempotent (safe to re-run)
  - Only affects spaces with invalid household references
  - Does not modify valid household spaces
  - Does not modify personal spaces
  
  ## Invariant
  Spaces must never reference non-existent households.
  If a household is deleted, associated spaces should be:
  - Downgraded to personal spaces, OR
  - Deleted (if space deletion is appropriate)
  
  This migration handles the repair case where spaces were left in an invalid state.
*/

-- Find and repair spaces with invalid household references
UPDATE spaces
SET
  context_type = 'personal',
  context_id = NULL
WHERE
  context_type = 'household'
  AND context_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM households h
    WHERE h.id = spaces.context_id
  );

-- Add comment explaining the fix
COMMENT ON TABLE spaces IS 
  'Spaces represent personal, household, or team contexts. CRITICAL: If context_type = ''household'', context_id MUST reference an existing household. Invalid household references are automatically downgraded to personal spaces.';

-- Log how many spaces were repaired (for verification)
DO $$
DECLARE
  repaired_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO repaired_count
  FROM spaces
  WHERE context_type = 'household'
    AND context_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM households h
      WHERE h.id = spaces.context_id
    );
  
  IF repaired_count > 0 THEN
    RAISE NOTICE 'Repaired % spaces with invalid household references', repaired_count;
  ELSE
    RAISE NOTICE 'No spaces with invalid household references found';
  END IF;
END $$;
