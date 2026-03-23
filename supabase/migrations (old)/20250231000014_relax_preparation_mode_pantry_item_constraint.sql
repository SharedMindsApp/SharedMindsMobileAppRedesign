/*
  # Relax Preparation Mode Pantry Item Constraint
  
  ## Problem
  The current constraint requires pantry_item_id to be NOT NULL when preparation_mode = 'pre_bought'.
  This prevents users from switching to pre_bought mode first and adding the pantry item later.
  
  ## Solution
  Relax the constraint to allow pre_bought mode without pantry_item_id initially.
  Users can switch to pre_bought mode, then add the pantry item via the UI.
  
  ## Behavior
  - preparation_mode = 'scratch': pantry_item_id MUST be NULL
  - preparation_mode = 'pre_bought': pantry_item_id CAN be NULL (optional initially)
  - This allows a smoother UX flow where users can switch modes first, then add pantry items
*/

-- ============================================================================
-- 1. DROP EXISTING CONSTRAINT
-- ============================================================================

ALTER TABLE meal_plans
DROP CONSTRAINT IF EXISTS meal_plans_preparation_mode_pantry_item_check;

-- ============================================================================
-- 2. CREATE RELAXED CONSTRAINT
-- ============================================================================
-- Only enforce that scratch mode cannot have pantry_item_id
-- Pre_bought mode can have pantry_item_id as NULL initially (user adds it later)

ALTER TABLE meal_plans
ADD CONSTRAINT meal_plans_preparation_mode_pantry_item_check
CHECK (
  (preparation_mode = 'scratch' AND pantry_item_id IS NULL)
  OR
  (preparation_mode = 'pre_bought')
);

-- ============================================================================
-- 3. UPDATE DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT meal_plans_preparation_mode_pantry_item_check ON meal_plans IS
  'Ensures pantry_item_id is only set when preparation_mode = "pre_bought". Allows pre_bought mode without pantry_item_id initially, so users can switch modes first and add pantry items later.';
