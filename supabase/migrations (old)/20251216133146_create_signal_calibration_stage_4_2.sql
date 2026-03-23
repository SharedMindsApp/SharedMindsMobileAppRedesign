/*
  # Stage 4.2: Signal Calibration & Personal Interpretation

  1. New Tables
    - `regulation_signal_calibration`
      - User preferences for each signal type
      - Sensitivity, relevance, visibility settings
      - Display-only, does not affect computation
      - Fully reversible

  2. Updates to Existing Tables
    - Add intensity calculation support to active signals
    - Add snooze functionality

  3. Security
    - Enable RLS on calibration table
    - Users can only manage their own calibration settings

  4. Important Notes
    - Calibration affects display only, NOT computation
    - No historical tracking
    - No trend analysis
    - No comparison to baselines
*/

-- Signal Calibration Settings (User-Authored)
CREATE TABLE IF NOT EXISTS regulation_signal_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key text NOT NULL,

  -- Sensitivity (affects when signal is shown based on computed intensity)
  sensitivity text DEFAULT 'as_is' CHECK (sensitivity IN ('earlier', 'as_is', 'only_when_strong')),

  -- Relevance (user's personal assessment)
  relevance text DEFAULT 'sometimes_useful' CHECK (relevance IN ('very_relevant', 'sometimes_useful', 'not_useful_right_now')),

  -- Visibility (display preference)
  visibility text DEFAULT 'prominently' CHECK (visibility IN ('prominently', 'quietly', 'hide_unless_strong')),

  -- Notes (optional user context)
  user_notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, signal_key)
);

ALTER TABLE regulation_signal_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signal calibration"
  ON regulation_signal_calibration
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signal calibration"
  ON regulation_signal_calibration
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signal calibration"
  ON regulation_signal_calibration
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal calibration"
  ON regulation_signal_calibration
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add snooze functionality to active signals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regulation_active_signals' AND column_name = 'snoozed_until'
  ) THEN
    ALTER TABLE regulation_active_signals ADD COLUMN snoozed_until timestamptz;
  END IF;
END $$;

-- Add intensity to active signals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regulation_active_signals' AND column_name = 'intensity'
  ) THEN
    ALTER TABLE regulation_active_signals ADD COLUMN intensity text DEFAULT 'medium' CHECK (intensity IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Update RLS policy to respect snooze
DROP POLICY IF EXISTS "Users can view own active signals" ON regulation_active_signals;

CREATE POLICY "Users can view own active signals"
  ON regulation_active_signals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND dismissed_at IS NULL 
    AND expires_at > now()
    AND (snoozed_until IS NULL OR snoozed_until < now())
  );

-- Index for calibration lookups
CREATE INDEX IF NOT EXISTS idx_signal_calibration_user_signal ON regulation_signal_calibration(user_id, signal_key);
