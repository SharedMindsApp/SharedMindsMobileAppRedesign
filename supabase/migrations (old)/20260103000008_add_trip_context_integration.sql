/*
  # Add Trip Context Integration
  
  This migration adds support for linking trips to contexts:
  - Adds context_id field to trips table (nullable, additive)
  - Enables lazy context creation for existing trips
  - No breaking changes - all existing trips continue to work
  
  1. Changes
    - Add context_id column to trips table (nullable)
    - Add foreign key constraint
    - Add index for efficient lookups
    
  2. Safety
    - Column is nullable (existing trips unaffected)
    - No data migration (lazy creation on first use)
    - No breaking changes to existing queries
*/

-- Add context_id column to trips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'context_id'
  ) THEN
    ALTER TABLE trips
    ADD COLUMN context_id uuid REFERENCES contexts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for efficient context lookups
CREATE INDEX IF NOT EXISTS idx_trips_context 
  ON trips(context_id) 
  WHERE context_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN trips.context_id IS 
  'Optional link to context for container/nested event architecture. Created lazily on first use.';

