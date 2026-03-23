/*
  # Add Multi-Course / Multi-Dish Meal Support
  
  ## Problem
  The Meal Planner currently treats each meal as a single dish.
  Users need to plan multi-dish meals (starters, sides, mains, desserts, shared plates)
  for cultural meals, tapas, mezze, BBQs, buffets, etc.
  
  ## Solution
  Add course_type column to meal_plans table:
  - Allows grouping dishes by course within the same meal time
  - Supports: starter, side, main, dessert, shared, snack
  - Defaults to 'main' for backward compatibility
  - No limits per course (flexibility > rules)
*/

-- ============================================
-- 1. ADD COURSE_TYPE COLUMN
-- ============================================

-- Add course_type column with default of 'main' (backward compatible)
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS course_type TEXT NOT NULL DEFAULT 'main';

-- ============================================
-- 2. ADD CONSTRAINT
-- ============================================

-- Add check constraint for valid course types
ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_course_type_check;

ALTER TABLE meal_plans
  ADD CONSTRAINT meal_plans_course_type_check
  CHECK (course_type IN (
    'starter',
    'side',
    'main',
    'dessert',
    'shared',
    'snack'
  ));

-- ============================================
-- 3. UPDATE EXISTING RECORDS
-- ============================================

-- Ensure all existing records have course_type = 'main' (backward compatibility)
UPDATE meal_plans
SET course_type = 'main'
WHERE course_type IS NULL OR course_type = '';

-- ============================================
-- 4. ADD INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meal_plans_course_type ON meal_plans(course_type);

-- ============================================
-- 5. ADD COMMENT
-- ============================================

COMMENT ON COLUMN meal_plans.course_type IS 
  'Type of dish/course: starter, side, main, dessert, shared, or snack. Defaults to "main" for backward compatibility. Used to group multiple dishes within the same meal time (e.g., tapas, Indian meals, mezze).';
