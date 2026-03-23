/*
  # Fix Pantry Items Foreign Key for Polymorphic Space Support
  
  The current FK constraint household_pantry_items_household_id_fkey only references households(id),
  but household_id is polymorphic and can refer to:
  - Personal spaces
  - Households
  - Teams
  
  This migration:
  1. Drops the invalid FK constraint
  2. Documents the polymorphic nature of household_id
  3. RLS policies already handle all space types (from previous migration)
*/

-- Drop the invalid foreign key constraint
-- PostgreSQL auto-generates constraint names, so we need to find and drop it
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the foreign key constraint on household_id
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'household_pantry_items'::regclass
    AND confrelid = 'households'::regclass
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'household_pantry_items'::regclass AND attname = 'household_id')]
    AND contype = 'f';
  
  -- Drop it if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE household_pantry_items DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Add comment documenting polymorphic nature
COMMENT ON COLUMN household_pantry_items.household_id IS 
'Polymorphic space identifier (personal | household | team). Enforced via RLS, not FK.';
