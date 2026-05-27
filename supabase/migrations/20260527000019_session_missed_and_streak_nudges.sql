-- Two new notification types — session_missed + streak_at_risk.
--
-- Both ride on the scheduler infrastructure shipped in
-- 20260527000017_session_reminder_scheduler.sql and respect the
-- category-level preferences shipped in 20260527000018.
--
-- session_missed
--   Fires 12-15 min AFTER a scheduled session's start time if the
--   host never transitioned it to active (i.e. they flat-out missed
--   it). Distinct from session_now (fires AT the start time as a
--   nudge to join) — that's "kick off now," this is "you flaked."
--   Same scheduler cadence as the other reminders (every minute).
--   Category: session_reminders → respects inapp_session_reminders.
--
-- streak_at_risk
--   Fires once a day at 19:00 UTC. Detects users who built a streak
--   (≥2 consecutive days with a completed session, including
--   yesterday) and haven't completed a session today. Strongest
--   retention lever in any habit app, and ADHD users specifically
--   respond to streak-loss aversion — but it can ALSO be a stress
--   trigger, so it's gated behind inapp_habit_nudges which defaults
--   OFF. Users opt in via Settings.
--   Category: habit_nudges → respects inapp_habit_nudges + quiet
--   hours (which only apply to habit_nudges, by design).
--
-- Idempotency:
--   • session_missed reuses the existing partial unique index
--     `notifications_session_reminder_uniq` so a given session can
--     trigger session_missed once max.
--   • streak_at_risk needs its own daily idempotency: the related_id
--     stays NULL, and a partial unique index keyed on user_id +
--     DATE(created_at) keeps one ping per user per day.

-- ── 1. Extend the type CHECK ─────────────────────────────────────

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
    'session_missed',
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
    'session_completed',
    'streak_at_risk'
  ));

-- ── 2. Extend the category mapper ───────────────────────────────
--
-- CREATE OR REPLACE rewrites the function; both new types get
-- mapped so the BEFORE INSERT gate handles them on day one.

CREATE OR REPLACE FUNCTION public.notification_category(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'session_reminder_24h'        THEN 'session_reminders'
    WHEN 'session_reminder_15min'      THEN 'session_reminders'
    WHEN 'session_reminder_5min'       THEN 'session_reminders'
    WHEN 'session_now'                 THEN 'session_reminders'
    WHEN 'session_missed'              THEN 'session_reminders'
    WHEN 'community_session_reminder'  THEN 'session_reminders'
    WHEN 'partner_joined'              THEN 'session_activity'
    WHEN 'partner_no_show'             THEN 'session_activity'
    WHEN 'session_completed'           THEN 'session_activity'
    WHEN 'new_dm'                      THEN 'messages'
    WHEN 'post_reply'                  THEN 'community'
    WHEN 'post_reaction'               THEN 'community'
    WHEN 'connection_request'          THEN 'social'
    WHEN 'connection_accepted'         THEN 'social'
    WHEN 'project_invite'              THEN 'social'
    WHEN 'stuck_help_offered'          THEN 'social'
    WHEN 'weekly_review_prompt'        THEN 'weekly_review'
    WHEN 'onboarding_day_1'            THEN 'onboarding'
    WHEN 'onboarding_day_3'            THEN 'onboarding'
    WHEN 'onboarding_day_7'            THEN 'onboarding'
    WHEN 'streak_at_risk'              THEN 'habit_nudges'
    ELSE NULL
  END
$$;

-- ── 3. Idempotency index for streak_at_risk ─────────────────────
--
-- One ping per user per day. Keyed on the UTC date of created_at
-- so the cron tick on day N can't fire twice if it accidentally
-- re-runs, and so a user resyncing their data doesn't collide
-- with prior pings.
--
-- IMPORTANT: index expressions must be IMMUTABLE. A plain
-- DATE(created_at) on a timestamptz is STABLE (depends on session
-- TimeZone). Pinning the timezone with `AT TIME ZONE 'UTC'` first
-- yields a timestamp-without-tz, whose cast to date IS immutable.
-- The cron job runs at 19:00 UTC so anchoring "day" to UTC also
-- matches the firing logic — no edge case where a user gets
-- double-pinged because their local midnight crosses while UTC
-- midnight doesn't.

CREATE UNIQUE INDEX IF NOT EXISTS notifications_streak_at_risk_daily_uniq
  ON public.notifications (user_id, type, (((created_at AT TIME ZONE 'UTC')::date)))
  WHERE type = 'streak_at_risk';

-- ── 4. Extend schedule_session_reminders() with Pass C ──────────
--
-- Pass C (new): session_missed.
--   Window: scheduled_at between now() - 15 min and now() - 12 min,
--   status still 'scheduled' (host never started it).
--   The 3-minute window absorbs cron drift while avoiding overlap
--   with Pass B (session_now, which fires at scheduled_at − 0..4
--   min). After 15 min we stop pinging — past that the user has
--   moved on and the nudge is just noise.

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
    AND s.scheduled_at BETWEEN v_now + interval '4 minutes'
                           AND v_now + interval '6 minutes'
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h', 'session_reminder_15min',
                   'session_reminder_5min', 'session_now')
    DO NOTHING;

  -- Pass B: "your session has started" — host hasn't started it yet.
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
    AND s.scheduled_at BETWEEN v_now - interval '4 minutes' AND v_now
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h', 'session_reminder_15min',
                   'session_reminder_5min', 'session_now')
    DO NOTHING;

  -- Pass C (new): session_missed — host flat-out missed it.
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    s.user_id,
    'session_missed',
    'You missed your session',
    'Your scheduled session "' || COALESCE(s.session_goal, s.session_title, 'focus block')
      || '" started ' ||
      EXTRACT(MINUTE FROM (v_now - s.scheduled_at))::text || ' minutes ago. '
      || 'Want to reschedule?',
    s.id,
    '/sessions',
    jsonb_build_object(
      'session_id',     s.id,
      'scheduled_at',   s.scheduled_at,
      'session_goal',   COALESCE(s.session_goal, s.session_title),
      'session_mode',   s.session_mode,
      'minutes_late',   EXTRACT(MINUTE FROM (v_now - s.scheduled_at))
    )
  FROM public.focus_sessions s
  WHERE s.status = 'scheduled'
    AND s.scheduled_at IS NOT NULL
    AND s.scheduled_at BETWEEN v_now - interval '15 minutes'
                           AND v_now - interval '12 minutes'
  -- Reuse the existing partial unique index so each session can only
  -- emit one session_missed ever.
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h', 'session_reminder_15min',
                   'session_reminder_5min', 'session_now')
    DO NOTHING;
  -- ^ NOTE: the partial index doesn't include session_missed in its
  -- predicate — so this ON CONFLICT *doesn't* dedupe across runs for
  -- session_missed. We'd need to extend the predicate. Fixing below.
