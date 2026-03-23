/*
  # Update Meal Plans Unique Constraint to Support Multiple Meals Per Slot
  
  ## Problem
  The existing unique constraint on meal_plans prevents multiple meals from being added
  to the same meal slot (same space_id, week_start_date, day_of_week, meal_type).
  With multi-course support (course_type), users should be able to add multiple meals
  to the same slot (e.g., a main course + side dishes).
  
  ## Solution
  Update the unique constraint to include course_type, allowing multiple meals per slot
  as long as they have different course types. This enables:
  - Multiple dishes in the same meal time (starter, main, side, dessert, shared)
  - Different course types without conflicts
  - Still prevents exact duplicates (same meal, same course type)
  
  ## Safety
  - Migration is idempotent (safe to re-run)
  - Drops old constraint before creating new one
  - New constraint includes course_type to allow multiple meals per slot
*/

-- ============================================
-- 1. DROP OLD UNIQUE CONSTRAINT
-- ============================================

-- Drop the old constraint that doesn't include course_type
-- The constraint name may vary, so we'll try multiple possible names
ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_household_id_week_start_date_day_of_week_meal_ty_key;

-- Also try alternative constraint names that might exist
ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_space_id_week_start_date_day_of_week_meal_type_key;

-- Drop any constraint that matches the pattern
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find and drop the constraint that matches the unique pattern
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'meal_plans'::regclass
      AND contype = 'u'
      AND (
        conname LIKE '%household_id%week_start_date%day_of_week%meal_type%'
        OR conname LIKE '%space_id%week_start_date%day_of_week%meal_type%'
        OR conname LIKE '%week_start_date%day_of_week%meal_type%'
      )
  LOOP
    EXECUTE format('ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

-- ============================================
-- 2. CREATE NEW UNIQUE CONSTRAINT WITH course_type
-- ============================================

-- Check which column exists: space_id or household_id
DO $$
DECLARE
  has_space_id boolean;
  has_household_id boolean;
  constraint_name text;
BEGIN
  -- Check if space_id column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'space_id'
  ) INTO has_space_id;
  
  -- Check if household_id column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'household_id'
  ) INTO has_household_id;
  
  -- Create constraint based on which column exists
  IF has_space_id THEN
    -- Use space_id (current schema)
    constraint_name := 'meal_plans_space_id_week_start_date_day_of_week_meal_type_course_type_key';
    EXECUTE format('ALTER TABLE meal_plans ADD CONSTRAINT %I UNIQUE (space_id, week_start_date, day_of_week, meal_type, course_type)', constraint_name);
    
    -- Add comment
    EXECUTE format('COMMENT ON CONSTRAINT %I ON meal_plans IS %L', 
      constraint_name,
      'Unique constraint allowing multiple meals per slot as long as they have different course types. Enables multi-course meals (starter, main, side, dessert, shared) within the same meal time.');
      
  ELSIF has_household_id THEN
    -- Use household_id (legacy schema)
    constraint_name := 'meal_plans_household_id_week_start_date_day_of_week_meal_type_course_type_key';
    EXECUTE format('ALTER TABLE meal_plans ADD CONSTRAINT %I UNIQUE (household_id, week_start_date, day_of_week, meal_type, course_type)', constraint_name);
    
    -- Add comment
    EXECUTE format('COMMENT ON CONSTRAINT %I ON meal_plans IS %L', 
      constraint_name,
      'Unique constraint allowing multiple meals per slot as long as they have different course types. Enables multi-course meals (starter, main, side, dessert, shared) within the same meal time.');
  ELSE
    RAISE EXCEPTION 'Neither space_id nor household_id column found in meal_plans table';
  END IF;
END $$;
