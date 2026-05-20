-- Intention microtasks — the ADHD "break it down" layer.
--
-- A weekly intention (e.g. "Post on social media this week") can hide a lot of
-- invisible work. This table lets users decompose intentions into bite-sized
-- steps so the real effort becomes visible BEFORE the week starts.
--
-- Each step carries an energy_level proxy:
--   'deep'   ≈ 1 full focus session  (~90 min)
--   'medium' ≈ ½ a session           (~50 min, batch 2 per session)
--   'quick'  ≈ ¼ of a session        (~25 min, batch 4 per session)
--
-- The frontend computes an estimated session count from the energy levels and
-- surfaces it as a "~N sessions" badge per intention. No time in minutes needed.

-- 1. Table
create table if not exists public.intention_microtasks (
  id           uuid        primary key default gen_random_uuid(),
  intention_id uuid        not null references public.weekly_intentions(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  title        text        not null check (char_length(title) >= 1 and char_length(title) <= 300),
  completed_at timestamptz,
  sort_order   smallint    not null default 0,
  energy_level text        not null default 'medium'
                           check (energy_level in ('deep', 'medium', 'quick')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists intention_microtasks_intention_idx
  on public.intention_microtasks(intention_id, sort_order);

create index if not exists intention_microtasks_user_idx
  on public.intention_microtasks(user_id, created_at desc);

-- Auto-update updated_at
create trigger intention_microtasks_set_updated_at
  before update on public.intention_microtasks
  for each row execute function public.set_updated_at();

-- 2. RLS — owner only
alter table public.intention_microtasks enable row level security;

drop policy if exists "intention_microtasks_select_own" on public.intention_microtasks;
create policy "intention_microtasks_select_own"
  on public.intention_microtasks for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "intention_microtasks_insert_own" on public.intention_microtasks;
create policy "intention_microtasks_insert_own"
  on public.intention_microtasks for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "intention_microtasks_update_own" on public.intention_microtasks;
create policy "intention_microtasks_update_own"
  on public.intention_microtasks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "intention_microtasks_delete_own" on public.intention_microtasks;
create policy "intention_microtasks_delete_own"
  on public.intention_microtasks for delete
  to authenticated
  using (user_id = auth.uid());
