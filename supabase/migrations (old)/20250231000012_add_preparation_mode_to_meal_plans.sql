/*
  # Add Preparation Mode to Meal Plans
  
  ## Problem
  Users need to distinguish between recipes that are:
  - Made from scratch (use ingredients)
  - Pre-bought / ready-made (use portion-based pantry items)
  
  Currently, all recipes are treated as "made from scratch", which doesn't support
  real-world usage where users buy ready-made items (trifle, lasagne, curry, etc.).
  
  ## Solution
  Add preparation_mode column to meal_plans to track how each meal is prepared.
  When pre_bought, link to a pantry item and use portion tracking instead of ingredients.
  
  ## Behavior
  - preparation_mode = 'scratch' (default): Use ingredient-based logic
  - preparation_mode = 'pre_bought': Use portion-based pantry item
  - pantry_item_id: Only set when preparation_mode = 'pre_bought'
  - Recipes remain unchanged (no duplication, no mode conflicts)
  
  ## Safety
  - Default is 'scratch' (backward compatible)
  - Constraint ensures pantry_item_id only when pre_bought
  - All existing meal plans continue to work unchanged
*/

-- ============================================================================
-- 1. ADD PREPARATION MODE COLUMN
-- ============================================================================

ALTER TABLE meal_plans
ADD COLUMN IF NOT EXISTS preparation_mode text
  CHECK (preparation_mode IN ('scratch', 'pre_bought'))
  DEFAULT 'scratch';

-- ============================================================================
-- 2. ADD PANTRY ITEM LINK COLUMN
-- ============================================================================

ALTER TABLE meal_plans
ADD COLUMN IF NOT EXISTS pantry_item_id uuid REFERENCES household_pantry_items(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. ADD CONSTRAINT: pantry_item_id only allowed when pre_bought
-- ============================================================================

ALTER TABLE meal_plans
DROP CONSTRAINT IF EXISTS meal_plans_preparation_mode_pantry_item_check;

ALTER TABLE meal_plans
ADD CONSTRAINT meal_plans_preparation_mode_pantry_item_check
CHECK (
  (preparation_mode = 'scratch' AND pantry_item_id IS NULL)
  OR
  (preparation_mode = 'pre_bought' AND pantry_item_id IS NOT NULL)
);

-- ============================================================================
-- 4. CREATE INDEX FOR PANTRY ITEM LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_meal_plans_pantry_item_id 
  ON meal_plans(pantry_item_id) 
  WHERE pantry_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plans_preparation_mode 
  ON meal_plans(preparation_mode) 
  WHERE preparation_mode = 'pre_bought';

-- ============================================================================
-- 5. ADD DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN meal_plans.preparation_mode IS
  'How the meal is prepared: "scratch" = made from ingredients, "pre_bought" = ready-made item from pantry. Default is "scratch" for backward compatibility.';

COMMENT ON COLUMN meal_plans.pantry_item_id IS
  'Reference to portion-tracked pantry item when preparation_mode = "pre_bought". Must be NULL when preparation_mode = "scratch".';

COMMENT ON CONSTRAINT meal_plans_preparation_mode_pantry_item_check ON meal_plans IS
  'Ensures pantry_item_id is only set when preparation_mode = "pre_bought". Prevents invalid states where scratch meals reference pantry items or pre_bought meals lack pantry items.';
