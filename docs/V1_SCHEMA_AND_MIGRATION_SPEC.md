# SharedMinds V1 Schema And Migration Spec

**Document Purpose**: Translate the V1 database blueprint into a practical implementation spec with:
- migration phases
- core SQL table definitions
- foreign keys
- indexes
- row-level security rules

**Companion Documents**:
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_FUTURE_EXPANSION_ARCHITECTURE_PLAN.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_FUTURE_EXPANSION_ARCHITECTURE_PLAN.md)
- [`/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_DATABASE_BLUEPRINT.md`](/Users/matthew/Documents/SharedMindsMobileApp-Redesign/docs/V1_DATABASE_BLUEPRINT.md)

**Scope**: V1 only. No tracks, widgets, MindMesh, roadmap hierarchy, or professional workflows.

---

## 1. Migration Strategy

Build the database in five migrations.

### Migration 001: Identity and ownership spine
Create:
- helper functions
- `profiles`
- `user_settings`
- `spaces`
- `space_members`
- `person_connections`

### Migration 002: Calendar spine
Create:
- `calendars`
- `calendar_sources`
- `calendar_events`
- `calendar_event_participants`

### Migration 003: Planning spine
Create:
- `projects`
- `project_members`
- `tasks`
- `daily_plans`

### Migration 004: Daily operating system spine
Create:
- `brain_state_entries`
- `responsibilities`
- `responsibility_completions`
- `activity_logs`
- `checkins`
- `checkin_messages`
- `journal_entries`
- `reports`

### Migration 005: Selective sharing
Create:
- `share_policies`

This order keeps the ownership and collaboration model stable before feature tables depend on it.

---

## 2. Conventions

### Required extensions

```sql
create extension if not exists pgcrypto;
```

### Timestamp trigger

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### RLS helper functions

These helper functions keep policies readable and reduce repeated logic.

```sql
create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

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

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  )
$$;
```

### Enum strategy
Use text columns with `check` constraints in V1.

Reason:
- faster iteration
- easier migration changes early on
- avoids enum churn when product vocabulary is still settling

---

## 3. Migration 001: Identity And Ownership Spine

### 3.1 `profiles`

```sql
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
```

Indexes:

```sql
create index profiles_display_name_idx on public.profiles(display_name);
```

RLS:

```sql
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
```

Optional later:
- add limited select policy for trusted people if profile cards need it

---

### 3.2 `user_settings`

```sql
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
```

RLS:

```sql
alter table public.user_settings enable row level security;

create policy "user_settings_all_self"
on public.user_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

### 3.3 `spaces`

```sql
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
```

Indexes:

```sql
create index spaces_created_by_idx on public.spaces(created_by);
create index spaces_type_idx on public.spaces(type);
```

RLS:

```sql
alter table public.spaces enable row level security;

create policy "spaces_select_if_member"
on public.spaces
for select
using (public.is_space_member(id));

create policy "spaces_insert_owner_only"
on public.spaces
for insert
with check (created_by = auth.uid());

create policy "spaces_update_manageable"
on public.spaces
for update
using (public.can_manage_space(id))
with check (public.can_manage_space(id));
```

Notes:
- application layer should auto-create a personal space on onboarding

---

### 3.4 `space_members`

```sql
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
```

Indexes:

```sql
create index space_members_user_idx on public.space_members(user_id);
create index space_members_space_status_idx on public.space_members(space_id, status);
```

RLS:

```sql
alter table public.space_members enable row level security;

create policy "space_members_select_if_same_space"
on public.space_members
for select
using (public.is_space_member(space_id));

create policy "space_members_insert_manageable_space"
on public.space_members
for insert
with check (public.can_manage_space(space_id));

create policy "space_members_update_manageable_space"
on public.space_members
for update
using (public.can_manage_space(space_id))
with check (public.can_manage_space(space_id));
```

---

### 3.5 `person_connections`

```sql
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
```

RLS:

```sql
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
```

---

## 4. Migration 002: Calendar Spine

### 4.1 `calendars`

```sql
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
```

Indexes:

```sql
create index calendars_space_idx on public.calendars(space_id);
create unique index calendars_default_per_space_idx
on public.calendars(space_id)
where is_default = true;
```

RLS:

```sql
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
```

---

### 4.2 `calendar_sources`

```sql
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
```

Indexes:

```sql
create index calendar_sources_calendar_idx on public.calendar_sources(calendar_id);
```

RLS:

```sql
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
```

---

### 4.3 `calendar_events`

```sql
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
```

Indexes:

```sql
create index calendar_events_calendar_time_idx
on public.calendar_events(calendar_id, start_at, end_at);

create index calendar_events_space_time_idx
on public.calendar_events(space_id, start_at, end_at);

