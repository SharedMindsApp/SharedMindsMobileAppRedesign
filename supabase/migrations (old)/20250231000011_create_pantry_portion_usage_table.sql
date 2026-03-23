/*
  # Create Pantry Portion Usage Table
  
  ## Problem
  Need to track how pantry portions are consumed by meal plans. One pantry item
  (e.g., tub of ice cream with 6 servings) can be used across multiple meal plans
  over time, and we need to track which meal plans consumed which portions.
  
  ## Solution
  Create pantry_portion_usage table to track:
  - Which pantry item provided portions
  - Which meal plan consumed those portions
  - How many portions were consumed
  
  ## Behavior
  - One pantry item can be used by many meal plans
  - One meal plan can consume portions from multiple pantry items
  - When a meal plan is deleted or servings change, usage records are cleaned up
  - Usage records are used to restore portions when meals are removed
  
  ## RLS
  - Users can only access usage rows for meal plans they own
  - Users can only insert usage rows for meal plans they own
  - Follows existing pantry RLS patterns (split policies, no OR chains)
*/

-- ============================================================================
-- 1. CREATE pantry_portion_usage TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pantry_portion_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pantry_item_id uuid NOT NULL REFERENCES household_pantry_items(id) ON DELETE CASCADE,
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  portions_used integer NOT NULL CHECK (portions_used > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (pantry_item_id, meal_plan_id)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pantry_portion_usage_pantry_item 
  ON pantry_portion_usage(pantry_item_id);

CREATE INDEX IF NOT EXISTS idx_pantry_portion_usage_meal_plan 
  ON pantry_portion_usage(meal_plan_id);

CREATE INDEX IF NOT EXISTS idx_pantry_portion_usage_created 
  ON pantry_portion_usage(created_at);

-- ============================================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Reuse existing update_updated_at_column function if it exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_pantry_portion_usage_updated_at
  BEFORE UPDATE ON pantry_portion_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. ENABLE RLS
-- ============================================================================

ALTER TABLE pantry_portion_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES
-- ============================================================================
-- Follow existing pantry RLS patterns: split policies, no OR chains
-- Users can only access usage rows for meal plans they own

-- Ensure helper functions exist (reuse from other migrations)
-- is_user_profile and is_user_household_member should already exist

-- ============================================================================
-- 5.1. INSERT POLICIES (WITH CHECK only)
-- ============================================================================

-- Policy: Users can insert usage rows for meal plans they own
-- Ownership is determined by meal_plans.space_id (which maps to household_id or profile_id)
CREATE POLICY "Users can create pantry portion usage for their meal plans"
  ON pantry_portion_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM meal_plans mp
      WHERE mp.id = pantry_portion_usage.meal_plan_id
        AND (
          -- Personal space: check if user owns the space
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN space_members sm ON sm.space_id = s.id
            JOIN profiles p ON p.id = sm.user_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'personal'
              AND p.user_id = auth.uid()
              AND sm.status = 'active'
          )
          OR
          -- Household space: check if user is a household member
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN household_members hm ON hm.household_id = s.context_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'household'
              AND s.context_id IS NOT NULL
              AND hm.auth_user_id = auth.uid()
              AND hm.status = 'active'
          )
        )
    )
  );

-- ============================================================================
-- 5.2. SELECT POLICIES (USING - required for INSERT visibility)
-- ============================================================================

-- Policy: Users can view usage rows for meal plans they own
CREATE POLICY "Users can view pantry portion usage for their meal plans"
  ON pantry_portion_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM meal_plans mp
      WHERE mp.id = pantry_portion_usage.meal_plan_id
        AND (
          -- Personal space: check if user owns the space
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN space_members sm ON sm.space_id = s.id
            JOIN profiles p ON p.id = sm.user_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'personal'
              AND p.user_id = auth.uid()
              AND sm.status = 'active'
          )
          OR
          -- Household space: check if user is a household member
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN household_members hm ON hm.household_id = s.context_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'household'
              AND s.context_id IS NOT NULL
              AND hm.auth_user_id = auth.uid()
              AND hm.status = 'active'
          )
        )
    )
  );

-- ============================================================================
-- 5.3. UPDATE POLICIES (USING + WITH CHECK)
-- ============================================================================

-- Policy: Users can update usage rows for meal plans they own
CREATE POLICY "Users can update pantry portion usage for their meal plans"
  ON pantry_portion_usage
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM meal_plans mp
      WHERE mp.id = pantry_portion_usage.meal_plan_id
        AND (
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN space_members sm ON sm.space_id = s.id
            JOIN profiles p ON p.id = sm.user_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'personal'
              AND p.user_id = auth.uid()
              AND sm.status = 'active'
          )
          OR
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN household_members hm ON hm.household_id = s.context_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'household'
              AND s.context_id IS NOT NULL
              AND hm.auth_user_id = auth.uid()
              AND hm.status = 'active'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM meal_plans mp
      WHERE mp.id = pantry_portion_usage.meal_plan_id
        AND (
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN space_members sm ON sm.space_id = s.id
            JOIN profiles p ON p.id = sm.user_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'personal'
              AND p.user_id = auth.uid()
              AND sm.status = 'active'
          )
          OR
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN household_members hm ON hm.household_id = s.context_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'household'
              AND s.context_id IS NOT NULL
              AND hm.auth_user_id = auth.uid()
              AND hm.status = 'active'
          )
        )
    )
  );

-- ============================================================================
-- 5.4. DELETE POLICIES (USING only)
-- ============================================================================

-- Policy: Users can delete usage rows for meal plans they own
CREATE POLICY "Users can delete pantry portion usage for their meal plans"
  ON pantry_portion_usage
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM meal_plans mp
      WHERE mp.id = pantry_portion_usage.meal_plan_id
        AND (
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN space_members sm ON sm.space_id = s.id
            JOIN profiles p ON p.id = sm.user_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'personal'
              AND p.user_id = auth.uid()
              AND sm.status = 'active'
          )
          OR
          EXISTS (
            SELECT 1
            FROM spaces s
            JOIN household_members hm ON hm.household_id = s.context_id
            WHERE s.id = mp.space_id
              AND s.context_type = 'household'
              AND s.context_id IS NOT NULL
              AND hm.auth_user_id = auth.uid()
              AND hm.status = 'active'
          )
        )
    )
  );

-- ============================================================================
-- 6. ADD DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE pantry_portion_usage IS
  'Tracks how pantry portions are consumed by meal plans. Links portion-tracked pantry items to meal plans that consume them. Used to restore portions when meals are removed or servings change.';

COMMENT ON COLUMN pantry_portion_usage.pantry_item_id IS
  'Reference to portion-tracked pantry item (must have total_portions IS NOT NULL).';

COMMENT ON COLUMN pantry_portion_usage.meal_plan_id IS
  'Reference to meal plan that consumes these portions.';

COMMENT ON COLUMN pantry_portion_usage.portions_used IS
  'Number of portions consumed by this meal plan. Must be > 0.';
