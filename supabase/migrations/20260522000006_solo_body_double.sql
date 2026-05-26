-- Solo body-double mode.
--
-- When `body_double = true` on a solo session, the user joins a shared,
-- persistent Daily.co room where everyone has their camera ON and mic
-- permanently OFF. Silent presence — Caveday/Flow.club-style.
--
-- Camera-mandatory is enforced at the Daily token layer (canSend: ['video']
-- only) so users physically cannot unmute.

ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS body_double boolean NOT NULL DEFAULT false;

-- Helpful for "who is body-doubling right now" queries (the room view).
CREATE INDEX IF NOT EXISTS focus_sessions_body_double_active_idx
  ON focus_sessions(start_time DESC)
  WHERE body_double = true AND status = 'active';

COMMENT ON COLUMN focus_sessions.body_double IS
  'Solo session with silent video coworking. User shares camera, mic is locked off, sees other body-doublers'' faces in a shared Daily room. Only meaningful when session_mode = ''solo''.';
