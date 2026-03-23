/*
  # Create Professional System Tables
  
  1. Tables
    - professional_households: Tracks professional access to households
    - professional_notes: Private and shared notes for professionals
  
  2. Additional Profile Fields
    - professional_type, professional_bio, professional_credentials
  
  3. Security
    - RLS policies ensuring professionals only see approved households
    - Instant access revocation enforcement
*/

-- Add professional description fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'professional_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN professional_type text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'professional_bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN professional_bio text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'professional_credentials'
  ) THEN
    ALTER TABLE profiles ADD COLUMN professional_credentials text;
  END IF;
END $$;

-- Create professional_households table
CREATE TABLE IF NOT EXISTS professional_households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  access_level text NOT NULL DEFAULT 'summary',
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'revoked')),
  CONSTRAINT valid_access_level CHECK (access_level IN ('summary', 'full_insights')),
  UNIQUE(professional_id, household_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_professional_households_professional_id 
  ON professional_households(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_households_household_id 
  ON professional_households(household_id);
CREATE INDEX IF NOT EXISTS idx_professional_households_status 
  ON professional_households(status);

-- Create professional_notes table
CREATE TABLE IF NOT EXISTS professional_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for notes
CREATE INDEX IF NOT EXISTS idx_professional_notes_professional_id 
  ON professional_notes(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_notes_household_id 
  ON professional_notes(household_id);
CREATE INDEX IF NOT EXISTS idx_professional_notes_is_shared 
  ON professional_notes(is_shared);

-- Enable RLS
ALTER TABLE professional_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professional_households
CREATE POLICY "Professionals can view their access records"
  ON professional_households FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
  );

CREATE POLICY "Household members can view professional access"
  ON professional_households FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      ) AND status = 'active'
    )
  );

CREATE POLICY "Professionals can request access"
  ON professional_households FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
    AND status = 'pending'
  );

CREATE POLICY "Household owners can manage professional access"
  ON professional_households FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE p.user_id = auth.uid() AND hm.role = 'owner' AND hm.status = 'active'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE p.user_id = auth.uid() AND hm.role = 'owner' AND hm.status = 'active'
    )
  );

CREATE POLICY "Household owners can delete professional access"
  ON professional_households FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE p.user_id = auth.uid() AND hm.role = 'owner' AND hm.status = 'active'
    )
  );

-- RLS Policies for professional_notes
CREATE POLICY "View notes based on role"
  ON professional_notes FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
    OR (
      is_shared = true 
      AND household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        ) AND status = 'active'
      )
    )
  );

CREATE POLICY "Professionals can create notes"
  ON professional_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
    AND household_id IN (
      SELECT household_id FROM professional_households
      WHERE professional_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND status = 'approved'
    )
  );

CREATE POLICY "Professionals can update their notes"
  ON professional_notes FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
  );

CREATE POLICY "Professionals can delete their notes"
  ON professional_notes FOR DELETE
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'professional'
    )
  );