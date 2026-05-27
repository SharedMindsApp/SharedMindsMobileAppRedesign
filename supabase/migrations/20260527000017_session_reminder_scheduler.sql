-- Session reminder scheduler — the missing piece.
--
-- The notification type constraint already allows session_reminder_24h,
-- session_reminder_15min and session_now (added in 20260520000017), but
-- nothing in the repo actually CREATES these rows when a session is
-- approaching. They were left to a "20260520000019 cron" migration
-- that never landed. As a result users get session-completed pings but
-- never the "your session starts in 5 minutes" nudge that makes
-- scheduled sessions actually show up.
--
-- This migration:
--   1. Adds 'session_reminder_5min' to the type CHECK (more useful than
--      15min — most people are still away from their desk at the 15-min
--      mark; 5min is the moment to actually pivot).
--   2. Creates schedule_session_reminders() — runs every minute via
--      pg_cron, inserts:
--        • session_reminder_5min for scheduled sessions starting in
--          ~5 min that don't already have one
--        • session_now for sessions that just passed their start time
--          and the host hasn't transitioned them to 'active' yet
--          (i.e. "your session has started — join now")
--      Both writes are idempotent: a partial unique index on
--      (user_id, type, related_id) prevents duplicates if the cron
--      runs an extra tick or the function is re-invoked.
--   3. Schedules the function via pg_cron on the "* * * * *" cadence.
--
-- Reverting: drop the cron job + function. The notifications already
-- created stay — they're real DB rows. Re-running this migration is
-- safe (everything is CREATE OR REPLACE / IF NOT EXISTS).

-- ── 1. Extend the type CHECK to allow session_reminder_5min ─────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'notifications'
      AND constraint_name = 'notifications_type_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.notifications
      DROP CONSTRAINT notifications_type_check;
  END IF;
END;
$$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'session_reminder_24h',
    'session_reminder_15min',
    'session_reminder_5min',
    'weekly_review_prompt',
    'onboarding_day_1',
    'onboarding_day_3',
    'onboarding_day_7',
    'community_session_reminder',
    'new_dm',
    'post_reply',
    'post_reaction',
    'connection_request',
    'connection_accepted',
    'project_invite',
    'stuck_help_offered',
    'partner_joined',
    'session_now',
    'partner_no_show',
    'session_completed'
  ));

-- ── 2. Idempotency guard — one (user, type, session) reminder max ──
--
-- Partial unique index keyed off the scheduled-reminder types. Lets the
-- scheduler re-run safely (every minute) without ever creating dupes.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_session_reminder_uniq
  ON public.notifications (user_id, type, related_id)
  WHERE type IN (
    'session_reminder_24h',
    'session_reminder_15min',
    'session_reminder_5min',
    'session_now'
  );

-- ── 3. Scheduler function ─────────────────────────────────────────
--
-- Two passes per invocation:
--
--   Pass A (5-min reminder): scheduled sessions starting in [4, 6] min
--   that don't already have a session_reminder_5min for the host.
--   Insert one + the join deep link.
--
--   Pass B (started-but-not-joined): sessions whose scheduled_at /
--   start_time has passed within the last 4 minutes AND status is
--   still 'scheduled' (host never transitioned to active). The host
--   gets a "your session has started" ping with the join link. Same
--   ON CONFLICT guard prevents repeats if the cron sees them twice.
--
-- The grace windows ([4,6] for 5-min, [0,4] for "started") absorb
-- minor cron drift without missing or double-firing.

CREATE OR REPLACE FUNCTION public.schedule_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Pass A: 5-minute warning.
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    s.user_id,
    'session_reminder_5min',
    'Starts in 5 minutes',
    'Your session "' || COALESCE(s.session_goal, s.session_title, 'focus session')
      || '" starts in 5 minutes. Tap to join.',
    s.id,
    '/session/' || s.id::text,
    jsonb_build_object(
      'session_id',     s.id,
      'scheduled_at',   s.scheduled_at,
      'session_goal',   COALESCE(s.session_goal, s.session_title),
      'session_mode',   s.session_mode
    )
  FROM public.focus_sessions s
  WHERE s.status = 'scheduled'
    AND s.scheduled_at IS NOT NULL
    -- Window: 4 to 6 minutes from now. Covers a single minute-aligned
    -- cron tick + drift on either side.
    AND s.scheduled_at BETWEEN v_now + interval '4 minutes'
                           AND v_now + interval '6 minutes'
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h', 'session_reminder_15min',
                   'session_reminder_5min', 'session_now')
    DO NOTHING;

  -- Pass B: "your session has started" — only fires if the host hasn't
  -- actually started it yet (status still 'scheduled' past the start time).
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    s.user_id,
    'session_now',
    'Your session has started',
    'Your session "' || COALESCE(s.session_goal, s.session_title, 'focus session')
      || '" just kicked off. Jump in now to catch the start.',
    s.id,
    '/session/' || s.id::text,
    jsonb_build_object(
      'session_id',     s.id,
      'scheduled_at',   s.scheduled_at,
      'session_goal',   COALESCE(s.session_goal, s.session_title),
      'session_mode',   s.session_mode
    )
  FROM public.focus_sessions s
  WHERE s.status = 'scheduled'
    AND s.scheduled_at IS NOT NULL
    -- Window: scheduled_at within the last 0-4 minutes. Past the start
    -- time, but still recent enough that "join now" is meaningful.
    AND s.scheduled_at BETWEEN v_now - interval '4 minutes' AND v_now
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h', 'session_reminder_15min',
                   'session_reminder_5min', 'session_now')
    DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_session_reminders() TO service_role;

-- ── 4. pg_cron schedule — every minute ────────────────────────────
--
-- Requires the pg_cron extension. Supabase enables it by default for
-- new projects; for older ones you may need `CREATE EXTENSION pg_cron`
-- in the postgres database before this migration applies.
--
-- The unschedule-then-schedule dance keeps the migration idempotent:
-- if it's run twice we don't end up with two identical cron rows.

DO $$
BEGIN
  -- pg_cron's schema is `cron`. Bail early if it isn't installed
  -- rather than failing the whole migration; the function still works
  -- via manual invocation and admins can wire cron when ready.
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron extension not installed — skipping cron schedule. '
                 'Run CREATE EXTENSION pg_cron then re-invoke this DO block.';
    RETURN;
  END IF;

  PERFORM cron.unschedule('schedule_session_reminders')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'schedule_session_reminders'
  );

  PERFORM cron.schedule(
    'schedule_session_reminders',
    '* * * * *',  -- every minute
    $cron$ SELECT public.schedule_session_reminders(); $cron$
  );
END;
$$;
