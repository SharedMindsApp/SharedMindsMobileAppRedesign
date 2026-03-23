/*
  # Create Household Diet Profiles Table

  1. New Tables
    - `household_diet_profiles`
      - `id` (uuid, primary key) - Unique identifier for each diet profile
      - `household_id` (uuid, foreign key) - References households table
      - `profile_id` (uuid, foreign key) - References profiles table
      - `diet_type` (text array) - Diet preferences (vegan, veggie, keto, halal, etc.)
      - `allergies` (text array) - Food allergies (nuts, dairy, gluten, shellfish, etc.)
      - `avoid_list` (text array) - Foods to avoid (mushrooms, onions, spicy, etc.)
      - `fasting_schedule` (jsonb) - Intermittent fasting schedule with type, start, and end times
      - `weekly_schedule` (jsonb) - Weekly meal schedule (tracks when members eat away from home)
      - `created_at` (timestamptz) - Timestamp of profile creation

  2. Indexes
    - Index on `household_id` for efficient household lookups
    - Index on `profile_id` for efficient profile lookups

  3. Security
    - RLS is NOT enabled on this table yet (will be added in future migration)
    - Table is created for schema setup only

  ## Notes
  - This table stores individual dietary preferences and schedules for household members
  - `diet_type`, `allergies`, and `avoid_list` are arrays to support multiple values
  - `fasting_schedule` stores intermittent fasting info: { type: "16:8", start: "20:00", end: "12:00" }
  - `weekly_schedule` tracks meals eaten away: { monday: { dinner: "away" }, tuesday: { lunch: "away" }, ... }
  - Each profile_id should only have one diet profile per household
*/

-- Create household_diet_profiles table
CREATE TABLE IF NOT EXISTS household_diet_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diet_type text[] DEFAULT '{}',
  allergies text[] DEFAULT '{}',
  avoid_list text[] DEFAULT '{}',
  fasting_schedule jsonb DEFAULT '{}'::jsonb,
  weekly_schedule jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one diet profile per person per household
  UNIQUE(household_id, profile_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_household_diet_profiles_household_id 
  ON household_diet_profiles(household_id);

CREATE INDEX IF NOT EXISTS idx_household_diet_profiles_profile_id 
  ON household_diet_profiles(profile_id);

-- Add helpful comment to table
COMMENT ON TABLE household_diet_profiles IS 'Stores dietary preferences, allergies, restrictions, and meal schedules for household members';
