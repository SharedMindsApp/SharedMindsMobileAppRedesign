/*
  # Add Standalone Task Support

  1. Add columns for standalone tasks
    - `date` (date, required for standalone tasks)
    - `start_time` (time, nullable)
    - `duration_minutes` (integer, nullable)
  
  2. Make event_id nullable
    - event_id = null → standalone task
    - event_id != null → event task (existing behavior)

  3. Add constraints
    - If event_id is null, date must be set
    - If event_id is not null, date should be null (derived from event)

  4. Update indexes
    - Add index on date for standalone task queries
    - Add index on user_id for user task queries (via profiles)

  5. Update RLS policies
    - Allow creating standalone tasks (event_id is null)
    - Allow viewing standalone tasks for the user
*/

-- Add date column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'date') THEN
    ALTER TABLE event_tasks ADD COLUMN date date;
  END IF;
END $$;

-- Add start_time column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'start_time') THEN
    ALTER TABLE event_tasks ADD COLUMN start_time time;
  END IF;
END $$;

-- Add duration_minutes column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'duration_minutes') THEN
    ALTER TABLE event_tasks ADD COLUMN duration_minutes integer CHECK (duration_minutes > 0);
  END IF;
END $$;

-- Add user_id column for standalone tasks (needed for RLS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tasks' AND column_name = 'user_id') THEN
    ALTER TABLE event_tasks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make event_id nullable (was NOT NULL before)
DO $$ BEGIN
  -- Check if event_id is currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_tasks' 
    AND column_name = 'event_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE event_tasks ALTER COLUMN event_id DROP NOT NULL;
  END IF;
END $$;

-- Add constraint: If event_id is null, date must be set
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_tasks_standalone_date_check'
  ) THEN
    ALTER TABLE event_tasks ADD CONSTRAINT event_tasks_standalone_date_check 
      CHECK (event_id IS NOT NULL OR date IS NOT NULL);
  END IF;
END $$;

-- Add constraint: If event_id is set, user_id should be null (user_id comes from event)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_tasks_user_id_check'
  ) THEN
    ALTER TABLE event_tasks ADD CONSTRAINT event_tasks_user_id_check 
      CHECK (event_id IS NOT NULL OR user_id IS NOT NULL);
  END IF;
END $$;

-- Create indexes for standalone tasks
CREATE INDEX IF NOT EXISTS idx_event_tasks_date ON event_tasks(date) WHERE event_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_tasks_user_id ON event_tasks(user_id) WHERE event_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_tasks_user_date ON event_tasks(user_id, date) WHERE event_id IS NULL AND completed = false;

-- Drop old RLS policies (we'll recreate them with standalone task support)
DROP POLICY IF EXISTS "Users can view tasks for events they can view" ON event_tasks;
DROP POLICY IF EXISTS "Users can create tasks for events they can edit" ON event_tasks;
DROP POLICY IF EXISTS "Users can update tasks for events they can edit" ON event_tasks;
DROP POLICY IF EXISTS "Users can delete tasks for events they can edit" ON event_tasks;

-- Recreate SELECT policy with standalone task support
CREATE POLICY "Users can view tasks for events they can view or their own standalone tasks"
  ON event_tasks FOR SELECT
  TO authenticated
  USING (
    -- Standalone tasks: user owns them
    (event_id IS NULL AND user_id = auth.uid())
    OR
    -- Event tasks: user can view the event
    (
      event_id IS NOT NULL
      AND EXISTS (
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
    )
  );

-- Recreate INSERT policy with standalone task support
CREATE POLICY "Users can create tasks for events they can edit or their own standalone tasks"
  ON event_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Standalone tasks: user_id must match current user
    (event_id IS NULL AND user_id = auth.uid() AND date IS NOT NULL)
    OR
    -- Event tasks: user can edit the event
    (
      event_id IS NOT NULL
      AND EXISTS (
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
    )
  );

-- Recreate UPDATE policy with standalone task support
CREATE POLICY "Users can update tasks for events they can edit or their own standalone tasks"
  ON event_tasks FOR UPDATE
  TO authenticated
  USING (
    -- Standalone tasks: user owns them
    (event_id IS NULL AND user_id = auth.uid())
    OR
    -- Event tasks: user can edit the event
    (
      event_id IS NOT NULL
      AND EXISTS (
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
    )
  );

-- Recreate DELETE policy with standalone task support
CREATE POLICY "Users can delete tasks for events they can edit or their own standalone tasks"
  ON event_tasks FOR DELETE
  TO authenticated
  USING (
    -- Standalone tasks: user owns them
    (event_id IS NULL AND user_id = auth.uid())
    OR
    -- Event tasks: user can edit the event
    (
      event_id IS NOT NULL
      AND EXISTS (
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
    )
  );

-- Add comments
COMMENT ON COLUMN event_tasks.date IS 'Date for standalone tasks (required when event_id is null)';
COMMENT ON COLUMN event_tasks.start_time IS 'Optional start time for standalone tasks';
COMMENT ON COLUMN event_tasks.duration_minutes IS 'Optional duration in minutes for standalone tasks';
COMMENT ON COLUMN event_tasks.user_id IS 'User ID for standalone tasks (required when event_id is null)';
COMMENT ON COLUMN event_tasks.event_id IS 'Event ID for event-linked tasks (null for standalone tasks)';
