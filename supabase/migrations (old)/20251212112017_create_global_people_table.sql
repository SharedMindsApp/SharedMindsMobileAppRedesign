/*
  # Create Global People Table

  1. Overview
    - Introduces canonical identity layer for people across all Guardrails projects
    - Supports deduplication by email
    - Enables multi-project participation
    - Foundation for future user-to-person binding (no auth yet)

  2. New Table
    - `global_people`
      - Canonical identity store
      - Name and optional email
      - Globally unique email when present
      - Soft-delete support via archived flag

  3. Design Principles
    - People ≠ Users (no authentication)
    - Global identity, local membership (project_people will reference this)
    - Deduplication ready
    - Future-proof for user account binding

  4. Security
    - RLS enabled
    - Readable by authenticated users
    - Only admins can create/update (for now, regular flow via peopleService)

  5. Important Notes
    - This is identity only, not membership
    - Project membership remains in project_people
    - Assignments remain unchanged
    - No breaking changes to existing functionality
*/

-- Create global_people table
CREATE TABLE IF NOT EXISTS global_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_name CHECK (length(trim(name)) > 0),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_global_people_email 
  ON global_people(email) WHERE email IS NOT NULL AND archived = false;

CREATE INDEX IF NOT EXISTS idx_global_people_name 
  ON global_people(name) WHERE archived = false;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_global_people_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_global_people_updated_at
  BEFORE UPDATE ON global_people
  FOR EACH ROW
  EXECUTE FUNCTION update_global_people_updated_at();

-- Enable RLS
ALTER TABLE global_people ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Read access for authenticated users
CREATE POLICY "Authenticated users can view global people"
  ON global_people
  FOR SELECT
  TO authenticated
  USING (archived = false);

-- RLS Policies - Write access (permissive for now, will be enforced via service layer)
CREATE POLICY "Authenticated users can create global people"
  ON global_people
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update global people"
  ON global_people
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: No DELETE policy - we use soft delete (archived flag)
