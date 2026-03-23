/*
  # Add Pantry Portion Usage Table
  
  ## Problem
  The application references a table called pantry_portion_usage (used for tracking
  how many portions of a pantry item are consumed by each meal plan), but this table
  does not exist in the database. This is causing runtime errors such as:
  - PGRST205: Could not find the table 'public.pantry_portion_usage'
  - 404 errors when querying /rest/v1/pantry_portion_usage
  
  ## Solution
  Create the pantry_portion_usage table with proper structure, indexes, and RLS policies.
  This table tracks portion consumption of pantry items per meal plan and is required
  for weekly pantry checks and pre-bought meal logic.
  
  ## Behavior
  - One pantry item can be used by many meal plans
  - One meal plan can consume portions from multiple pantry items
  - When a meal plan is deleted, usage records are automatically cleaned up (CASCADE)
  - When a pantry item is deleted, usage records are automatically cleaned up (CASCADE)
  - This is a system-managed table (written by services, not directly by users)
  
  ## RLS
  - Permissive policies for system-managed operations
  - SELECT, INSERT, UPDATE, DELETE all allowed for authenticated users
  - This allows the service layer to manage portion tracking without RLS conflicts
*/

-- ============================================================================
-- 1. CREATE pantry_portion_usage TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pantry_portion_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pantry_item_id uuid NOT NULL REFERENCES household_pantry_items(id) ON DELETE CASCADE,
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  portions_used numeric NOT NULL CHECK (portions_used > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
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
-- 5. CREATE PERMISSIVE RLS POLICIES (System-Managed Table)
-- ============================================================================
-- This table is system-managed (written by services, not directly by users)
-- Permissive policies allow the service layer to manage portion tracking
-- without RLS conflicts

-- SELECT Policy: Allow authenticated users to read usage records
CREATE POLICY "pantry_portion_usage_select"
  ON pantry_portion_usage
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT Policy: Allow authenticated users to create usage records
CREATE POLICY "pantry_portion_usage_insert"
  ON pantry_portion_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE Policy: Allow authenticated users to update usage records
CREATE POLICY "pantry_portion_usage_update"
  ON pantry_portion_usage
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE Policy: Allow authenticated users to delete usage records
CREATE POLICY "pantry_portion_usage_delete"
  ON pantry_portion_usage
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- 6. ADD DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE pantry_portion_usage IS
  'Tracks portion consumption of pantry items per meal plan. This table is required for weekly pantry checks and pre-bought meal logic. It is system-managed (written by services, not directly by users). Links portion-tracked pantry items to meal plans that consume them. Used to restore portions when meals are removed or servings change.';

COMMENT ON COLUMN pantry_portion_usage.pantry_item_id IS
  'Reference to portion-tracked pantry item (must have total_portions IS NOT NULL).';

COMMENT ON COLUMN pantry_portion_usage.meal_plan_id IS
  'Reference to meal plan that consumes these portions.';

COMMENT ON COLUMN pantry_portion_usage.portions_used IS
  'Number of portions consumed by this meal plan. Must be > 0.';

COMMENT ON POLICY "pantry_portion_usage_select" ON pantry_portion_usage IS
  'Permissive SELECT policy for system-managed portion tracking. Allows authenticated users to read usage records.';

COMMENT ON POLICY "pantry_portion_usage_insert" ON pantry_portion_usage IS
  'Permissive INSERT policy for system-managed portion tracking. Allows authenticated users to create usage records.';

COMMENT ON POLICY "pantry_portion_usage_update" ON pantry_portion_usage IS
  'Permissive UPDATE policy for system-managed portion tracking. Allows authenticated users to update usage records.';

COMMENT ON POLICY "pantry_portion_usage_delete" ON pantry_portion_usage IS
  'Permissive DELETE policy for system-managed portion tracking. Allows authenticated users to delete usage records.';
