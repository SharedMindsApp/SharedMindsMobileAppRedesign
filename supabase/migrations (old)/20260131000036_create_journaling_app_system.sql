/*
  # Create Journaling App System in Spaces
  
  This migration creates a standalone journaling application within Spaces,
  replacing the Personal Journal and Gratitude Journal trackers.
  
  Context:
  - Journaling is better suited as a standalone app in Spaces rather than a tracker
  - Provides richer functionality (tags, search, organization)
  - Better aligns with Spaces' purpose (personal narratives and reflection)
  - Personal Journal and Gratitude Journal trackers will be deprecated
  
  Architecture:
  - personal_journal_entries table for general journaling
  - gratitude_entries already exists (from self-care system)
  - Both are linked to spaces (household_id) for organization
  - Private by default, can be shared to shared spaces
*/

-- Step 1: Create personal_journal_entries table
CREATE TABLE IF NOT EXISTS personal_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  title text,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  is_private boolean NOT NULL DEFAULT true,
  shared_space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_journal_entries_user_space 
  ON personal_journal_entries(user_id, space_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_journal_entries_space_date 
  ON personal_journal_entries(space_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_journal_entries_tags 
  ON personal_journal_entries USING GIN(tags);

-- Step 3: Enable RLS
ALTER TABLE personal_journal_entries ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for personal_journal_entries
-- Users can only see their own entries or entries shared to their spaces
CREATE POLICY "Users can view their own journal entries"
  ON personal_journal_entries FOR SELECT
  USING (
    auth.uid() = user_id OR
    (shared_space_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = shared_space_id
      AND hm.auth_user_id = auth.uid()
      AND hm.status = 'active'
    ))
  );

CREATE POLICY "Users can insert their own journal entries"
  ON personal_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON personal_journal_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON personal_journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Step 5: Update gratitude_entries to support space_id (if not already)
-- Check if space_id column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gratitude_entries' 
    AND column_name = 'space_id'
  ) THEN
    ALTER TABLE gratitude_entries 
    ADD COLUMN space_id uuid REFERENCES spaces(id) ON DELETE CASCADE;
    
    -- Migrate existing gratitude_entries to use space_id
    -- Try to find space_id from household_id (household_id might be space_id or we need to look it up)
    -- For now, we'll use household_id directly if it exists in spaces table, otherwise keep household_id
    UPDATE gratitude_entries ge
    SET space_id = COALESCE(
      (SELECT s.id FROM spaces s WHERE s.id = ge.household_id LIMIT 1),
      ge.household_id
    )
    WHERE ge.space_id IS NULL;
    
    -- Make space_id NOT NULL after migration (set to household_id if still null)
    UPDATE gratitude_entries
    SET space_id = household_id
    WHERE space_id IS NULL;
    
    ALTER TABLE gratitude_entries 
    ALTER COLUMN space_id SET NOT NULL;
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_gratitude_entries_space_date 
      ON gratitude_entries(space_id, entry_date DESC);
  END IF;
END $$;

-- Step 6: Add updated_at to gratitude_entries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gratitude_entries' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE gratitude_entries 
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Step 7: Create trigger for updated_at on personal_journal_entries
CREATE OR REPLACE FUNCTION update_personal_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personal_journal_entries_updated_at
  BEFORE UPDATE ON personal_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_journal_entries_updated_at();

-- Step 8: Create trigger for updated_at on gratitude_entries (if trigger doesn't exist)
-- First, create the function (idempotent)
CREATE OR REPLACE FUNCTION update_gratitude_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Then, create the trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'gratitude_entries_updated_at'
  ) THEN
    CREATE TRIGGER gratitude_entries_updated_at
      BEFORE UPDATE ON gratitude_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_gratitude_entries_updated_at();
  END IF;
END $$;

-- Step 9: Add widget_type enum value for journal app (if not exists)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
-- We'll use a DO block with exception handling
DO $$
BEGIN
  -- Try to add the value, ignore if it already exists
  BEGIN
    ALTER TYPE widget_type ADD VALUE 'journal';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Step 10: Deprecate Personal Journal and Gratitude Journal tracker templates
UPDATE tracker_templates
SET deprecated_at = NOW(),
    updated_at = NOW()
WHERE scope = 'global'
  AND name IN ('Personal Journal', 'Gratitude Journal')
  AND deprecated_at IS NULL;

-- Add comments
COMMENT ON TABLE personal_journal_entries IS 
  'Personal journal entries for thoughts, reflections, and growth. Part of the standalone journaling app in Spaces.';

COMMENT ON COLUMN personal_journal_entries.space_id IS 
  'The space (household) this journal entry belongs to. Links journaling to Spaces.';

COMMENT ON COLUMN personal_journal_entries.is_private IS 
  'Whether this entry is private (true) or can be shared to shared spaces (false).';

COMMENT ON COLUMN personal_journal_entries.shared_space_id IS 
  'If shared, the shared space this entry is visible in.';

COMMENT ON COLUMN tracker_templates.deprecated_at IS 
  'Timestamp when template was deprecated. Deprecated templates are hidden from new template selection but remain accessible for existing trackers. Use Journal app in Spaces instead of Personal Journal and Gratitude Journal trackers. Use enhanced Mood Tracker instead of Stress Level Tracker. Use Environmental Impact Tracker instead of Weather & Environment Tracker. Use Nutrition & Hydration Tracker instead of Nutrition Log and Water Intake Tracker. Use Health Tracker instead of Medication/Symptom Trackers. Use Fitness Tracker instead of Exercise Tracker.';

COMMENT ON TABLE tracker_templates IS 
  'Templates now include enhanced Mood Tracker (with optional stress tracking), Environmental Impact Tracker (behavior-focused environmental actions), Nutrition & Hydration Tracker (unified food + hydration tracking), Health Tracker (unified medication + symptom tracking), and Fitness Tracker (personalized movement tracking). Personal Journal and Gratitude Journal are now standalone apps in Spaces. Stress Level Tracker, Weather & Environment Tracker, Nutrition Log, Water Intake Tracker, Medication Tracker, Symptom Tracker, and Exercise Tracker are deprecated but preserved for backward compatibility.';
