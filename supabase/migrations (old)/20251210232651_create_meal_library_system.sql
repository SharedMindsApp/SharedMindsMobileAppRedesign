/*
  # Create Meal Library System

  1. New Tables
    - `meal_library`
      - `id` (uuid, primary key)
      - `household_id` (uuid, nullable) - null = global meal available to all
      - `title` (text) - name of the meal
      - `category` (text) - healthy, quick, cheap, vegetarian, dessert, takeaway
      - `ingredients` (text[]) - list of ingredients
      - `tags` (text[]) - vegan, high-protein, gluten-free, etc.
      - `created_by` (uuid) - profile who created it
      - `created_at` (timestamptz) - when created
    
    - `meal_votes`
      - `id` (uuid, primary key)
      - `meal_id` (uuid) - references meal_library
      - `profile_id` (uuid) - who voted
      - `rating` (int) - 1 to 5 stars
      - `created_at` (timestamptz)
      - UNIQUE constraint on (meal_id, profile_id) - one vote per person per meal

  2. Security
    - Enable RLS on both tables
    - Household members can view meals for their household or global meals
    - Household members can create meals
    - Only creator can update/delete their own meals
    - Anyone can vote on meals
    - Users can update their own votes
*/

-- Create meal_library table
CREATE TABLE IF NOT EXISTS meal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  ingredients text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create meal_votes table
CREATE TABLE IF NOT EXISTS meal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid REFERENCES meal_library(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (meal_id, profile_id)
);

-- Enable RLS
ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_votes ENABLE ROW LEVEL SECURITY;

-- Policies for meal_library

-- Anyone authenticated can view global meals or meals for their household
CREATE POLICY "Users can view accessible meals"
  ON meal_library FOR SELECT
  TO authenticated
  USING (
    household_id IS NULL
    OR EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_library.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Household members can create meals for their household
CREATE POLICY "Household members can create meals"
  ON meal_library FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IS NULL
    OR EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_library.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Creators can update their own meals
CREATE POLICY "Creators can update own meals"
  ON meal_library FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Creators can delete their own meals
CREATE POLICY "Creators can delete own meals"
  ON meal_library FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Policies for meal_votes

-- Users can view all votes for meals they have access to
CREATE POLICY "Users can view votes for accessible meals"
  ON meal_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_library
      WHERE meal_library.id = meal_votes.meal_id
      AND (
        meal_library.household_id IS NULL
        OR EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = meal_library.household_id
          AND household_members.user_id = auth.uid()
        )
      )
    )
  );

-- Users can create votes for meals they have access to
CREATE POLICY "Users can vote on accessible meals"
  ON meal_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meal_library
      WHERE meal_library.id = meal_votes.meal_id
      AND (
        meal_library.household_id IS NULL
        OR EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = meal_library.household_id
          AND household_members.user_id = auth.uid()
        )
      )
    )
  );

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
  ON meal_votes FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON meal_votes FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_library_household ON meal_library(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_library_category ON meal_library(category);
CREATE INDEX IF NOT EXISTS idx_meal_library_created_by ON meal_library(created_by);
CREATE INDEX IF NOT EXISTS idx_meal_votes_meal ON meal_votes(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_votes_profile ON meal_votes(profile_id);