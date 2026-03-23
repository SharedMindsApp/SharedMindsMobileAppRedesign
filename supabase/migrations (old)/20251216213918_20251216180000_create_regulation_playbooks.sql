/*
  # Create Regulation Playbooks & Quick Pins System

  1. New Tables
    - `regulation_playbooks`
      - Signal-linked personal reference notes
      - User-authored, optional, editable
      - Links to signal types, not instances
    - `regulation_quick_pins`
      - Fast context capture (10-second reflections)
      - Optional one-line notes
      - Links to signal instances

  2. Security
    - Enable RLS on both tables
    - Users can only access their own playbooks and pins
    - No cross-user inference or aggregation
    - Treated as sensitive personal data

  3. Important Notes
    - No analytics or aggregation allowed
    - No AI interpretation layer
    - No export by default
    - User-authored only, no system suggestions
    - Never blocks progress or creates obligations
*/

-- Create regulation_playbooks table
CREATE TABLE IF NOT EXISTS regulation_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  notes text,
  helps jsonb DEFAULT '[]'::jsonb,
  doesnt_help text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, signal_key)
);

-- Create regulation_quick_pins table
CREATE TABLE IF NOT EXISTS regulation_quick_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_instance_id uuid,
  signal_key text NOT NULL,
  reason_tags text[] DEFAULT '{}'::text[],
  note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE regulation_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_quick_pins ENABLE ROW LEVEL SECURITY;

-- Policies for regulation_playbooks
CREATE POLICY "Users can view own playbooks"
  ON regulation_playbooks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own playbooks"
  ON regulation_playbooks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbooks"
  ON regulation_playbooks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playbooks"
  ON regulation_playbooks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for regulation_quick_pins
CREATE POLICY "Users can view own quick pins"
  ON regulation_quick_pins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quick pins"
  ON regulation_quick_pins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quick pins"
  ON regulation_quick_pins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_regulation_playbooks_user_id ON regulation_playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_playbooks_signal_key ON regulation_playbooks(user_id, signal_key);
CREATE INDEX IF NOT EXISTS idx_regulation_quick_pins_user_id ON regulation_quick_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_quick_pins_signal_key ON regulation_quick_pins(user_id, signal_key);

-- Update trigger for regulation_playbooks
CREATE OR REPLACE FUNCTION update_regulation_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regulation_playbooks_updated_at
  BEFORE UPDATE ON regulation_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_regulation_playbooks_updated_at();
