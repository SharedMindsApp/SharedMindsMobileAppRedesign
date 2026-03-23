/*
  # Create Body Transformation Tracker Tables
  
  This migration creates the tables needed for the Body Transformation Tracker system:
  - body_profiles: Stores user's physical baseline profile (optional)
  - body_measurements: Stores body measurement entries (weight, measurements, photos)
*/

-- Create body_profiles table (optional physical baseline)
CREATE TABLE IF NOT EXISTS body_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Physical baseline (all optional)
  height_cm INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  date_of_birth DATE,
  current_bodyweight_kg DECIMAL(5,2),
  training_background TEXT,
  athlete_flag BOOLEAN DEFAULT FALSE,
  
  -- Measurement preferences
  weight_unit TEXT CHECK (weight_unit IN ('kg', 'lb')) DEFAULT 'kg',
  measurement_unit TEXT CHECK (measurement_unit IN ('cm', 'in')) DEFAULT 'cm',
  
  -- Scheduling preferences (pressure-free)
  weigh_in_schedule TEXT CHECK (weigh_in_schedule IN ('weekly', 'bi_weekly', 'monthly', 'ad_hoc')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create body_measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Measurement date and time
  measurement_date DATE NOT NULL,
  measurement_time TIME,
  
  -- Core measurements
  bodyweight_kg DECIMAL(5,2),
  
  -- Circumference measurements (optional)
  waist_cm DECIMAL(5,1),
  hips_cm DECIMAL(5,1),
  chest_cm DECIMAL(5,1),
  thigh_cm DECIMAL(5,1),
  arm_cm DECIMAL(5,1),
  
  -- Visual progress photos (optional, private)
  photo_front TEXT, -- URL or storage reference
  photo_side TEXT,
  photo_back TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date 
  ON body_measurements(user_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_logged 
  ON body_measurements(user_id, logged_at DESC);

-- Enable RLS
ALTER TABLE body_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for body_profiles
-- Drop policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Users can view their own body profile" ON body_profiles;
DROP POLICY IF EXISTS "Users can update their own body profile" ON body_profiles;
DROP POLICY IF EXISTS "Users can insert their own body profile" ON body_profiles;

CREATE POLICY "Users can view their own body profile"
  ON body_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own body profile"
  ON body_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body profile"
  ON body_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for body_measurements
-- Drop policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Users can view their own measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can insert their own measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can update their own measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can delete their own measurements" ON body_measurements;

CREATE POLICY "Users can view their own measurements"
  ON body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurements"
  ON body_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measurements"
  ON body_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE body_profiles IS 'Optional physical baseline profile for body transformation tracking';
COMMENT ON TABLE body_measurements IS 'Body measurement entries: weight, measurements, photos - linked to fitness activity';
COMMENT ON COLUMN body_profiles.weigh_in_schedule IS 'User preference for weigh-in reminders (never enforced)';
COMMENT ON COLUMN body_measurements.photo_front IS 'Private photo URL/storage reference - never shared or compared automatically';

-- Refresh PostgREST schema cache so new tables are immediately available
NOTIFY pgrst, 'reload schema';