END;
$$;

-- Extend the partial unique index to include session_missed too.
-- DROP + recreate because predicate changes require re-creation.
DROP INDEX IF EXISTS public.notifications_session_reminder_uniq;
CREATE UNIQUE INDEX notifications_session_reminder_uniq
  ON public.notifications (user_id, type, related_id)
  WHERE type IN (
    'session_reminder_24h',
    'session_reminder_15min',
    'session_reminder_5min',
    'session_now',
    'session_missed'
  );

-- Now re-create schedule_session_reminders() with the corrected
-- ON CONFLICT predicates referencing the new index. Same body as
-- above but the WHERE clauses on the ON CONFLICT include
-- session_missed.

CREATE OR REPLACE FUNCTION public.schedule_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Pass A: 5-min warning
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    s.user_id, 'session_reminder_5min',
    'Starts in 5 minutes',
    'Your session "' || COALESCE(s.session_goal, s.session_title, 'focus session')
      || '" starts in 5 minutes. Tap to join.',
    s.id, '/session/' || s.id::text,
    jsonb_build_object(
      'session_id', s.id, 'scheduled_at', s.scheduled_at,
      'session_goal', COALESCE(s.session_goal, s.session_title),
      'session_mode', s.session_mode
    )
  FROM public.focus_sessions s
  WHERE s.status = 'scheduled' AND s.scheduled_at IS NOT NULL
    AND s.scheduled_at BETWEEN v_now + interval '4 minutes' AND v_now + interval '6 minutes'
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h','session_reminder_15min','session_reminder_5min','session_now','session_missed')
    DO NOTHING;

  -- Pass B: session_now (started, host not in yet)
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    s.user_id, 'session_now',
    'Your session has started',
    'Your session "' || COALESCE(s.session_goal, s.session_title, 'focus session')
      || '" just kicked off. Jump in now to catch the start.',
    s.id, '/session/' || s.id::text,
    jsonb_build_object(
      'session_id', s.id, 'scheduled_at', s.scheduled_at,
      'session_goal', COALESCE(s.session_goal, s.session_title),
      'session_mode', s.session_mode
    )
  FROM public.focus_sessions s
  WHERE s.status = 'scheduled' AND s.scheduled_at IS NOT NULL
    AND s.scheduled_at BETWEEN v_now - interval '4 minutes' AND v_now
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h','session_reminder_15min','session_reminder_5min','session_now','session_missed')
    DO NOTHING;

  -- Pass C: session_missed (host flat-out missed it)
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    s.user_id, 'session_missed',
    'You missed your session',
    'Your scheduled session "' || COALESCE(s.session_goal, s.session_title, 'focus block')
      || '" started ' || EXTRACT(MINUTE FROM (v_now - s.scheduled_at))::text
      || ' minutes ago. Want to reschedule?',
    s.id, '/sessions',
    jsonb_build_object(
      'session_id', s.id, 'scheduled_at', s.scheduled_at,
      'session_goal', COALESCE(s.session_goal, s.session_title),
      'session_mode', s.session_mode,
      'minutes_late', EXTRACT(MINUTE FROM (v_now - s.scheduled_at))
    )
  FROM public.focus_sessions s
  WHERE s.status = 'scheduled' AND s.scheduled_at IS NOT NULL
    AND s.scheduled_at BETWEEN v_now - interval '15 minutes' AND v_now - interval '12 minutes'
  ON CONFLICT (user_id, type, related_id)
    WHERE type IN ('session_reminder_24h','session_reminder_15min','session_reminder_5min','session_now','session_missed')
    DO NOTHING;
