/*
  # Create Recipe Links and Voting System

  1. New Tables
    - `recipe_links`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `url` (text, the source URL)
      - `title` (text, recipe title)
      - `image_url` (text, thumbnail image)
      - `source_platform` (text, platform name like TikTok, Instagram, etc.)
      - `tags` (jsonb, array of tags)
      - `notes` (text, user notes)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `recipe_votes`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, foreign key to recipe_links)
      - `user_id` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (recipe_id, user_id)

  2. Security
    - Enable RLS on both tables
    - Policies for household members to manage recipes
    - Policies for voting
*/

-- Create recipe_links table
CREATE TABLE IF NOT EXISTS recipe_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL,
  image_url text,
  source_platform text,
  tags jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recipe_votes table
CREATE TABLE IF NOT EXISTS recipe_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipe_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipe_links_household ON recipe_links(household_id);
CREATE INDEX IF NOT EXISTS idx_recipe_links_created_by ON recipe_links(created_by);
CREATE INDEX IF NOT EXISTS idx_recipe_votes_recipe ON recipe_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_votes_user ON recipe_votes(user_id);

-- Enable RLS
ALTER TABLE recipe_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_votes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in household
CREATE OR REPLACE FUNCTION is_household_member_by_profile(p_household_id uuid, p_profile_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = p_household_id
    AND profile_id = p_profile_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recipe links policies
CREATE POLICY "Household members can view recipe links"
  ON recipe_links FOR SELECT
  TO authenticated
  USING (
    is_household_member_by_profile(household_id, (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Household members can create recipe links"
  ON recipe_links FOR INSERT
  TO authenticated
  WITH CHECK (
    is_household_member_by_profile(household_id, (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Household members can update recipe links"
  ON recipe_links FOR UPDATE
  TO authenticated
  USING (
    is_household_member_by_profile(household_id, (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Household members can delete recipe links"
  ON recipe_links FOR DELETE
  TO authenticated
  USING (
    is_household_member_by_profile(household_id, (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  );

-- Recipe votes policies
CREATE POLICY "Users can view recipe votes"
  ON recipe_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipe_links rl
      WHERE rl.id = recipe_votes.recipe_id
      AND is_household_member_by_profile(rl.household_id, (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create their own votes"
  ON recipe_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM recipe_links rl
      WHERE rl.id = recipe_votes.recipe_id
      AND is_household_member_by_profile(rl.household_id, user_id)
    )
  );

CREATE POLICY "Users can delete their own votes"
  ON recipe_votes FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
