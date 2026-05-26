-- Real-world / offline-capable sessions.
--
-- For users doing focus work AWAY from their screen (allotment,
-- exercise, household tasks, parenting prep, creative hobbies). The
-- timer + Declare/Ship flow still applies — the only difference is the
-- session UI knows to render a simpler mobile-friendly chrome and the
-- live feed shows a "focusing offline" badge instead of trying to
-- include the user in any video room.
--
-- Orthogonal to session_mode. In practice always paired with solo:
-- the UI in DeclareSessionModal forces session_mode = 'solo' when this
-- toggle is on. We don't constrain it at the DB level — leaving room
-- for future "shared real-world session" experiments without a
-- migration round-trip.

alter table public.focus_sessions
  add column if not exists is_offline boolean not null default false;

-- Index helps the community pulse + ambient peers strip quickly
-- exclude offline sessions from the Jitsi-room participant grids
-- without scanning every active session.
create index if not exists focus_sessions_offline_idx
  on public.focus_sessions(is_offline)
  where status = 'active';
