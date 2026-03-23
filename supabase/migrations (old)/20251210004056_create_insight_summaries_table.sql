/*
  # Create Insight Summaries Table

  1. New Tables
    - `insight_summaries`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key to members)
      - `section_id` (uuid, foreign key to sections)
      - `title` (text) - Single sentence insight title
      - `core_insight` (text) - 2-3 short lines of insight
      - `brain_tip` (text) - Single actionable sentence
      - `feature_teaser` (text, nullable) - Optional upcoming feature hint
      - `saved_to_profile` (boolean) - Tracks if user saved to brain profile
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `insight_summaries` table
    - Add policy for users to read their own household members' insights
    - Add policy for users to update their own insights (save to profile)
    - Add policy for system to insert new insights
    
  3. Indexes
    - Add index on (member_id, section_id) for fast lookups
    - Add index on member_id for user queries
*/

-- Create insight_summaries table
CREATE TABLE IF NOT EXISTS insight_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  core_insight text NOT NULL,
  brain_tip text NOT NULL,
  feature_teaser text,
  saved_to_profile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, section_id)
);

-- Enable RLS
ALTER TABLE insight_summaries ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insight_summaries_member_section ON insight_summaries(member_id, section_id);
CREATE INDEX IF NOT EXISTS idx_insight_summaries_member ON insight_summaries(member_id);

-- Policy: Users can read insights for members in their household
CREATE POLICY "Users can read household member insights"
  ON insight_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m1
      INNER JOIN members m2 ON m1.household_id = m2.household_id
      WHERE m1.id = insight_summaries.member_id
      AND m2.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own member's insights
CREATE POLICY "Users can update own insights"
  ON insight_summaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = insight_summaries.member_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = insight_summaries.member_id
      AND members.user_id = auth.uid()
    )
  );

-- Policy: Allow authenticated users to insert insights for their own members
CREATE POLICY "Users can insert own insights"
  ON insight_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = insight_summaries.member_id
      AND members.user_id = auth.uid()
    )
  );