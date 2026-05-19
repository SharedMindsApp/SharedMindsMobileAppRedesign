-- Session modes (group vs 1-on-1) and quiet mode.
--
-- Adds three columns to focus_sessions:
--   • session_mode: 'group' | 'one_on_one' (default: 'group')
--   • quiet_mode: boolean (default: false) — Jitsi starts with mic muted
--   • partner_user_id: uuid — for 1-on-1 only, the second participant who claimed the slot
--
-- 1-on-1 sessions are enforced by partner_user_id: while NULL, the slot is open
-- and any other user may claim it. Once set, joining is blocked at the service
-- layer (claim is implemented as a conditional UPDATE that only succeeds when
-- partner_user_id IS NULL).

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS session_mode    text    NOT NULL DEFAULT 'group',
  ADD COLUMN IF NOT EXISTS quiet_mode      boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS partner_user_id uuid    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Allowed modes
ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_mode_check;
ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_mode_check
  CHECK (session_mode IN ('group', 'one_on_one'));

-- partner can only be set for 1-on-1 sessions, and never equal to the host
ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_partner_rules;
ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_partner_rules
  CHECK (
    partner_user_id IS NULL
    OR (session_mode = 'one_on_one' AND partner_user_id <> user_id)
  );

-- Index for "find open 1-on-1 sessions to join"
CREATE INDEX IF NOT EXISTS focus_sessions_open_oneonone_idx
  ON public.focus_sessions(status, session_mode)
  WHERE status = 'active' AND session_mode = 'one_on_one' AND partner_user_id IS NULL;
