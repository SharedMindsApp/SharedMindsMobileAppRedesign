-- ============================================================
-- Match events — clean per-match wait tracking
-- ============================================================
-- The single match_joined_at column on focus_sessions can't model the real
-- world: a host's door can match, the partner can leave, and the host can
-- re-open and match someone else — each is a SEPARATE match whose wait must
-- be timed fresh from when the door (re)opened.
--
-- This migration introduces a proper event log:
--   • focus_sessions.door_opened_at — when the CURRENT door opened (reset on
--     each re-open), the baseline for the next match's wait.
--   • session_match_events — one row per door-open → match, with the wait and
--     a status. Only GENUINE, jointly-completed matches count toward stats;
--     abandoned matches (partner left, host re-opened) are excluded.
--
-- "Jointly completed" = the matched session reached 'completed' AND the
-- partner recorded a session outcome (they were still there at the debrief).
--
-- Apply manually via the Supabase dashboard. Safe to re-run.
-- ============================================================

-- ── 1. door_opened_at on focus_sessions ───────────────────────
ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS door_opened_at timestamptz;

-- Backfill: existing open / previously-matched doors opened at start_time.
UPDATE public.focus_sessions
  SET door_opened_at = start_time
  WHERE door_opened_at IS NULL
    AND (open_to_match = true OR match_joined_at IS NOT NULL);

-- ── 2. session_match_events ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_match_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.focus_sessions(id) ON DELETE CASCADE,
  host_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- When the door opened (baseline) and when the partner matched.
  door_opened_at  timestamptz NOT NULL,
  matched_at      timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'matched'
                    CHECK (status IN ('matched', 'completed', 'abandoned')),
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_events_session_idx ON public.session_match_events(session_id);
CREATE INDEX IF NOT EXISTS match_events_status_idx  ON public.session_match_events(status);
CREATE INDEX IF NOT EXISTS match_events_door_idx    ON public.session_match_events(door_opened_at);

ALTER TABLE public.session_match_events ENABLE ROW LEVEL SECURITY;

-- Involved users + admins can read; rows are only written by the SECURITY
-- DEFINER functions below (no INSERT/UPDATE policy needed).
DROP POLICY IF EXISTS match_events_select ON public.session_match_events;
CREATE POLICY match_events_select ON public.session_match_events
  FOR SELECT USING (
    auth.uid() = host_user_id
    OR auth.uid() = partner_user_id
    OR public.is_admin()
  );

-- ── 3. claim_open_session — log a match event ─────────────────
CREATE OR REPLACE FUNCTION public.claim_open_session(p_session_id UUID)
RETURNS public.focus_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_session        public.focus_sessions;
  v_now            TIMESTAMPTZ := now();
  v_elapsed_min    NUMERIC;
  v_total_min      NUMERIC;
  v_elapsed_pct    NUMERIC;
  v_intro_min      INT;
  v_intro_ends_at  TIMESTAMPTZ;
  v_target_session public.focus_sessions;
  v_door_opened    TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target_session
  FROM public.focus_sessions
  WHERE id = p_session_id
    AND status = 'active'
    AND open_to_match = true
    AND partner_user_id IS NULL
    AND user_id <> v_user_id
  FOR UPDATE SKIP LOCKED;

  IF v_target_session.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_elapsed_min := EXTRACT(EPOCH FROM (v_now - v_target_session.start_time)) / 60.0;
  v_total_min   := GREATEST(1, COALESCE(v_target_session.intended_duration_minutes, 30));
  v_elapsed_pct := v_elapsed_min / v_total_min;

  IF v_target_session.vibe = 'silent' THEN
    v_intro_min := 0;
  ELSIF v_elapsed_pct < 0.10 THEN
    v_intro_min := 5;
  ELSIF v_elapsed_pct < 0.67 THEN
    v_intro_min := 2;
  ELSE
    v_intro_min := 0;
  END IF;

  v_intro_ends_at := CASE
    WHEN v_intro_min > 0 THEN v_now + (v_intro_min || ' minutes')::interval
    ELSE NULL
  END;

  -- Baseline: the time the CURRENT door opened (fresh on every re-open),
  -- falling back to start_time for first-ever match / legacy rows.
  v_door_opened := COALESCE(v_target_session.door_opened_at, v_target_session.start_time);

  UPDATE public.focus_sessions
  SET
    partner_user_id     = v_user_id,
    session_mode        = 'one_on_one',
    match_joined_at     = v_now,
    intro_phase_ends_at = v_intro_ends_at,
    updated_at          = v_now
  WHERE id = v_target_session.id
  RETURNING * INTO v_session;

  -- Log the match event. Wait = matched_at − door_opened_at.
  INSERT INTO public.session_match_events
    (session_id, host_user_id, partner_user_id, door_opened_at, matched_at, status)
  VALUES
    (v_session.id, v_session.user_id, v_user_id, v_door_opened, v_now, 'matched');

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_open_session(uuid) TO authenticated;

