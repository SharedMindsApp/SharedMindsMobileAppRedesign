-- V1 Migration 010: Pantry inventory schema + access controls
--
-- Goal:
-- - Add explicit pantry/internal access flags to profiles so the owner account
--   can unlock pantry features in Supabase without widening the public MVP.
-- - Create the pantry/grocery tables the current client code already expects.
-- - Scope pantry data to spaces so personal and shared spaces can both use the
--   same inventory model under RLS.

create extension if not exists pg_trgm;

-- ============================================================
-- 1. PROFILE ACCESS FLAGS
-- ============================================================

alter table public.profiles
  add column if not exists pantry_access_enabled boolean not null default false;

alter table public.profiles
  add column if not exists internal_role text not null default 'standard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_internal_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_internal_role_check
      check (internal_role in ('standard', 'pantry', 'internal', 'developer'));
  end if;
end;
$$;

create or replace function public.current_internal_role()
returns text
language sql
stable
as $$
  select coalesce(
    (
      select p.internal_role
      from public.profiles p
      where p.id = auth.uid()
    ),
    'standard'
  )
$$;

create or replace function public.has_pantry_access()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.pantry_access_enabled, false)
        or coalesce(p.testing_mode_enabled, false)
        or p.role = 'admin'
        or p.internal_role in ('pantry', 'internal', 'developer')
      )
  )
$$;

-- Compatibility helper for legacy household-scoped code.
-- In V1 pantry storage is scoped to spaces.id, including personal spaces.
create or replace function public.is_user_household_member(hid uuid)
returns boolean
language sql
stable
as $$
  select public.is_space_member(hid)
$$;

create or replace function public.get_current_member_id(hid uuid)
returns uuid
language sql
stable
as $$
  select sm.id
  from public.space_members sm
  where sm.space_id = hid
    and sm.user_id = auth.uid()
    and sm.status = 'active'
  limit 1
$$;

create or replace function public.can_access_pantry_space(p_space_id uuid)
returns boolean
language sql
stable
as $$
  select public.has_pantry_access()
     and public.is_space_member(p_space_id)
$$;

create or replace function public.can_write_pantry_space(p_space_id uuid)
returns boolean
language sql
stable
as $$
  select public.has_pantry_access()
     and public.can_manage_space(p_space_id)
$$;

-- Legacy compatibility surface for code paths that still expect household_members.
create or replace view public.household_members
with (security_invoker = true)
as
select
  sm.id,
  sm.space_id as household_id,
  sm.user_id as auth_user_id,
  coalesce(p.full_name, p.display_name) as name,
  case when sm.role = 'owner' then 'owner' else 'member' end as role,
  sm.status,
  sm.created_at,
  sm.updated_at
from public.space_members sm
join public.spaces s on s.id = sm.space_id
left join public.profiles p on p.id = sm.user_id
where s.type = 'shared';

-- ============================================================
-- 2. FOOD CATALOG
-- ============================================================

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  category text,
  emoji text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create trigger food_items_set_updated_at
before update on public.food_items
for each row execute function public.set_updated_at();

create index if not exists food_items_name_trgm_idx
on public.food_items using gin (name gin_trgm_ops);

create index if not exists food_items_normalized_name_idx
on public.food_items (normalized_name);

alter table public.food_items enable row level security;

drop policy if exists "food_items_select_authenticated" on public.food_items;
create policy "food_items_select_authenticated"
on public.food_items
for select
using (auth.uid() is not null);

drop policy if exists "food_items_insert_authenticated" on public.food_items;
create policy "food_items_insert_authenticated"
on public.food_items
for insert
with check (auth.uid() is not null);

drop policy if exists "food_items_update_authenticated" on public.food_items;
create policy "food_items_update_authenticated"
on public.food_items
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

