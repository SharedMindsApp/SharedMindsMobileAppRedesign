-- door_presence — kill "ghost" open doors.
--
-- An open-to-match door has no liveness signal today: if the host closes the
-- laptop / loses connection without ending the session, the row stays
-- status='active', open_to_match=true, partner_user_id=null and keeps showing
-- as "waiting" — so someone drops in and lands in an empty room with a
-- no-show host.
--
-- Fix: a heartbeat. The waiting host pings last_seen_at every ~30s while their
-- door is open + unmatched. fetchOpenSessions() hides doors whose last_seen_at
-- has gone quiet (>75s), so a crashed / closed / sleeping host's door drops out
-- of discovery on its own. Robust against tab-close, crashes, and OS sleep
-- alike — no unload beacon needed.

alter table public.focus_sessions
  add column if not exists last_seen_at timestamptz;

-- Seed existing rows so an in-flight door isn't treated as instantly stale on
-- deploy (it'll go quiet naturally if its host doesn't have the heartbeat yet).
update public.focus_sessions
  set last_seen_at = coalesce(start_time, created_at, now())
  where last_seen_at is null;

-- Partial index for the discovery filter (only open, unmatched doors matter).
create index if not exists focus_sessions_door_presence_idx
  on public.focus_sessions (last_seen_at)
  where open_to_match = true and partner_user_id is null;

-- No new RLS needed: the session owner can already UPDATE their own row, which
-- is exactly (and only) who the heartbeat writes for.
