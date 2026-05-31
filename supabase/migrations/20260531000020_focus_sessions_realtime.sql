-- Publish focus_sessions for Realtime.
--
-- The app subscribes to focus_sessions postgres_changes in several places —
-- the home "Drop in · live now" strip, the hero's live-now list, the
-- match-me-now host/partner watchers — but the table was never added to the
-- `supabase_realtime` publication, so none of those events ever fired. Result:
-- a newly-opened session only appeared after a manual refresh, and a matched
-- host didn't learn it had been claimed.
--
-- REPLICA IDENTITY FULL so UPDATE events carry the full row (needed for the
-- client's RLS-evaluated change delivery + reading changed columns like
-- partner_user_id).

alter table public.focus_sessions replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.focus_sessions;
exception
  when duplicate_object then null;  -- already published — fine
  when undefined_object then null;  -- publication missing (local) — ignore
end $$;
