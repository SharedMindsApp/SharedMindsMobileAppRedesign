-- time_block_tasks — attach existing tasks to a time block.
--
-- Lets the user micromanage what a block contains: pull specific tasks into the
-- block they've carved out. Many-to-many (a task could sit in more than one
-- block over a day), owner-scoped.

create table if not exists public.time_block_tasks (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references public.daily_time_blocks(id) on delete cascade,
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (block_id, task_id)
);

create index if not exists time_block_tasks_block_idx on public.time_block_tasks (block_id);
create index if not exists time_block_tasks_user_idx  on public.time_block_tasks (user_id);

alter table public.time_block_tasks enable row level security;

drop policy if exists "tbt own" on public.time_block_tasks;
create policy "tbt own" on public.time_block_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
