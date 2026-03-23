/*
  # Add Tracker Reminders Support
  
  1. Changes
    - Extend reminders table to support 'tracker' entity_type
    - Add tracker-specific fields: reminder_kind, schedule, delivery_channels, is_active
    - Update RLS policies for tracker reminders
    - Add helper function to get due tracker reminders
  
  2. Notes
    - Reminders are optional, dismissible, and configurable
    - No enforcement, no guilt language, no streaks
    - Reminders only fire if entry doesn't exist
    - Respects tracker permissions (read-only users don't get reminders)
*/

-- Extend entity_type to include 'tracker'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' 
    AND table_name = 'reminders'
    AND constraint_name = 'reminders_entity_type_check'
  ) THEN
    ALTER TABLE public.reminders DROP CONSTRAINT reminders_entity_type_check;
  END IF;
  
  -- Add new constraint including 'tracker'
  ALTER TABLE public.reminders 
  ADD CONSTRAINT reminders_entity_type_check 
  CHECK (entity_type IN ('event', 'task', 'tracker'));
END $$;

-- Add reminder_kind column (for tracker reminders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'reminder_kind'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN reminder_kind TEXT;
  END IF;
END $$;

-- Add CHECK constraint for reminder_kind (only for tracker reminders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' 
    AND table_name = 'reminders'
    AND constraint_name = 'reminders_reminder_kind_check'
  ) THEN
    ALTER TABLE public.reminders 
    ADD CONSTRAINT reminders_reminder_kind_check 
    CHECK (
      (entity_type != 'tracker') OR 
      (entity_type = 'tracker' AND reminder_kind IN ('entry_prompt', 'reflection'))
    );
  END IF;
END $$;

-- Add schedule column (JSONB for cron-like or rule-based timing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'schedule'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN schedule JSONB;
  END IF;
END $$;

-- Add delivery_channels column (array of channels)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'delivery_channels'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN delivery_channels TEXT[];
  END IF;
END $$;

-- Add CHECK constraint for delivery_channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' 
    AND table_name = 'reminders'
    AND constraint_name = 'reminders_delivery_channels_check'
  ) THEN
    ALTER TABLE public.reminders 
    ADD CONSTRAINT reminders_delivery_channels_check 
    CHECK (
      delivery_channels IS NULL OR
      (array_length(delivery_channels, 1) > 0 AND
       delivery_channels <@ ARRAY['in_app', 'push']::TEXT[])
    );
  END IF;
END $$;

-- Add is_active column (for enabling/disabling reminders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminders' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.reminders 
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index for tracker reminders
CREATE INDEX IF NOT EXISTS idx_reminders_tracker_active 
  ON public.reminders(entity_type, entity_id, is_active) 
  WHERE entity_type = 'tracker' AND is_active = true;

-- Update RLS policies to support tracker reminders
-- Drop existing policy and recreate with tracker support
DROP POLICY IF EXISTS "Users can view reminders for their entities" ON public.reminders;

CREATE POLICY "Users can view reminders for their entities"
  ON public.reminders
  FOR SELECT
  USING (
    -- Owner can view all their reminders
    owner_user_id = auth.uid()
    OR
    -- Event reminders (existing logic)
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
    -- Task reminders (existing logic)
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
    OR
    -- Tracker reminders: user can view if they have access to tracker
    (
      entity_type = 'tracker' AND EXISTS (
        SELECT 1 FROM public.trackers t
        WHERE t.id = reminders.entity_id
        AND (
          -- Owner can always view
          t.owner_id = auth.uid()
          OR
          -- Shared users with read/write access can view
          EXISTS (
            SELECT 1 FROM public.entity_permission_grants epg
            JOIN public.profiles p ON epg.subject_id = p.id
            WHERE epg.entity_type = 'tracker'
            AND epg.entity_id = t.id
            AND epg.subject_type = 'user'
            AND p.user_id = auth.uid()
            AND epg.revoked_at IS NULL
            AND epg.permission_role IN ('viewer', 'editor')
          )
        )
      )
    )
  );

-- Helper function: Get due tracker reminders
CREATE OR REPLACE FUNCTION public.get_due_tracker_reminders()
RETURNS TABLE (
  reminder_id UUID,
  tracker_id UUID,
  reminder_kind TEXT,
  owner_user_id UUID,
  schedule JSONB,
  delivery_channels TEXT[],
  tracker_name TEXT,
  entry_granularity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS reminder_id,
    r.entity_id AS tracker_id,
    r.reminder_kind,
    r.owner_user_id,
    r.schedule,
    r.delivery_channels,
    t.name AS tracker_name,
    t.entry_granularity::TEXT AS entry_granularity
  FROM public.reminders r
  JOIN public.trackers t ON r.entity_id = t.id
  WHERE r.entity_type = 'tracker'
    AND r.is_active = true
    AND r.is_sent = false
    AND t.archived_at IS NULL
    -- Check if reminder should fire based on schedule
    -- For now, we'll use a simple daily check (can be extended)
    AND (
      -- Entry prompt reminders: check if entry doesn't exist for today
      (
        r.reminder_kind = 'entry_prompt'
        AND NOT EXISTS (
          SELECT 1 FROM public.tracker_entries te
          WHERE te.tracker_id = t.id
          AND te.user_id = r.owner_user_id
          AND te.entry_date = CURRENT_DATE
        )
      )
      OR
      -- Reflection reminders: check if entry exists for today but no notes
      (
        r.reminder_kind = 'reflection'
        AND EXISTS (
          SELECT 1 FROM public.tracker_entries te
          WHERE te.tracker_id = t.id
          AND te.user_id = r.owner_user_id
          AND te.entry_date = CURRENT_DATE
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.tracker_entries te
          WHERE te.tracker_id = t.id
          AND te.user_id = r.owner_user_id
          AND te.entry_date = CURRENT_DATE
          AND te.notes IS NOT NULL
          AND trim(te.notes) != ''
        )
      )
    )
    -- Check schedule time (if specified in schedule JSONB)
    -- For simplicity, we'll check if current time matches schedule
    -- This can be extended to support cron-like expressions
    AND (
      r.schedule IS NULL
      OR
      -- If schedule has time_of_day, check if current time is within window
      (
        r.schedule->>'time_of_day' IS NULL
        OR
        -- Simple time check (can be enhanced)
        (
          EXTRACT(HOUR FROM CURRENT_TIME) >= COALESCE((r.schedule->>'hour')::INTEGER, 0)
          AND EXTRACT(HOUR FROM CURRENT_TIME) < COALESCE((r.schedule->>'hour')::INTEGER, 23) + 1
        )
      )
    );
END;
$$;

COMMENT ON FUNCTION public.get_due_tracker_reminders IS 'Returns tracker reminders that are due to be sent. Checks if entry exists and respects schedule.';

-- Comments
COMMENT ON COLUMN public.reminders.reminder_kind IS 'Type of reminder: entry_prompt (log entry) or reflection (add notes)';
COMMENT ON COLUMN public.reminders.schedule IS 'JSONB schedule config: {time_of_day: "HH:MM", days: ["monday", "tuesday"], quiet_hours: {start: "22:00", end: "07:00"}}';
COMMENT ON COLUMN public.reminders.delivery_channels IS 'Array of delivery channels: ["in_app", "push"]';
COMMENT ON COLUMN public.reminders.is_active IS 'Whether reminder is active (can be disabled without deleting)';
