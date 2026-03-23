/**
 * Reminders System for Events and Tasks
 * 
 * Creates:
 * - reminders table (stores reminder configurations for events and tasks)
 * 
 * Features:
 * - Multiple reminders per event/task
 * - Reminder offsets (15 min, 30 min, 1 hour, etc.)
 * - Owner-only or all attendees
 * - Scheduled via edge function
 * 
 * IMPORTANT: This migration is idempotent and handles existing tables.
 * It uses ALTER TABLE to add missing columns rather than CREATE TABLE IF NOT EXISTS.
 */

-- ============================================================================
-- Step 1: Ensure reminders table exists (create only if it doesn't)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Step 2: Add columns conditionally (handles schema drift)
-- ============================================================================

-- Add entity_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'event';
  END IF;
END $$;

-- Add CHECK constraint for entity_type (drop first if exists, then add)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' 
    AND table_name = 'reminders'
    AND constraint_name = 'reminders_entity_type_check'
  ) THEN
    ALTER TABLE public.reminders DROP CONSTRAINT reminders_entity_type_check;
  END IF;
  
  ALTER TABLE public.reminders 
  ADD CONSTRAINT reminders_entity_type_check 
  CHECK (entity_type IN ('event', 'task'));
  
  -- Remove default after constraint is added
  ALTER TABLE public.reminders 
  ALTER COLUMN entity_type DROP DEFAULT;
END $$;

-- Add entity_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN entity_id UUID NOT NULL DEFAULT gen_random_uuid();
    -- Remove default after adding
    ALTER TABLE public.reminders 
    ALTER COLUMN entity_id DROP DEFAULT;
  END IF;
END $$;

-- Add offset_minutes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'offset_minutes'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN offset_minutes INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add CHECK constraint for offset_minutes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' 
    AND table_name = 'reminders'
    AND constraint_name = 'reminders_offset_minutes_check'
  ) THEN
    ALTER TABLE public.reminders 
    ADD CONSTRAINT reminders_offset_minutes_check 
    CHECK (offset_minutes >= 0);
  END IF;
  
  -- Remove default after constraint is added
  ALTER TABLE public.reminders 
  ALTER COLUMN offset_minutes DROP DEFAULT;
END $$;

-- Add owner_user_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make owner_user_id NOT NULL after it's created (handle existing data)
DO $$
BEGIN
  -- Only make it NOT NULL if there's no existing data or all rows have owner_user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'owner_user_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Check if there are any NULL values
    IF NOT EXISTS (SELECT 1 FROM public.reminders WHERE owner_user_id IS NULL) THEN
      ALTER TABLE public.reminders 
      ALTER COLUMN owner_user_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Add notify_owner column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'notify_owner'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN notify_owner BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add notify_attendees column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'notify_attendees'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN notify_attendees BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add is_sent column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN is_sent BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add sent_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add space_id column (nullable - for personal event/task reminders, this can be null)
-- Handle schema drift: existing reminders table might have space_id as NOT NULL
DO $$
BEGIN
  -- Check if space_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'space_id'
  ) THEN
    -- Add space_id as nullable for event/task reminders
    ALTER TABLE public.reminders 
    ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
  END IF;
  
  -- If space_id exists but is NOT NULL, make it nullable (for personal event reminders)
  -- This allows personal calendar event reminders to have NULL space_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'space_id'
    AND is_nullable = 'NO'
  ) THEN
    -- Only make nullable if safe (no existing NULL values that would violate constraint)
    -- But since we're making it nullable, this should be safe
    BEGIN
      ALTER TABLE public.reminders 
      ALTER COLUMN space_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If there's an error (e.g., existing data constraints), log but continue
      RAISE NOTICE 'Could not make space_id nullable: %', SQLERRM;
    END;
  END IF;
END $$;

-- Add created_by column (nullable for new event/task reminders, but should be set when possible)
-- The old reminders table has created_by as NOT NULL referencing profiles(id)
-- For event/task reminders, we'll set it to the profile ID corresponding to owner_user_id
DO $$
BEGIN
  -- Check if created_by column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'created_by'
  ) THEN
    -- Add created_by as nullable (event/task reminders will set it, old reminders already have it)
    ALTER TABLE public.reminders 
    ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  -- If created_by exists but is NOT NULL, we need to handle it carefully
  -- For now, leave it as-is if it's NOT NULL (for old reminders compatibility)
  -- New event/task reminders will always set created_by via the application layer
END $$;

-- ============================================================================
-- Step 3: Add unique constraint (after all columns exist)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'reminders'
    AND constraint_name = 'reminders_entity_type_entity_id_offset_minutes_owner_user_id_key'
  ) THEN
    ALTER TABLE public.reminders
    ADD CONSTRAINT reminders_entity_type_entity_id_offset_minutes_owner_user_id_key
    UNIQUE(entity_type, entity_id, offset_minutes, owner_user_id);
  END IF;
END $$;

