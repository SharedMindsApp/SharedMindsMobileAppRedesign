-- daily_time_blocks — time-blocking layer for the home page planner.
--
-- A "block" is a named slot in a user's day: "Deep work 09:00 (90 min)",
-- "Admin pile 14:00 (25 min)", etc. This is the backing store for the
-- TodayPlannerCard and WeekPlannerCard on the home page.
--
-- block_type is an energy/context proxy (same philosophy as microtask energy):
--   'deep'     — full focus, ~90 min
--   'focus'    — moderate focus, ~50 min
--   'admin'    — routine admin, ~25 min
--   'break'    — intentional rest
--   'personal' — non-work

create table if not exists public.daily_time_blocks (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  block_date    date        not null,
  start_time    time        not null,                 -- e.g. '09:00', '14:30'
  duration_mins smallint    not null default 60
                            check (duration_mins >= 15 and duration_mins <= 480),
  title         text        not null
                            check (char_length(title) >= 1 and char_length(title) <= 200),
  block_type    text        not null default 'focus'
                            check (block_type in ('focus', 'deep', 'admin', 'break', 'personal')),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index if not exists daily_time_blocks_user_date_idx
  on public.daily_time_blocks(user_id, block_date, start_time);

-- Auto-update updated_at
create trigger daily_time_blocks_set_updated_at
  before update on public.daily_time_blocks
  for each row execute function public.set_updated_at();

-- RLS — owner only
alter table public.daily_time_blocks enable row level security;

drop policy if exists "daily_time_blocks_select_own" on public.daily_time_blocks;
create policy "daily_time_blocks_select_own"
  on public.daily_time_blocks for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "daily_time_blocks_insert_own" on public.daily_time_blocks;
create policy "daily_time_blocks_insert_own"
  on public.daily_time_blocks for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "daily_time_blocks_update_own" on public.daily_time_blocks;
create policy "daily_time_blocks_update_own"
  on public.daily_time_blocks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "daily_time_blocks_delete_own" on public.daily_time_blocks;
create policy "daily_time_blocks_delete_own"
  on public.daily_time_blocks for delete
  to authenticated
  using (user_id = auth.uid());
