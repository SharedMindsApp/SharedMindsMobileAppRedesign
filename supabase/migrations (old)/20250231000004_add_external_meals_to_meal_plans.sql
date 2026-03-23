/*
  # Add Pre-Prepared & Restaurant Meals to Meal Planner
  
  ## Problem
  The Meal Planner currently assumes meals are either:
  - Recipes (recipe_id)
  - Meals from meal_library (meal_id)
  - Custom meals (custom_meal_name)
  
  This breaks down for real-world usage where users:
  - Buy food from shops
  - Eat at restaurants
  - Grab ready-made meals
  - Don't cook every meal
  
  ## Solution
  Extend meal_plans table to support external meals:
  - Add meal_source column to distinguish source types
  - Add external meal metadata (name, vendor, type)
  - Add is_prepared flag (false for external meals)
  - Update CHECK constraint to support external meals
  - Keep backward compatibility (existing meals default to appropriate source)
*/

-- ============================================
-- 1. ADD EXTERNAL MEAL COLUMNS
-- ============================================

-- Add meal_source column (default to 'meal_library' for backward compatibility)
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS meal_source TEXT CHECK (
    meal_source IN ('recipe', 'meal_library', 'external', 'custom')
  );

-- Add external meal metadata columns
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS external_name TEXT,
  ADD COLUMN IF NOT EXISTS external_vendor TEXT,
  ADD COLUMN IF NOT EXISTS external_type TEXT CHECK (
    external_type IN ('restaurant', 'shop', 'cafe', 'takeaway', 'other')
  ),
  ADD COLUMN IF NOT EXISTS is_prepared BOOLEAN DEFAULT TRUE;

-- Add scheduled_at for time-based scheduling (optional, for free-time placement)
ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- ============================================
-- 2. SET DEFAULT meal_source BASED ON EXISTING DATA
-- ============================================

-- Set meal_source for existing records based on what's populated
UPDATE meal_plans
SET meal_source = CASE
  WHEN recipe_id IS NOT NULL THEN 'recipe'
  WHEN meal_id IS NOT NULL THEN 'meal_library'
  WHEN custom_meal_name IS NOT NULL THEN 'custom'
  ELSE 'custom' -- Fallback for edge cases
END
WHERE meal_source IS NULL;

-- Set default meal_source for new records (will be overridden by application logic)
ALTER TABLE meal_plans
  ALTER COLUMN meal_source SET DEFAULT 'meal_library';

-- ============================================
-- 3. UPDATE CHECK CONSTRAINT
-- ============================================

-- Drop existing constraints if they exist
ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_meal_or_recipe_check;

ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_meal_source_check;

-- Add new constraint that supports external meals
ALTER TABLE meal_plans
  ADD CONSTRAINT meal_plans_meal_source_check
  CHECK (
    (meal_source = 'recipe' AND recipe_id IS NOT NULL AND meal_id IS NULL AND external_name IS NULL)
    OR (meal_source = 'meal_library' AND meal_id IS NOT NULL AND recipe_id IS NULL AND external_name IS NULL)
    OR (meal_source = 'external' AND external_name IS NOT NULL AND recipe_id IS NULL AND meal_id IS NULL)
    OR (meal_source = 'custom' AND custom_meal_name IS NOT NULL AND recipe_id IS NULL AND meal_id IS NULL AND external_name IS NULL)
  );

-- ============================================
-- 4. UPDATE UNIQUE CONSTRAINT (if needed)
-- ============================================

-- The existing unique constraint on (household_id, week_start_date, day_of_week, meal_type)
-- should still work, but we may want to relax it for external meals with specific times
-- For now, keep the existing constraint - external meals can still use meal_type slots

-- ============================================
-- 5. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_source ON meal_plans(meal_source);
CREATE INDEX IF NOT EXISTS idx_meal_plans_external_type ON meal_plans(external_type) WHERE external_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_plans_scheduled_at ON meal_plans(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ============================================
-- 6. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN meal_plans.meal_source IS 
  'Source type: recipe (from recipes table), meal_library (from meal_library table), external (bought/prepared elsewhere), or custom (user-entered name)';

COMMENT ON COLUMN meal_plans.external_name IS 
  'Name of external meal (required when meal_source = external). e.g., "Chicken Caesar Sandwich", "Pad Thai"';

COMMENT ON COLUMN meal_plans.external_vendor IS 
  'Vendor/source of external meal (optional). e.g., "Tesco", "Nando''s", "Local Cafe"';

COMMENT ON COLUMN meal_plans.external_type IS 
  'Type of external meal source: restaurant, shop, cafe, takeaway, or other';

COMMENT ON COLUMN meal_plans.is_prepared IS 
  'Whether the meal requires preparation/cooking. Defaults to TRUE. Set to FALSE for external meals (bought/restaurant).';

COMMENT ON COLUMN meal_plans.scheduled_at IS 
  'Optional specific time for the meal (allows free-time placement, not just meal slots). Used for external meals that don''t fit standard meal times.';