-- ── 4. take_over_as_host — abandon the prior match, reset baseline ──
CREATE OR REPLACE FUNCTION public.take_over_as_host(p_session_id uuid)
RETURNS public.focus_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.focus_sessions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.focus_sessions
  SET
    user_id             = v_uid,
    partner_user_id     = NULL,
    session_mode        = 'solo',
    open_to_match       = true,
    match_joined_at     = NULL,
    intro_phase_ends_at = NULL,
    project_id          = NULL,
    session_task_id     = NULL,
    co_host_user_id     = NULL,
    door_opened_at      = now(),   -- fresh baseline for the next match
    updated_at          = now()
  WHERE id = p_session_id
    AND status = 'active'
    AND partner_user_id = v_uid
  RETURNING * INTO v_row;

  -- The previous host's match didn't jointly complete → abandon it.
  IF v_row.id IS NOT NULL THEN
    UPDATE public.session_match_events
      SET status = 'abandoned'
      WHERE session_id = p_session_id AND status = 'matched';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_over_as_host(uuid) TO authenticated;

-- ── 5. reopen_for_new_match — host's partner left, find someone new ──
-- Abandons the current match and re-opens the door with a FRESH baseline,
-- so the next match's wait is timed from now (not the original start).
CREATE OR REPLACE FUNCTION public.reopen_for_new_match(p_session_id uuid)
RETURNS public.focus_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.focus_sessions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.focus_sessions
  SET
    partner_user_id     = NULL,
    session_mode        = 'solo',
    open_to_match       = true,
    match_joined_at     = NULL,
    intro_phase_ends_at = NULL,
    door_opened_at      = now(),   -- fresh baseline
    updated_at          = now()
  WHERE id = p_session_id
    AND status = 'active'
    AND user_id = v_uid            -- caller must be the host
  RETURNING * INTO v_row;

  IF v_row.id IS NOT NULL THEN
    UPDATE public.session_match_events
      SET status = 'abandoned'
      WHERE session_id = p_session_id AND status = 'matched';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_for_new_match(uuid) TO authenticated;

-- ── 6. Mark a match completed when the session genuinely finishes ──
-- Fires when a session flips to 'completed'. The still-open match counts only
-- if the partner recorded an outcome (i.e. they were present at the debrief —
-- a real joint finish, not a 5-minute ghost).
CREATE OR REPLACE FUNCTION public.mark_match_event_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.session_match_events;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT * INTO v_event
    FROM public.session_match_events
    WHERE session_id = NEW.id AND status = 'matched'
    ORDER BY matched_at DESC
    LIMIT 1;

    IF v_event.id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.session_outcomes o
         WHERE o.session_id = NEW.id AND o.user_id = v_event.partner_user_id
       ) THEN
      UPDATE public.session_match_events
        SET status = 'completed', completed_at = now()
        WHERE id = v_event.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_match_event_completed ON public.focus_sessions;
CREATE TRIGGER trg_mark_match_event_completed
  AFTER UPDATE OF status ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_match_event_completed();

-- ── 7. Aggregated wait stats (privacy-safe, RLS-safe) ─────────
-- Per (weekday × 2-hour) averages over COMPLETED matches only. SECURITY
-- DEFINER so any authenticated user can read aggregates without seeing rows.
-- Buckets keyed on door_opened_at (when the user started looking), in UTC.
CREATE OR REPLACE FUNCTION public.match_wait_buckets(p_since timestamptz DEFAULT NULL)
RETURNS TABLE (day int, bucket int, cnt bigint, avg_minutes numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(DOW  FROM (door_opened_at AT TIME ZONE 'UTC'))::int          AS day,
    FLOOR(EXTRACT(HOUR FROM (door_opened_at AT TIME ZONE 'UTC')) / 2)::int AS bucket,
    COUNT(*)                                                              AS cnt,
    AVG(EXTRACT(EPOCH FROM (matched_at - door_opened_at)) / 60.0)         AS avg_minutes
  FROM public.session_match_events
  WHERE status = 'completed'
    AND matched_at >= door_opened_at
    AND (p_since IS NULL OR door_opened_at >= p_since)
  GROUP BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION public.match_wait_buckets(timestamptz) TO authenticated;

-- ── 8. Backfill events from existing matched sessions ─────────
-- Seed history so the stat isn't empty on day one. Status mirrors the rule:
-- completed sessions where the partner debriefed = 'completed'; cancelled =
-- 'abandoned'; anything else stays 'matched' (uncounted).
INSERT INTO public.session_match_events
  (session_id, host_user_id, partner_user_id, door_opened_at, matched_at, status, completed_at)
SELECT
  s.id, s.user_id, s.partner_user_id,
  COALESCE(s.door_opened_at, s.start_time), s.match_joined_at,
  CASE
    WHEN s.status = 'completed'
      AND EXISTS (SELECT 1 FROM public.session_outcomes o WHERE o.session_id = s.id AND o.user_id = s.partner_user_id)
      THEN 'completed'
    WHEN s.status = 'cancelled' THEN 'abandoned'
    ELSE 'matched'
  END,
  CASE WHEN s.status = 'completed' THEN s.ended_at ELSE NULL END
FROM public.focus_sessions s
WHERE s.match_joined_at IS NOT NULL
  AND s.partner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.session_match_events e WHERE e.session_id = s.id);
