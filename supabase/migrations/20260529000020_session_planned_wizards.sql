-- ─────────────────────────────────────────────────────────────────
-- Planned wizards — a host's pre-session agenda.
--
-- While the host waits for a match (or any time during their session) they
-- can schedule guided wizards (breaths, breaks, vibe check, intentions) to
-- fire at relative moments: at the start, 5 min in, halfway, or in the last
-- 5 minutes. When the moment arrives the host's client launches the wizard,
-- which broadcasts to everyone in the session via the existing
-- wizard:{sessionId} realtime channel.
--
-- Stored as a JSONB array on the session itself rather than a side table:
--   [ { "id": "<uuid>", "wizardId": "breathing_box",
--       "at": "min5", "status": "planned" }, ... ]
--   • at     ∈ 'start' | 'min5' | 'halfway' | 'last5'
--   • status ∈ 'planned' | 'fired' | 'cancelled'
--
-- No new RLS needed: the session host already owns UPDATE on their
-- focus_sessions row (and after a takeover the new host owns it), and the
-- partner already has SELECT on the row, so they can see the agenda.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS planned_wizards jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.focus_sessions.planned_wizards IS
  'Host-scheduled guided wizards for this session. Array of {id, wizardId, at, status}; fired client-side at relative moments and broadcast to participants.';
