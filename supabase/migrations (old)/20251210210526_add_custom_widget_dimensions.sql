/*
  # Add custom widget dimensions

  1. Changes
    - Add `custom_width` column to `fridge_widget_layouts` table
    - Add `custom_height` column to `fridge_widget_layouts` table
    - These fields allow widgets to be manually resized beyond their default size_mode dimensions
    - Nullable fields - only populated when user manually resizes a widget

  2. Notes
    - When null, widget uses default dimensions based on size_mode
    - When set, widget uses custom dimensions instead
    - Maximum size limited to 2x the default for each size_mode
*/

DO $$
BEGIN
  -- Add custom_width column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fridge_widget_layouts' AND column_name = 'custom_width'
  ) THEN
    ALTER TABLE fridge_widget_layouts ADD COLUMN custom_width integer;
  END IF;

  -- Add custom_height column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fridge_widget_layouts' AND column_name = 'custom_height'
  ) THEN
    ALTER TABLE fridge_widget_layouts ADD COLUMN custom_height integer;
  END IF;
END $$;