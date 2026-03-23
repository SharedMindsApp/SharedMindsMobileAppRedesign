/*
  # Stage 4.9: Daily Alignment System

  1. New Tables
    - `daily_alignments`
      - Stores one record per user per day
      - Tracks completion/dismissal status
      - Non-judgmental tracking only

    - `daily_alignment_blocks`
      - Calendar blocks representing work items
      - User-specified duration and placement
      - Links to tasks/tracks/subtracks

    - `daily_alignment_microtasks`
      - Optional breakdown of blocks into tickable steps
      - Dopamine-positive completion tracking
      - No scoring or streaks

  2. Security
    - Enable RLS on all tables
    - Users can only access their own alignment data
    - No cross-user visibility

  3. Design Principles
    - Optional and user-controlled
    - Once per day visibility
    - Non-judgmental language
    - Fully reversible
    - Dopamine-positive feedback
*/

-- Create enum for alignment status
DO $$ BEGIN
  CREATE TYPE daily_alignment_status AS ENUM ('pending', 'completed', 'dismissed', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for block item types
DO $$ BEGIN
  CREATE TYPE alignment_block_item_type AS ENUM ('task', 'subtrack', 'track', 'project');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create daily_alignments table
CREATE TABLE IF NOT EXISTS daily_alignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  status daily_alignment_status NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create daily_alignment_blocks table
CREATE TABLE IF NOT EXISTS daily_alignment_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alignment_id uuid NOT NULL REFERENCES daily_alignments(id) ON DELETE CASCADE,
  item_type alignment_block_item_type NOT NULL,
  item_id uuid NOT NULL,
  item_title text NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_alignment_microtasks table
CREATE TABLE IF NOT EXISTS daily_alignment_microtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES daily_alignment_blocks(id) ON DELETE CASCADE,
  description text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_alignments_user_date
  ON daily_alignments(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_alignment_blocks_alignment
  ON daily_alignment_blocks(alignment_id);

CREATE INDEX IF NOT EXISTS idx_daily_alignment_microtasks_block
  ON daily_alignment_microtasks(block_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_daily_alignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_alignments_updated_at
  BEFORE UPDATE ON daily_alignments
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_alignment_updated_at();

CREATE TRIGGER daily_alignment_blocks_updated_at
  BEFORE UPDATE ON daily_alignment_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_alignment_updated_at();

CREATE TRIGGER daily_alignment_microtasks_updated_at
  BEFORE UPDATE ON daily_alignment_microtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_alignment_updated_at();

-- Enable RLS
ALTER TABLE daily_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_alignment_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_alignment_microtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_alignments
CREATE POLICY "Users can view own daily alignments"
  ON daily_alignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily alignments"
  ON daily_alignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily alignments"
  ON daily_alignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily alignments"
  ON daily_alignments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for daily_alignment_blocks
CREATE POLICY "Users can view own alignment blocks"
  ON daily_alignment_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_alignments
      WHERE daily_alignments.id = daily_alignment_blocks.alignment_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own alignment blocks"
  ON daily_alignment_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_alignments
      WHERE daily_alignments.id = daily_alignment_blocks.alignment_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own alignment blocks"
  ON daily_alignment_blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_alignments
      WHERE daily_alignments.id = daily_alignment_blocks.alignment_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own alignment blocks"
  ON daily_alignment_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_alignments
      WHERE daily_alignments.id = daily_alignment_blocks.alignment_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

-- RLS Policies for daily_alignment_microtasks
CREATE POLICY "Users can view own alignment microtasks"
  ON daily_alignment_microtasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_alignment_blocks
      JOIN daily_alignments ON daily_alignments.id = daily_alignment_blocks.alignment_id
      WHERE daily_alignment_blocks.id = daily_alignment_microtasks.block_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own alignment microtasks"
  ON daily_alignment_microtasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_alignment_blocks
      JOIN daily_alignments ON daily_alignments.id = daily_alignment_blocks.alignment_id
      WHERE daily_alignment_blocks.id = daily_alignment_microtasks.block_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own alignment microtasks"
  ON daily_alignment_microtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_alignment_blocks
      JOIN daily_alignments ON daily_alignments.id = daily_alignment_blocks.alignment_id
      WHERE daily_alignment_blocks.id = daily_alignment_microtasks.block_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own alignment microtasks"
  ON daily_alignment_microtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_alignment_blocks
      JOIN daily_alignments ON daily_alignments.id = daily_alignment_blocks.alignment_id
      WHERE daily_alignment_blocks.id = daily_alignment_microtasks.block_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

-- Add daily_alignment_enabled to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_alignment_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_alignment_enabled boolean DEFAULT false;
  END IF;
END $$;
