-- Open-to-match: redesign of "Match me now".
--
-- The original match_me_now() flow (migration 20260527000008) put users into
-- a waiting_for_match lobby — they sat staring at a countdown until someone
-- else clicked the same button. Two failure modes:
--   1. Wasted time. A 10-min wait that yields no match is pure tax.
--   2. Critical-mass trap. At low volume the button feels broken.
--
-- The redesign: when you click "Match me now" the session STARTS immediately
-- as a normal solo session that's flagged `open_to_match=true`. You begin
-- working. The session appears in a "Live now — drop in" lane visible to
-- other online users. If someone joins, the session upgrades to 1-on-1 and
-- a Jitsi room spins up. If nobody joins, you still had a productive solo
-- session. No failure mode.
--
-- Three transitions also need DB support:
--   • vibe: host's social preference (silent / brief_hi / chatty) — shown
--     to the joiner before they click join, and drives intro-phase length.
--   • intro_phase_ends_at: set when a joiner claims; both clients sync to
--     this timestamp for the "say hi" countdown. NULL = no intro active.
--   • match_joined_at: when the joiner claimed the session — used to
--     decide intro length retroactively (arrival in first 10 min = full
--     5-min intro; middle third = 2 min; last third = none).
--
-- The legacy match_me_now() RPC + the 'waiting_for_match' status stay for
-- now; we'll deprecate them in a follow-up once the new flow is dogfooded.

-- ── 1. Schema additions ───────────────────────────────────────────────

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS open_to_match BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS vibe TEXT
  CHECK (vibe IN ('silent', 'brief_hi', 'chatty'));
-- NULL vibe = legacy session pre-dating this feature. Defaults to brief_hi
-- in the UI layer to avoid backfilling existing rows.

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS intro_phase_ends_at TIMESTAMPTZ;

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS match_joined_at TIMESTAMPTZ;

-- Partial index for the "Live now — drop in" feed query. Tiny because
-- only a sliver of active sessions are open-to-match at any moment.
CREATE INDEX IF NOT EXISTS focus_sessions_open_to_match_idx
  ON public.focus_sessions(start_time DESC)
  WHERE status = 'active'
    AND open_to_match = true
    AND partner_user_id IS NULL;

-- ── 2. RLS — let authenticated users discover open sessions ───────────
--
-- Existing select policies cover own sessions + active community sessions.
-- We add an explicit one for open-to-match so it surfaces even if the
-- session_visibility flag is set to 'private' (open-to-match implies
-- "I want one specific other person to drop in" — it's its own opt-in).

DROP POLICY IF EXISTS "focus_sessions_select_open_to_match" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select_open_to_match"
ON public.focus_sessions
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND open_to_match = true
  AND partner_user_id IS NULL
);

-- ── 3. RPC — claim_open_session() ─────────────────────────────────────
--
-- The race-safe drop-in. A user clicks "Join" on a Live-now card; this
-- runs as one transaction with FOR UPDATE SKIP LOCKED so two simultaneous
-- joiners can't both claim the same session.
--
-- On success: returns the session with partner_user_id set + intro_phase
-- timestamps populated based on arrival timing (see intro-length rules in
-- the migration header).

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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Peek (with row lock) — needed to compute intro length before update.
  SELECT * INTO v_target_session
  FROM public.focus_sessions
  WHERE id = p_session_id
    AND status = 'active'
    AND open_to_match = true
    AND partner_user_id IS NULL
    AND user_id <> v_user_id
  FOR UPDATE SKIP LOCKED;

  IF v_target_session.id IS NULL THEN
    -- Already claimed, host closed the door, or invalid id. Return null.
    RETURN NULL;
  END IF;

  -- Intro length rules (in minutes):
  --   • Host vibe = silent     → 0 (skip intro entirely)
  --   • Joiner arrives < 10% in → 5
  --   • Joiner arrives < 67% in → 2
  --   • Joiner arrives later   → 0 (just chime + work-in-progress toast)
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

  -- Claim the session. Flip mode → one_on_one so per-mode UI branches
  -- (Jitsi room, partner avatar, etc.) light up automatically.
  UPDATE public.focus_sessions
  SET
    partner_user_id     = v_user_id,
    session_mode        = 'one_on_one',
    match_joined_at     = v_now,
    intro_phase_ends_at = v_intro_ends_at,
    -- Once claimed, the session is no longer offered in the Live-now lane
    -- (open_to_match stays true for analytics — the partner_user_id IS NOT
    -- NULL clause in the discovery query takes care of hiding it).
    updated_at          = v_now
  WHERE id = v_target_session.id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_open_session(UUID) TO authenticated;

-- ── 4. RPC — close_the_door() ─────────────────────────────────────────
--
-- Host's mid-session escape hatch. They started open but want quiet now.
-- Just flips open_to_match=false; session continues as solo.

CREATE OR REPLACE FUNCTION public.close_the_door(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.focus_sessions
  SET open_to_match = false, updated_at = now()
  WHERE id = p_session_id
    AND user_id = v_user_id
    AND status = 'active'
    AND partner_user_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_the_door(UUID) TO authenticated;

-- ── 5. RPC — finish_intro_phase() ─────────────────────────────────────
--
-- Either party can manually end the intro early (e.g. "we're ready,
-- let's start focusing"). Just nulls intro_phase_ends_at so the client
-- transitions to work mode immediately.

CREATE OR REPLACE FUNCTION public.finish_intro_phase(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.focus_sessions
  SET intro_phase_ends_at = NULL, updated_at = now()
  WHERE id = p_session_id
    AND (user_id = v_user_id OR partner_user_id = v_user_id)
    AND status = 'active'
    AND intro_phase_ends_at IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finish_intro_phase(UUID) TO authenticated;
