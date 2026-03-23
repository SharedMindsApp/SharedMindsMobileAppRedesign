/*
  # Add row and column counts to tables

  ## Summary
  Adds row_count and column_count columns to the existing tables table
  and creates triggers to keep them updated.

  ## Changes
  - Add row_count column with default 0
  - Add column_count column with default 0
  - Create/update triggers to maintain counts
*/

-- Add row_count and column_count columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tables' AND column_name = 'row_count'
  ) THEN
    ALTER TABLE tables ADD COLUMN row_count integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tables' AND column_name = 'column_count'
  ) THEN
    ALTER TABLE tables ADD COLUMN column_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Trigger to update row_count and column_count
CREATE OR REPLACE FUNCTION update_table_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'table_rows' THEN
    UPDATE tables
    SET row_count = (SELECT COUNT(*) FROM table_rows WHERE table_id = COALESCE(NEW.table_id, OLD.table_id)),
        updated_at = now()
    WHERE id = COALESCE(NEW.table_id, OLD.table_id);
  ELSIF TG_TABLE_NAME = 'table_columns' THEN
    UPDATE tables
    SET column_count = (SELECT COUNT(*) FROM table_columns WHERE table_id = COALESCE(NEW.table_id, OLD.table_id)),
        updated_at = now()
    WHERE id = COALESCE(NEW.table_id, OLD.table_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_table_row_count ON table_rows;
DROP TRIGGER IF EXISTS update_table_column_count ON table_columns;

-- Create triggers
CREATE TRIGGER update_table_row_count
  AFTER INSERT OR DELETE ON table_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_table_counts();

CREATE TRIGGER update_table_column_count
  AFTER INSERT OR DELETE ON table_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_table_counts();
