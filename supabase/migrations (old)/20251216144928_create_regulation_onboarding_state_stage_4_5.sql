/*
  # Stage 4.5: Regulation Onboarding State
  
  1. Overview
    - Track whether user has seen Regulation onboarding
    - Track whether mental model card is dismissed
    - Purely for UX (not showing repeatedly), not analytics
    - User can always re-access onboarding
  
  2. New Tables
    - `regulation_onboarding_state`
      - One row per user
      - Tracks if onboarding has been seen
      - Tracks if mental model card is dismissed
  
  3. Important Notes
    - No tracking of completion
    - No tracking of screen views
    - No telemetry
    - No analytics
    - Just: "has seen once" to avoid repetition
*/

-- Onboarding state table
CREATE TABLE IF NOT EXISTS regulation_onboarding_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Simple flags
  has_seen_onboarding boolean DEFAULT false,
  mental_model_card_dismissed boolean DEFAULT false,
  
  -- Timestamps
  onboarding_first_seen_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE regulation_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding state"
  ON regulation_onboarding_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding state"
  ON regulation_onboarding_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding state"
  ON regulation_onboarding_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_regulation_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regulation_onboarding_updated_at
  BEFORE UPDATE ON regulation_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_regulation_onboarding_updated_at();
