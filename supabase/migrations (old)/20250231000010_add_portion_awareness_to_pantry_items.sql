/*
  # Add Portion Awareness to Pantry Items
  
  ## Problem
  Pantry items currently track quantity (e.g., "1 bottle", "500g") but don't support
  portion-based consumption tracking. Users need to track pre-made items (ice cream,
  frozen pizza, etc.) that have a finite number of portions consumed across multiple meals.
  
  ## Solution
  Add optional portion tracking columns to household_pantry_items:
  - total_portions: Total number of portions available (NULL = unlimited/non-portion-tracked)
  - remaining_portions: Current remaining portions (defaults to total_portions)
  - portion_unit: Unit for portions (e.g., "serving", "slice", "scoop")
  
  ## Behavior
  - If total_portions IS NULL, item behaves like current pantry items (no portion tracking)
  - If total_portions IS NOT NULL, item is portion-tracked and remaining_portions is decremented
  - remaining_portions defaults to total_portions on insert
  - remaining_portions can be manually adjusted
  - When remaining_portions reaches 0, item is effectively "out of stock"
  
  ## Safety
  - All columns are nullable (backward compatible)
  - Existing items continue to work unchanged
  - Portion tracking is opt-in (only when total_portions is set)
*/

-- ============================================================================
-- 1. ADD PORTION COLUMNS TO household_pantry_items
-- ============================================================================

ALTER TABLE household_pantry_items
ADD COLUMN IF NOT EXISTS total_portions integer,
ADD COLUMN IF NOT EXISTS remaining_portions integer,
ADD COLUMN IF NOT EXISTS portion_unit text;

-- ============================================================================
-- 2. ADD CONSTRAINTS
-- ============================================================================

-- Ensure remaining_portions doesn't exceed total_portions
ALTER TABLE household_pantry_items
DROP CONSTRAINT IF EXISTS pantry_items_portion_check;

ALTER TABLE household_pantry_items
ADD CONSTRAINT pantry_items_portion_check
CHECK (
  (total_portions IS NULL AND remaining_portions IS NULL AND portion_unit IS NULL)
  OR
  (total_portions IS NOT NULL 
   AND total_portions > 0 
   AND remaining_portions IS NOT NULL 
   AND remaining_portions >= 0 
   AND remaining_portions <= total_portions)
);

-- ============================================================================
-- 3. SET DEFAULT FOR remaining_portions
-- ============================================================================

-- Create function to set remaining_portions = total_portions on insert if not provided
CREATE OR REPLACE FUNCTION set_default_remaining_portions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If total_portions is set but remaining_portions is NULL, default to total_portions
  IF NEW.total_portions IS NOT NULL AND NEW.remaining_portions IS NULL THEN
    NEW.remaining_portions := NEW.total_portions;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set default remaining_portions
DROP TRIGGER IF EXISTS trigger_set_default_remaining_portions ON household_pantry_items;

CREATE TRIGGER trigger_set_default_remaining_portions
  BEFORE INSERT OR UPDATE ON household_pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION set_default_remaining_portions();

-- ============================================================================
-- 4. ADD INDEXES
-- ============================================================================

-- Index for finding portion-tracked items
CREATE INDEX IF NOT EXISTS idx_pantry_items_portion_tracked 
  ON household_pantry_items(total_portions) 
  WHERE total_portions IS NOT NULL;

-- Index for finding depleted items (remaining_portions = 0)
CREATE INDEX IF NOT EXISTS idx_pantry_items_depleted 
  ON household_pantry_items(remaining_portions) 
  WHERE total_portions IS NOT NULL AND remaining_portions = 0;

-- ============================================================================
-- 5. ADD DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN household_pantry_items.total_portions IS
  'Total number of portions available. NULL = unlimited/non-portion-tracked item. When set, item is portion-tracked and remaining_portions is decremented as portions are consumed.';

COMMENT ON COLUMN household_pantry_items.remaining_portions IS
  'Current remaining portions. Defaults to total_portions on insert. Automatically decremented when portions are allocated to meal plans. Must be >= 0 and <= total_portions.';

COMMENT ON COLUMN household_pantry_items.portion_unit IS
  'Unit for portions (e.g., "serving", "slice", "scoop"). Used for display purposes only.';
