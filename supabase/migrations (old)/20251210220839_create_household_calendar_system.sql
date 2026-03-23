/*
  # Create Household Calendar System

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `created_by` (uuid, foreign key to profiles)
      - `title` (text, event title)
      - `description` (text, event description)
      - `start_at` (timestamptz, event start time)
      - `end_at` (timestamptz, event end time)
      - `all_day` (boolean, whether event is all-day)
      - `location` (text, event location)
      - `color` (text, event color category)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `calendar_event_members`
      - `event_id` (uuid, foreign key to calendar_events)
      - `member_profile_id` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on both tables
    - Household members can read all events in their household
    - Only event creator and household admins can update/delete events
    - Any household member can create events

  3. Indexes
    - Index on household_id for fast household event queries
    - Index on start_at for chronological sorting
    - Index on event_id for member lookups
*/

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  location text DEFAULT '',
  color text DEFAULT 'blue',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_event_times CHECK (end_at >= start_at),
  CONSTRAINT valid_color CHECK (color IN ('blue', 'red', 'yellow', 'green', 'purple', 'gray', 'orange', 'pink'))
);

-- Create calendar_event_members table
CREATE TABLE IF NOT EXISTS calendar_event_members (
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  member_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, member_profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_household ON calendar_events(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_event_members_event ON calendar_event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_members_profile ON calendar_event_members(member_profile_id);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Household members can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Household members can create calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Event creators and admins can update events" ON calendar_events;
DROP POLICY IF EXISTS "Event creators and admins can delete events" ON calendar_events;
DROP POLICY IF EXISTS "Household members can view event members" ON calendar_event_members;
DROP POLICY IF EXISTS "Event creators can manage event members" ON calendar_event_members;

-- RLS Policies for calendar_events

-- SELECT: Household members can view all events in their household
CREATE POLICY "Household members can view calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- INSERT: Any household member can create events
CREATE POLICY "Household members can create calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
      AND status = 'accepted'
    )
    AND created_by = auth.uid()
  );

-- UPDATE: Event creator or household admin can update
CREATE POLICY "Event creators and admins can update events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'accepted'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'accepted'
    )
  );

-- DELETE: Event creator or household admin can delete
CREATE POLICY "Event creators and admins can delete events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    household_id IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'accepted'
    )
  );

-- RLS Policies for calendar_event_members

-- SELECT: Household members can view event members
CREATE POLICY "Household members can view event members"
  ON calendar_event_members
  FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id
      FROM calendar_events
      WHERE household_id IN (
        SELECT household_id
        FROM household_members
        WHERE user_id = auth.uid()
        AND status = 'accepted'
      )
    )
  );

-- INSERT/UPDATE/DELETE: Event creator or household admin can manage members
CREATE POLICY "Event creators can manage event members"
  ON calendar_event_members
  FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id
      FROM calendar_events
      WHERE created_by = auth.uid()
      OR household_id IN (
        SELECT household_id
        FROM household_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
        AND status = 'accepted'
      )
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id
      FROM calendar_events
      WHERE created_by = auth.uid()
      OR household_id IN (
        SELECT household_id
        FROM household_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
        AND status = 'accepted'
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_updated_at();
