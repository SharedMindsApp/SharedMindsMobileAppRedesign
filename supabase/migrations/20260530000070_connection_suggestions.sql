-- connection_suggestions — turn repeated co-working into real connections.
--
-- If two people have matched into each other's sessions 3+ times, they clearly
-- click — surface a "connect?" suggestion to both. Repeated co-sessions is the
-- trigger; shared skills / work types only RANK the suggestion and shape the
-- copy (so a designer + founder who vibe every week still get suggested).
--
-- Counts non-abandoned match events (matched OR completed) — "they joined each
-- other 3 times" — so the suggestion fires reliably right after the 3rd
-- session even before both debriefs land. Excludes pairs already connected /
-- with a pending request, and pairs the user has dismissed.

-- Per-user dismissals so a "not now" doesn't re-nag.
create table if not exists public.connection_suggestion_dismissals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, other_user_id),
  check (user_id <> other_user_id)
);

alter table public.connection_suggestion_dismissals enable row level security;

drop policy if exists "csd read own" on public.connection_suggestion_dismissals;
create policy "csd read own" on public.connection_suggestion_dismissals
  for select using (user_id = auth.uid());

drop policy if exists "csd insert own" on public.connection_suggestion_dismissals;
create policy "csd insert own" on public.connection_suggestion_dismissals
  for insert with check (user_id = auth.uid());

drop policy if exists "csd delete own" on public.connection_suggestion_dismissals;
create policy "csd delete own" on public.connection_suggestion_dismissals
  for delete using (user_id = auth.uid());

-- ── Suggestions for the calling user ──────────────────────────────────
create or replace function public.get_connection_suggestions()
returns table (
  other_user_id     uuid,
  co_sessions       bigint,
  last_session_at   timestamptz,
  display_name      text,
  avatar_url        text,
  work_type         text,
  shared_skills     text[],
  shared_work_types text[],
  country_code      text
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select skills as my_skills,
           coalesce(work_types, case when work_type is not null then array[work_type] else '{}' end) as my_work_types
    from public.profiles where id = auth.uid()
  ),
  pairs as (
    select
      case when host_user_id = auth.uid() then partner_user_id else host_user_id end as other,
      count(*) as n,
      max(coalesce(completed_at, matched_at)) as last_at
    from public.session_match_events
    where status <> 'abandoned'
      and (host_user_id = auth.uid() or partner_user_id = auth.uid())
    group by 1
  )
  select * from (
    select
      p.other as other_user_id,
      p.n     as co_sessions,
      p.last_at as last_session_at,
      pr.display_name,
      pr.avatar_url,
      pr.work_type,
      coalesce(array(
        select unnest(pr.skills) intersect select unnest((select my_skills from me))
      ), '{}') as shared_skills,
      coalesce(array(
        select unnest(coalesce(pr.work_types, case when pr.work_type is not null then array[pr.work_type] else '{}' end))
        intersect select unnest((select my_work_types from me))
      ), '{}') as shared_work_types,
      pr.country_code
    from pairs p
    join public.profiles pr on pr.id = p.other
    where p.n >= 3
      and p.other <> auth.uid()
      and not exists (
        select 1 from public.connections c
        where (c.requester_id = auth.uid() and c.addressee_id = p.other)
           or (c.requester_id = p.other       and c.addressee_id = auth.uid())
      )
      and not exists (
        select 1 from public.connection_suggestion_dismissals d
        where d.user_id = auth.uid() and d.other_user_id = p.other
      )
  ) q
  order by q.co_sessions desc,
           coalesce(array_length(q.shared_skills, 1), 0) + coalesce(array_length(q.shared_work_types, 1), 0) desc,
           q.last_session_at desc;
$$;

grant execute on function public.get_connection_suggestions() to authenticated;