create or replace function public.search_food_items(search_query text, limit_count integer default 20)
returns table (
  id uuid,
  name text,
  normalized_name text,
  category text,
  emoji text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    fi.id,
    fi.name,
    fi.normalized_name,
    fi.category,
    fi.emoji,
    fi.created_at,
    fi.updated_at
  from public.food_items fi
  where fi.name ilike '%' || trim(search_query) || '%'
     or fi.normalized_name ilike '%' || trim(lower(search_query)) || '%'
  order by
    similarity(fi.name, trim(search_query)) desc,
    fi.name asc
  limit greatest(coalesce(limit_count, 20), 1)
$$;

create or replace function public.auto_categorize_grocery_item(item_name_input text)
returns text
language sql
immutable
as $$
  select case
    when item_name_input is null or btrim(item_name_input) = '' then 'other'
    when lower(item_name_input) ~ '(milk|cheese|butter|yogurt|egg)' then 'dairy'
    when lower(item_name_input) ~ '(apple|banana|orange|berry|fruit|avocado)' then 'produce'
    when lower(item_name_input) ~ '(carrot|onion|tomato|pepper|potato|lettuce|veg)' then 'produce'
    when lower(item_name_input) ~ '(chicken|beef|pork|fish|salmon|tuna|meat)' then 'protein'
    when lower(item_name_input) ~ '(rice|pasta|flour|oat|lentil|bean|tin|canned)' then 'pantry'
    when lower(item_name_input) ~ '(tea|coffee|juice|water|drink)' then 'beverages'
    when lower(item_name_input) ~ '(biscuit|cracker|snack|chocolate|bar)' then 'snacks'
    else 'other'
  end
$$;

-- ============================================================
-- 3. PANTRY LOCATIONS
-- ============================================================

create table if not exists public.pantry_locations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  household_id uuid references public.spaces(id) on delete cascade,
  name text not null,
  icon text,
  order_index integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pantry_locations_set_updated_at
before update on public.pantry_locations
for each row execute function public.set_updated_at();

create index if not exists pantry_locations_space_idx
on public.pantry_locations (space_id, order_index, name);

create unique index if not exists pantry_locations_space_name_uidx
on public.pantry_locations (space_id, lower(name));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pantry_locations_owner_xor_check'
      and conrelid = 'public.pantry_locations'::regclass
  ) then
    alter table public.pantry_locations
      add constraint pantry_locations_owner_xor_check
      check (
        (profile_id is not null and household_id is null)
        or
        (profile_id is null and household_id is not null)
      );
  end if;
end;
$$;

alter table public.pantry_locations enable row level security;

drop policy if exists "pantry_locations_select_if_space_access" on public.pantry_locations;
create policy "pantry_locations_select_if_space_access"
on public.pantry_locations
for select
using (public.can_access_pantry_space(space_id));

drop policy if exists "pantry_locations_insert_if_space_write" on public.pantry_locations;
create policy "pantry_locations_insert_if_space_write"
on public.pantry_locations
for insert
with check (
  public.can_write_pantry_space(space_id)
  and (
    (profile_id = auth.uid() and household_id is null)
    or
    (profile_id is null and household_id = space_id)
  )
);

drop policy if exists "pantry_locations_update_if_space_write" on public.pantry_locations;
create policy "pantry_locations_update_if_space_write"
on public.pantry_locations
for update
using (public.can_write_pantry_space(space_id))
with check (
  public.can_write_pantry_space(space_id)
  and (
    (profile_id = auth.uid() and household_id is null)
    or
    (profile_id is null and household_id = space_id)
  )
);

drop policy if exists "pantry_locations_delete_if_space_write" on public.pantry_locations;
create policy "pantry_locations_delete_if_space_write"
on public.pantry_locations
for delete
using (public.can_write_pantry_space(space_id));

-- ============================================================
-- 4. PANTRY ITEMS
-- ============================================================

create table if not exists public.household_pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.spaces(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete restrict,
  item_name text,
  category text not null default 'other',
  quantity text,
  unit text,
  quantity_value text,
  quantity_unit text,
  expiration_date date,
  expires_on date,
  location text,
  location_id uuid references public.pantry_locations(id) on delete set null,
  status text,
  notes text,
  added_by uuid references public.profiles(id) on delete set null,
  total_portions integer,
  remaining_portions integer,
  portion_unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger household_pantry_items_set_updated_at
before update on public.household_pantry_items
for each row execute function public.set_updated_at();

create index if not exists household_pantry_items_household_idx
on public.household_pantry_items (household_id, expires_on, created_at desc);

create index if not exists household_pantry_items_food_idx
on public.household_pantry_items (food_item_id);

create index if not exists household_pantry_items_location_idx
on public.household_pantry_items (location_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_pantry_items_status_check'
      and conrelid = 'public.household_pantry_items'::regclass
  ) then
    alter table public.household_pantry_items
      add constraint household_pantry_items_status_check
      check (status in ('have', 'low', 'out') or status is null);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_pantry_items_total_portions_check'
      and conrelid = 'public.household_pantry_items'::regclass
  ) then
    alter table public.household_pantry_items
      add constraint household_pantry_items_total_portions_check
      check (total_portions is null or total_portions >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_pantry_items_remaining_portions_check'
      and conrelid = 'public.household_pantry_items'::regclass
  ) then
    alter table public.household_pantry_items
      add constraint household_pantry_items_remaining_portions_check
      check (remaining_portions is null or remaining_portions >= 0);
  end if;
