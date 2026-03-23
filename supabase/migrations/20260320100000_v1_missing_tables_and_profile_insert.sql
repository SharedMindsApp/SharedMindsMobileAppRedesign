-- V1 Migration 006: Missing tables + profile auto-provisioning
-- Fixes: profiles INSERT policy, user_ui_preferences, neurotype_profiles,
--         user_active_projects, regulation_state, regulation_events,
--         and auto-provisioning trigger for new signups.

-- ============================================================
-- 1. PROFILES: Add INSERT policy so the app can auto-provision
-- ============================================================
create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = auth.uid());


-- ============================================================
-- 2. AUTO-PROVISION: Trigger that fires when a new auth user
--    is created. Inserts a profile row + personal space + membership.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_space_id uuid;
begin
  -- Create the profile
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1),
      'Explorer'
    )
  )
  on conflict (id) do nothing;

  -- Create personal space
  insert into public.spaces (type, name, created_by)
  values ('personal', 'Personal Space', new.id)
  returning id into new_space_id;

  -- Create space membership
  insert into public.space_members (space_id, user_id, role, status)
  values (new_space_id, new.id, 'owner', 'active');

  return new;
exception
  when others then
    -- Log but don't block signup if provisioning fails
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Attach to auth.users (fires after insert = after signup)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ============================================================
-- 3. NEUROTYPE_PROFILES: Pre-defined ADHD neurotype templates
-- ============================================================
create table if not exists public.neurotype_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  description text,
  neurotype text not null,
  is_active boolean not null default true,
  default_layout text not null default 'focus',
  default_density text not null default 'comfortable',
  default_theme jsonb not null default '{
    "fontScale": 1.0,
    "colorTheme": "calm-blue",
    "contrastLevel": "normal"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger neurotype_profiles_set_updated_at
before update on public.neurotype_profiles
for each row execute function public.set_updated_at();

alter table public.neurotype_profiles enable row level security;

-- Neurotype profiles are read-only for everyone (admin-seeded)
create policy "neurotype_profiles_select_all"
on public.neurotype_profiles
for select
using (true);

-- Seed default neurotype profiles
insert into public.neurotype_profiles (display_name, description, neurotype, default_layout, default_density, default_theme)
values
  ('ADHD — Focus Mode', 'Minimal distractions, one task at a time, large text', 'adhd', 'focus', 'spacious', '{"fontScale": 1.1, "colorTheme": "calm-blue", "contrastLevel": "normal"}'::jsonb),
  ('ADHD — Energised Mode', 'Rich dashboard, multiple streams, compact view', 'adhd', 'dashboard', 'compact', '{"fontScale": 1.0, "colorTheme": "warm-amber", "contrastLevel": "normal"}'::jsonb),
  ('Neurotypical — Default', 'Balanced layout with standard density', 'neurotypical', 'balanced', 'comfortable', '{"fontScale": 1.0, "colorTheme": "calm-blue", "contrastLevel": "normal"}'::jsonb)
on conflict do nothing;


-- ============================================================
-- 4. USER_UI_PREFERENCES: Per-user UI configuration
-- ============================================================
create table if not exists public.user_ui_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  neurotype_profile_id uuid references public.neurotype_profiles(id) on delete set null,
  layout_mode text not null default 'balanced',
  ui_density text not null default 'comfortable',
  font_scale numeric(3,2) not null default 1.0,
  color_theme text not null default 'calm-blue',
  contrast_level text not null default 'normal',
  reduced_motion boolean not null default false,
  app_theme text not null default 'light',
  measurement_system text not null default 'metric',
  recipe_location text,
  recipe_location_override text,
  include_location_in_ai boolean not null default true,
  favourite_nav_tabs jsonb,
  custom_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_ui_preferences_set_updated_at
before update on public.user_ui_preferences
for each row execute function public.set_updated_at();

alter table public.user_ui_preferences enable row level security;

create policy "user_ui_preferences_all_self"
on public.user_ui_preferences
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 5. USER_ACTIVE_PROJECTS: Tracks which project is "focused"
-- ============================================================
create table if not exists public.user_active_projects (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  active_project_id uuid references public.projects(id) on delete set null,
  selected_at timestamptz not null default now()
);

alter table public.user_active_projects enable row level security;

create policy "user_active_projects_all_self"
on public.user_active_projects
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 6. REGULATION_STATE: Trust score / guardrail levels per user
-- ============================================================
create table if not exists public.regulation_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  master_project_id uuid references public.projects(id) on delete set null,
  current_level integer not null default 1,
  trust_score numeric(5,2) not null default 75.0,
  drift_events_last_7d integer not null default 0,
  focus_interruptions_last_7d integer not null default 0,
  missed_deadlines_last_7d integer not null default 0,
  offshoot_creation_rate_7d integer not null default 0,
  side_project_switches_7d integer not null default 0,
  tasks_completed_7d integer not null default 0,
  focus_sessions_completed_7d integer not null default 0,
  last_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger regulation_state_set_updated_at
before update on public.regulation_state
for each row execute function public.set_updated_at();

create unique index regulation_state_user_project_idx
on public.regulation_state (user_id, coalesce(master_project_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.regulation_state enable row level security;

create policy "regulation_state_all_self"
on public.regulation_state
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 7. REGULATION_EVENTS: Audit log of trust-impacting events
-- ============================================================
create table if not exists public.regulation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  master_project_id uuid references public.projects(id) on delete set null,
  event_type text not null,
  severity integer not null default 1,
  impact_on_trust numeric(5,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index regulation_events_user_time_idx
on public.regulation_events (user_id, created_at desc);

create index regulation_events_user_project_idx
on public.regulation_events (user_id, master_project_id);

alter table public.regulation_events enable row level security;

create policy "regulation_events_all_self"
on public.regulation_events
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 8. BACKFILL: For any existing auth users who don't have a
--    profile yet, create one now.
-- ============================================================
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    split_part(u.email::text, '@', 1),
    'Explorer'
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Also create personal spaces for any existing profiles without one
insert into public.spaces (type, name, created_by)
select 'personal', 'Personal Space', p.id
from public.profiles p
where not exists (
  select 1 from public.spaces s
  where s.created_by = p.id and s.type = 'personal'
);

-- And create memberships for any spaces missing their owner membership
insert into public.space_members (space_id, user_id, role, status)
select s.id, s.created_by, 'owner', 'active'
from public.spaces s
where s.type = 'personal'
  and not exists (
    select 1 from public.space_members sm
    where sm.space_id = s.id and sm.user_id = s.created_by
  );
