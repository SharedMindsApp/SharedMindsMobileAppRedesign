/**
 * Separate General Tasks from Event Tasks
 * 
 * This migration:
 * 1. Creates a new `general_tasks` table for standalone tasks
 * 2. Migrates existing standalone tasks from `event_tasks` to `general_tasks`
 * 3. Restores `event_tasks` to only contain event-linked tasks (event_id NOT NULL)
 * 4. Creates a function to promote/integrate general tasks into event tasks
 * 5. Updates RLS policies for both tables
 * 
 * IMPORTANT: This migration is idempotent and handles existing data safely.
 */

-- ============================================================================
-- Step 1: Create general_tasks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.general_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  start_time time,
  duration_minutes integer CHECK (duration_minutes > 0),
  completed boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT general_tasks_title_not_empty CHECK (length(trim(title)) > 0)
);

-- ============================================================================
-- Step 2: Add columns conditionally (handle schema drift)
-- ============================================================================

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'general_tasks' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.general_tasks 
    ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));
  END IF;
END $$;

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'general_tasks' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.general_tasks 
    ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Add progress column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'general_tasks' 
    AND column_name = 'progress'
  ) THEN
    ALTER TABLE public.general_tasks 
    ADD COLUMN progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;

-- ============================================================================
-- Step 3: Create indexes for general_tasks
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_general_tasks_user_id ON public.general_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_general_tasks_date ON public.general_tasks(date);
CREATE INDEX IF NOT EXISTS idx_general_tasks_user_date ON public.general_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_general_tasks_completed ON public.general_tasks(completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_general_tasks_status ON public.general_tasks(status) WHERE status = 'pending';

-- ============================================================================
-- Step 4: Enable RLS and create policies for general_tasks
-- ============================================================================

ALTER TABLE public.general_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own general tasks" ON public.general_tasks;
DROP POLICY IF EXISTS "Users can create their own general tasks" ON public.general_tasks;
DROP POLICY IF EXISTS "Users can update their own general tasks" ON public.general_tasks;
DROP POLICY IF EXISTS "Users can delete their own general tasks" ON public.general_tasks;

-- SELECT: Users can view their own tasks
CREATE POLICY "Users can view their own general tasks"
  ON public.general_tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Users can create their own tasks
CREATE POLICY "Users can create their own general tasks"
  ON public.general_tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own tasks
CREATE POLICY "Users can update their own general tasks"
  ON public.general_tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own tasks
CREATE POLICY "Users can delete their own general tasks"
  ON public.general_tasks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Step 5: Create trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_general_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_general_tasks_updated_at ON public.general_tasks;
CREATE TRIGGER update_general_tasks_updated_at
  BEFORE UPDATE ON public.general_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_general_tasks_updated_at();

-- ============================================================================
-- Step 6: Migrate existing standalone tasks from event_tasks to general_tasks
-- ============================================================================

-- Only migrate if event_tasks table exists and has rows with event_id IS NULL
DO $$
DECLARE
  task_count INTEGER;
BEGIN
  -- Check if there are any standalone tasks to migrate
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_tasks'
  ) THEN
    -- Count standalone tasks
    SELECT COUNT(*) INTO task_count
    FROM public.event_tasks
    WHERE event_id IS NULL AND user_id IS NOT NULL;
    
    -- Migrate standalone tasks if they exist
    IF task_count > 0 THEN
      INSERT INTO public.general_tasks (
        id,
        user_id,
        title,
        date,
        start_time,
        duration_minutes,
        completed,
        status,
        completed_at,
        progress,
        created_at,
        updated_at
      )
      SELECT 
        id,
        user_id,
        title,
        date,
        start_time,
        duration_minutes,
        completed,
        COALESCE(status, CASE WHEN completed THEN 'completed' ELSE 'pending' END),
        completed_at,
        COALESCE(progress, CASE WHEN completed THEN 100 ELSE 0 END),
        created_at,
        updated_at
      FROM public.event_tasks
      WHERE event_id IS NULL AND user_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING; -- Skip if already migrated
      
      RAISE NOTICE 'Migrated % standalone tasks from event_tasks to general_tasks', task_count;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- Step 7: Clean up event_tasks - remove standalone task support
-- ============================================================================

