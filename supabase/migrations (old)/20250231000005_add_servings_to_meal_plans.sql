/*
  # Add Portion / Serving Size Control to Meal Planner
  
  ## Problem
  The Meal Planner currently assumes family-sized cooking by default.
  Users need to specify how many portions they're making when adding meals.
  
  ## Solution
  Add servings column to meal_plans table:
  - Represents how many portions the user intends to make/eat
  - Defaults to 1 (individual-friendly)
  - Allows scaling ingredients, nutrition, and downstream logic
  - Works for recipes, meal library items, custom meals, and external meals
*/

-- ============================================
-- 1. ADD SERVINGS COLUMN
-- ============================================

-- Add servings column with default of 1 (individual-friendly)
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS servings INTEGER NOT NULL DEFAULT 1 
  CHECK (servings > 0 AND servings <= 12);

-- ============================================
-- 2. UPDATE EXISTING RECORDS
-- ============================================

-- Set servings to 1 for all existing records (backward compatibility)
UPDATE meal_plans
SET servings = 1
WHERE servings IS NULL OR servings < 1;

-- ============================================
-- 3. ADD INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meal_plans_servings ON meal_plans(servings);

-- ============================================
-- 4. ADD COMMENT
-- ============================================

COMMENT ON COLUMN meal_plans.servings IS 
  'Number of portions the user intends to make/eat for this meal plan entry. Defaults to 1 (individual-friendly). Used to scale ingredients, nutrition, and shopping lists. Range: 1-12.';
