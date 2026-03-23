/*
  # Meal Schedules System
  
  Creates a flexible meal scheduling system that supports:
  - User-defined meal slots (not just breakfast/lunch/dinner)
  - Fasting periods
  - Different schedules per day of week
  - Religious, cultural, medical, and lifestyle patterns
  
  1. New Table
    - `meal_schedules`
      - Stores meal schedule configurations per user/household
      - Supports daily variations
      - Includes meal slots with type (meal/fast)
  
  2. Security
    - RLS enabled
    - Users can manage their own schedules
    - Household members can manage household schedules
*/

-- Create meal_schedules table
CREATE TABLE IF NOT EXISTS meal_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Standard',
  is_default boolean DEFAULT false,
  schedules jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of DailyMealSchedule
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure either user_id or household_id is set, but not both
  CONSTRAINT meal_schedules_owner_check CHECK (
    (user_id IS NOT NULL AND household_id IS NULL) OR
    (user_id IS NULL AND household_id IS NOT NULL)
  )
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_meal_schedules_space_id ON meal_schedules(space_id);
CREATE INDEX IF NOT EXISTS idx_meal_schedules_user_id ON meal_schedules(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_schedules_household_id ON meal_schedules(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_schedules_is_default ON meal_schedules(space_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE meal_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own schedules
CREATE POLICY "Users can view own meal schedules"
  ON meal_schedules FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own schedules
CREATE POLICY "Users can insert own meal schedules"
  ON meal_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND household_id IS NULL) OR
    (household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    ) AND user_id IS NULL)
  );

-- Users can update their own schedules
CREATE POLICY "Users can update own meal schedules"
  ON meal_schedules FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own schedules
CREATE POLICY "Users can delete own meal schedules"
  ON meal_schedules FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meal_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER meal_schedules_updated_at
  BEFORE UPDATE ON meal_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_schedules_updated_at();

-- Comment
COMMENT ON TABLE meal_schedules IS 'User-configurable meal schedules supporting custom meal slots, fasting periods, and daily variations';
COMMENT ON COLUMN meal_schedules.schedules IS 'JSONB array of DailyMealSchedule objects, one per day of week (0-6)';
