/*
  # Add Context Ownership to Spaces
  
  1. Changes to spaces table
    - Add `context_type` column (personal, household, team)
    - Add `context_id` column (nullable, references context entity)
  
  2. Rules
    - context_id is null when context_type = 'personal'
    - context_id references households.id when context_type = 'household'
    - context_id references teams.id when context_type = 'team'
    - ⚠️ Foreign keys not enforced yet (will be added later)
  
  3. Constraints
    - context_type must be one of: 'personal', 'household', 'team'
    - context_id must be null when context_type = 'personal'
    - context_id must NOT be null when context_type != 'personal'
  
  Note: space_type column is kept for now (will be removed in future migration)
*/

-- Add context_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'context_type'
  ) THEN
    ALTER TABLE spaces ADD COLUMN context_type text;
  END IF;
END $$;

-- Add context_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'context_id'
  ) THEN
    ALTER TABLE spaces ADD COLUMN context_id uuid;
  END IF;
END $$;

-- Add check constraint for context_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spaces_context_type_check'
  ) THEN
    ALTER TABLE spaces ADD CONSTRAINT spaces_context_type_check
      CHECK (context_type IN ('personal', 'household', 'team'));
  END IF;
END $$;

-- Add check constraint for context_id rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spaces_context_id_check'
  ) THEN
    ALTER TABLE spaces ADD CONSTRAINT spaces_context_id_check
      CHECK (
        (context_type = 'personal' AND context_id IS NULL) OR
        (context_type IN ('household', 'team') AND context_id IS NOT NULL)
      );
  END IF;
END $$;

-- Make context_type NOT NULL after backfill (will be done in next migration)
-- For now, we'll allow NULL temporarily during migration

-- Comments
COMMENT ON COLUMN spaces.context_type IS 'Type of context that owns this space: personal, household, or team';
COMMENT ON COLUMN spaces.context_id IS 'ID of the context entity (null for personal, household_id or team_id for shared spaces)';
