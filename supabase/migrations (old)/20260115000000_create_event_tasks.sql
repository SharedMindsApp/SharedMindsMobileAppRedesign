/*
  # Create Event Tasks System

  1. New Table
    - `event_tasks`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to calendar_events, cascade delete)
      - `title` (text, required)
      - `completed` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on event_tasks
    - Users can read tasks for events they can view
    - Users can create/update/delete tasks for events they can edit

  3. Indexes
    - Index on event_id for fast event task queries
    - Index on completed for filtering incomplete tasks
*/

-- Create event_tasks table
CREATE TABLE IF NOT EXISTS event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT event_tasks_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_tasks_event_id ON event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_completed ON event_tasks(completed) WHERE completed = false;

-- Enable RLS
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view tasks for events they can view
CREATE POLICY "Users can view tasks for events they can view"
  ON event_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_tasks.event_id
      AND (
        -- Personal events: user owns the event
        (calendar_events.user_id = auth.uid())
        OR
        -- Household events: user is a member (household_members.auth_user_id references auth.users.id)
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

-- Users can create tasks for events they can edit
CREATE POLICY "Users can create tasks for events they can edit"
  ON event_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_tasks.event_id
      AND (
        -- Personal events: user owns the event
        (calendar_events.user_id = auth.uid())
        OR
        -- Household events: user is a member (any member can add tasks)
        -- household_members.auth_user_id references auth.users.id
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

-- Users can update tasks for events they can edit
CREATE POLICY "Users can update tasks for events they can edit"
  ON event_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_tasks.event_id
      AND (
        -- Personal events: user owns the event
        (calendar_events.user_id = auth.uid())
        OR
        -- Household events: user is a member
        -- household_members.auth_user_id references auth.users.id
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

-- Users can delete tasks for events they can edit
CREATE POLICY "Users can delete tasks for events they can edit"
  ON event_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_tasks.event_id
      AND (
        -- Personal events: user owns the event
        (calendar_events.user_id = auth.uid())
        OR
        -- Household events: user is a member
        -- household_members.auth_user_id references auth.users.id
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_event_tasks_updated_at
  BEFORE UPDATE ON event_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_event_tasks_updated_at();

-- Add comment
COMMENT ON TABLE event_tasks IS 'Tasks (to-dos) associated with calendar events. Tasks are deleted when their parent event is deleted.';
