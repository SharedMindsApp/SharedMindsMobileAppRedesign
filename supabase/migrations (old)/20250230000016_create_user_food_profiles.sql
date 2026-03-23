/*
  # User Food Profiles System
  
  Creates a unified system for managing user diets, allergies, and food preferences.
  Supports medical constraints (allergies), dietary patterns (vegan, vegetarian, etc.),
  and personal preferences (liked/disliked ingredients and cuisines).
*/

-- Create user_food_profiles table
CREATE TABLE IF NOT EXISTS user_food_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  
  -- Diet type (single selection)
  diet text CHECK (diet IN ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher', 'keto', 'paleo')) DEFAULT 'omnivore',
  
  -- Allergies (hard constraints - JSONB array)
  allergies jsonb DEFAULT '[]'::jsonb NOT NULL,
  
  -- Excluded ingredients (user-specified, e.g. "mushrooms", "cilantro")
  excluded_ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
  
  -- Preferred ingredients (for ranking/boosting)
  preferred_ingredients jsonb DEFAULT '[]'::jsonb NOT NULL,
  
  -- Excluded cuisines (e.g. ["Thai", "Indian"])
  excluded_cuisines jsonb DEFAULT '[]'::jsonb NOT NULL,
  
  -- Preferred cuisines (for ranking/boosting)
  preferred_cuisines jsonb DEFAULT '[]'::jsonb NOT NULL,
  
  -- Allow overrides (can user manually add blocked recipes?)
  allow_overrides boolean DEFAULT false NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one profile per user/household/space combination
  CONSTRAINT unique_user_food_profile UNIQUE (profile_id, household_id, space_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_food_profiles_profile_id ON user_food_profiles(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_food_profiles_household_id ON user_food_profiles(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_food_profiles_space_id ON user_food_profiles(space_id);

-- Enable RLS
ALTER TABLE user_food_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view food profiles in their spaces
CREATE POLICY "Users can view food profiles in their spaces"
  ON user_food_profiles FOR SELECT
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = user_food_profiles.household_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    ))
    OR
    -- Space-based access
    EXISTS (
      SELECT 1 FROM spaces s
      JOIN space_members sm ON sm.space_id = s.id
      JOIN profiles p ON p.id = sm.user_id
      WHERE s.id = user_food_profiles.space_id
      AND p.user_id = auth.uid()
      AND sm.status = 'active'
    )
  );

-- Users can insert food profiles in their spaces
CREATE POLICY "Users can insert food profiles in their spaces"
  ON user_food_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Personal space: profile_id must match user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user must be a member
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = user_food_profiles.household_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    ))
  );

-- Users can update food profiles in their spaces
CREATE POLICY "Users can update food profiles in their spaces"
  ON user_food_profiles FOR UPDATE
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = user_food_profiles.household_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    ))
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = user_food_profiles.household_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    ))
  );

-- Users can delete food profiles in their spaces
CREATE POLICY "Users can delete food profiles in their spaces"
  ON user_food_profiles FOR DELETE
  TO authenticated
  USING (
    -- Personal space: profile_id matches user's profile
    (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND household_id IS NULL)
    OR
    -- Household: user is a member
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = user_food_profiles.household_id
      AND auth_user_id = auth.uid()
      AND status = 'active'
    ))
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_food_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER user_food_profiles_updated_at
  BEFORE UPDATE ON user_food_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_food_profiles_updated_at();

-- Comments
COMMENT ON TABLE user_food_profiles IS 'User dietary constraints, allergies, and food preferences for meal planning';
COMMENT ON COLUMN user_food_profiles.diet IS 'Primary diet type (omnivore, vegetarian, vegan, etc.)';
COMMENT ON COLUMN user_food_profiles.allergies IS 'JSONB array of allergy types (hard constraints)';
COMMENT ON COLUMN user_food_profiles.excluded_ingredients IS 'JSONB array of ingredient names to exclude';
COMMENT ON COLUMN user_food_profiles.preferred_ingredients IS 'JSONB array of ingredient names to prefer (for ranking)';
COMMENT ON COLUMN user_food_profiles.excluded_cuisines IS 'JSONB array of cuisine names to exclude';
COMMENT ON COLUMN user_food_profiles.preferred_cuisines IS 'JSONB array of cuisine names to prefer (for ranking)';
COMMENT ON COLUMN user_food_profiles.allow_overrides IS 'Whether user can manually add recipes that violate constraints';