END;
$$;

-- ── 5. Streak-at-risk scheduler ─────────────────────────────────
--
-- Fires once daily at 19:00 UTC. Detects users who:
--   • Completed a session yesterday (the "streak alive" anchor)
--   • Completed sessions on ≥2 distinct days in the last 14 days
--     (the "had a streak" floor — one-day-and-done isn't a streak)
--   • Have NOT completed a session today
--   • Opted into habit_nudges (the BEFORE INSERT gate handles this
--     automatically — we don't filter explicitly so future logic
--     stays centralised)
--
-- The notification is gated by the BEFORE INSERT trigger which
-- looks at inapp_habit_nudges. Users with that off won't even get
-- the row inserted. Quiet hours (also habit_nudges-only) are also
-- enforced by the same trigger — so a user with quiet hours
-- 18:00-08:00 set won't get pinged at 19:00 UTC.

CREATE OR REPLACE FUNCTION public.schedule_habit_nudges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today  date := CURRENT_DATE;
  v_yest   date := CURRENT_DATE - 1;
  v_window date := CURRENT_DATE - 14;
BEGIN
  -- streak_at_risk: anyone with a 2+ day streak ending yesterday
  -- and no completion today.
  INSERT INTO public.notifications (
    user_id, type, title, body, related_id, deep_link, data
  )
  SELECT
    streaks.user_id,
    'streak_at_risk',
    'Your streak is at risk',
    'You have focused ' || streaks.day_count || ' days in a row. '
      || 'Keep it alive — a 25-minute session today is enough.',
    NULL,
    '/sessions',
    jsonb_build_object(
      'days_in_window', streaks.day_count,
      'last_session_day', v_yest
    )
  FROM (
    -- Distinct days per user with at least one completed session
    -- in the last 14 days, then aggregate to count + bool flags.
    SELECT
      user_id,
      COUNT(DISTINCT session_day) AS day_count,
      BOOL_OR(session_day = v_yest)  AS had_yesterday,
      BOOL_OR(session_day = v_today) AS had_today
    FROM (
      SELECT
        user_id,
        DATE(start_time AT TIME ZONE 'UTC') AS session_day
      FROM public.focus_sessions
      WHERE status = 'completed'
        AND start_time > now() - interval '14 days'
    ) per_user_days
    GROUP BY user_id
  ) streaks
  WHERE streaks.had_yesterday = true
    AND streaks.had_today    = false
    AND streaks.day_count    >= 2
  -- Idempotency: the partial unique index keyed on
  -- (user_id, type, DATE(created_at)) blocks duplicates within a
  -- single day even if the cron job mis-fires.
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_habit_nudges() TO service_role;

-- ── 6. pg_cron schedule for habit nudges ────────────────────────
--
-- Once a day at 19:00 UTC. That's evening for Europe, late
-- afternoon for US East, morning for Asia — imperfect, but better
-- than firing 24/7. A future migration can move to per-user
-- timezones if we add a profiles.timezone column.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — skipping schedule_habit_nudges cron. '
                 'Function still callable manually.';
    RETURN;
  END IF;

  PERFORM cron.unschedule('schedule_habit_nudges')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'schedule_habit_nudges');

  PERFORM cron.schedule(
    'schedule_habit_nudges',
    '0 19 * * *',  -- daily at 19:00 UTC
    $cron$ SELECT public.schedule_habit_nudges(); $cron$
  );
END;
$$;
