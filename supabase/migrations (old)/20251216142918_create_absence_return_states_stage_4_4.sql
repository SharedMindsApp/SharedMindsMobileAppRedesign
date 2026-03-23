/*
  # Stage 4.4: Absence and Return States
  
  1. Overview
    - Detect inactivity gaps (7+ days)
    - Capture optional return context (why away, what changed)
    - Enable calm re-orientation without pressure
    - Support signal behavior adjustment during return period
  
  2. New Tables
    - `regulation_return_contexts`
      - Stores user-provided context when returning after absence
      - Includes reason category, free text, and behavior preference
      - User-owned, sensitive data
    
  3. Behavior Preferences
    - normal: "Keep showing signals normally"
    - quiet: "Show signals quietly for a week"
    - strong_only: "Hide signals unless strong for a week"
    - safe_mode: "Turn on Safe Mode"
  
  4. Privacy & Security
    - All records user-owned
    - RLS enforced
    - No effectiveness tracking
    - No return counting
    - No guilt metrics
  
  5. Important Notes
    - Detection is foreground-only
    - Banner shows once per gap
    - All context capture is optional
    - No automatic behavior enforcement
    - Can exit flow at any time
*/

-- Return context table
CREATE TABLE IF NOT EXISTS regulation_return_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Detection
  absence_detected_at timestamptz NOT NULL DEFAULT now(),
  last_activity_before_absence timestamptz,
  gap_duration_days integer,
  
  -- User-provided context (all optional)
  reason_category text,
    -- Options: 'health_energy', 'family_life', 'travel', 'work_overload', 
    --          'project_paused', 'other', 'prefer_not_to_say', null
  
  user_note text,
  
  -- Behavior preference for return period
  behavior_preference text DEFAULT 'normal',
    -- Options: 'normal', 'quiet', 'strong_only', 'safe_mode'
  
  behavior_preference_until timestamptz,
    -- Auto-set to +7 days if quiet/strong_only chosen
  
  -- State
  context_provided boolean DEFAULT false,
  banner_shown boolean DEFAULT false,
  banner_dismissed boolean DEFAULT false,
  reorientation_shown boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_return_contexts_user_id ON regulation_return_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_return_contexts_absence_detected ON regulation_return_contexts(absence_detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_contexts_preference_until ON regulation_return_contexts(behavior_preference_until)
  WHERE behavior_preference_until IS NOT NULL;

-- RLS
ALTER TABLE regulation_return_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own return contexts"
  ON regulation_return_contexts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own return contexts"
  ON regulation_return_contexts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own return contexts"
  ON regulation_return_contexts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own return contexts"
  ON regulation_return_contexts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_return_contexts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_return_contexts_updated_at
  BEFORE UPDATE ON regulation_return_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_return_contexts_updated_at();
