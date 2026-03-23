/*
  # Add Roadmap Item Types System

  1. New Enum
    - `roadmap_item_type`: 10 canonical types (task, event, note, document, milestone, goal, photo, grocery_list, habit, review)

  2. Schema Changes
    - Add `type` column to roadmap_items (defaults to 'task')
    - Add `metadata` column for type-specific data
    - Make `start_date` and `end_date` nullable (type-dependent)
    - Update status enum with 'on_hold' and 'archived'

  3. Timeline Eligibility
    - event, milestone: Always timeline-eligible (require dates)
    - goal: Optional timeline (if dates present)
    - Others: Content-only (never on timeline)
    - Enforced in service layer, not database

  4. Backward Compatibility
    - Existing items default to 'task' type
    - Dates remain NOT NULL by default for existing data
    - New items can have NULL dates based on type
*/

-- Step 1: Create item type enum
DO $$ BEGIN
  CREATE TYPE roadmap_item_type AS ENUM (
    'task',
    'event',
    'note',
    'document',
    'milestone',
    'goal',
    'photo',
    'grocery_list',
    'habit',
    'review'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new status values to existing enum
DO $$ BEGIN
  ALTER TYPE roadmap_item_status ADD VALUE IF NOT EXISTS 'on_hold';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE roadmap_item_status ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- Step 3: Add new columns to roadmap_items
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS type roadmap_item_type DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Step 4: Make dates nullable for future items
-- Note: This doesn't affect existing data, only new inserts
ALTER TABLE roadmap_items
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Step 5: Add updated_at column if it doesn't exist
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 6: Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_roadmap_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
DROP TRIGGER IF EXISTS roadmap_items_updated_at_trigger ON roadmap_items;
CREATE TRIGGER roadmap_items_updated_at_trigger
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_items_updated_at();

-- Step 8: Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_roadmap_items_type ON roadmap_items(type);

-- Step 9: Create index on track_id for querying by track
CREATE INDEX IF NOT EXISTS idx_roadmap_items_track_id ON roadmap_items(track_id) WHERE track_id IS NOT NULL;

-- Step 10: Update constraint to allow NULL dates
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS valid_date_range;
ALTER TABLE roadmap_items
  ADD CONSTRAINT valid_date_range CHECK (
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date IS NOT NULL AND (end_date IS NULL OR end_date >= start_date))
  );
