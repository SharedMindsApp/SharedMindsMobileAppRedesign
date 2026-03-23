/*
  # Fix Fridge Widgets Schema Cache
  
  This migration ensures the fridge_widgets table schema is properly recognized
  by Supabase's schema cache. It verifies the 'shared' column exists and 
  recreates it if necessary.
  
  1. Changes
    - Ensure 'shared' column exists on fridge_widgets table
    - Refresh schema cache by touching the table
*/

-- Ensure the shared column exists (idempotent operation)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fridge_widgets' 
    AND column_name = 'shared'
  ) THEN
    ALTER TABLE fridge_widgets ADD COLUMN shared boolean DEFAULT true;
  END IF;
END $$;

-- Touch the table to refresh PostgREST schema cache
COMMENT ON TABLE fridge_widgets IS 'Fridge board widgets for household canvas - updated schema';
