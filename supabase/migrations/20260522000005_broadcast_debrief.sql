-- Broadcast debrief: when the host ends the session, every participant's
-- screen should flip to the debrief overlay at the same moment.
--
-- Implementation: add a `debrief_started_at` timestamp to focus_sessions.
-- The host's End button sets it; everyone else's client listens to the
-- existing focus_sessions UPDATE Realtime stream and opens their own
-- debrief overlay when this field becomes non-null.
--
-- The timer-zero auto-trigger also sets this so participants who joined
-- late (or just refreshed) immediately see the debrief.

ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS debrief_started_at timestamptz;

CREATE INDEX IF NOT EXISTS focus_sessions_debrief_idx
  ON focus_sessions(debrief_started_at)
  WHERE debrief_started_at IS NOT NULL;

COMMENT ON COLUMN focus_sessions.debrief_started_at IS
  'Timestamp when the debrief was triggered. NULL while the session is still in progress. Once set, all participants'' clients open the debrief overlay simultaneously.';
