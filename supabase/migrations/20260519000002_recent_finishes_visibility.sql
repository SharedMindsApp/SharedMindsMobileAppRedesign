-- Recent finishes visibility
--
-- Adds the home page "founders finished today" carousel by allowing any
-- authenticated user to SELECT non-solo sessions that completed in the
-- last 24 hours. Solo sessions stay private as always.
--
-- We're already exposing display_name + avatar_url on active sessions via
-- the profiles RLS policy added in 20260514000001; this extends the same
-- pattern to recently-completed sessions so their owner names render.

drop policy if exists "focus_sessions_select_policy" on public.focus_sessions;

create policy "focus_sessions_select_policy"
on public.focus_sessions for select
using (
  user_id = auth.uid()                                    -- always your own
  or status = 'active'                                    -- any active session (non-solo filter is app-side)
  or (
    project_id is not null                                -- shared project — members see all
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = focus_sessions.project_id
        and pm.user_id = auth.uid()
    )
  )
  or (
    -- Recent non-solo finishes — last 24h, visible to all authenticated
    -- users so the home page can show community proof.
    auth.uid() is not null
    and status = 'completed'
    and session_mode is not null
    and session_mode <> 'solo'
    and ended_at is not null
    and ended_at > now() - interval '24 hours'
  )
);

-- Profiles policy needs to also allow seeing the owner of a recently-finished
-- session so the carousel can render their display_name + avatar.
drop policy if exists "profiles_select_recent_session_owners" on public.profiles;
create policy "profiles_select_recent_session_owners"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1 from public.focus_sessions fs
    where fs.user_id = id
      and fs.session_mode is not null
      and fs.session_mode <> 'solo'
      and (
        fs.status = 'active'
        or (fs.status = 'completed' and fs.ended_at is not null and fs.ended_at > now() - interval '24 hours')
      )
  )
);

-- Drop the older narrower policy if it survives — replaced by the union above
drop policy if exists "profiles_select_active_session_owners" on public.profiles;
