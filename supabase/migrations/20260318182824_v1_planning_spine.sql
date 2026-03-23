-- V1 Migration 003: Planning Spine

-- 1. `projects`
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

create index projects_space_status_idx on public.projects(space_id, status);
create index projects_target_date_idx on public.projects(target_date);
create index projects_created_by_idx on public.projects(created_by);


-- 2. `project_members`
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_user_idx on public.project_members(user_id);


-- 2.5 RLS helper functions
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


-- 2.6 `projects` RLS
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


-- 2.7 `project_members` RLS
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


-- 3. `tasks`
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

create index tasks_space_status_idx on public.tasks(space_id, status);
create index tasks_project_status_idx on public.tasks(project_id, status);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_due_on_idx on public.tasks(due_on);

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


-- 4. `daily_plans`
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

create index daily_plans_space_date_idx on public.daily_plans(space_id, plan_date);

alter table public.daily_plans enable row level security;

create policy "daily_plans_all_self"
on public.daily_plans
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
