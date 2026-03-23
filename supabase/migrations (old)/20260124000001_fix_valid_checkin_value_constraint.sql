/*
  # Fix valid_checkin_value Constraint Violation
  
  ## Problem
  The current `valid_checkin_value` constraint is ambiguous and doesn't properly enforce
  the requirement that `status = 'done'` must have exactly one non-null value.
  
  Current constraint allows edge cases where:
  - `status = 'done'` with both values NULL (should be invalid)
  - The logic is hard to reason about in a single CHECK expression
  
  ## Solution
  Split the constraint into two explicit, clear constraints:
  1. `valid_checkin_done` - When status = 'done', exactly one value must be non-null
  2. `valid_checkin_not_done` - When status != 'done', both values must be NULL
  
  This makes the constraint logic explicit and easier to understand.
  
  ## Truth Table
  status    | value_boolean | value_numeric | Valid
  ----------|--------------|---------------|-------
  done      | true         | null          | ✅
  done      | null         | 7             | ✅
  done      | null         | null          | ❌ (blocked by valid_checkin_done)
  missed    | null         | null          | ✅
  skipped   | null         | null          | ✅
  partial   | true         | null          | ✅ (if status = 'partial', same rules as 'done')
  
  ## Safety
  - Migration is idempotent (safe to re-run)
  - Drops old constraint before creating new ones
  - No data migration needed (constraint only validates new inserts/updates)
*/

-- ============================================================================
-- 1. DROP OLD CONSTRAINTS
-- ============================================================================

-- Drop old single constraint if it exists
ALTER TABLE habit_checkins
DROP CONSTRAINT IF EXISTS valid_checkin_value;

-- Drop split constraints if they already exist (from previous migration attempts)
ALTER TABLE habit_checkins
DROP CONSTRAINT IF EXISTS valid_checkin_done,
DROP CONSTRAINT IF EXISTS valid_checkin_not_done;

-- ============================================================================
-- 2. CREATE SPLIT CONSTRAINTS (CORRECTED LOGIC)
-- ============================================================================

-- Constraint 1: When status = 'done' or 'partial', exactly one value must be non-null
-- Uses implication-safe logic: status NOT IN ('done', 'partial') OR (exactly one value set)
ALTER TABLE habit_checkins
ADD CONSTRAINT valid_checkin_done
CHECK (
  status NOT IN ('done', 'partial')
  OR
  (
    (value_boolean IS NOT NULL AND value_numeric IS NULL)
    OR
    (value_boolean IS NULL AND value_numeric IS NOT NULL)
  )
);

-- Constraint 2: When status != 'done' and != 'partial' (i.e., 'missed' or 'skipped'), both values must be NULL
-- Uses implication-safe logic: status IN ('done', 'partial') OR (both values NULL)
ALTER TABLE habit_checkins
ADD CONSTRAINT valid_checkin_not_done
CHECK (
  status IN ('done', 'partial')
  OR
  (
    value_boolean IS NULL
    AND value_numeric IS NULL
  )
);

-- ============================================================================
-- 3. ADD COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT valid_checkin_done ON habit_checkins IS
  'When status is "done" or "partial", exactly one of value_boolean or value_numeric must be non-null. Enforces that completed check-ins have a measured value. Rejects (done, NULL, NULL).';

COMMENT ON CONSTRAINT valid_checkin_not_done ON habit_checkins IS
  'When status is "missed" or "skipped", both value_boolean and value_numeric must be NULL. Enforces that non-completed check-ins have no measured values. Rejects any value set for missed/skipped.';

-- ============================================================================
-- 4. VERIFY NO TRIGGERS ARE MUTATING VALUES
-- ============================================================================

-- Check for triggers that might modify value_boolean, value_numeric, or status
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE t.tgrelid = 'habit_checkins'::regclass
    AND NOT t.tgisinternal
    AND n.nspname = 'public';
  
  IF trigger_count > 1 THEN
    -- Only the update_habit_checkins_updated_at trigger should exist
    RAISE NOTICE 'Found % non-internal triggers on habit_checkins. Expected 1 (updated_at trigger).', trigger_count;
  END IF;
END $$;

-- ============================================================================
-- 5. VERIFY NO DEFAULTS ON VALUE COLUMNS
-- ============================================================================

-- Ensure no defaults are set on value columns that could interfere
DO $$
BEGIN
  -- Check for defaults on value_boolean
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'habit_checkins'
      AND column_name = 'value_boolean'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE habit_checkins ALTER COLUMN value_boolean DROP DEFAULT;
    RAISE NOTICE 'Removed default from value_boolean column';
  END IF;
  
  -- Check for defaults on value_numeric
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'habit_checkins'
      AND column_name = 'value_numeric'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE habit_checkins ALTER COLUMN value_numeric DROP DEFAULT;
    RAISE NOTICE 'Removed default from value_numeric column';
  END IF;
END $$;

-- ============================================================================
-- 6. VERIFICATION TESTS (COMMENTED OUT - FOR MANUAL TESTING)
-- ============================================================================

/*
-- These tests should be run manually after migration to verify correctness:

-- Test 1: Must FAIL (done with both values NULL)
INSERT INTO habit_checkins (activity_id, owner_id, local_date, status, value_boolean, value_numeric)
VALUES (
  (SELECT id FROM activities LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE,
  'done',
  NULL,
  NULL
);

-- Test 2: Must PASS (missed with both values NULL)
INSERT INTO habit_checkins (activity_id, owner_id, local_date, status, value_boolean, value_numeric)
VALUES (
  (SELECT id FROM activities LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE,
  'missed',
  NULL,
  NULL
);

-- Test 3: Must PASS (done with boolean value)
INSERT INTO habit_checkins (activity_id, owner_id, local_date, status, value_boolean, value_numeric)
VALUES (
  (SELECT id FROM activities LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE,
  'done',
  TRUE,
  NULL
);

-- Test 4: Must PASS (done with numeric value)
INSERT INTO habit_checkins (activity_id, owner_id, local_date, status, value_boolean, value_numeric)
VALUES (
  (SELECT id FROM activities LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE,
  'done',
  NULL,
  7
);

-- Test 5: Must FAIL (missed with value set)
INSERT INTO habit_checkins (activity_id, owner_id, local_date, status, value_boolean, value_numeric)
VALUES (
  (SELECT id FROM activities LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE,
  'missed',
  TRUE,
  NULL
);
*/
