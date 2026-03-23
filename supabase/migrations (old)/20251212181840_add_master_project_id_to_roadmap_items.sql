/*
  # Add master_project_id to roadmap_items

  1. Changes
    - Add master_project_id column to roadmap_items table
    - Populate it from roadmap_sections (denormalization for query performance)
    - Add foreign key constraint
    - Add index for fast filtering
    - Update RLS policies to use master_project_id

  2. Rationale
    - Direct access to master_project_id improves query performance
    - Avoids JOIN with roadmap_sections for filtering
    - Common pattern: denormalize foreign keys one level up

  3. Migration Steps
    - Add column as nullable
    - Populate from sections
    - Make NOT NULL
    - Add constraints and indexes
*/

-- Add master_project_id column (nullable initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roadmap_items' AND column_name = 'master_project_id'
  ) THEN
    ALTER TABLE roadmap_items ADD COLUMN master_project_id uuid;
  END IF;
END $$;

-- Populate master_project_id from roadmap_sections
UPDATE roadmap_items ri
SET master_project_id = rs.master_project_id
FROM roadmap_sections rs
WHERE ri.section_id = rs.id
AND ri.master_project_id IS NULL;

-- Make column NOT NULL
ALTER TABLE roadmap_items ALTER COLUMN master_project_id SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'roadmap_items_master_project_id_fkey'
  ) THEN
    ALTER TABLE roadmap_items
    ADD CONSTRAINT roadmap_items_master_project_id_fkey
    FOREIGN KEY (master_project_id)
    REFERENCES master_projects(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for fast filtering by master_project_id
CREATE INDEX IF NOT EXISTS idx_roadmap_items_master_project_id
ON roadmap_items(master_project_id);

-- Add composite index for common queries (project + date)
CREATE INDEX IF NOT EXISTS idx_roadmap_items_project_dates
ON roadmap_items(master_project_id, start_date, end_date);

-- Drop old RLS policies if they exist
DROP POLICY IF EXISTS "Users can view roadmap items in their projects" ON roadmap_items;
DROP POLICY IF EXISTS "Users can create roadmap items in their projects" ON roadmap_items;
DROP POLICY IF EXISTS "Users can update roadmap items in their projects" ON roadmap_items;
DROP POLICY IF EXISTS "Users can delete roadmap items in their projects" ON roadmap_items;

-- Recreate RLS policies using master_project_id directly
CREATE POLICY "Users can view roadmap items in their projects"
  ON roadmap_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_items.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create roadmap items in their projects"
  ON roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_items.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roadmap items in their projects"
  ON roadmap_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_items.master_project_id
      AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_items.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete roadmap items in their projects"
  ON roadmap_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = roadmap_items.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Create trigger to auto-populate master_project_id on insert
CREATE OR REPLACE FUNCTION set_roadmap_item_master_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate master_project_id from section
  IF NEW.master_project_id IS NULL THEN
    SELECT master_project_id INTO NEW.master_project_id
    FROM roadmap_sections
    WHERE id = NEW.section_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_roadmap_item_master_project ON roadmap_items;

CREATE TRIGGER trigger_set_roadmap_item_master_project
  BEFORE INSERT ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION set_roadmap_item_master_project();

-- Create trigger to validate consistency on update
CREATE OR REPLACE FUNCTION validate_roadmap_item_master_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure master_project_id matches section's master_project_id
  IF NOT EXISTS (
    SELECT 1 FROM roadmap_sections
    WHERE id = NEW.section_id
    AND master_project_id = NEW.master_project_id
  ) THEN
    RAISE EXCEPTION 'master_project_id must match section''s master_project_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_roadmap_item_master_project ON roadmap_items;

CREATE TRIGGER trigger_validate_roadmap_item_master_project
  BEFORE INSERT OR UPDATE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_roadmap_item_master_project();
