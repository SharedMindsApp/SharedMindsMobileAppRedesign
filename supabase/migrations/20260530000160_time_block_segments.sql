-- time_block_segments — multiple sessions within one time block.
--
-- A block can hold an ordered queue of sessions of different modes: e.g. a
-- 3-hour block = Group (1h) → Solo (1h) → Match-me-now (1h). This migration
-- adds the model + composer support; the auto-advancing runner (launch one,
-- advance to the next when it ends) is a later slice — session_id is here ready
-- for it.

create table if not exists public.time_block_segments (
  id            uuid primary key default gen_random_uuid(),
  block_id      uuid not null references public.daily_time_blocks(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  sort_order    int  not null default 0,
  mode          text not null check (mode in ('group', 'solo', 'match')),
  duration_mins smallint not null default 50 check (duration_mins between 15 and 180),
  status        text not null default 'planned' check (status in ('planned', 'active', 'done', 'skipped')),
  session_id    uuid,                     -- set by the runner when launched (future slice)
  created_at    timestamptz not null default now()
);

create index if not exists time_block_segments_block_idx on public.time_block_segments (block_id, sort_order);

alter table public.time_block_segments enable row level security;

drop policy if exists "tbs own" on public.time_block_segments;
create policy "tbs own" on public.time_block_segments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