-- ============================================================================
-- Step 4: Create indexes (after columns exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reminders_entity ON public.reminders(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reminders_owner ON public.reminders(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_unsent ON public.reminders(is_sent, entity_type, entity_id) WHERE is_sent = false;

-- ============================================================================
-- Step 5: Enable RLS and create policies
-- ============================================================================

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view reminders for their entities" ON public.reminders;
DROP POLICY IF EXISTS "Users can create reminders for their own entities" ON public.reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;

-- Users can view reminders for events/tasks they own or are part of
CREATE POLICY "Users can view reminders for their entities"
  ON public.reminders
  FOR SELECT
  USING (
    -- Owner can view all their reminders
    owner_user_id = auth.uid()
    OR
    -- Members can view reminders for events/tasks they're part of
    (
      entity_type = 'event' AND EXISTS (
        SELECT 1 FROM public.calendar_events ce
        LEFT JOIN public.calendar_event_members cem ON ce.id = cem.event_id
        LEFT JOIN public.profiles p ON cem.member_profile_id = p.id
        WHERE ce.id = reminders.entity_id
        AND (ce.user_id::text = auth.uid()::text OR p.user_id = auth.uid())
      )
    )
    OR
    (
      entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.event_tasks et
        LEFT JOIN public.calendar_events ce ON et.event_id = ce.id
        LEFT JOIN public.calendar_event_members cem ON ce.id = cem.event_id
        LEFT JOIN public.profiles p ON cem.member_profile_id = p.id
        WHERE et.id = reminders.entity_id
        AND (et.user_id::text = auth.uid()::text OR ce.user_id::text = auth.uid()::text OR p.user_id = auth.uid())
      )
    )
  );

-- Only owners can create reminders
CREATE POLICY "Users can create reminders for their own entities"
  ON public.reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
  );

-- Only owners can update their reminders
CREATE POLICY "Users can update their own reminders"
  ON public.reminders
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Only owners can delete their reminders
CREATE POLICY "Users can delete their own reminders"
  ON public.reminders
  FOR DELETE
  USING (owner_user_id = auth.uid());

-- ============================================================================
-- Step 6: Add comments
-- ============================================================================

COMMENT ON TABLE public.reminders IS 'Reminder configurations for events and tasks. Scheduled notifications are sent via edge function.';
COMMENT ON COLUMN public.reminders.offset_minutes IS 'Minutes before entity start time to send reminder (0 = at start time)';
COMMENT ON COLUMN public.reminders.notify_owner IS 'Whether to notify the event/task owner';
COMMENT ON COLUMN public.reminders.notify_attendees IS 'Whether to notify all event/task attendees/members';

-- ============================================================================
-- Step 7: Helper Function: Get reminders due for processing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_due_reminders()
RETURNS TABLE (
  reminder_id UUID,
  entity_type TEXT,
  entity_id UUID,
  offset_minutes INTEGER,
  owner_user_id UUID,
  notify_owner BOOLEAN,
  notify_attendees BOOLEAN,
  event_start_at TIMESTAMPTZ,
  task_date TIMESTAMPTZ,
  owner_user_auth_id UUID,
  attendee_user_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS reminder_id,
    r.entity_type,
    r.entity_id,
    r.offset_minutes,
    r.owner_user_id,
    r.notify_owner,
    r.notify_attendees,
    CASE 
      WHEN r.entity_type = 'event' THEN ce.start_at
      ELSE NULL
    END AS event_start_at,
    CASE
      WHEN r.entity_type = 'task' THEN 
        CASE
          WHEN et.event_id IS NOT NULL THEN ce_task.start_at
          ELSE (et.date || ' ' || COALESCE(et.start_time, '00:00:00'))::TIMESTAMPTZ
        END
      ELSE NULL
    END AS task_date,
    -- owner_user_id is already auth.users.id, so use it directly
    r.owner_user_id AS owner_user_auth_id,
    -- Get attendee user IDs if notify_attendees is true
    CASE
      WHEN r.notify_attendees AND r.entity_type = 'event' THEN
        ARRAY(
          SELECT DISTINCT p.user_id
          FROM public.calendar_event_members cem
          JOIN public.profiles p ON cem.member_profile_id = p.id
          WHERE cem.event_id = r.entity_id
          AND p.user_id IS NOT NULL
        )
      WHEN r.notify_attendees AND r.entity_type = 'task' AND et.event_id IS NOT NULL THEN
        ARRAY(
          SELECT DISTINCT p.user_id
          FROM public.calendar_event_members cem
          JOIN public.profiles p ON cem.member_profile_id = p.id
          WHERE cem.event_id = et.event_id
          AND p.user_id IS NOT NULL
        )
      ELSE ARRAY[]::UUID[]
    END AS attendee_user_ids
  FROM public.reminders r
  LEFT JOIN public.calendar_events ce ON r.entity_type = 'event' AND r.entity_id = ce.id
  LEFT JOIN public.event_tasks et ON r.entity_type = 'task' AND r.entity_id = et.id
  LEFT JOIN public.calendar_events ce_task ON et.event_id = ce_task.id
  WHERE r.is_sent = false
    AND (
      -- Event reminders: due if (start_at - offset_minutes) <= now()
      (r.entity_type = 'event' AND ce.start_at IS NOT NULL 
        AND (ce.start_at - (r.offset_minutes || ' minutes')::INTERVAL) <= now())
      OR
      -- Task reminders: due if (date/time - offset_minutes) <= now()
      (r.entity_type = 'task' AND et.date IS NOT NULL
        AND (
          (et.event_id IS NOT NULL AND ce_task.start_at IS NOT NULL
            AND (ce_task.start_at - (r.offset_minutes || ' minutes')::INTERVAL) <= now())
          OR
          (et.event_id IS NULL
            AND ((et.date || ' ' || COALESCE(et.start_time, '00:00:00'))::TIMESTAMPTZ 
              - (r.offset_minutes || ' minutes')::INTERVAL) <= now())
        )
      )
    );
END;
$$;

COMMENT ON FUNCTION public.get_due_reminders IS 'Returns all reminders that are due to be sent. Used by scheduled edge function.';

-- ============================================================================
-- Step 8: Function: Mark reminder as sent
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_reminder_sent(p_reminder_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reminders
  SET is_sent = true,
      sent_at = now(),
      updated_at = now()
  WHERE id = p_reminder_id;
END;
$$;

COMMENT ON FUNCTION public.mark_reminder_sent IS 'Marks a reminder as sent after notification is delivered.';
