/*
  # Add Icon Support to Recipe Links

  1. Changes
    - Add `icon_name` column to `recipe_links` table
      - Stores the key/name of the selected icon from the predefined library
      - Nullable to allow recipes without icons
      - Default value is null

  2. Notes
    - No RLS changes needed - existing policies cover this column
    - Icons are selected from a predefined library in the frontend
*/

-- Add icon_name column to recipe_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipe_links' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE recipe_links ADD COLUMN icon_name text;
  END IF;
END $$;
