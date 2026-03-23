/*
  # Add Type Column to Households Table

  1. Changes
    - Add `type` column to `households` table
    - Set default to 'shared' for backwards compatibility
    - Mark existing households as 'shared'
  
  2. Security
    - No RLS changes needed - existing policies still apply
*/

-- Add type column to households table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'type'
  ) THEN
    ALTER TABLE households
    ADD COLUMN type text DEFAULT 'shared' CHECK (type IN ('personal', 'shared'));
    
    -- Mark all existing households as 'shared'
    UPDATE households SET type = 'shared' WHERE type IS NULL;
    
    -- Make type not null after setting defaults
    ALTER TABLE households ALTER COLUMN type SET NOT NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_households_type ON households(type);
