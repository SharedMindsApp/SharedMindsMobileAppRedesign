/*
  # Add soft delete to fridge widgets

  1. Changes
    - Add `deleted_at` column to `fridge_widgets` table
    - Widgets are soft-deleted when user clicks trash
    - Widgets are kept for 48 hours before permanent deletion
    - Add index on deleted_at for efficient queries

  2. Notes
    - NULL = active widget
    - Non-null timestamp = soft-deleted widget
    - Frontend can filter by deleted_at IS NULL for active widgets
    - Trash viewer shows deleted_at IS NOT NULL widgets
*/

DO $$
BEGIN
  -- Add deleted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fridge_widgets' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE fridge_widgets ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Add index for efficient queries on deleted_at
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_deleted_at ON fridge_widgets(deleted_at);

-- Add index for household + deleted_at queries
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_household_deleted ON fridge_widgets(household_id, deleted_at);