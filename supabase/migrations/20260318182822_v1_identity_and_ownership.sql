-- V1 Migration 001: Identity And Ownership Spine

-- 1. Required extensions
create extension if not exists pgcrypto;

-- 2. Timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

-- 3. `profiles`
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'Europe/London',
  locale text,
  neurotype text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index profiles_display_name_idx on public.profiles(display_name);

alter table public.profiles enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());


-- 4. `user_settings`
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  default_space_id uuid,
  voice_enabled boolean not null default false,
  voice_choice text,
  checkin_preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  ui_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "user_settings_all_self"
on public.user_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- 5. `spaces` (Tables only first)
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('personal', 'shared')),
  name text not null,
  slug text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create trigger spaces_set_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

create index spaces_created_by_idx on public.spaces(created_by);
create index spaces_type_idx on public.spaces(type);


-- 6. `space_members` (Tables only first)
create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'viewer')),
  status text not null check (status in ('active', 'invited', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create trigger space_members_set_updated_at
before update on public.space_members
for each row execute function public.set_updated_at();

create index space_members_user_idx on public.space_members(user_id);
create index space_members_space_status_idx on public.space_members(space_id, status);


-- 7. RLS helper functions (Now that spaces and space_members exist)
create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = p_space_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
$$;

create or replace function public.space_role(p_space_id uuid)
returns text
language sql
stable
as $$
  select sm.role
  from public.space_members sm
  where sm.space_id = p_space_id
    and sm.user_id = auth.uid()
    and sm.status = 'active'
  limit 1
$$;

create or replace function public.can_manage_space(p_space_id uuid)
returns boolean
language sql
stable
as $$
  select public.space_role(p_space_id) in ('owner', 'collaborator')
$$;


-- 8. `spaces` RLS
alter table public.spaces enable row level security;

create policy "spaces_select_if_member"
on public.spaces
for select
using (public.is_space_member(id) or created_by = auth.uid());

create policy "spaces_insert_owner_only"
on public.spaces
for insert
with check (created_by = auth.uid());

create policy "spaces_update_manageable"
on public.spaces
for update
using (public.can_manage_space(id))
with check (public.can_manage_space(id));


-- 9. `space_members` RLS
alter table public.space_members enable row level security;

create policy "space_members_select_if_same_space"
on public.space_members
for select
using (public.is_space_member(space_id));

create policy "space_members_insert_manageable_space"
on public.space_members
for insert
with check (
  public.can_manage_space(space_id)
  or exists (
    select 1 from public.spaces s
    where s.id = space_id and s.created_by = auth.uid()
  )
);

create policy "space_members_update_manageable_space"
on public.space_members
for update
using (public.can_manage_space(space_id))
with check (public.can_manage_space(space_id));


-- 10. `person_connections`
create table public.person_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined', 'blocked')),
  connection_type text not null default 'trusted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index person_connections_pair_idx
on public.person_connections (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create trigger person_connections_set_updated_at
before update on public.person_connections
for each row execute function public.set_updated_at();

alter table public.person_connections enable row level security;

create policy "person_connections_select_participants"
on public.person_connections
for select
using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "person_connections_insert_requester"
on public.person_connections
for insert
with check (requester_id = auth.uid());

create policy "person_connections_update_participants"
on public.person_connections
for update
using (requester_id = auth.uid() or addressee_id = auth.uid())
with check (requester_id = auth.uid() or addressee_id = auth.uid());
