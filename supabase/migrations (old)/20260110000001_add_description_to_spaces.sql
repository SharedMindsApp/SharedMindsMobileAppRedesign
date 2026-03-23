/*
  # Add Description Column to Spaces
  
  Adds description column to spaces table to support optional descriptions
  for Households and Teams.
*/

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'description'
  ) THEN
    ALTER TABLE spaces ADD COLUMN description text;
    -- Add comment
    COMMENT ON COLUMN spaces.description IS 'Optional description for the space (Household or Team)';
  END IF;
END $$;
