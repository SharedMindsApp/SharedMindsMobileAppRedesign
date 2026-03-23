/*
  # Add Status Column to Pantry Items
  
  This migration adds the `status` column to `household_pantry_items` table.
  The status field is optional and can be 'have', 'low', or 'out'.
  
  This supports the Pantry Widget's status management feature (hidden by default,
  exposed only in edit modal, for future intelligence without user pressure).
*/

-- Add status column to household_pantry_items
ALTER TABLE household_pantry_items
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('have', 'low', 'out') OR status IS NULL);

-- Add index for status queries (optional, but useful for future features)
CREATE INDEX IF NOT EXISTS idx_pantry_status ON household_pantry_items(status) WHERE status IS NOT NULL;

-- Comments
COMMENT ON COLUMN household_pantry_items.status IS 
  'Optional status: have (default), low, or out. Hidden by default in UI, exposed only in edit modal for future intelligence without user pressure.';
