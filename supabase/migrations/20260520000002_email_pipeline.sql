-- ============================================================
-- Email pipeline: triggers, cron functions, onboarding sequence
-- Migration: 20260520000002_email_pipeline
--
-- Builds on 20260520000001_notifications (tables already exist).
-- Adds:
--   1. Schema additions (last_seen_at, scheduled_for + index)
--   2. insert_notification() helper
--   3. Reactive triggers: DM, post reply, post reaction,
--      connection request/accepted, project invite
--   4. Onboarding sequence trigger (profile insert)
--   5. Cron functions: create_session_reminders(), create_weekly_review_prompts()
--   6. pg_cron setup (conditional — Pro plan only)
-- ============================================================


-- ============================================================
-- 1. Schema additions
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Index for the dispatcher Edge Function: cheaply finds rows that are
-- scheduled and not yet emailed (scheduled_for in the past or NULL means ready).
CREATE INDEX IF NOT EXISTS notifications_scheduled_queue_idx
  ON public.notifications(scheduled_for)
  WHERE email_sent_at IS NULL;


-- ============================================================
-- 2. Helper insert function
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id      uuid,
  p_type         text,
  p_title        text,
  p_body         text,
  p_related_id   uuid          DEFAULT NULL,
  p_deep_link    text          DEFAULT NULL,
  p_scheduled_for timestamptz  DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(
    user_id, type, title, body, related_id, deep_link, scheduled_for
  )
  VALUES (
    p_user_id, p_type, p_title, p_body, p_related_id, p_deep_link, p_scheduled_for
  )
  ON CONFLICT DO NOTHING;
END;
$$;


