/*
  # Calendar Sync Settings Foundation

  1. Purpose
    - Establishes calendar_events as the canonical time authority
    - Creates user-controlled sync settings for calendar integration
    - Defines boundaries between Guardrails and Personal Spaces calendar interactions

  2. New Tables
    - `calendar_sync_settings`
      - `user_id` (uuid, primary key) - One row per user
      - `sync_guardrails_to_personal` (boolean) - Default true: Guardrails projects into Personal Spaces calendar
      - `sync_roadmap_events` (boolean) - Default true: Roadmap events appear in calendar
      - `sync_tasks_with_dates` (boolean) - Default true: Dated tasks appear in calendar
      - `sync_mindmesh_events` (boolean) - Default true: Mind Mesh events appear in calendar
      - `sync_personal_to_guardrails` (boolean) - Default false: Personal calendar does NOT feed into Guardrails
      - `require_confirmation_for_personal_sync` (boolean) - Default true: User must confirm before personal events sync to Guardrails
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - RLS enabled
    - Users can only read/write their own settings

  4. Important Notes
    - ❌ This migration does NOT create any syncing logic
    - ❌ This migration does NOT add any triggers
    - ❌ This migration does NOT modify existing calendar behavior
    - ❌ This migration does NOT add any UI components
    - ✅ This is CONTRACT GROUNDWORK ONLY for future sync implementation

  5. Calendar Authority
    - calendar_events is the ONLY authoritative calendar source
    - All dated items (tasks, roadmap events, mind mesh events, personal events) will reference it
    - Other systems PROJECT INTO the calendar, they do not own time
*/

-- Create calendar_sync_settings table
CREATE TABLE IF NOT EXISTS calendar_sync_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Guardrails → Personal Spaces (default: enabled)
  sync_guardrails_to_personal boolean NOT NULL DEFAULT true,
  sync_roadmap_events boolean NOT NULL DEFAULT true,
  sync_tasks_with_dates boolean NOT NULL DEFAULT true,
  sync_mindmesh_events boolean NOT NULL DEFAULT true,

  -- Personal Spaces → Guardrails (default: disabled)
  sync_personal_to_guardrails boolean NOT NULL DEFAULT false,
  require_confirmation_for_personal_sync boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own settings
CREATE POLICY "Users can read own calendar sync settings"
  ON calendar_sync_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar sync settings"
  ON calendar_sync_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar sync settings"
  ON calendar_sync_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar sync settings"
  ON calendar_sync_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_sync_settings_user_id ON calendar_sync_settings(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_sync_settings_updated_at
  BEFORE UPDATE ON calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_settings_updated_at();