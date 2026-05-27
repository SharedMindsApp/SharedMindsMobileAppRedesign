-- Per-category in-app notification preferences + quiet hours + gating.
--
-- Before this migration the notification_preferences table only had
-- email_* toggles — every in-app notification fired unconditionally for
-- every user. That was fine when there were a few types but with the
-- open-to-match flow + upcoming habit nudges (streak-at-risk, etc.) it
-- becomes urgent to give users category-level control + quiet hours.
--
-- Design choices:
--
-- 1. CATEGORIES, not types — 16+ types would make settings overwhelming.
--    notification_category() maps each type to one of 10 categories.
--
-- 2. SERVER-SIDE GATE — a BEFORE INSERT trigger on notifications calls
--    should_create_inapp_notification(). If the user has the category
--    turned off (or is in quiet hours and the category is "habit
--    nudges"), the trigger returns NULL — silently skipping the insert.
--    No row created = no unread badge bloat = no client-side filter
--    needed.
--
-- 3. FAIL-OPEN — if the prefs row is missing OR the type is unmapped,
--    the notification still gets created. Important during signup
--    edge cases + when new types ship before this map is updated.
--
-- 4. DEFAULTS reflect the policy in the design doc:
--      • Most categories ON by default
--      • Drop-in opportunities + habit nudges OFF (opt-in)
--      • Marketing OFF (already was)
--
-- 5. QUIET HOURS only apply to the "habit_nudges" category (streak,
--    first-session-of-day, stuck task). Time-sensitive notifications
--    like session reminders or messages always fire — silencing those
--    via quiet hours would break the product. Users who want full
--    silence use the DND toggle in the avatar dropdown instead.

-- ── 1. Add the new columns ───────────────────────────────────────

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS inapp_session_reminders     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_session_activity      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_drop_in_opportunities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inapp_habit_nudges          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inapp_messages              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_community             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_social                boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_weekly_review         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_onboarding            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_marketing             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start           time     NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end             time     NOT NULL DEFAULT '08:00';

-- ── 2. Category mapper ──────────────────────────────────────────
--
-- One canonical place where notification_type → category is decided.
-- IMMUTABLE because it's pure. Unmapped types return NULL → gate
-- fails open (the notification gets created). When you add a new
-- type, add it here too.

CREATE OR REPLACE FUNCTION public.notification_category(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    -- Time-based session pings
    WHEN 'session_reminder_24h'        THEN 'session_reminders'
    WHEN 'session_reminder_15min'      THEN 'session_reminders'
    WHEN 'session_reminder_5min'       THEN 'session_reminders'
    WHEN 'session_now'                 THEN 'session_reminders'
    WHEN 'community_session_reminder'  THEN 'session_reminders'
    -- Per-session social events
    WHEN 'partner_joined'              THEN 'session_activity'
    WHEN 'partner_no_show'             THEN 'session_activity'
    WHEN 'session_completed'           THEN 'session_activity'
    -- Channels
    WHEN 'new_dm'                      THEN 'messages'
    WHEN 'post_reply'                  THEN 'community'
    WHEN 'post_reaction'               THEN 'community'
    -- Network actions
    WHEN 'connection_request'          THEN 'social'
    WHEN 'connection_accepted'         THEN 'social'
    WHEN 'project_invite'              THEN 'social'
    WHEN 'stuck_help_offered'          THEN 'social'
    -- Cadence
    WHEN 'weekly_review_prompt'        THEN 'weekly_review'
    WHEN 'onboarding_day_1'            THEN 'onboarding'
    WHEN 'onboarding_day_3'            THEN 'onboarding'
    WHEN 'onboarding_day_7'            THEN 'onboarding'
    ELSE NULL
  END
$$;

-- ── 3. Gate function ────────────────────────────────────────────
--
-- Returns true iff the in-app notification should be created.
-- Consulted by the BEFORE INSERT trigger. STABLE because we touch
-- the prefs table.

CREATE OR REPLACE FUNCTION public.should_create_inapp_notification(
  p_user_id uuid,
  p_type    text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs       public.notification_preferences%ROWTYPE;
  v_category    text;
  v_now_time    time;
  v_allowed     boolean;
BEGIN
  v_category := notification_category(p_type);

  -- Unmapped category → fail open. New types ship before this map is
  -- updated; don't silently drop their notifications.
  IF v_category IS NULL THEN
    RETURN true;
  END IF;

  SELECT * INTO v_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- No prefs row → fail open. Bootstrap trigger should have created
  -- one but timing edge cases exist around signup.
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Quiet hours — only for habit_nudges. Other categories are
  -- intentionally exempt (time-sensitive). DND covers full silence.
  IF v_category = 'habit_nudges' AND v_prefs.quiet_hours_enabled THEN
    -- Naive UTC clock. A future migration can move to per-user
    -- timezones when we store one on the profile; for now habit
    -- nudges fire on a UTC-aware schedule anyway.
    v_now_time := (now() AT TIME ZONE 'UTC')::time;

    IF v_prefs.quiet_hours_start <= v_prefs.quiet_hours_end THEN
      -- Same-day window (e.g. 13:00–17:00)
      IF v_now_time BETWEEN v_prefs.quiet_hours_start AND v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    ELSE
      -- Wrap-around window (e.g. 22:00–08:00 next day)
      IF v_now_time >= v_prefs.quiet_hours_start OR v_now_time <= v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  v_allowed := CASE v_category
    WHEN 'session_reminders'      THEN v_prefs.inapp_session_reminders
    WHEN 'session_activity'       THEN v_prefs.inapp_session_activity
    WHEN 'drop_in_opportunities'  THEN v_prefs.inapp_drop_in_opportunities
    WHEN 'habit_nudges'           THEN v_prefs.inapp_habit_nudges
    WHEN 'messages'               THEN v_prefs.inapp_messages
    WHEN 'community'              THEN v_prefs.inapp_community
    WHEN 'social'                 THEN v_prefs.inapp_social
    WHEN 'weekly_review'          THEN v_prefs.inapp_weekly_review
    WHEN 'onboarding'             THEN v_prefs.inapp_onboarding
    WHEN 'marketing'              THEN v_prefs.inapp_marketing
    ELSE true
  END;

  RETURN COALESCE(v_allowed, true);
END;
$$;

-- ── 4. BEFORE INSERT trigger on notifications ───────────────────
--
-- Returns NULL to silently skip the insert when the user has opted
-- out (or quiet hours active). Returns NEW otherwise. Silently
-- skipping is correct here: it's the user's stated preference, not
-- an error. No log spam.

CREATE OR REPLACE FUNCTION public.gate_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT should_create_inapp_notification(NEW.user_id, NEW.type) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gate_notification_insert ON public.notifications;
CREATE TRIGGER trg_gate_notification_insert
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.gate_notification_insert();

-- ── 5. Backfill the bootstrap function ──────────────────────────
--
-- The original bootstrap (20260520000001) inserts a default
-- notification_preferences row when a profile is created. New
-- columns have defaults so the insert still works, but a future
-- developer reading the bootstrap shouldn't think "wait, where's
-- the habit_nudges default?" — leave a breadcrumb comment.

COMMENT ON COLUMN public.notification_preferences.inapp_drop_in_opportunities IS
  'Opt-IN by default — drop-in pings can be spammy at scale, users must enable.';
COMMENT ON COLUMN public.notification_preferences.inapp_habit_nudges IS
  'Opt-IN by default — streak anxiety / pattern-based nudges. Users must enable.';
COMMENT ON COLUMN public.notification_preferences.quiet_hours_start IS
  'UTC clock window during which habit_nudges category is suppressed.';
