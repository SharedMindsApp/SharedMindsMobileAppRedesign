-- Weekly Reflections + Intentions
--
-- ADHD-friendly weekly planning ritual:
--   * Each week the user sets up to 3 intentions (max enforced in DB)
--   * After the week ends they tick each off, rate 1-5, and write one
--     overall reflection. Then set next week's intentions.
--   * Intentions can be linked to a project or stand alone
--
-- Self-only RLS — reflection content is always private to the user.
-- Reviews shared with another person happen via a scheduled session
-- (no schema change needed) where two users open their own reflections
-- side by side and talk through them.


-- ============================================================
-- 1. weekly_reflections — one row per (user, week_start)
-- ============================================================

create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Always a Monday (00:00 in user-perceived locale; we keep it as a date)
  week_start date not null,
  -- Overall reflection text. Null until the user writes one.
  reflection_text text,
  -- Optional 1-5 rating for the whole week as a quick proxy when the
  -- user doesn't want to write much.
  overall_rating smallint check (overall_rating between 1 and 5),
  -- 'planning' = intentions set, week not done yet
  -- 'reflecting' = week ended, in the middle of ticking + rating
  -- 'complete' = reflection written, ready to look back on
  status text not null default 'planning'
    check (status in ('planning', 'reflecting', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_reflections_user_week_idx
  on public.weekly_reflections(user_id, week_start desc);

drop trigger if exists weekly_reflections_set_updated_at on public.weekly_reflections;
create trigger weekly_reflections_set_updated_at
before update on public.weekly_reflections
for each row execute function public.set_updated_at();

alter table public.weekly_reflections enable row level security;

drop policy if exists "weekly_reflections_all_self" on public.weekly_reflections;
create policy "weekly_reflections_all_self"
on public.weekly_reflections for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 2. weekly_intentions — up to 3 per reflection
-- ============================================================

create table if not exists public.weekly_intentions (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.weekly_reflections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  project_id uuid references public.projects(id) on delete set null,
  sort_order smallint not null default 0 check (sort_order between 0 and 2),
  completed_at timestamptz,
  -- 1-5 rating, set during the reflection step
  rating smallint check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_intentions_reflection_idx
  on public.weekly_intentions(reflection_id, sort_order);
create index if not exists weekly_intentions_project_idx
  on public.weekly_intentions(project_id) where project_id is not null;

drop trigger if exists weekly_intentions_set_updated_at on public.weekly_intentions;
create trigger weekly_intentions_set_updated_at
before update on public.weekly_intentions
for each row execute function public.set_updated_at();

alter table public.weekly_intentions enable row level security;

drop policy if exists "weekly_intentions_all_self" on public.weekly_intentions;
create policy "weekly_intentions_all_self"
on public.weekly_intentions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ============================================================
-- 3. Max-3 intentions per reflection (ADHD-friendly cap)
-- ============================================================
-- A simple unique constraint won't work because we allow editing
-- (sort_order can shift). Enforce via a BEFORE INSERT trigger that
-- counts existing siblings.

create or replace function public.enforce_max_three_intentions()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.weekly_intentions
  where reflection_id = new.reflection_id;

  if v_count >= 3 then
    raise exception 'Max 3 intentions per week (ADHD-friendly cap)'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists weekly_intentions_max_three on public.weekly_intentions;
create trigger weekly_intentions_max_three
before insert on public.weekly_intentions
for each row execute function public.enforce_max_three_intentions();
