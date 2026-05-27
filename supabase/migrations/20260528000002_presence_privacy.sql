-- ============================================================
-- Presence privacy + status mode
-- Migration: 20260528000002_presence_privacy
--
-- Two NEW orthogonal axes for "am I visible / what do I show":
--
--   presence_privacy  — WHO sees my presence dot at all
--     'everyone'      anyone signed in sees it (default)
--     'connections'   only accepted connections see it
--     'nobody'        invisible mode — I never appear in Online-now
--                     lists or carry a green dot anywhere
--
--   status_mode       — WHAT label is shown when I AM visible
--     'auto'          green if heartbeat in last 2 min, else grey
--                     (default)
--     'busy'          amber "Busy" regardless of heartbeat
--     'offline'       grey "Offline" regardless of heartbeat — useful
--                     for "in the app but don't ping me"
--
-- Active-session override: if a user currently has a focus_sessions
-- row with status='active', the effective status becomes 'in_session'
-- automatically. We do this in the RPC rather than as a column so it
-- can never go stale.
--
-- All "who sees what" decisions live in
-- get_presence_for_viewer(target uuid) so every surface
-- (Online-now list, member directory, profile page, chat sidebar)
-- shares ONE source of truth.
-- ============================================================


-- 1. Columns ---------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_privacy text NOT NULL DEFAULT 'everyone'
    CHECK (presence_privacy IN ('everyone', 'connections', 'nobody'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_mode text NOT NULL DEFAULT 'auto'
    CHECK (status_mode IN ('auto', 'busy', 'offline'));


-- 2. Effective-presence RPC -----------------------------------
--
-- Returns the dot the VIEWER should see for the TARGET user.
-- Returned status values:
--   'online'      green dot, "Online"
--   'busy'        amber dot, "Busy"
--   'in_session'  blue dot, "In a focus session"
--   'offline'     grey dot, "Offline" / no dot
--   'hidden'      caller should treat target as invisible entirely
--                 (don't render in lists, don't show last-seen, etc.)
--
-- 'hidden' is distinct from 'offline' because a user who has set
-- presence_privacy='nobody' should be omitted from discovery
-- surfaces, whereas an offline-but-visible user should still be
-- listed (just greyed out).

CREATE OR REPLACE FUNCTION public.get_presence_for_viewer(target uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_privacy     text;
  v_status_mode text;
  v_last_seen   timestamptz;
  v_connected   boolean;
  v_in_session  boolean;
  v_online_threshold timestamptz := now() - interval '2 minutes';
BEGIN
  -- The viewer is always the calling user. Strangers (anon) get
  -- 'hidden' for everyone — no presence info leaks pre-auth.
  IF auth.uid() IS NULL THEN
    RETURN 'hidden';
  END IF;

  -- A user always sees their own real presence (useful for the
  -- avatar dropdown to show "what others see").
  IF target = auth.uid() THEN
    SELECT presence_privacy, status_mode, last_seen_at
      INTO v_privacy, v_status_mode, v_last_seen
      FROM public.profiles WHERE id = target;
  ELSE
    SELECT presence_privacy, status_mode, last_seen_at
      INTO v_privacy, v_status_mode, v_last_seen
      FROM public.profiles WHERE id = target;
  END IF;

  IF v_privacy IS NULL THEN
    RETURN 'hidden';
  END IF;

  -- Privacy gate ------------------------------------------------
  IF target <> auth.uid() THEN
    IF v_privacy = 'nobody' THEN
      RETURN 'hidden';
    END IF;

    IF v_privacy = 'connections' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.person_connections
        WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = target)
            OR
            (addressee_id = auth.uid() AND requester_id = target)
          )
      ) INTO v_connected;
      IF NOT v_connected THEN
        RETURN 'hidden';
      END IF;
    END IF;
  END IF;

  -- Active-session override (highest-priority "what they're up to"
  -- signal — stronger than manual busy because they're literally
  -- mid-focus right now).
  SELECT EXISTS (
    SELECT 1 FROM public.focus_sessions
    WHERE user_id = target AND status = 'active'
  ) INTO v_in_session;

  IF v_in_session THEN
    RETURN 'in_session';
  END IF;

  -- Manual status overrides
  IF v_status_mode = 'busy' THEN
    RETURN 'busy';
  END IF;
  IF v_status_mode = 'offline' THEN
    RETURN 'offline';
  END IF;

  -- Auto: based on heartbeat
  IF v_last_seen IS NULL OR v_last_seen < v_online_threshold THEN
    RETURN 'offline';
  END IF;

  RETURN 'online';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_presence_for_viewer(uuid) TO authenticated;


-- 3. Batch RPC for online-now lists ---------------------------
--
-- listOnlineMembers used to be a plain SELECT against profiles
-- filtered by last_seen_at > 10 min ago. That bypasses the privacy
-- gate entirely. This RPC returns the user_ids the caller is
-- allowed to see as online RIGHT NOW (last 2 min heartbeat,
-- privacy-respected, status-overridden, in-session-aware).
--
-- Returns: rows of (id, status) — caller joins profiles for the
-- rest of the row data on the client.

CREATE OR REPLACE FUNCTION public.list_visible_online_users(max_rows int DEFAULT 50)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN; -- empty
  END IF;

  RETURN QUERY
  WITH candidates AS (
    -- Users who could plausibly be "online" — heartbeat in last 2 min,
    -- OR currently in a focus session (in-session people stay visible
    -- in the list even if their heartbeat lapsed because the session
    -- itself is keep-alive evidence).
    SELECT p.id
      FROM public.profiles p
     WHERE p.id <> auth.uid()
       AND p.presence_privacy <> 'nobody'
       AND (
         p.last_seen_at > now() - interval '2 minutes'
         OR EXISTS (
           SELECT 1 FROM public.focus_sessions fs
           WHERE fs.user_id = p.id AND fs.status = 'active'
         )
       )
     LIMIT max_rows * 2  -- pre-filter buffer; final filter trims to max_rows
  )
  SELECT c.id, public.get_presence_for_viewer(c.id) AS status
    FROM candidates c
   WHERE public.get_presence_for_viewer(c.id) IN ('online', 'busy', 'in_session')
   LIMIT max_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_visible_online_users(int) TO authenticated;


-- 4. Index to keep the heartbeat scan cheap -------------------
CREATE INDEX IF NOT EXISTS profiles_last_seen_visible_idx
  ON public.profiles (last_seen_at DESC)
  WHERE presence_privacy <> 'nobody';
