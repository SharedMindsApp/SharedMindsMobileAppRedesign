-- V1 Migration 002: Calendar Spine

-- 1. `calendars`
create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('system', 'personal', 'shared', 'external')),
  color text,
  is_default boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger calendars_set_updated_at
before update on public.calendars
for each row execute function public.set_updated_at();

create index calendars_space_idx on public.calendars(space_id);
create unique index calendars_default_per_space_idx
on public.calendars(space_id)
where is_default = true;

alter table public.calendars enable row level security;

create policy "calendars_select_if_space_member"
on public.calendars
for select
using (public.is_space_member(space_id));

create policy "calendars_insert_manageable_space"
on public.calendars
for insert
with check (public.can_manage_space(space_id) and created_by = auth.uid());

create policy "calendars_update_manageable_space"
on public.calendars
for update
using (public.can_manage_space(space_id))
with check (public.can_manage_space(space_id));


-- 2. `calendar_sources`
create table public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  provider text not null,
  external_id text not null,
  sync_state text not null default 'active',
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);

create trigger calendar_sources_set_updated_at
before update on public.calendar_sources
for each row execute function public.set_updated_at();

create index calendar_sources_calendar_idx on public.calendar_sources(calendar_id);

alter table public.calendar_sources enable row level security;

create policy "calendar_sources_select_if_calendar_visible"
on public.calendar_sources
for select
using (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_id
      and public.is_space_member(c.space_id)
  )
);

create policy "calendar_sources_manage_if_calendar_manageable"
on public.calendar_sources
for all
using (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_id
      and public.can_manage_space(c.space_id)
  )
)
with check (
  exists (
    select 1
    from public.calendars c
    where c.id = calendar_id
      and public.can_manage_space(c.space_id)
  )
);


-- 3. `calendar_events`
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  event_type text not null default 'general',
  visibility text not null check (visibility in ('space', 'restricted', 'private')) default 'space',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  source_type text not null default 'manual',
  source_ref_id uuid,
  status text not null check (status in ('confirmed', 'tentative', 'cancelled')) default 'confirmed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

create index calendar_events_calendar_time_idx
on public.calendar_events(calendar_id, start_at, end_at);

create index calendar_events_space_time_idx
on public.calendar_events(space_id, start_at, end_at);

create index calendar_events_source_idx
on public.calendar_events(source_type, source_ref_id);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_visible"
on public.calendar_events
for select
using (
  (
    visibility = 'space'
    and public.is_space_member(space_id)
  )
  or (
    visibility = 'private'
    and created_by = auth.uid()
  )
  or (
    visibility = 'restricted'
    and created_by = auth.uid()
  )
);

create policy "calendar_events_insert_manageable_space"
on public.calendar_events
for insert
with check (
  public.can_manage_space(space_id)
  and created_by = auth.uid()
);

create policy "calendar_events_update_creator_or_manageable_space"
on public.calendar_events
for update
using (
  created_by = auth.uid()
  or public.can_manage_space(space_id)
)
with check (
  created_by = auth.uid()
  or public.can_manage_space(space_id)
);


-- 4. `calendar_event_participants`
create table public.calendar_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response_status text not null check (response_status in ('pending', 'accepted', 'declined', 'tentative')) default 'pending',
  role text not null default 'participant',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index calendar_event_participants_user_idx
on public.calendar_event_participants(user_id);

alter table public.calendar_event_participants enable row level security;

create policy "calendar_event_participants_select_if_event_visible"
on public.calendar_event_participants
for select
using (
  exists (
    select 1
    from public.calendar_events e
    where e.id = event_id
      and (
        e.created_by = auth.uid()
        or public.is_space_member(e.space_id)
      )
  )
);

create policy "calendar_event_participants_insert_if_event_manageable"
on public.calendar_event_participants
for insert
with check (
  exists (
    select 1
    from public.calendar_events e
    where e.id = event_id
      and (
        e.created_by = auth.uid()
        or public.can_manage_space(e.space_id)
      )
  )
);
