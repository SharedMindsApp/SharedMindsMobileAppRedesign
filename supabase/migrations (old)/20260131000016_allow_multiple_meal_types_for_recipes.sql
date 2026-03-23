/*
  # Allow Multiple Meal Types for Recipes
  
  ## Problem
  Recipes currently only support a single meal_type, but some recipes (like smoothies)
  can be appropriate for multiple meal types (e.g., breakfast OR snack).
  
  ## Solution
  Change meal_type from a single enum value to an array of enum values.
  This allows recipes to be tagged with multiple meal types.
  
  ## Changes
  1. Convert meal_type column from meal_type to meal_type[]
  2. Migrate existing data (wrap single values in arrays)
  3. Update index to support array queries (GIN index)
  4. Ensure default value is an empty array
*/

-- ============================================
-- 1. BACKUP EXISTING DATA (for safety)
-- ============================================

-- Create a temporary column to store the old meal_type values
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS meal_type_old meal_type;

-- Copy existing meal_type values to backup column
UPDATE recipes
SET meal_type_old = meal_type
WHERE meal_type_old IS NULL;

-- ============================================
-- 2. DROP OLD INDEX
-- ============================================

DROP INDEX IF EXISTS idx_recipes_meal_type;

-- ============================================
-- 3. CONVERT COLUMN TO ARRAY
-- ============================================

-- Change meal_type to array type using USING clause
-- This converts the single enum value to an array in one step
ALTER TABLE recipes
  ALTER COLUMN meal_type TYPE meal_type[] USING 
    CASE 
      WHEN meal_type IS NOT NULL THEN ARRAY[meal_type]::meal_type[]
      ELSE ARRAY[]::meal_type[]
    END;

-- Set NOT NULL constraint with default empty array
ALTER TABLE recipes
  ALTER COLUMN meal_type SET NOT NULL,
  ALTER COLUMN meal_type SET DEFAULT ARRAY[]::meal_type[];

-- Ensure all rows have at least an empty array (safety check)
UPDATE recipes
SET meal_type = ARRAY[]::meal_type[]
WHERE meal_type IS NULL OR array_length(meal_type, 1) IS NULL;

-- ============================================
-- 4. CREATE NEW GIN INDEX FOR ARRAY QUERIES
-- ============================================

-- GIN index supports array containment queries (e.g., WHERE meal_type @> ARRAY['breakfast'])
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes USING GIN (meal_type) WHERE deleted_at IS NULL;

-- ============================================
-- 5. CLEANUP
-- ============================================

-- Drop the temporary backup column
ALTER TABLE recipes
  DROP COLUMN IF EXISTS meal_type_old;

-- ============================================
-- 6. ADD COMMENT
-- ============================================

COMMENT ON COLUMN recipes.meal_type IS 
  'Array of meal types this recipe is appropriate for. Allows recipes to be tagged for multiple meal times (e.g., smoothies can be breakfast OR snack). Use array containment queries: WHERE meal_type @> ARRAY[''breakfast'']';