create index calendar_events_source_idx
on public.calendar_events(source_type, source_ref_id);
```

RLS:

```sql
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
    and (
      created_by = auth.uid()
      or exists (
        select 1
        from public.share_policies sp
        where sp.resource_type = 'calendar_event'
          and sp.resource_id = calendar_events.id
          and sp.target_user_id = auth.uid()
      )
    )
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
```

Note:
- the `restricted` policy depends on `share_policies`, so this select rule should be added in migration 005 if migration ordering needs strict dependency safety

---

### 4.4 `calendar_event_participants`

```sql
create table public.calendar_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response_status text not null check (response_status in ('pending', 'accepted', 'declined', 'tentative')) default 'pending',
  role text not null default 'participant',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
```

Indexes:

```sql
create index calendar_event_participants_user_idx
on public.calendar_event_participants(user_id);
```

RLS:

```sql
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
```

---

## 5. Migration 003: Planning Spine

### 5.1 `projects`

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  status text not null check (status in ('active', 'paused', 'completed', 'archived')) default 'active',
  phase text,
  color text,
  icon text,
  is_private boolean not null default false,
  starts_on date,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();
```

Indexes:

```sql
create index projects_space_status_idx on public.projects(space_id, status);
create index projects_target_date_idx on public.projects(target_date);
create index projects_created_by_idx on public.projects(created_by);
```

RLS:

```sql
alter table public.projects enable row level security;

create policy "projects_select_visible"
on public.projects
for select
using (
  public.is_space_member(space_id)
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.share_policies sp
    where sp.resource_type = 'project'
      and sp.resource_id = id
      and sp.target_user_id = auth.uid()
  )
);

create policy "projects_insert_manageable_space"
on public.projects
for insert
with check (
  public.can_manage_space(space_id)
  and created_by = auth.uid()
);

create policy "projects_update_if_manageable"
on public.projects
for update
using (
  public.can_manage_space(space_id)
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'collaborator')
  )
)
with check (
  public.can_manage_space(space_id)
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'collaborator')
  )
);
```

---

### 5.2 `project_members`

```sql
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
```

Indexes:

```sql
create index project_members_user_idx on public.project_members(user_id);
```

RLS:

```sql
alter table public.project_members enable row level security;

create policy "project_members_select_if_project_visible"
on public.project_members
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (
        public.is_space_member(p.space_id)
        or exists (
          select 1
          from public.project_members pm2
          where pm2.project_id = p.id
            and pm2.user_id = auth.uid()
        )
      )
  )
);

create policy "project_members_manage_if_project_manageable"
on public.project_members
for all
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.can_manage_space(p.space_id)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and public.can_manage_space(p.space_id)
  )
);
```

---

### 5.3 `tasks`

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  notes text,
  status text not null check (status in ('inbox', 'active', 'done', 'dropped')) default 'inbox',
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  energy_level text not null check (energy_level in ('high', 'medium', 'low')) default 'medium',
  due_on date,
  scheduled_for date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();
```

Indexes:

```sql
create index tasks_space_status_idx on public.tasks(space_id, status);
create index tasks_project_status_idx on public.tasks(project_id, status);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_due_on_idx on public.tasks(due_on);
```

RLS:

```sql
alter table public.tasks enable row level security;

create policy "tasks_select_if_space_or_project_visible"
on public.tasks
for select
using (
  public.is_space_member(space_id)
  or (assigned_to = auth.uid())
  or (
    project_id is not null
    and exists (
      select 1
      from public.project_members pm
      where pm.project_id = project_id
        and pm.user_id = auth.uid()
    )
  )
);

create policy "tasks_insert_if_manageable"
on public.tasks
for insert
with check (
  public.can_manage_space(space_id)
  and created_by = auth.uid()
);

create policy "tasks_update_if_manageable"
on public.tasks
for update
using (
  public.can_manage_space(space_id)
  or assigned_to = auth.uid()
)
with check (
  public.can_manage_space(space_id)
  or assigned_to = auth.uid()
);
```

---

### 5.4 `daily_plans`

```sql
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  space_id uuid not null references public.spaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  intention text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create trigger daily_plans_set_updated_at
before update on public.daily_plans
for each row execute function public.set_updated_at();
```

Indexes:

```sql
create index daily_plans_space_date_idx on public.daily_plans(space_id, plan_date);
```

RLS:

```sql
alter table public.daily_plans enable row level security;

create policy "daily_plans_all_self"
on public.daily_plans
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

## 6. Migration 004: Daily Operating System Spine

### 6.1 `brain_state_entries`

