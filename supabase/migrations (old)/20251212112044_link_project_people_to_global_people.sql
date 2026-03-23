/*
  # Link Project People to Global People

  1. Overview
    - Adds global_person_id to project_people
    - Migrates existing project_people to global_people
    - Deduplicates by email where possible
    - Preserves all assignments and relationships

  2. Changes
    - Add global_person_id column to project_people
    - Create global_people entries from existing project_people
    - Link project_people to global_people
    - Add foreign key constraint
    - Remove redundant name/email from project_people (keep for now for backward compat)

  3. Migration Logic
    - For each project_people record:
      - If email exists, check if global_person with that email exists
      - If yes, link to existing global_person
      - If no, create new global_person
      - If no email, always create new global_person (can't deduplicate)

  4. Backward Compatibility
    - Keep name and email in project_people for now (denormalized)
    - All queries continue to work
    - Service layer will manage sync

  5. Important Notes
    - No data loss
    - No assignment breakage
    - Idempotent migration
*/

-- Step 1: Add global_person_id column to project_people (nullable for now)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_people' AND column_name = 'global_person_id'
  ) THEN
    ALTER TABLE project_people ADD COLUMN global_person_id uuid REFERENCES global_people(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Migrate existing project_people to global_people
DO $$
DECLARE
  person_record RECORD;
  global_person_id_var uuid;
BEGIN
  -- Loop through all existing project_people that don't have a global_person_id yet
  FOR person_record IN 
    SELECT id, name, email, archived
    FROM project_people
    WHERE global_person_id IS NULL
  LOOP
    -- Check if we can deduplicate by email
    IF person_record.email IS NOT NULL AND person_record.email != '' THEN
      -- Try to find existing global_person with this email
      SELECT id INTO global_person_id_var
      FROM global_people
      WHERE email = person_record.email
      LIMIT 1;
      
      -- If found, use it; otherwise create new
      IF global_person_id_var IS NULL THEN
        INSERT INTO global_people (name, email, archived)
        VALUES (person_record.name, person_record.email, person_record.archived)
        RETURNING id INTO global_person_id_var;
      END IF;
    ELSE
      -- No email, can't deduplicate - create new global_person
      INSERT INTO global_people (name, email, archived)
      VALUES (person_record.name, NULL, person_record.archived)
      RETURNING id INTO global_person_id_var;
    END IF;
    
    -- Link project_people to global_people
    UPDATE project_people
    SET global_person_id = global_person_id_var
    WHERE id = person_record.id;
  END LOOP;
END $$;

-- Step 3: Make global_person_id NOT NULL (all records should be migrated now)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_people' 
    AND column_name = 'global_person_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE project_people ALTER COLUMN global_person_id SET NOT NULL;
  END IF;
END $$;

-- Step 4: Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_project_people_global_person 
  ON project_people(global_person_id);

-- Step 5: Update RLS policies to include global_person_id context
-- (Existing policies continue to work, no changes needed)

-- Note: We keep name and email in project_people for backward compatibility
-- Service layer will manage keeping them in sync with global_people
