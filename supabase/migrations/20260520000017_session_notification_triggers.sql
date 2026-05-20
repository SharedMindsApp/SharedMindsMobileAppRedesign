-- Session notification triggers
--
-- This migration does two things:
--
-- 1. Extends the notifications.type check constraint to include four new
--    real-time session event types:
--      partner_joined     — host is told their 1-on-1 partner has joined
--      session_now        — session is about to start (≤ 0 min buffer)
--      partner_no_show    — partner never arrived after the grace period
--      session_completed  — a session transitioned to 'completed'
--
-- 2. Adds two AFTER UPDATE triggers on public.focus_sessions:
--      trg_notify_partner_joined    → fires notify_on_partner_joined()
--      trg_notify_session_completed → fires notify_on_session_completed()
--
-- The migration is idempotent (safe to run more than once):
--   • Functions use CREATE OR REPLACE.
--   • Triggers use DROP … IF EXISTS before CREATE.
--   • The constraint is dropped inside a DO block that guards against
--     the constraint not existing.


-- ============================================================
-- 1. Update notifications.type check constraint
-- ============================================================

-- Drop the existing type check constraint (created in
-- 20260520000001_notifications.sql as an inline CHECK).
-- PostgreSQL names inline CHECK constraints
-- "<table>_<column>_check" by default.
-- We also attempt the explicit name in case it was ever
-- renamed, so the DROP is wrapped in a safe DO block.

DO $$
BEGIN
  -- Primary candidate name (PostgreSQL auto-generated from inline CHECK)
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

-- Re-add the constraint with the full set of allowed types,
-- including the four new session-event types.
-- Guard against duplicate add (e.g. migration run twice).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'notifications'
      AND constraint_name = 'notifications_type_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (type IN (
        -- Scheduled / time-based
        'session_reminder_24h',
        'session_reminder_15min',
        'weekly_review_prompt',
        'onboarding_day_1',
        'onboarding_day_3',
        'onboarding_day_7',
        'community_session_reminder',
        -- Reactive social
        'new_dm',
        'post_reply',
        'post_reaction',
        'connection_request',
        'connection_accepted',
        'project_invite',
        'stuck_help_offered',
        -- Session lifecycle (new)
        'partner_joined',
        'session_now',
        'partner_no_show',
        'session_completed'
      ));
  END IF;
END;
$$;


-- ============================================================
-- 1b. Add data jsonb column to notifications (if missing)
-- ============================================================
-- The original notifications schema (20260520000001) stores the
-- denormalised payload in title + body + related_id + deep_link.
-- These triggers also need a structured jsonb blob so consumers
-- (Edge Functions, mobile clients) can read typed fields without
-- parsing the human-readable body string.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data jsonb;


-- ============================================================
-- 2a. Trigger function: notify_on_partner_joined
-- ============================================================
-- Fires when a 1-on-1 session transitions from "no partner"
-- to "has partner" (i.e. someone claimed the open slot).
-- Inserts a 'partner_joined' notification for the session host.

CREATE OR REPLACE FUNCTION public.notify_on_partner_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title  text;
  v_body   text;
  v_goal   text;
BEGIN
  -- Only proceed when partner_user_id flips from NULL → a real UUID.
  IF OLD.partner_user_id IS NOT NULL OR NEW.partner_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve the session goal / title for the notification payload.
  v_goal := COALESCE(NEW.session_goal, NEW.session_title, 'your session');

  -- Human-readable strings for the in-app bell dropdown.
  v_title := 'Your partner has joined!';
  v_body  := 'Someone joined ' || v_goal || '. Head in when you''re ready.';

  -- Insert notification for the HOST (NEW.user_id).
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    deep_link,
    data
  ) VALUES (
    NEW.user_id,
    'partner_joined',
    v_title,
    v_body,
    NEW.id,
    '/sessions/' || NEW.id::text,
    jsonb_build_object(
      'session_id',      NEW.id,
      'session_goal',    COALESCE(NEW.session_goal, NEW.session_title),
      'partner_user_id', NEW.partner_user_id,
      'session_mode',    NEW.session_mode
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_on_partner_joined() IS
  'AFTER UPDATE trigger on focus_sessions. Notifies the host when '
  'partner_user_id transitions from NULL to a real UUID (partner claims slot).';


-- ============================================================
-- 2b. Trigger: trg_notify_partner_joined
-- ============================================================

DROP TRIGGER IF EXISTS trg_notify_partner_joined ON public.focus_sessions;

CREATE TRIGGER trg_notify_partner_joined
AFTER UPDATE ON public.focus_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_partner_joined();


-- ============================================================
-- 3a. Trigger function: notify_on_session_completed
-- ============================================================
-- Fires when a session's status transitions to 'completed'.
-- Inserts a 'session_completed' notification for the session owner,
-- including streak/count context (week_count, total_count).

CREATE OR REPLACE FUNCTION public.notify_on_session_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_count  int;
  v_total_count int;
  v_goal        text;
  v_title       text;
  v_body        text;
BEGIN
  -- Only proceed when status flips to 'completed' for the first time.
  IF OLD.status = 'completed' OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Count sessions completed this calendar week (Mon 00:00 UTC).
  SELECT COUNT(*)
    INTO v_week_count
    FROM public.focus_sessions
   WHERE user_id  = NEW.user_id
     AND status   = 'completed'
     AND ended_at >= date_trunc('week', now());

  -- Count all completed sessions ever for this user.
  SELECT COUNT(*)
    INTO v_total_count
    FROM public.focus_sessions
   WHERE user_id = NEW.user_id
     AND status  = 'completed';

  -- Resolve the goal text (prefer session_goal over session_title).
  v_goal := COALESCE(NULLIF(TRIM(NEW.session_goal),  ''),
                     NULLIF(TRIM(NEW.session_title), ''),
                     'your session');

  -- Human-readable strings for the in-app bell dropdown.
  v_title := 'Session complete — nice work!';
  v_body  := 'You finished ' || v_goal || '. '
          || v_week_count::text || ' session'
          || CASE WHEN v_week_count = 1 THEN '' ELSE 's' END
          || ' done this week.';

  -- Insert notification for the session owner (NEW.user_id).
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    deep_link,
    data
  ) VALUES (
    NEW.user_id,
    'session_completed',
    v_title,
    v_body,
    NEW.id,
    '/sessions/' || NEW.id::text,
    jsonb_build_object(
      'session_id',               NEW.id,
      'goal',                     COALESCE(NEW.session_goal, NEW.session_title),
      'outcome',                  NEW.session_outcome,
      'actual_duration_minutes',  NEW.actual_duration_minutes,
      'week_count',               v_week_count,
      'total_count',              v_total_count
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_on_session_completed() IS
  'AFTER UPDATE trigger on focus_sessions. Notifies the session owner '
  'when status transitions to ''completed'', including weekly and total '
  'session counts for motivational context.';


-- ============================================================
-- 3b. Trigger: trg_notify_session_completed
-- ============================================================

DROP TRIGGER IF EXISTS trg_notify_session_completed ON public.focus_sessions;

CREATE TRIGGER trg_notify_session_completed
AFTER UPDATE ON public.focus_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_session_completed();
