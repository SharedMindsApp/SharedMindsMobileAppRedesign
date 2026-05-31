-- scheduled_session_rsvps — let members sign up for (RSVP to) a scheduled
-- group session they don't host.
--
-- Until now "committed to a session" only meant hosting it (or being the
-- matched 1-on-1 partner). Group sessions are social, so a member should be
-- able to add a public session to their calendar and get the home countdown
-- + reminders for it. One row per (session, user).

create table if not exists public.scheduled_session_rsvps (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.focus_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists ssr_session_idx on public.scheduled_session_rsvps (session_id);
create index if not exists ssr_user_idx    on public.scheduled_session_rsvps (user_id);

alter table public.scheduled_session_rsvps enable row level security;

-- Own RSVPs: members fully manage their own (sign up / cancel / read).
drop policy if exists "rsvp own" on public.scheduled_session_rsvps;
create policy "rsvp own" on public.scheduled_session_rsvps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A session's host can read its RSVP rows (to see who's coming).
drop policy if exists "rsvp host read" on public.scheduled_session_rsvps;
create policy "rsvp host read" on public.scheduled_session_rsvps
  for select using (
    exists (
      select 1 from public.focus_sessions fs
      where fs.id = scheduled_session_rsvps.session_id
        and fs.user_id = auth.uid()
    )
  );

-- Public "N going" counts without exposing WHO is going. SECURITY DEFINER so
-- it can count rows past RLS, but only ever returns aggregate counts.
create or replace function public.get_session_rsvp_counts(p_session_ids uuid[])
returns table (session_id uuid, going int)
language sql
stable
security definer
set search_path = public
as $$
  select r.session_id, count(*)::int as going
  from public.scheduled_session_rsvps r
  where r.session_id = any(p_session_ids)
  group by r.session_id
$$;

grant execute on function public.get_session_rsvp_counts(uuid[]) to authenticated;
