/*
  # Make item_name Nullable in Pantry Items
  
  With the unified food system, pantry items now reference food_items via food_item_id.
  The item_name column is kept for backward compatibility but should be nullable
  since we no longer require it for new inserts.
  
  This migration:
  1. Makes item_name nullable in household_pantry_items
  2. Ensures existing data remains intact
*/

-- Make item_name nullable (it's now optional, used only for backward compatibility)
ALTER TABLE household_pantry_items
ALTER COLUMN item_name DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN household_pantry_items.item_name IS 
'Deprecated: Use food_item_id instead. Kept for backward compatibility. Can be NULL for new items.';
