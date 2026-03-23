-- V1 Migration: restore meal planner core tables expected by the current client
--
-- Fixes:
-- - PGRST205 on public.meal_plans
-- - PGRST205 on public.meal_library
--
-- Notes:
-- - Uses the current V1 spaces model (spaces + space_members)
-- - Includes compatibility columns used by older meal-library code paths
-- - Keeps RLS aligned with is_space_member() / can_manage_space()

create extension if not exists pgcrypto;

-- ============================================================
-- Helper triggers
-- ============================================================

create or replace function public.sync_meal_library_compatibility_fields()
returns trigger
language plpgsql
as $$
begin
  if new.name is null or btrim(new.name) = '' then
    new.name := nullif(btrim(coalesce(new.title, '')), '');
  end if;

  if new.title is null or btrim(new.title) = '' then
    new.title := new.name;
  end if;

  if new.space_id is null and new.household_id is not null then
    new.space_id := new.household_id;
  end if;

  if new.space_id is not null then
    new.household_id := new.space_id;
  end if;

  if new.categories is null then
    new.categories := '{}'::text[];
  end if;

  if new.tags is null then
    new.tags := '{}'::text[];
  end if;

  if new.allergies is null then
    new.allergies := '{}'::text[];
  end if;

  if new.ingredients is null then
    new.ingredients := '[]'::jsonb;
  end if;

  if (new.category is null or btrim(new.category) = '')
     and coalesce(array_length(new.categories, 1), 0) > 0 then
    new.category := new.categories[1];
  end if;

  if coalesce(array_length(new.categories, 1), 0) = 0
     and new.category is not null
     and btrim(new.category) <> '' then
    new.categories := array[new.category];
  end if;

  if new.servings is null or new.servings < 1 then
    new.servings := 1;
  end if;

  if new.meal_type is null or btrim(new.meal_type) = '' then
    new.meal_type := 'dinner';
  end if;

  if new.difficulty is null or btrim(new.difficulty) = '' then
    new.difficulty := 'easy';
  end if;

  return new;
end;
$$;

create or replace function public.sync_meal_plan_compatibility_fields()
returns trigger
language plpgsql
as $$
begin
  new.household_id := new.space_id;

  if new.servings is null or new.servings < 1 then
    new.servings := 1;
  end if;

  if new.course_type is null or btrim(new.course_type) = '' then
    new.course_type := 'main';
  end if;

  if new.preparation_mode is null or btrim(new.preparation_mode) = '' then
    new.preparation_mode := 'scratch';
  end if;

  if new.is_prepared is null then
    new.is_prepared := false;
  end if;

  if new.meal_source is null or btrim(new.meal_source) = '' then
    if new.recipe_id is not null then
      new.meal_source := 'recipe';
    elsif new.meal_id is not null then
      new.meal_source := 'meal_library';
    elsif nullif(btrim(coalesce(new.external_name, '')), '') is not null then
      new.meal_source := 'external';
    elsif nullif(btrim(coalesce(new.custom_meal_name, '')), '') is not null then
      new.meal_source := 'custom';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- meal_library
-- ============================================================

create table if not exists public.meal_library (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  household_id uuid references public.spaces(id) on delete cascade,
  name text not null,
  title text,
  meal_type text not null default 'dinner',
  category text,
  categories text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  cuisine text,
  difficulty text not null default 'easy',
  prep_time integer,
  cook_time integer,
  servings integer not null default 1,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  allergies text[] not null default '{}'::text[],
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_library_meal_type_check
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  constraint meal_library_difficulty_check
    check (difficulty in ('easy', 'medium', 'hard')),
  constraint meal_library_servings_check
    check (servings >= 1)
);

drop trigger if exists meal_library_set_updated_at on public.meal_library;
create trigger meal_library_set_updated_at
before update on public.meal_library
for each row execute function public.set_updated_at();

drop trigger if exists meal_library_sync_compatibility_fields on public.meal_library;
create trigger meal_library_sync_compatibility_fields
before insert or update on public.meal_library
for each row execute function public.sync_meal_library_compatibility_fields();

create index if not exists meal_library_space_idx
on public.meal_library (space_id, meal_type, name);

create index if not exists meal_library_household_idx
on public.meal_library (household_id, created_at desc);

create index if not exists meal_library_name_idx
on public.meal_library (name);

