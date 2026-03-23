/*
  # Create Guardrails ↔ Personal Spaces Data Bridge

  ## Summary
  This migration creates the data bridge architecture between Guardrails projects and Personal Spaces,
  allowing users to explicitly link roadmap items and tracks to their personal systems (calendar, tasks, 
  habits, notes, goals).

  ## Key Principles
  - **Opt-in only**: Nothing flows automatically
  - **Guardrails is source of truth**: Personal Spaces reference but don't mutate
  - **Reversible**: Links can be activated/deactivated
  - **Audit-safe**: Complete history of what was shared

  ## Tables Created
  1. `guardrails_personal_links`
    - Links between Guardrails entities (tracks, roadmap_items) and Personal Space types
    - Tracks active/inactive state and revocation history
    - Enforces user ownership and project association

  ## Security
  - RLS enabled on all tables
  - Users can only manage links for their own projects
  - Complete audit trail of link creation and revocation
*/

-- Step 1: Create enum for source types
DO $$ BEGIN
  CREATE TYPE guardrails_source_type AS ENUM ('track', 'roadmap_item');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create enum for target space types
DO $$ BEGIN
  CREATE TYPE personal_space_type AS ENUM (
    'calendar',
    'tasks',
    'habits',
    'notes',
    'goals'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create guardrails_personal_links table
CREATE TABLE IF NOT EXISTS guardrails_personal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  
  source_type guardrails_source_type NOT NULL,
  source_id uuid NOT NULL,
  
  target_space_type personal_space_type NOT NULL,
  target_entity_id uuid,
  
  is_active boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  
  CONSTRAINT valid_revocation CHECK (
    (is_active = true AND revoked_at IS NULL) OR
    (is_active = false AND revoked_at IS NOT NULL)
  )
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gpl_user_id ON guardrails_personal_links(user_id);
CREATE INDEX IF NOT EXISTS idx_gpl_project_id ON guardrails_personal_links(master_project_id);
CREATE INDEX IF NOT EXISTS idx_gpl_source ON guardrails_personal_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_gpl_target_space ON guardrails_personal_links(target_space_type);
CREATE INDEX IF NOT EXISTS idx_gpl_active ON guardrails_personal_links(is_active) WHERE is_active = true;

-- Step 5: Create unique constraint to prevent duplicate active links
CREATE UNIQUE INDEX IF NOT EXISTS idx_gpl_unique_active_link 
  ON guardrails_personal_links(source_type, source_id, target_space_type, user_id)
  WHERE is_active = true;

-- Step 6: Enable Row Level Security
ALTER TABLE guardrails_personal_links ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for guardrails_personal_links

-- Users can view their own links
CREATE POLICY "Users can view own personal links"
  ON guardrails_personal_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create links for their own projects
CREATE POLICY "Users can create personal links for own projects"
  ON guardrails_personal_links FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_personal_links.master_project_id
      AND mp.user_id = auth.uid()
    )
  );

-- Users can update their own links (mainly for revoking)
CREATE POLICY "Users can update own personal links"
  ON guardrails_personal_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "Users can delete own personal links"
  ON guardrails_personal_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 8: Create function to auto-set revoked_at when is_active becomes false
CREATE OR REPLACE FUNCTION set_revoked_at_on_deactivate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    NEW.revoked_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for auto-setting revoked_at
DROP TRIGGER IF EXISTS trigger_set_revoked_at ON guardrails_personal_links;
CREATE TRIGGER trigger_set_revoked_at
  BEFORE UPDATE ON guardrails_personal_links
  FOR EACH ROW
  EXECUTE FUNCTION set_revoked_at_on_deactivate();

-- Step 10: Add comment for documentation
COMMENT ON TABLE guardrails_personal_links IS 
  'Links between Guardrails entities (tracks, roadmap items) and Personal Space systems. Opt-in only, fully reversible, audit-safe.';
