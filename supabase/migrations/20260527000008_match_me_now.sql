-- "Match me now" — instant 1-on-1 matchmaking.
--
-- Until now, 1-on-1 sessions required scheduling a specific time slot. This
-- migration adds the spontaneous lane: a user clicks "Match me now", we open
-- a session in status='waiting_for_match', and the first other user to do
-- the same gets atomically paired in and the session flips to 'active'.
--
-- Schema additions:
--   • status: extend the CHECK constraint with 'waiting_for_match'
--   • match_expires_at: when this row auto-cancels if nobody pairs up
--
-- Atomicity: the match_me_now() RPC runs as one transaction. Either it
-- claims an existing waiting session (UPDATE … RETURNING) OR it inserts a
-- new one — never both, never neither. Two users racing both get a clean
-- result: the first paired into the second's slot, the second creates
-- their own waiting row.
--
-- Auto-cancel: client filters waitings by `match_expires_at > now()`.
-- We don't bother with a background sweeper — expired rows are harmless,
-- and a future cleanup pass can soft-mark them 'cancelled' if needed.

-- ── 1. Schema changes ─────────────────────────────────────────────────

ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_status_check;

ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'scheduled', 'waiting_for_match'));

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS match_expires_at timestamptz;

-- Index for the matching query — "find oldest non-expired waiting session
-- that isn't mine, in 1-on-1 mode, with no partner yet". Partial index keeps
-- it tiny because the table is dominated by 'active'/'completed' rows.
CREATE INDEX IF NOT EXISTS focus_sessions_waiting_for_match_idx
  ON public.focus_sessions(match_expires_at, created_at)
  WHERE status = 'waiting_for_match'
    AND session_mode = 'one_on_one'
    AND partner_user_id IS NULL;

-- ── 2. RLS — let anonymous + authenticated discover live waitings ──────
--
-- The existing focus_sessions_select policy (migration 20260514000014_solo_mode.sql)
-- allows seeing sessions where status='active'. We add a parallel policy so
-- non-expired waiting 1-on-1s also surface, otherwise the Find sheet can't
-- show them. Self-rows already pass via user_id = auth.uid().

DROP POLICY IF EXISTS "focus_sessions_select_waiting_public" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select_waiting_public"
ON public.focus_sessions
FOR SELECT
USING (
  status = 'waiting_for_match'
  AND session_mode = 'one_on_one'
  AND partner_user_id IS NULL
  AND (match_expires_at IS NULL OR match_expires_at > now())
);

-- ── 3. RPC — match_me_now() ────────────────────────────────────────────
--
-- One transaction that tries to claim the oldest waiting session not
-- created by the caller. If found, atomically flips it to active and
-- returns it. Otherwise inserts a fresh waiting session for the caller
-- and returns that.
--
-- Both branches return the same row shape — the client always navigates
-- to the returned session id, but checks `partner_user_id` to decide
-- waiting-room vs straight-into-call.

CREATE OR REPLACE FUNCTION public.match_me_now(
  p_duration_minutes int  DEFAULT 30,
  p_quiet_mode       bool DEFAULT false,
  p_goal_text        text DEFAULT NULL
)
RETURNS public.focus_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_session    public.focus_sessions;
  v_now        timestamptz := now();
  v_end        timestamptz := now() + (p_duration_minutes || ' minutes')::interval;
  v_match_ttl  interval    := interval '10 minutes';
  -- Structure: the first 5 min is for hellos + declaring intentions,
  -- the remainder is heads-down work. Drives the SegmentTimeline UI and
  -- (future) auto-advance progression. Stored on the row so both
  -- partners share the same structure even after pairing.
  v_intro_min  int := 5;
  v_work_min   int := GREATEST(1, p_duration_minutes - v_intro_min);
  v_segments   jsonb := jsonb_build_array(
    jsonb_build_object('kind', 'intentions', 'label', 'Say hi · declare goals', 'minutes', v_intro_min),
    jsonb_build_object('kind', 'work',       'label', 'Focus block',            'minutes', v_work_min)
  );
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Floor of 30 min: 5 min intro + 25 min focus. Anything shorter
  -- doesn't leave room for hellos and reading each other's goals.
  IF p_duration_minutes < 30 OR p_duration_minutes > 180 THEN
    RAISE EXCEPTION 'Duration must be between 30 and 180 minutes' USING ERRCODE = '22023';
  END IF;

  -- Try to claim someone else's waiting session (FIFO by created_at).
  -- The conditional WHERE guarantees only ONE caller wins; the loser
  -- falls through to the INSERT branch and creates their own.
  UPDATE public.focus_sessions
  SET
    partner_user_id  = v_user_id,
    status           = 'active',
    start_time       = v_now,
    target_end_time  = v_end,
    -- inherit the new joiner's preferences? No — leave the host's settings.
    -- duration stays as the host set it; the joiner accepts that.
    match_expires_at = NULL
  WHERE id = (
    SELECT id FROM public.focus_sessions
    WHERE status = 'waiting_for_match'
      AND session_mode = 'one_on_one'
      AND partner_user_id IS NULL
      AND user_id <> v_user_id
      AND (match_expires_at IS NULL OR match_expires_at > v_now)
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO v_session;

  IF v_session.id IS NOT NULL THEN
    -- Paired. Return the now-active session.
    RETURN v_session;
  END IF;

  -- No waiting session to claim — create our own.
  INSERT INTO public.focus_sessions (
    user_id,
    session_mode,
    status,
    start_time,
    target_end_time,
    intended_duration_minutes,
    quiet_mode,
    session_goal,
    segments,
    match_expires_at,
    is_offline
  ) VALUES (
    v_user_id,
    'one_on_one',
    'waiting_for_match',
    v_now,
    v_end,
    p_duration_minutes,
    p_quiet_mode,
    p_goal_text,
    v_segments,
    v_now + v_match_ttl,
    false
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_me_now(int, bool, text) TO authenticated;

-- ── 4. RPC — cancel_pending_match() ─────────────────────────────────────
--
-- Owner-only soft-cancel. Sets status='cancelled' so the waiting room
-- realtime sub fires and the user is shown a "no luck this time" state.

CREATE OR REPLACE FUNCTION public.cancel_pending_match(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.focus_sessions
  SET status = 'cancelled', match_expires_at = NULL
  WHERE id = p_session_id
    AND user_id = v_user_id
    AND status = 'waiting_for_match'
    AND partner_user_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_pending_match(uuid) TO authenticated;
