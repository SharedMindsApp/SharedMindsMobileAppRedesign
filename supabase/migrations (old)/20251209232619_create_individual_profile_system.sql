/*
  # Create Individual Profile System

  1. New Tables
    - `individual_profile_responses`
      - Stores answers to the 10 creative personality questions
      - One row per member with JSONB data structure
      - Links to members table

  2. Section Creation
    - Creates the "You, As an Individual" section in the journey
    - Special marker for custom UI component

  3. Security
    - Enable RLS on individual_profile_responses table
    - Users can only view/update their own responses
    - Household members can view each other's responses for insights
*/

-- Create individual_profile_responses table
CREATE TABLE IF NOT EXISTS individual_profile_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Question responses stored as structured data
  thinking_style text[],
  focus_type text,
  energy_pattern text,
  time_perception text[],
  thinking_speed text,
  sensory_preferences text[],
  overwhelm_reactions text[],
  reset_preferences text[],
  communication_style text[],
  peak_moments text[],

  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(member_id)
);

-- Enable RLS
ALTER TABLE individual_profile_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view and update their own profile responses
CREATE POLICY "Members can manage own profile responses"
  ON individual_profile_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = individual_profile_responses.member_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = individual_profile_responses.member_id
      AND members.user_id = auth.uid()
    )
  );

-- Policy: Household members can view each other's profile responses
CREATE POLICY "Household members can view profile responses"
  ON individual_profile_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m1
      JOIN members m2 ON m1.household_id = m2.household_id
      WHERE m1.user_id = auth.uid()
      AND m2.id = individual_profile_responses.member_id
    )
  );

-- Create or update the "You, As an Individual" section
DO $$
DECLARE
  section_id uuid;
BEGIN
  -- Check if section already exists
  SELECT id INTO section_id
  FROM sections
  WHERE title = 'You, As an Individual';

  IF section_id IS NULL THEN
    -- Create new section
    INSERT INTO sections (
      title,
      description,
      order_index,
      stage,
      stage_order,
      icon,
      emotional_copy,
      completion_insight
    ) VALUES (
      'You, As an Individual',
      'A gentle dive into how your mind works — your strengths, your rhythms, your sensory world.',
      1,
      'individual',
      1,
      'sparkles',
      'Let''s explore how your unique mind works. This isn''t a test—it''s a conversation.',
      'You thrive with visual clarity. Your energy peaks in the evening. You prefer gentle communication.'
    );
  ELSE
    -- Update existing section
    UPDATE sections SET
      description = 'A gentle dive into how your mind works — your strengths, your rhythms, your sensory world.',
      stage = 'individual',
      stage_order = 1,
      icon = 'sparkles',
      emotional_copy = 'Let''s explore how your unique mind works. This isn''t a test—it''s a conversation.',
      completion_insight = 'You thrive with visual clarity. Your energy peaks in the evening. You prefer gentle communication.'
    WHERE id = section_id;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_individual_profile_responses_member_id
  ON individual_profile_responses(member_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_individual_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_individual_profile_timestamp ON individual_profile_responses;
CREATE TRIGGER update_individual_profile_timestamp
  BEFORE UPDATE ON individual_profile_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_individual_profile_updated_at();
