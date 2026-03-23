/*
  # Create Household Insight Matches System

  1. New Tables
    - `household_insight_matches`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `member_ids` (uuid array) - IDs of members being compared
      - `insight_cards` (jsonb) - Array of insight card data
      - `saved_to_profile` (boolean) - Whether saved to household profile
      - `viewed` (boolean) - Whether the match has been viewed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `household_insight_matches` table
    - Users can read matches for their household
    - Users can update matches in their household
    - Users can insert matches for their household

  3. Indexes
    - Add index on household_id for fast lookups
    - Add index on member_ids for comparison queries

  4. Notes
    - insight_cards structure:
      [
        {
          category: 'communication' | 'routine' | 'sensory' | 'stress' | 'task' | 'needs' | 'actions',
          title: string,
          summary: string,
          explanation: string,
          tryThis: string,
          icon: string,
          strengthBased: boolean
        }
      ]
*/

-- Create household_insight_matches table
CREATE TABLE IF NOT EXISTS household_insight_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  member_ids uuid[] NOT NULL,
  insight_cards jsonb DEFAULT '[]'::jsonb,
  saved_to_profile boolean DEFAULT false,
  viewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE household_insight_matches ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_household_insight_matches_household ON household_insight_matches(household_id);
CREATE INDEX IF NOT EXISTS idx_household_insight_matches_members ON household_insight_matches USING gin(member_ids);

-- Policy: Users can read matches for their household
CREATE POLICY "Users can read household matches"
  ON household_insight_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_insight_matches.household_id
      AND members.user_id = auth.uid()
    )
  );

-- Policy: Users can update matches in their household
CREATE POLICY "Users can update household matches"
  ON household_insight_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_insight_matches.household_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_insight_matches.household_id
      AND members.user_id = auth.uid()
    )
  );

-- Policy: Users can insert matches for their household
CREATE POLICY "Users can insert household matches"
  ON household_insight_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = household_insight_matches.household_id
      AND members.user_id = auth.uid()
    )
  );