-- Remove standalone task constraints and columns from event_tasks
-- First, ensure all standalone tasks are migrated (delete any remaining)
DO $$
BEGIN
  -- Delete any remaining standalone tasks (shouldn't happen after migration, but safety check)
  DELETE FROM public.event_tasks 
  WHERE event_id IS NULL;
  
  -- Make event_id NOT NULL again (it was made nullable for standalone tasks)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'event_tasks' 
    AND column_name = 'event_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Only make NOT NULL if there are no NULL values
    IF NOT EXISTS (SELECT 1 FROM public.event_tasks WHERE event_id IS NULL) THEN
      ALTER TABLE public.event_tasks ALTER COLUMN event_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Remove standalone task columns from event_tasks (date, start_time, duration_minutes, user_id)
-- These are no longer needed since standalone tasks are in general_tasks
DO $$
BEGIN
  -- Remove date column (keep for now, might be used elsewhere - safer to leave)
  -- ALTER TABLE public.event_tasks DROP COLUMN IF EXISTS date;
  
  -- Remove start_time column
  -- ALTER TABLE public.event_tasks DROP COLUMN IF EXISTS start_time;
  
  -- Remove duration_minutes column
  -- ALTER TABLE public.event_tasks DROP COLUMN IF EXISTS duration_minutes;
  
  -- Remove user_id column (event tasks don't need it, they get user_id from event)
  -- ALTER TABLE public.event_tasks DROP COLUMN IF EXISTS user_id;
  
  -- Note: Keeping these columns for now to avoid breaking existing code
  -- They can be removed in a future migration after all code is updated
END $$;

-- Update RLS policies for event_tasks (remove standalone task logic)
-- Drop and recreate policies to remove standalone task support
DROP POLICY IF EXISTS "Users can view tasks for events they can view or their own standalone tasks" ON public.event_tasks;
DROP POLICY IF EXISTS "Users can create tasks for events they can edit or their own standalone tasks" ON public.event_tasks;
DROP POLICY IF EXISTS "Users can update tasks for events they can edit or their own standalone tasks" ON public.event_tasks;
DROP POLICY IF EXISTS "Users can delete tasks for events they can edit or their own standalone tasks" ON public.event_tasks;

-- Recreate event_tasks policies (only for event-linked tasks now)
CREATE POLICY "Users can view tasks for events they can view"
  ON public.event_tasks FOR SELECT
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
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can create tasks for events they can edit"
  ON public.event_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_tasks.event_id
      AND (
        -- Personal events: user owns the event
        (calendar_events.user_id = auth.uid())
        OR
        -- Household events: user is a member
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can update tasks for events they can edit"
  ON public.event_tasks FOR UPDATE
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
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_tasks.event_id
      AND (
        -- Personal events: user owns the event
        (calendar_events.user_id = auth.uid())
        OR
        -- Household events: user is a member
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can delete tasks for events they can edit"
  ON public.event_tasks FOR DELETE
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
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_members.household_id = calendar_events.household_id
          AND household_members.auth_user_id = auth.uid()
          AND household_members.status = 'active'
        )
      )
    )
  );

-- ============================================================================
-- Step 8: Create function to promote/integrate general task to event task
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_general_task_to_event_task(
  p_general_task_id UUID,
  p_event_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_record RECORD;
  v_new_event_task_id UUID;
BEGIN
  -- Verify the general task exists and belongs to the current user
  SELECT * INTO v_task_record
  FROM public.general_tasks
  WHERE id = p_general_task_id
    AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'General task not found or access denied';
  END IF;
  
  -- Verify the event exists and user can edit it
  IF NOT EXISTS (
    SELECT 1 FROM calendar_events
    WHERE id = p_event_id
    AND (
      calendar_events.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = calendar_events.household_id
        AND household_members.auth_user_id = auth.uid()
        AND household_members.status = 'active'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;
  
  -- Create the event task with data from general task
  INSERT INTO public.event_tasks (
    id,
    event_id,
    title,
    completed,
    status,
    completed_at,
    progress,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(), -- New ID for event task
    p_event_id,
    v_task_record.title,
    v_task_record.completed,
    v_task_record.status,
    v_task_record.completed_at,
    v_task_record.progress,
    v_task_record.created_at,
    now()
  )
  RETURNING id INTO v_new_event_task_id;
  
  -- Migrate tags from general_task to event_task (if tag links exist)
  -- Tag links use entity_type = 'task' for both general_tasks and event_tasks
  -- We just need to update the entity_id to point to the new event_task
  UPDATE tag_links
  SET entity_id = v_new_event_task_id
  WHERE entity_id = p_general_task_id
    AND entity_type = 'task';
  
  -- Migrate reminders from general_task to event_task (if reminders exist)
  -- Reminders use entity_type = 'task' for both general_tasks and event_tasks
  -- We just need to update the entity_id to point to the new event_task
  UPDATE reminders
  SET entity_id = v_new_event_task_id
  WHERE entity_id = p_general_task_id
    AND entity_type = 'task';
  
  -- Delete the general task (now that it's been migrated)
  DELETE FROM public.general_tasks
  WHERE id = p_general_task_id;
  
  RETURN v_new_event_task_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.promote_general_task_to_event_task(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.promote_general_task_to_event_task IS 'Promotes/integrates a general task into an event task. Deletes the general task and creates a new event task, preserving tags and reminders.';

-- ============================================================================
-- Step 9: Add comments
-- ============================================================================

COMMENT ON TABLE public.general_tasks IS 'Standalone tasks not linked to calendar events. Can be promoted/integrated into event tasks.';
COMMENT ON COLUMN public.general_tasks.user_id IS 'User who owns this task (auth.users.id)';
COMMENT ON COLUMN public.general_tasks.date IS 'Date for the task (required)';
COMMENT ON COLUMN public.general_tasks.start_time IS 'Optional start time for the task';
COMMENT ON COLUMN public.general_tasks.duration_minutes IS 'Optional duration in minutes';
COMMENT ON COLUMN public.general_tasks.progress IS 'Completion percentage (0-100)';

COMMENT ON TABLE public.event_tasks IS 'Tasks linked to calendar events. Date/time derived from event. Cannot be standalone tasks.';