create index if not exists meal_library_categories_gin_idx
on public.meal_library using gin (categories);

create index if not exists meal_library_tags_gin_idx
on public.meal_library using gin (tags);

alter table public.meal_library enable row level security;

drop policy if exists "meal_library_select" on public.meal_library;
create policy "meal_library_select"
on public.meal_library
for select
using (
  auth.uid() is not null
  and (
    coalesce(space_id, household_id) is null
    or public.is_space_member(coalesce(space_id, household_id))
    or created_by = auth.uid()
  )
);

drop policy if exists "meal_library_insert" on public.meal_library;
create policy "meal_library_insert"
on public.meal_library
for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and (
    coalesce(space_id, household_id) is null
    or public.can_manage_space(coalesce(space_id, household_id))
  )
);

drop policy if exists "meal_library_update" on public.meal_library;
create policy "meal_library_update"
on public.meal_library
for update
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.can_manage_space(coalesce(space_id, household_id))
  )
)
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.can_manage_space(coalesce(space_id, household_id))
  )
);

drop policy if exists "meal_library_delete" on public.meal_library;
create policy "meal_library_delete"
on public.meal_library
for delete
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.can_manage_space(coalesce(space_id, household_id))
  )
);

-- ============================================================
-- meal_plans
-- ============================================================

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  household_id uuid references public.spaces(id) on delete cascade,
  meal_id uuid references public.meal_library(id) on delete set null,
  recipe_id uuid,
  custom_meal_name text,
  meal_source text,
  external_name text,
  external_vendor text,
  external_type text,
  is_prepared boolean not null default false,
  scheduled_at timestamptz,
  servings integer not null default 1,
  course_type text not null default 'main',
  meal_type text not null,
  day_of_week integer not null,
  week_start_date date not null,
  notes text,
  pantry_item_id uuid references public.household_pantry_items(id) on delete set null,
  preparation_mode text not null default 'scratch',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plans_meal_type_check
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  constraint meal_plans_course_type_check
    check (course_type in ('starter', 'side', 'main', 'dessert', 'shared', 'snack')),
  constraint meal_plans_source_check
    check (meal_source is null or meal_source in ('recipe', 'meal_library', 'external', 'custom')),
  constraint meal_plans_external_type_check
    check (external_type is null or external_type in ('restaurant', 'shop', 'cafe', 'takeaway', 'other')),
  constraint meal_plans_preparation_mode_check
    check (preparation_mode in ('scratch', 'pre_bought')),
  constraint meal_plans_day_of_week_check
    check (day_of_week between 0 and 6),
  constraint meal_plans_servings_check
    check (servings >= 1 and servings <= 12),
  constraint meal_plans_one_source_check
    check (
      (
        case when meal_id is not null then 1 else 0 end +
        case when recipe_id is not null then 1 else 0 end +
        case when nullif(btrim(coalesce(custom_meal_name, '')), '') is not null then 1 else 0 end +
        case when nullif(btrim(coalesce(external_name, '')), '') is not null then 1 else 0 end
      ) = 1
    )
);

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row execute function public.set_updated_at();

drop trigger if exists meal_plans_sync_compatibility_fields on public.meal_plans;
create trigger meal_plans_sync_compatibility_fields
before insert or update on public.meal_plans
for each row execute function public.sync_meal_plan_compatibility_fields();

create unique index if not exists meal_plans_unique_slot_idx
on public.meal_plans (space_id, week_start_date, day_of_week, meal_type, course_type);

create index if not exists meal_plans_space_week_idx
on public.meal_plans (space_id, week_start_date, day_of_week);

create index if not exists meal_plans_created_by_idx
on public.meal_plans (created_by, created_at desc);

create index if not exists meal_plans_recipe_idx
on public.meal_plans (recipe_id)
where recipe_id is not null;

create index if not exists meal_plans_meal_idx
on public.meal_plans (meal_id)
where meal_id is not null;

alter table public.meal_plans enable row level security;

drop policy if exists "meal_plans_select" on public.meal_plans;
create policy "meal_plans_select"
on public.meal_plans
for select
using (
  auth.uid() is not null
  and public.is_space_member(space_id)
);

drop policy if exists "meal_plans_insert" on public.meal_plans;
create policy "meal_plans_insert"
on public.meal_plans
for insert
with check (
  auth.uid() is not null
  and public.can_manage_space(space_id)
  and created_by = auth.uid()
);

