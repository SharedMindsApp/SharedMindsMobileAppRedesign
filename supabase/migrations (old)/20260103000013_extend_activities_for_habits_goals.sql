/*
  # Extend Activities for Habits and Goals

  Extends the canonical activities table with habit/goal-specific fields.
  All fields are nullable and additive for backward compatibility.
*/

-- ============================================================================
-- 1. Extend Activities Table (Additive Fields)
-- ============================================================================
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS polarity text CHECK (polarity IN ('build', 'break')),
ADD COLUMN IF NOT EXISTS metric_type text CHECK (metric_type IN ('count', 'minutes', 'boolean', 'rating', 'custom')),
ADD COLUMN IF NOT EXISTS metric_unit text,
ADD COLUMN IF NOT EXISTS target_value numeric,
ADD COLUMN IF NOT EXISTS direction text CHECK (direction IN ('at_least', 'at_most', 'exactly')),
ADD COLUMN IF NOT EXISTS visibility_default text CHECK (visibility_default IN ('private', 'shared_overview', 'shared_detailed'));

-- Add comment
COMMENT ON COLUMN activities.polarity IS 
  'For habits only: build (good habit) or break (bad habit). NULL for non-habits.';

COMMENT ON COLUMN activities.metric_type IS 
  'Metric type: count, minutes, boolean, rating (1-10), or custom.';

COMMENT ON COLUMN activities.direction IS 
  'Direction for metric comparison: at_least (>=), at_most (<=), or exactly (==).';

-- ============================================================================
-- 2. Create Habit Check-ins Table (Append-Only)
-- ============================================================================
-- Check if table exists and handle column renaming if needed
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'habit_checkins') THEN
    CREATE TABLE habit_checkins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Link to habit activity
      activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      
      -- Owner
      owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      
      -- Check-in data
      local_date date NOT NULL, -- Local day (not timestamp)
      status text NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'missed', 'skipped', 'partial')),
      value_numeric numeric, -- For count/minutes/rating/custom
      value_boolean boolean, -- For boolean habits
      notes text,
      
      -- Timestamps
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      
      -- Constraints
      CONSTRAINT one_checkin_per_habit_per_day UNIQUE (activity_id, owner_id, local_date),
      CONSTRAINT valid_checkin_value CHECK (
        (value_numeric IS NOT NULL AND value_boolean IS NULL) OR
        (value_numeric IS NULL AND value_boolean IS NOT NULL) OR
        (value_numeric IS NULL AND value_boolean IS NULL AND status IN ('missed', 'skipped'))
      )
    );
  ELSE
    -- Table exists, check if we need to rename columns
    -- Rename habit_activity_id to activity_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'habit_activity_id'
    ) THEN
      ALTER TABLE habit_checkins RENAME COLUMN habit_activity_id TO activity_id;
    END IF;
    
    -- Rename date to local_date if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'date'
    ) THEN
      ALTER TABLE habit_checkins RENAME COLUMN date TO local_date;
    END IF;
    
    -- Rename value to value_numeric if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'value'
    ) THEN
      ALTER TABLE habit_checkins RENAME COLUMN value TO value_numeric;
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'activity_id'
    ) THEN
      ALTER TABLE habit_checkins ADD COLUMN activity_id uuid REFERENCES activities(id) ON DELETE CASCADE;
      -- Migrate data if habit_activity_id existed
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'habit_checkins' AND column_name = 'habit_activity_id'
      ) THEN
        UPDATE habit_checkins SET activity_id = habit_activity_id WHERE activity_id IS NULL;
        ALTER TABLE habit_checkins ALTER COLUMN activity_id SET NOT NULL;
        ALTER TABLE habit_checkins DROP COLUMN IF EXISTS habit_activity_id;
      END IF;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'local_date'
    ) THEN
      ALTER TABLE habit_checkins ADD COLUMN local_date date;
      -- Migrate data if date existed
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'habit_checkins' AND column_name = 'date'
      ) THEN
        UPDATE habit_checkins SET local_date = date WHERE local_date IS NULL;
        ALTER TABLE habit_checkins ALTER COLUMN local_date SET NOT NULL;
        ALTER TABLE habit_checkins DROP COLUMN IF EXISTS date;
      END IF;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'value_numeric'
    ) THEN
      ALTER TABLE habit_checkins ADD COLUMN value_numeric numeric;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'value_boolean'
    ) THEN
      ALTER TABLE habit_checkins ADD COLUMN value_boolean boolean;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'habit_checkins' AND column_name = 'status'
    ) THEN
      ALTER TABLE habit_checkins ADD COLUMN status text NOT NULL DEFAULT 'done';
      ALTER TABLE habit_checkins ADD CONSTRAINT habit_checkins_status_check 
        CHECK (status IN ('done', 'missed', 'skipped', 'partial'));
    END IF;
  END IF;
END $$;