end;
$$;

create or replace function public.sync_pantry_portion_counts()
returns trigger
language plpgsql
as $$
begin
  if new.total_portions is null then
    new.remaining_portions := null;
  elsif new.remaining_portions is null or tg_op = 'INSERT' then
    new.remaining_portions := new.total_portions;
  elsif new.remaining_portions > new.total_portions then
    new.remaining_portions := new.total_portions;
  end if;

  return new;
end;
$$;

drop trigger if exists household_pantry_items_sync_portions on public.household_pantry_items;
create trigger household_pantry_items_sync_portions
before insert or update on public.household_pantry_items
for each row execute function public.sync_pantry_portion_counts();

create or replace function public.validate_pantry_item_location()
returns trigger
language plpgsql
as $$
declare
  location_space_id uuid;
begin
  if new.location_id is null then
    return new;
  end if;

  select pl.space_id
  into location_space_id
  from public.pantry_locations pl
  where pl.id = new.location_id;

  if location_space_id is null then
    raise exception 'Pantry location % does not exist', new.location_id;
  end if;

  if location_space_id <> new.household_id then
    raise exception 'Pantry location % does not belong to space %', new.location_id, new.household_id;
  end if;

  return new;
end;
$$;

drop trigger if exists household_pantry_items_validate_location on public.household_pantry_items;
create trigger household_pantry_items_validate_location
before insert or update on public.household_pantry_items
for each row execute function public.validate_pantry_item_location();

alter table public.household_pantry_items enable row level security;

drop policy if exists "household_pantry_items_select_if_space_access" on public.household_pantry_items;
create policy "household_pantry_items_select_if_space_access"
on public.household_pantry_items
for select
using (public.can_access_pantry_space(household_id));

drop policy if exists "household_pantry_items_insert_if_space_write" on public.household_pantry_items;
create policy "household_pantry_items_insert_if_space_write"
on public.household_pantry_items
for insert
with check (
  public.can_write_pantry_space(household_id)
  and (added_by = auth.uid() or added_by is null)
);

drop policy if exists "household_pantry_items_update_if_space_write" on public.household_pantry_items;
create policy "household_pantry_items_update_if_space_write"
on public.household_pantry_items
for update
using (public.can_write_pantry_space(household_id))
with check (
  public.can_write_pantry_space(household_id)
  and (added_by = auth.uid() or added_by is null or auth.uid() is not null)
);

drop policy if exists "household_pantry_items_delete_if_space_write" on public.household_pantry_items;
create policy "household_pantry_items_delete_if_space_write"
on public.household_pantry_items
for delete
using (public.can_write_pantry_space(household_id));

-- ============================================================
-- 5. SHOPPING LISTS / GROCERY ITEMS
-- ============================================================

create table if not exists public.household_shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.spaces(id) on delete cascade,
  list_name text not null,
  list_type text not null default 'regular',
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger household_shopping_lists_set_updated_at
before update on public.household_shopping_lists
for each row execute function public.set_updated_at();

create unique index if not exists household_shopping_lists_default_uidx
on public.household_shopping_lists (household_id)
where is_default = true;

alter table public.household_shopping_lists enable row level security;

drop policy if exists "household_shopping_lists_select_if_space_access" on public.household_shopping_lists;
create policy "household_shopping_lists_select_if_space_access"
on public.household_shopping_lists
for select
using (public.can_access_pantry_space(household_id));

