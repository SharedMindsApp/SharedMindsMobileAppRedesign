-- Fix: focus_sessions_status_check rejects status='scheduled'
--
-- The materialize_recurring_sessions RPC tries to insert status='scheduled'
-- and gets:
--   23514: new row for relation "focus_sessions" violates check constraint
--          "focus_sessions_status_check"
--
-- Looking at the app's behaviour, 'scheduled' is a legitimate status:
--   - JoinSessionPage.tsx checks `session.status === 'scheduled'`
--   - RLS policies select WHERE status='scheduled'
--   - scheduled_sessions.sql migration adds an RLS policy that depends on it
--   - public_session_visibility.sql exposes status='scheduled' to anon
--
-- The CHECK constraint just hasn't been kept in sync. Drop and recreate it
-- to include all five valid statuses.

alter table public.focus_sessions
  drop constraint if exists focus_sessions_status_check;

alter table public.focus_sessions
  add constraint focus_sessions_status_check
  check (status in ('active', 'paused', 'completed', 'cancelled', 'scheduled'));