-- Ensure constraints exist
DO $$
BEGIN
  -- Drop old constraint if it exists with old column name
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'one_checkin_per_habit_per_day' 
    AND conrelid = 'habit_checkins'::regclass
  ) THEN
    ALTER TABLE habit_checkins DROP CONSTRAINT IF EXISTS one_checkin_per_habit_per_day;
  END IF;
  
  -- Add constraint with correct column names
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'one_checkin_per_habit_per_day' 
    AND conrelid = 'habit_checkins'::regclass
  ) THEN
    ALTER TABLE habit_checkins 
    ADD CONSTRAINT one_checkin_per_habit_per_day 
    UNIQUE (activity_id, owner_id, local_date);
  END IF;
  
  -- Add value check constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_checkin_value' 
    AND conrelid = 'habit_checkins'::regclass
  ) THEN
    ALTER TABLE habit_checkins 
    ADD CONSTRAINT valid_checkin_value CHECK (
      (value_numeric IS NOT NULL AND value_boolean IS NULL) OR
      (value_numeric IS NULL AND value_boolean IS NOT NULL) OR
      (value_numeric IS NULL AND value_boolean IS NULL AND status IN ('missed', 'skipped'))
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habit_checkins_activity_id ON habit_checkins(activity_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_owner_id ON habit_checkins(owner_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_local_date ON habit_checkins(local_date);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_activity_date ON habit_checkins(activity_id, local_date);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_owner_date ON habit_checkins(owner_id, local_date);

-- ============================================================================
-- 3. Create Goals Table (Extension Around Activities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to activity (one-to-one)
  goal_activity_id uuid NOT NULL UNIQUE REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Owner
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Goal status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  
  -- Date range
  start_date date,
  end_date date,
  
  -- Completion rule (how completion is computed)
  completion_rule jsonb DEFAULT '{}'::jsonb,
  
  -- Completion tracking
  completed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_goal_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_goal_activity_id ON goals(goal_activity_id);
CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_dates ON goals(start_date, end_date);

-- ============================================================================
-- 4. Create Goal Requirements Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to goal
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  
  -- Required activity (habit or task)
  required_activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Requirement type
  requirement_type text NOT NULL CHECK (requirement_type IN ('habit_streak', 'habit_count', 'task_complete', 'custom')),
  
  -- Target configuration
  target_count int, -- e.g., 30 days
  window_days int, -- e.g., 30-day window
  per_day_target numeric, -- e.g., 30 pushups/day
  strict boolean DEFAULT true, -- strict streak vs flexible
  
  -- Optional weighting
  weight numeric, -- for weighted goals
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_requirements_goal_id ON goal_requirements(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_requirements_activity_id ON goal_requirements(required_activity_id);

-- ============================================================================
-- 5. Enable RLS
-- ============================================================================
ALTER TABLE habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_requirements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS Policies for Habit Check-ins
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own habit check-ins" ON habit_checkins;
DROP POLICY IF EXISTS "Users can create their own habit check-ins" ON habit_checkins;
DROP POLICY IF EXISTS "Users can update their own habit check-ins" ON habit_checkins;
DROP POLICY IF EXISTS "Users can delete their own habit check-ins" ON habit_checkins;

-- Users can view their own check-ins
CREATE POLICY "Users can view their own habit check-ins"
  ON habit_checkins FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can create their own check-ins
CREATE POLICY "Users can create their own habit check-ins"
  ON habit_checkins FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Users can update their own check-ins
CREATE POLICY "Users can update their own habit check-ins"
  ON habit_checkins FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users can delete their own check-ins (soft delete via status)
CREATE POLICY "Users can delete their own habit check-ins"
  ON habit_checkins FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- 7. RLS Policies for Goals
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Users can view their own goals
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Users can create their own goals
CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Users can delete their own goals (soft delete via archive)
CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- 8. RLS Policies for Goal Requirements
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view requirements for their goals" ON goal_requirements;
DROP POLICY IF EXISTS "Users can create requirements for their goals" ON goal_requirements;
DROP POLICY IF EXISTS "Users can update requirements for their goals" ON goal_requirements;
DROP POLICY IF EXISTS "Users can delete requirements for their goals" ON goal_requirements;

-- Users can view requirements for their goals
CREATE POLICY "Users can view requirements for their goals"
  ON goal_requirements FOR SELECT
  TO authenticated
  USING (
    goal_id IN (
      SELECT id FROM goals WHERE owner_id = auth.uid()
    )
  );

-- Users can create requirements for their goals
CREATE POLICY "Users can create requirements for their goals"
  ON goal_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    goal_id IN (
      SELECT id FROM goals WHERE owner_id = auth.uid()
    )
  );

-- Users can update requirements for their goals
CREATE POLICY "Users can update requirements for their goals"
  ON goal_requirements FOR UPDATE
  TO authenticated
  USING (
    goal_id IN (
      SELECT id FROM goals WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    goal_id IN (
      SELECT id FROM goals WHERE owner_id = auth.uid()
    )
  );

-- Users can delete requirements for their goals
CREATE POLICY "Users can delete requirements for their goals"
  ON goal_requirements FOR DELETE
  TO authenticated
  USING (
    goal_id IN (
      SELECT id FROM goals WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. Helper Functions
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_habit_checkin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_goal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_goal_requirement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_habit_checkins_updated_at ON habit_checkins;
CREATE TRIGGER update_habit_checkins_updated_at
  BEFORE UPDATE ON habit_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_checkin_updated_at();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_updated_at();

DROP TRIGGER IF EXISTS update_goal_requirements_updated_at ON goal_requirements;
CREATE TRIGGER update_goal_requirements_updated_at
  BEFORE UPDATE ON goal_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_requirement_updated_at();

-- ============================================================================
-- 10. Comments
-- ============================================================================
COMMENT ON TABLE habit_checkins IS 
  'Append-only check-in records for habits. Never hard deleted - history preserved.';

COMMENT ON TABLE goals IS 
  'Goals are extensions of activities. A goal activity has a corresponding goal record.';

COMMENT ON TABLE goal_requirements IS 
  'Links habits/tasks to goals. Defines how goal completion is computed.';