drop policy if exists "household_shopping_lists_insert_if_space_write" on public.household_shopping_lists;
create policy "household_shopping_lists_insert_if_space_write"
on public.household_shopping_lists
for insert
with check (
  public.can_write_pantry_space(household_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "household_shopping_lists_update_if_space_write" on public.household_shopping_lists;
create policy "household_shopping_lists_update_if_space_write"
on public.household_shopping_lists
for update
using (public.can_write_pantry_space(household_id))
with check (public.can_write_pantry_space(household_id));

drop policy if exists "household_shopping_lists_delete_if_space_write" on public.household_shopping_lists;
create policy "household_shopping_lists_delete_if_space_write"
on public.household_shopping_lists
for delete
using (public.can_write_pantry_space(household_id));

create table if not exists public.household_grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.spaces(id) on delete cascade,
  shopping_list_id uuid references public.household_shopping_lists(id) on delete set null,
  food_item_id uuid not null references public.food_items(id) on delete restrict,
  item_name text,
  quantity text,
  unit text,
  category text not null default 'other',
  auto_categorized boolean not null default false,
  checked boolean not null default false,
  is_recurring boolean not null default false,
  recurrence_days integer,
  last_purchased_date timestamptz,
  estimated_price numeric(10,2),
  notes text,
  source text,
  meal_plan_id uuid,
  added_by uuid references public.profiles(id) on delete set null,
  added_by_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger household_grocery_list_items_set_updated_at
before update on public.household_grocery_list_items
for each row execute function public.set_updated_at();

create index if not exists household_grocery_list_items_household_idx
on public.household_grocery_list_items (household_id, checked, sort_order, created_at desc);

create index if not exists household_grocery_list_items_list_idx
on public.household_grocery_list_items (shopping_list_id);

alter table public.household_grocery_list_items enable row level security;

drop policy if exists "household_grocery_list_items_select_if_space_access" on public.household_grocery_list_items;
create policy "household_grocery_list_items_select_if_space_access"
on public.household_grocery_list_items
for select
using (public.can_access_pantry_space(household_id));

drop policy if exists "household_grocery_list_items_insert_if_space_write" on public.household_grocery_list_items;
create policy "household_grocery_list_items_insert_if_space_write"
on public.household_grocery_list_items
for insert
with check (
  public.can_write_pantry_space(household_id)
  and (added_by = auth.uid() or added_by is null)
);

drop policy if exists "household_grocery_list_items_update_if_space_write" on public.household_grocery_list_items;
create policy "household_grocery_list_items_update_if_space_write"
on public.household_grocery_list_items
for update
using (public.can_write_pantry_space(household_id))
with check (public.can_write_pantry_space(household_id));

drop policy if exists "household_grocery_list_items_delete_if_space_write" on public.household_grocery_list_items;
create policy "household_grocery_list_items_delete_if_space_write"
on public.household_grocery_list_items
for delete
using (public.can_write_pantry_space(household_id));

create table if not exists public.household_grocery_purchase_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.spaces(id) on delete cascade,
  item_name text not null,
  category text not null default 'other',
  quantity text,
  price numeric(10,2),
  purchased_date timestamptz not null default now(),
  purchased_by uuid references public.profiles(id) on delete set null,
  store_name text,
  created_at timestamptz not null default now()
);

create index if not exists household_grocery_purchase_history_household_idx
on public.household_grocery_purchase_history (household_id, purchased_date desc);

alter table public.household_grocery_purchase_history enable row level security;

drop policy if exists "household_grocery_purchase_history_select_if_space_access" on public.household_grocery_purchase_history;
create policy "household_grocery_purchase_history_select_if_space_access"
on public.household_grocery_purchase_history
for select
using (public.can_access_pantry_space(household_id));

drop policy if exists "household_grocery_purchase_history_insert_if_space_write" on public.household_grocery_purchase_history;
create policy "household_grocery_purchase_history_insert_if_space_write"
on public.household_grocery_purchase_history
for insert
with check (
  public.can_write_pantry_space(household_id)
  and (purchased_by = auth.uid() or purchased_by is null)
);

create table if not exists public.household_grocery_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.spaces(id) on delete cascade,
  item_name text not null,
  category text not null default 'other',
  typical_quantity text,
  keywords text[] not null default '{}'::text[],
  purchase_frequency_days integer,
  is_system_template boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger household_grocery_templates_set_updated_at
before update on public.household_grocery_templates
for each row execute function public.set_updated_at();

create index if not exists household_grocery_templates_household_idx
on public.household_grocery_templates (household_id, is_system_template, item_name);

alter table public.household_grocery_templates enable row level security;

drop policy if exists "household_grocery_templates_select_if_access" on public.household_grocery_templates;
create policy "household_grocery_templates_select_if_access"
on public.household_grocery_templates
for select
using (
  is_system_template = true
  or (
    household_id is not null
    and public.can_access_pantry_space(household_id)
  )
);

drop policy if exists "household_grocery_templates_insert_if_space_write" on public.household_grocery_templates;
create policy "household_grocery_templates_insert_if_space_write"
on public.household_grocery_templates
for insert
with check (
  is_system_template = false
  and household_id is not null
  and public.can_write_pantry_space(household_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "household_grocery_templates_update_if_space_write" on public.household_grocery_templates;
create policy "household_grocery_templates_update_if_space_write"
on public.household_grocery_templates
for update
using (
  is_system_template = false
  and household_id is not null
  and public.can_write_pantry_space(household_id)
)
with check (
  is_system_template = false
  and household_id is not null
  and public.can_write_pantry_space(household_id)
);

drop policy if exists "household_grocery_templates_delete_if_space_write" on public.household_grocery_templates;
create policy "household_grocery_templates_delete_if_space_write"
on public.household_grocery_templates
for delete
using (
  is_system_template = false
  and household_id is not null
  and public.can_write_pantry_space(household_id)
);

-- ============================================================
-- 6. PORTION TRACKING
-- ============================================================

create table if not exists public.pantry_portion_usage (
  id uuid primary key default gen_random_uuid(),
  pantry_item_id uuid not null references public.household_pantry_items(id) on delete cascade,
  meal_plan_id uuid not null,
  portions_used integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pantry_item_id, meal_plan_id)
);

create trigger pantry_portion_usage_set_updated_at
before update on public.pantry_portion_usage
for each row execute function public.set_updated_at();

create index if not exists pantry_portion_usage_meal_plan_idx
on public.pantry_portion_usage (meal_plan_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pantry_portion_usage_portions_used_check'
      and conrelid = 'public.pantry_portion_usage'::regclass
  ) then
    alter table public.pantry_portion_usage
      add constraint pantry_portion_usage_portions_used_check
      check (portions_used > 0);
  end if;
end;
$$;

alter table public.pantry_portion_usage enable row level security;

drop policy if exists "pantry_portion_usage_select_if_parent_access" on public.pantry_portion_usage;
create policy "pantry_portion_usage_select_if_parent_access"
on public.pantry_portion_usage
for select
using (
  exists (
    select 1
    from public.household_pantry_items hpi
    where hpi.id = pantry_item_id
      and public.can_access_pantry_space(hpi.household_id)
  )
);

drop policy if exists "pantry_portion_usage_insert_if_parent_write" on public.pantry_portion_usage;
create policy "pantry_portion_usage_insert_if_parent_write"
on public.pantry_portion_usage
for insert
with check (
  exists (
    select 1
    from public.household_pantry_items hpi
    where hpi.id = pantry_item_id
      and public.can_write_pantry_space(hpi.household_id)
  )
);

drop policy if exists "pantry_portion_usage_update_if_parent_write" on public.pantry_portion_usage;
create policy "pantry_portion_usage_update_if_parent_write"
on public.pantry_portion_usage
for update
using (
  exists (
    select 1
    from public.household_pantry_items hpi
    where hpi.id = pantry_item_id
      and public.can_write_pantry_space(hpi.household_id)
  )
)
with check (
  exists (
    select 1
    from public.household_pantry_items hpi
    where hpi.id = pantry_item_id
      and public.can_write_pantry_space(hpi.household_id)
  )
);

drop policy if exists "pantry_portion_usage_delete_if_parent_write" on public.pantry_portion_usage;
create policy "pantry_portion_usage_delete_if_parent_write"
on public.pantry_portion_usage
for delete
using (
  exists (
    select 1
    from public.household_pantry_items hpi
    where hpi.id = pantry_item_id
      and public.can_write_pantry_space(hpi.household_id)
  )
);

-- ============================================================
-- 7. RECENT FOOD LOOKUPS
-- ============================================================

create or replace function public.get_recently_used_food_items(
  household_id_input uuid,
  limit_count integer default 10
)
returns table (
  id uuid,
  name text,
  normalized_name text,
  category text,
  emoji text,
  created_at timestamptz,
  updated_at timestamptz,
  last_used timestamptz
)
language sql
stable
as $$
  with recent_usage as (
    select
      x.food_item_id,
      max(x.used_at) as last_used
    from (
      select
        hpi.food_item_id,
        greatest(hpi.updated_at, hpi.created_at) as used_at
      from public.household_pantry_items hpi
      where hpi.household_id = household_id_input

      union all

      select
        hg.food_item_id,
        greatest(
          coalesce(hg.last_purchased_date, hg.updated_at),
          hg.created_at
        ) as used_at
      from public.household_grocery_list_items hg
      where hg.household_id = household_id_input
    ) x
    group by x.food_item_id
  )
  select
    fi.id,
    fi.name,
    fi.normalized_name,
    fi.category,
    fi.emoji,
    fi.created_at,
    fi.updated_at,
    ru.last_used
  from recent_usage ru
  join public.food_items fi on fi.id = ru.food_item_id
  order by ru.last_used desc, fi.name asc
  limit greatest(coalesce(limit_count, 10), 1)
$$;