-- ============================================================
-- 3a. Reactive trigger: new DM
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_recipient   uuid;
BEGIN
  SELECT display_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  FOR v_recipient IN
    SELECT user_id
    FROM public.dm_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.sender_id
  LOOP
    PERFORM public.insert_notification(
      v_recipient,
      'new_dm',
      'New message from ' || coalesce(v_sender_name, 'someone'),
      left(NEW.content, 120),
      NEW.id,
      '/messages/' || NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dm_messages_notify ON public.dm_messages;
CREATE TRIGGER dm_messages_notify
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm();


-- ============================================================
-- 3b. Reactive trigger: community post reply
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_post_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author  uuid;
  v_replier_name text;
BEGIN
  SELECT author_id INTO v_post_author
  FROM public.community_posts
  WHERE id = NEW.post_id;

  -- Skip if post not found or replier is the post author
  IF v_post_author IS NULL OR v_post_author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_replier_name
  FROM public.profiles
  WHERE id = NEW.author_id;

  PERFORM public.insert_notification(
    v_post_author,
    'post_reply',
    coalesce(v_replier_name, 'Someone') || ' replied to your post',
    left(NEW.content, 120),
    NEW.post_id,
    '/community'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_post_replies_notify ON public.community_post_replies;
CREATE TRIGGER community_post_replies_notify
  AFTER INSERT ON public.community_post_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_reply();


-- ============================================================
-- 3c. Reactive trigger: community post reaction
--     Max one reaction notification per post per hour (dupe guard)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author    uuid;
  v_reactor_name   text;
  v_post_snippet   text;
BEGIN
  SELECT author_id INTO v_post_author
  FROM public.community_posts
  WHERE id = NEW.post_id;

  -- Skip if post not found or user reacted to their own post
  IF v_post_author IS NULL OR v_post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Dupe guard: skip if we already sent a reaction notification for this post
  -- to this user in the last hour
  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id    = v_post_author
      AND type       = 'post_reaction'
      AND related_id = NEW.post_id
      AND created_at > now() - interval '1 hour'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_reactor_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  SELECT left(content, 60) INTO v_post_snippet
  FROM public.community_posts
  WHERE id = NEW.post_id;

  PERFORM public.insert_notification(
    v_post_author,
    'post_reaction',
    coalesce(v_reactor_name, 'Someone') || ' reacted to your post',
    NEW.emoji || ' ' || coalesce(v_post_snippet, ''),
    NEW.post_id,
    '/community'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_post_reactions_notify ON public.community_post_reactions;
CREATE TRIGGER community_post_reactions_notify
  AFTER INSERT ON public.community_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_reaction();


-- ============================================================
-- 3d & 3e. Reactive trigger: connection request + connection accepted
--          Single function handles both INSERT and UPDATE cases
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Notify addressee of incoming request
    SELECT display_name INTO v_name
    FROM public.profiles
    WHERE id = NEW.requester_id;

    PERFORM public.insert_notification(
      NEW.addressee_id,
      'connection_request',
      coalesce(v_name, 'Someone') || ' wants to connect',
      'Accept their connection request to start messaging and joining sessions together.',
      NEW.id,
      '/connections'
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Notify requester that their request was accepted
    SELECT display_name INTO v_name
    FROM public.profiles
    WHERE id = NEW.addressee_id;

    PERFORM public.insert_notification(
      NEW.requester_id,
      'connection_accepted',
      coalesce(v_name, 'Someone') || ' accepted your connection',
      'You''re now connected. Send a message or invite them to a session.',
      NEW.id,
      '/connections'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS person_connections_notify_insert ON public.person_connections;
DROP TRIGGER IF EXISTS person_connections_notify_update ON public.person_connections;

CREATE TRIGGER person_connections_notify_insert
  AFTER INSERT ON public.person_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_connection();

CREATE TRIGGER person_connections_notify_update
  AFTER UPDATE ON public.person_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_connection();


-- ============================================================
-- 3f. Reactive trigger: project invite
--     Fires on INSERT to project_members where the member being
--     added is NOT the project creator (owner seeding their own row
--     should not trigger a notification).
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_project_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title   text;
  v_project_creator uuid;
BEGIN
  SELECT title, created_by INTO v_project_title, v_project_creator
  FROM public.projects
  WHERE id = NEW.project_id;

  -- Skip if user being added is the project creator
  IF v_project_creator IS NULL OR v_project_creator = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.insert_notification(
    NEW.user_id,
    'project_invite',
    'You''ve been added to a project',
    'You now have access to "' || coalesce(v_project_title, 'a project') || '". Open it to see tasks and sessions.',
    NEW.project_id,
    '/projects/' || NEW.project_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_members_notify ON public.project_members;
CREATE TRIGGER project_members_notify
  AFTER INSERT ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_project_invite();


-- ============================================================
-- 4. Onboarding sequence trigger
--    Fires on INSERT to profiles. Creates three scheduled notifications:
--    Day 1 (immediate), Day 3, Day 7.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_profile_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Day 1: send immediately (scheduled_for = NULL)
  PERFORM public.insert_notification(
    NEW.id,
    'onboarding_day_1',
    'Welcome to SharedMinds 👋',
    'Declare your first session and start working alongside other founders and creators.',
    NULL,
    '/home',
    NULL
  );

  -- Day 3
  PERFORM public.insert_notification(
    NEW.id,
    'onboarding_day_3',
    'How''s your first week going?',
    'Try a community session — working in public is surprisingly motivating.',
    NULL,
    '/home',
    NEW.created_at + interval '3 days'
  );

  -- Day 7
  PERFORM public.insert_notification(
    NEW.id,
    'onboarding_day_7',
    'One week in — keep the momentum',
    'Set a weekly intention to give your sessions direction. It only takes 2 minutes.',
    NULL,
    '/home',
    NEW.created_at + interval '7 days'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_onboarding_notify ON public.profiles;
CREATE TRIGGER profiles_onboarding_notify
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_create();


-- ============================================================
-- 5. Session reminder function (called by pg_cron or external cron)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  -- 24-hour reminders: sessions starting 23–25 h from now, not yet notified
  FOR r IN
    SELECT fs.id, fs.user_id, fs.goal, fs.scheduled_at
    FROM public.focus_sessions fs
    WHERE fs.session_type IN ('scheduled', 'drop_in')
      AND fs.status = 'scheduled'
      AND fs.scheduled_at BETWEEN now() + interval '23 hours'
                               AND now() + interval '25 hours'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id    = fs.user_id
          AND n.type       = 'session_reminder_24h'
          AND n.related_id = fs.id
      )
  LOOP
    PERFORM public.insert_notification(
      r.user_id,
      'session_reminder_24h',
      'Session tomorrow: ' || coalesce(left(r.goal, 60), 'Coworking session'),
      'Your session starts at ' || to_char(r.scheduled_at AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC tomorrow. Get ready!',
      r.id,
      '/sessions'
    );
  END LOOP;

  -- 15-minute reminders: sessions starting 10–20 min from now, not yet notified
  FOR r IN
    SELECT fs.id, fs.user_id, fs.goal, fs.scheduled_at
    FROM public.focus_sessions fs
    WHERE fs.session_type IN ('scheduled', 'drop_in')
      AND fs.status = 'scheduled'
      AND fs.scheduled_at BETWEEN now() + interval '10 minutes'
                               AND now() + interval '20 minutes'
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id    = fs.user_id
          AND n.type       = 'session_reminder_15min'
          AND n.related_id = fs.id
      )
  LOOP
    PERFORM public.insert_notification(
      r.user_id,
      'session_reminder_15min',
      'Starting soon: ' || coalesce(left(r.goal, 60), 'Coworking session'),
      'Your session starts in about 15 minutes. Time to wrap up and get in the zone.',
      r.id,
      '/sessions'
    );
  END LOOP;
END;
$$;


-- ============================================================
-- 6. Weekly review prompt function (called by pg_cron or external cron)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_weekly_review_prompts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, deep_link)
  SELECT
    p.id,
    'weekly_review_prompt',
    'Time for your weekly review',
    'What did you finish this week? Take 5 minutes to reflect and set your intention for next week.',
    '/reflection'
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id  = p.id
      AND n.type     = 'weekly_review_prompt'
      AND n.created_at > now() - interval '6 days'
  );
END;
$$;


-- ============================================================
-- 7. pg_cron setup (conditional — requires Supabase Pro plan)
--    Errors are caught so the migration succeeds on free-tier projects.
-- ============================================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron/pg_net not available on this plan — schedule dispatch-notifications manually';
END;
$$;

-- Register cron jobs only if pg_cron was successfully installed above
DO $outer$
BEGIN
  -- Session reminders: every 10 minutes
  PERFORM cron.schedule(
    'session-reminders',
    '*/10 * * * *',
    'SELECT public.create_session_reminders();'
  );

  -- Weekly review prompts: Sundays at 18:00 UTC
  PERFORM cron.schedule(
    'weekly-review-prompts',
    '0 18 * * 0',
    'SELECT public.create_weekly_review_prompts();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$outer$;