drop policy if exists "meal_plans_update" on public.meal_plans;
create policy "meal_plans_update"
on public.meal_plans
for update
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.can_manage_space(space_id)
  )
)
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.can_manage_space(space_id)
  )
);

drop policy if exists "meal_plans_delete" on public.meal_plans;
create policy "meal_plans_delete"
on public.meal_plans
for delete
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.can_manage_space(space_id)
  )
);

-- ============================================================
-- Compatibility support tables used by adjacent meal flows
-- ============================================================

create table if not exists public.meal_favourites (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meal_library(id) on delete cascade,
  recipe_id uuid,
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_favourites_target_check
    check (
      (
        case when meal_id is not null then 1 else 0 end +
        case when recipe_id is not null then 1 else 0 end
      ) = 1
    )
);

drop trigger if exists meal_favourites_set_updated_at on public.meal_favourites;
create trigger meal_favourites_set_updated_at
before update on public.meal_favourites
for each row execute function public.set_updated_at();

create unique index if not exists meal_favourites_user_meal_uidx
on public.meal_favourites (user_id, meal_id)
where meal_id is not null;

create unique index if not exists meal_favourites_user_recipe_uidx
on public.meal_favourites (user_id, recipe_id)
where recipe_id is not null;

create index if not exists meal_favourites_space_idx
on public.meal_favourites (space_id, created_at desc);

alter table public.meal_favourites enable row level security;

drop policy if exists "meal_favourites_select" on public.meal_favourites;
create policy "meal_favourites_select"
on public.meal_favourites
for select
using (
  auth.uid() is not null
  and public.is_space_member(space_id)
);

drop policy if exists "meal_favourites_insert" on public.meal_favourites;
create policy "meal_favourites_insert"
on public.meal_favourites
for insert
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and public.is_space_member(space_id)
);

drop policy if exists "meal_favourites_update" on public.meal_favourites;
create policy "meal_favourites_update"
on public.meal_favourites
for update
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.can_manage_space(space_id)
  )
)
with check (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.can_manage_space(space_id)
  )
);

drop policy if exists "meal_favourites_delete" on public.meal_favourites;
create policy "meal_favourites_delete"
on public.meal_favourites
for delete
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.can_manage_space(space_id)
  )
);

create table if not exists public.meal_votes (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meal_library(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_votes_rating_check check (rating between 1 and 5),
  unique (meal_id, profile_id)
);

drop trigger if exists meal_votes_set_updated_at on public.meal_votes;
create trigger meal_votes_set_updated_at
before update on public.meal_votes
for each row execute function public.set_updated_at();

alter table public.meal_votes enable row level security;

drop policy if exists "meal_votes_select" on public.meal_votes;
create policy "meal_votes_select"
on public.meal_votes
for select
using (auth.uid() is not null);

drop policy if exists "meal_votes_insert" on public.meal_votes;
create policy "meal_votes_insert"
on public.meal_votes
for insert
with check (
  auth.uid() is not null
  and profile_id = auth.uid()
);

drop policy if exists "meal_votes_update" on public.meal_votes;
create policy "meal_votes_update"
on public.meal_votes
for update
using (
  auth.uid() is not null
  and profile_id = auth.uid()
)
with check (
  auth.uid() is not null
  and profile_id = auth.uid()
);

drop policy if exists "meal_votes_delete" on public.meal_votes;
create policy "meal_votes_delete"
on public.meal_votes
for delete
using (
  auth.uid() is not null
  and profile_id = auth.uid()
);

-- ============================================================
-- Optional compatibility FKs for projects that already have recipes
-- ============================================================

do $$
begin
  if to_regclass('public.recipes') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'meal_plans_recipe_id_fkey'
         and conrelid = 'public.meal_plans'::regclass
     ) then
    alter table public.meal_plans
      add constraint meal_plans_recipe_id_fkey
      foreign key (recipe_id) references public.recipes(id) on delete set null;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.recipes') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'meal_favourites_recipe_id_fkey'
         and conrelid = 'public.meal_favourites'::regclass
     ) then
    alter table public.meal_favourites
      add constraint meal_favourites_recipe_id_fkey
      foreign key (recipe_id) references public.recipes(id) on delete cascade;
  end if;
end;
$$;
