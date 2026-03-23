/*
  # Diagnose and Fix valid_checkin_value Constraint Violation
  
  ## Problem
  Despite correct payloads from the application, Supabase is returning:
  ERROR: new row violates check constraint "valid_checkin_value" (23514)
  
  This migration:
  1. Runs comprehensive diagnostics to identify the root cause
  2. Checks column types, defaults, triggers, and constraint definitions
  3. Tests manual insert to isolate the issue
  4. Applies definitive fix if needed
  
  ## Expected Payload (from debug logs)
  {
    "status": "done",
    "value_boolean": true,
    "value_numeric": null,
    "notes": null
  }
  
  This should pass the constraint but is failing.
*/

-- ============================================================================
-- TASK 1: DIAGNOSTIC QUERIES
-- ============================================================================

-- 1️⃣ Confirm column types (CRITICAL)
-- Run this and check results:
DO $$
DECLARE
  v_boolean_type text;
  v_numeric_type text;
  v_status_type text;
  v_boolean_default text;
  v_numeric_default text;
BEGIN
  -- Check value_boolean
  SELECT data_type, column_default INTO v_boolean_type, v_boolean_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'habit_checkins'
    AND column_name = 'value_boolean';
  
  -- Check value_numeric
  SELECT data_type, column_default INTO v_numeric_type, v_numeric_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'habit_checkins'
    AND column_name = 'value_numeric';
  
  -- Check status
  SELECT data_type INTO v_status_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'habit_checkins'
    AND column_name = 'status';
  
  -- Report findings
  RAISE NOTICE '=== COLUMN TYPE DIAGNOSTICS ===';
  RAISE NOTICE 'value_boolean: type=%, default=%', v_boolean_type, COALESCE(v_boolean_default, 'NULL');
  RAISE NOTICE 'value_numeric: type=%, default=%', v_numeric_type, COALESCE(v_numeric_default, 'NULL');
  RAISE NOTICE 'status: type=%', v_status_type;
  
  -- Check for issues
  IF v_boolean_type != 'boolean' THEN
    RAISE WARNING 'ISSUE: value_boolean is type % (expected boolean)', v_boolean_type;
  END IF;
  
  IF v_numeric_type NOT IN ('numeric', 'double precision', 'real', 'integer', 'bigint', 'smallint') THEN
    RAISE WARNING 'ISSUE: value_numeric is type % (expected numeric)', v_numeric_type;
  END IF;
  
  IF v_boolean_default IS NOT NULL THEN
    RAISE WARNING 'ISSUE: value_boolean has default: % (should be NULL)', v_boolean_default;
  END IF;
  
  IF v_numeric_default IS NOT NULL THEN
    RAISE WARNING 'ISSUE: value_numeric has default: % (should be NULL)', v_numeric_default;
  END IF;
END $$;

-- 2️⃣ Confirm constraint definition EXACTLY as executed
-- Report all constraints on habit_checkins
DO $$
DECLARE
  r RECORD;
  constraint_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== CONSTRAINT DEFINITIONS ===';
  
  FOR r IN
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'habit_checkins'::regclass
    ORDER BY conname
  LOOP
    constraint_count := constraint_count + 1;
    RAISE NOTICE 'Constraint: %', r.conname;
    RAISE NOTICE 'Definition: %', r.definition;
    
    -- Check for multiple valid_checkin_value constraints
    IF r.conname LIKE '%valid_checkin%' THEN
      RAISE NOTICE '  ^^^ Found valid_checkin constraint';
    END IF;
  END LOOP;
  
  IF constraint_count = 0 THEN
    RAISE WARNING 'No constraints found on habit_checkins table!';
  END IF;
END $$;

-- 3️⃣ Check for triggers mutating values
DO $$
DECLARE
  r RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== TRIGGER DIAGNOSTICS ===';
  
  FOR r IN
    SELECT tgname, pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid = 'habit_checkins'::regclass
      AND NOT tgisinternal
    ORDER BY tgname
  LOOP
    trigger_count := trigger_count + 1;
    RAISE NOTICE 'Trigger: %', r.tgname;
    RAISE NOTICE 'Definition: %', r.definition;
    
    -- Check if trigger might mutate values
    IF r.definition LIKE '%value_boolean%' 
       OR r.definition LIKE '%value_numeric%'
       OR r.definition LIKE '%status%' THEN
      RAISE WARNING '  ^^^ WARNING: This trigger may mutate value columns!';
    END IF;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE 'No non-internal triggers found (expected)';
  END IF;
END $$;

-- 4️⃣ Test manual insert (if we have valid IDs)
-- This will fail if the constraint is wrong
DO $$
DECLARE
  test_activity_id uuid;
  test_owner_id uuid;
  test_result text;
BEGIN
  RAISE NOTICE '=== MANUAL INSERT TEST ===';
  
  -- Try to get valid IDs (use first available)
  -- Note: column is 'type', not 'activity_type'
  SELECT id INTO test_activity_id
  FROM activities
  WHERE type = 'habit'
  LIMIT 1;
  
  SELECT id INTO test_owner_id
  FROM auth.users
  LIMIT 1;
  
  IF test_activity_id IS NULL OR test_owner_id IS NULL THEN
    RAISE NOTICE 'Skipping manual insert test - no valid IDs found';
    RAISE NOTICE '  (Run manually with your actual IDs)';
  ELSE
    BEGIN
      -- Try the exact insert that should work
      INSERT INTO habit_checkins (
        activity_id,
        owner_id,
        local_date,
        status,
        value_boolean,
        value_numeric,
        notes
      )
      VALUES (
        test_activity_id,
        test_owner_id,
        CURRENT_DATE,
        'done',
        true,
        NULL,
        NULL
      );
      
      RAISE NOTICE 'SUCCESS: Manual insert passed!';
      
      -- Clean up test row
      DELETE FROM habit_checkins
      WHERE activity_id = test_activity_id
        AND owner_id = test_owner_id
        AND local_date = CURRENT_DATE
        AND status = 'done'
        AND value_boolean = true;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'FAILED: Manual insert failed with error: %', SQLERRM;
      RAISE WARNING '  This confirms the constraint is rejecting valid data!';
    END;
  END IF;