```sql
create table public.brain_state_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  state text not null check (state in ('hyperfocus', 'energised', 'steady', 'distracted', 'low_battery', 'brain_fog')),
  entered_at timestamptz not null,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now()
);

create index brain_state_entries_user_time_idx
on public.brain_state_entries(user_id, entered_at desc);
```

RLS:

```sql
alter table public.brain_state_entries enable row level security;

create policy "brain_state_entries_select_self"
on public.brain_state_entries
for select
using (user_id = auth.uid());

create policy "brain_state_entries_insert_self"
on public.brain_state_entries
for insert
with check (user_id = auth.uid());
```

---

### 6.2 `responsibilities`

```sql
create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  type text not null check (type in ('recurring', 'one_off')),
  category text,
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  recurrence_rule jsonb,
  due_on date,
  scheduled_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger responsibilities_set_updated_at
before update on public.responsibilities
for each row execute function public.set_updated_at();
```

Indexes:

```sql
create index responsibilities_space_active_idx
on public.responsibilities(space_id, is_active);
```

RLS:

```sql
alter table public.responsibilities enable row level security;

create policy "responsibilities_select_if_space_member"
on public.responsibilities
for select
using (public.is_space_member(space_id));

create policy "responsibilities_manage_if_space_manageable"
on public.responsibilities
for all
using (public.can_manage_space(space_id))
with check (public.can_manage_space(space_id));
```

---

### 6.3 `responsibility_completions`

```sql
create table public.responsibility_completions (
  id uuid primary key default gen_random_uuid(),
  responsibility_id uuid not null references public.responsibilities(id) on delete cascade,
  completed_by uuid not null references public.profiles(id) on delete restrict,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  notes text,
  unique (responsibility_id, completed_on, completed_by)
);

create index responsibility_completions_completed_by_idx
on public.responsibility_completions(completed_by, completed_on desc);
```

RLS:

```sql
alter table public.responsibility_completions enable row level security;

create policy "responsibility_completions_select_if_responsibility_visible"
on public.responsibility_completions
for select
using (
  exists (
    select 1
    from public.responsibilities r
    where r.id = responsibility_id
      and public.is_space_member(r.space_id)
  )
);

create policy "responsibility_completions_insert_if_responsibility_visible"
on public.responsibility_completions
for insert
with check (
  completed_by = auth.uid()
  and exists (
    select 1
    from public.responsibilities r
    where r.id = responsibility_id
      and public.is_space_member(r.space_id)
  )
);
```

---

### 6.4 `activity_logs`

```sql
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  activity_date date not null,
  start_time time not null,
  end_time time,
  duration_mins integer,
  title text not null,
  category text,
  brain_state text,
  visibility text not null check (visibility in ('private', 'space', 'restricted')) default 'private',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger activity_logs_set_updated_at
before update on public.activity_logs
for each row execute function public.set_updated_at();
```

Indexes:

```sql
create index activity_logs_user_date_idx
on public.activity_logs(user_id, activity_date desc);

create index activity_logs_space_date_idx
on public.activity_logs(space_id, activity_date desc);
```

RLS:

```sql
alter table public.activity_logs enable row level security;

create policy "activity_logs_select_visible"
on public.activity_logs
for select
using (
  (visibility = 'private' and user_id = auth.uid())
  or (visibility = 'space' and public.is_space_member(space_id))
  or (
    visibility = 'restricted'
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.share_policies sp
        where sp.resource_type = 'activity_log'
          and sp.resource_id = id
          and sp.target_user_id = auth.uid()
      )
    )
  )
);

create policy "activity_logs_insert_self"
on public.activity_logs
for insert
with check (user_id = auth.uid());

create policy "activity_logs_update_self"
on public.activity_logs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

### 6.5 `checkins`

```sql
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  checkin_date date not null,
  checkin_type text not null check (checkin_type in ('morning', 'afternoon', 'evening')),
  brain_state text,
  prompt_text text not null,
  response_text text,
  audio_url text,
  status text not null check (status in ('generated', 'answered', 'skipped')) default 'generated',
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (user_id, checkin_date, checkin_type)
);

create index checkins_user_date_idx
on public.checkins(user_id, checkin_date desc);
```

RLS:

```sql
alter table public.checkins enable row level security;

create policy "checkins_all_self"
on public.checkins
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

### 6.6 `checkin_messages`

```sql
create table public.checkin_messages (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  author_type text not null check (author_type in ('user', 'assistant')),
  message_text text not null,
  created_at timestamptz not null default now()
);

create index checkin_messages_checkin_idx
on public.checkin_messages(checkin_id, created_at);
```

RLS:

