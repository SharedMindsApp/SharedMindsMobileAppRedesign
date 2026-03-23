create table if not exists public.household_diet_profiles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  diet_type text[] not null default '{}'::text[],
  allergies text[] not null default '{}'::text[],
  avoid_list text[] not null default '{}'::text[],
  fasting_schedule jsonb not null default '{}'::jsonb,
  weekly_schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, profile_id)
);

create trigger household_diet_profiles_set_updated_at
before update on public.household_diet_profiles
for each row execute function public.set_updated_at();

create index if not exists household_diet_profiles_space_idx
on public.household_diet_profiles (space_id, profile_id);

create index if not exists household_diet_profiles_profile_idx
on public.household_diet_profiles (profile_id, space_id);

alter table public.household_diet_profiles enable row level security;

drop policy if exists "household_diet_profiles_select_if_space_member" on public.household_diet_profiles;
create policy "household_diet_profiles_select_if_space_member"
on public.household_diet_profiles
for select
using (public.is_space_member(space_id));

drop policy if exists "household_diet_profiles_insert_if_self_or_manager" on public.household_diet_profiles;
create policy "household_diet_profiles_insert_if_self_or_manager"
on public.household_diet_profiles
for insert
with check (
  public.is_space_member(space_id)
  and (
    profile_id = auth.uid()
    or public.can_manage_space(space_id)
  )
);

drop policy if exists "household_diet_profiles_update_if_self_or_manager" on public.household_diet_profiles;
create policy "household_diet_profiles_update_if_self_or_manager"
on public.household_diet_profiles
for update
using (
  public.is_space_member(space_id)
  and (
    profile_id = auth.uid()
    or public.can_manage_space(space_id)
  )
)
with check (
  public.is_space_member(space_id)
  and (
    profile_id = auth.uid()
    or public.can_manage_space(space_id)
  )
);

drop policy if exists "household_diet_profiles_delete_if_self_or_manager" on public.household_diet_profiles;
create policy "household_diet_profiles_delete_if_self_or_manager"
on public.household_diet_profiles
for delete
using (
  public.is_space_member(space_id)
  and (
    profile_id = auth.uid()
    or public.can_manage_space(space_id)
  )
);
