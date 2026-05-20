-- Authenticated users can see scheduled non-solo community sessions.
--
-- Bug found: anonymous visitors on the marketing site could see upcoming
-- public sessions via `focus_sessions_public_community_view`, but logged-in
-- users in the app could NOT — the `focus_sessions_select_policy` only
-- granted access to (a) own sessions, (b) live active sessions,
-- (c) shared-project sessions, (d) recent finishes. Scheduled sessions
-- created by admins (via the recurring templates materializer) were
-- effectively invisible to everyone except the admin who owned them.
--
-- This migration adds a 5th clause: any authenticated user can SELECT a
-- non-solo session with status='scheduled' and a scheduled_at value.
-- Mirrors the existing anon policy.

drop policy if exists "focus_sessions_select_policy" on public.focus_sessions;

create policy "focus_sessions_select_policy"
on public.focus_sessions for select
using (
  user_id = auth.uid()                                    -- always your own
  or status = 'active'                                    -- any active session (solo filter is app-side)
  or (
    project_id is not null                                -- shared project — members see all
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = focus_sessions.project_id
        and pm.user_id = auth.uid()
    )
  )
  or (
    -- Recent non-solo finishes — last 24h, social proof for the home feed.
    auth.uid() is not null
    and status = 'completed'
    and session_mode is not null
    and session_mode <> 'solo'
    and ended_at is not null
    and ended_at > now() - interval '24 hours'
  )
  or (
    -- NEW: upcoming non-solo scheduled sessions — admins curate these via
    -- recurring templates; every authenticated user should see them on the
    -- /sessions calendar and in the "Find Sessions" sheet.
    auth.uid() is not null
    and status = 'scheduled'
    and session_mode is not null
    and session_mode <> 'solo'
    and scheduled_at is not null
  )
);