```sql
alter table public.checkin_messages enable row level security;

create policy "checkin_messages_select_if_checkin_self"
on public.checkin_messages
for select
using (
  exists (
    select 1
    from public.checkins c
    where c.id = checkin_id
      and c.user_id = auth.uid()
  )
);

create policy "checkin_messages_insert_if_checkin_self"
on public.checkin_messages
for insert
with check (
  exists (
    select 1
    from public.checkins c
    where c.id = checkin_id
      and c.user_id = auth.uid()
  )
);
```

---

### 6.7 `journal_entries`

```sql
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  entry_date date not null,
  sleep_quality integer check (sleep_quality between 1 and 5),
  bed_time time,
  wake_time time,
  exercise_done boolean,
  exercise_type text,
  exercise_mins integer,
  water_litres numeric(4,1),
  day_rating integer check (day_rating between 1 and 5),
  wins text,
  struggles text,
  tomorrow_intention text,
  reflection text,
  visibility text not null check (visibility in ('private', 'space', 'restricted')) default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();
```

Indexes:

```sql
create index journal_entries_user_date_idx
on public.journal_entries(user_id, entry_date desc);
```

RLS:

```sql
alter table public.journal_entries enable row level security;

create policy "journal_entries_select_visible"
on public.journal_entries
for select
using (
  (visibility = 'private' and user_id = auth.uid())
  or (visibility = 'space' and public.is_space_member(space_id))
  or (
    visibility = 'restricted'
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.share_policies sp
        where sp.resource_type = 'journal_entry'
          and sp.resource_id = id
          and sp.target_user_id = auth.uid()
      )
    )
  )
);

create policy "journal_entries_insert_self"
on public.journal_entries
for insert
with check (user_id = auth.uid());

create policy "journal_entries_update_self"
on public.journal_entries
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

### 6.8 `reports`

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  report_date date not null,
  report_type text not null check (report_type in ('daily', 'weekly')),
  title text not null,
  summary text,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index reports_user_date_idx
on public.reports(user_id, report_date desc);
```

RLS:

```sql
alter table public.reports enable row level security;

create policy "reports_all_self"
on public.reports
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

---

## 7. Migration 005: Selective Sharing

### 7.1 `share_policies`

```sql
create table public.share_policies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  access_level text not null check (access_level in ('view', 'collaborate')),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  check (owner_user_id <> target_user_id)
);

create index share_policies_owner_idx
on public.share_policies(owner_user_id);

create index share_policies_target_idx
on public.share_policies(target_user_id);

create index share_policies_resource_idx
on public.share_policies(resource_type, resource_id);
```

RLS:

```sql
alter table public.share_policies enable row level security;

create policy "share_policies_select_participants"
on public.share_policies
for select
using (owner_user_id = auth.uid() or target_user_id = auth.uid());

create policy "share_policies_insert_owner"
on public.share_policies
for insert
with check (
  owner_user_id = auth.uid()
  and created_by = auth.uid()
  and exists (
    select 1
    from public.person_connections pc
    where (
      (pc.requester_id = owner_user_id and pc.addressee_id = target_user_id)
      or
      (pc.requester_id = target_user_id and pc.addressee_id = owner_user_id)
    )
    and pc.status = 'accepted'
  )
);

create policy "share_policies_delete_owner"
on public.share_policies
for delete
using (owner_user_id = auth.uid());
```

Notes:
- keep `resource_type` constrained in application code at first
- recommended V1 allowed values:
  - `project`
  - `calendar_event`
  - `activity_log`
  - `journal_entry`

---

## 8. RLS Summary

### Ownership rules
- self-owned records use `user_id = auth.uid()`
- shared records use `public.is_space_member(space_id)`
- collaborative edits use `public.can_manage_space(space_id)` or project membership
- selective visibility uses `share_policies`

### Principle
RLS should reflect the product story:
- personal by default
- shared when space-owned
- selectively visible when explicitly granted

That is simpler and more faithful than a generalized permission graph in V1.

---

## 9. Recommended First SQL Deliverables

Implement in this order:

1. Migration 001
2. Migration 002
3. Migration 003
4. Migration 004
5. Migration 005

Then add:
- onboarding trigger or application bootstrapping to create personal space
- default personal calendar creation
- initial shared space invite flow

---

## 10. Known Simplifications

These are deliberate V1 simplifications:
- no audit log tables yet
- no polymorphic permission inheritance engine
- no recurrence expansion table for responsibilities
- no advanced external calendar sync schema yet
- no roadmap hierarchy
- no widget/page schema

These can be added later without changing the ownership spine.

---

## 11. Final Implementation Rule

When building later feature modules, do not introduce:
- parallel project tables
- parallel calendar tables
- parallel personal/shared entity trees
- separate permission systems per module

Everything new should hang from:
- `profiles`
- `spaces`
- `space_members`
- `calendars`
- `calendar_events`
- `projects`
- `tasks`

That keeps the system extensible without becoming fragmented again.