END $$;

-- ============================================================================
-- TASK 2: APPLY DEFINITIVE FIX
-- ============================================================================

-- Drop ALL existing valid_checkin constraints (any variation)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== DROPPING EXISTING CONSTRAINTS ===';
  
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'habit_checkins'::regclass
      AND conname LIKE '%valid_checkin%'
  LOOP
    EXECUTE format('ALTER TABLE habit_checkins DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- Remove any defaults that might interfere
-- Note: DROP DEFAULT doesn't support IF EXISTS, so we use DO block
DO $$
BEGIN
  -- Check and drop default on value_boolean
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'habit_checkins'
      AND column_name = 'value_boolean'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE habit_checkins ALTER COLUMN value_boolean DROP DEFAULT;
    RAISE NOTICE 'Removed default from value_boolean';
  END IF;
  
  -- Check and drop default on value_numeric
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'habit_checkins'
      AND column_name = 'value_numeric'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE habit_checkins ALTER COLUMN value_numeric DROP DEFAULT;
    RAISE NOTICE 'Removed default from value_numeric';
  END IF;
END $$;

-- Create the definitive constraint (verbatim from requirements)
ALTER TABLE habit_checkins
ADD CONSTRAINT valid_checkin_value
CHECK (
  (
    status IN ('done', 'partial')
    AND (
      (value_boolean IS NOT NULL AND value_numeric IS NULL)
      OR
      (value_boolean IS NULL AND value_numeric IS NOT NULL)
    )
  )
  OR
  (
    status IN ('missed', 'skipped')
    AND value_boolean IS NULL
    AND value_numeric IS NULL
  )
);

-- Add comment
COMMENT ON CONSTRAINT valid_checkin_value ON habit_checkins IS
  'Enforces valid check-in values: done/partial must have exactly one value set; missed/skipped must have both values NULL.';

-- ============================================================================
-- VERIFICATION: Re-test after fix
-- ============================================================================

DO $$
DECLARE
  test_activity_id uuid;
  test_owner_id uuid;
BEGIN
  RAISE NOTICE '=== POST-FIX VERIFICATION ===';
  
  -- Try to get valid IDs
  -- Note: column is 'type', not 'activity_type'
  SELECT id INTO test_activity_id
  FROM activities
  WHERE type = 'habit'
  LIMIT 1;
  
  SELECT id INTO test_owner_id
  FROM auth.users
  LIMIT 1;
  
  IF test_activity_id IS NOT NULL AND test_owner_id IS NOT NULL THEN
    BEGIN
      -- Test 1: done with boolean (should pass)
      INSERT INTO habit_checkins (
        activity_id, owner_id, local_date, status, value_boolean, value_numeric, notes
      )
      VALUES (
        test_activity_id, test_owner_id, CURRENT_DATE, 'done', true, NULL, NULL
      );
      DELETE FROM habit_checkins
      WHERE activity_id = test_activity_id AND owner_id = test_owner_id
        AND local_date = CURRENT_DATE AND status = 'done';
      RAISE NOTICE '✓ Test 1 PASSED: done with boolean=true';
      
      -- Test 2: done with numeric (should pass)
      INSERT INTO habit_checkins (
        activity_id, owner_id, local_date, status, value_boolean, value_numeric, notes
      )
      VALUES (
        test_activity_id, test_owner_id, CURRENT_DATE, 'done', NULL, 7, NULL
      );
      DELETE FROM habit_checkins
      WHERE activity_id = test_activity_id AND owner_id = test_owner_id
        AND local_date = CURRENT_DATE AND status = 'done';
      RAISE NOTICE '✓ Test 2 PASSED: done with numeric=7';
      
      -- Test 3: missed with both NULL (should pass)
      INSERT INTO habit_checkins (
        activity_id, owner_id, local_date, status, value_boolean, value_numeric, notes
      )
      VALUES (
        test_activity_id, test_owner_id, CURRENT_DATE, 'missed', NULL, NULL, NULL
      );
      DELETE FROM habit_checkins
      WHERE activity_id = test_activity_id AND owner_id = test_owner_id
        AND local_date = CURRENT_DATE AND status = 'missed';
      RAISE NOTICE '✓ Test 3 PASSED: missed with both NULL';
      
      -- Test 4: done with both NULL (should FAIL)
      BEGIN
        INSERT INTO habit_checkins (
          activity_id, owner_id, local_date, status, value_boolean, value_numeric, notes
        )
        VALUES (
          test_activity_id, test_owner_id, CURRENT_DATE, 'done', NULL, NULL, NULL
        );
        RAISE WARNING '✗ Test 4 FAILED: done with both NULL should have been rejected!';
        DELETE FROM habit_checkins
        WHERE activity_id = test_activity_id AND owner_id = test_owner_id
          AND local_date = CURRENT_DATE AND status = 'done';
      EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ Test 4 PASSED: done with both NULL correctly rejected';
      END;
      
      RAISE NOTICE '=== ALL VERIFICATION TESTS COMPLETE ===';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Verification failed with error: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Skipping verification tests - no valid IDs found';
    RAISE NOTICE 'Run manual tests with your actual IDs';
  END IF;
END $$;
