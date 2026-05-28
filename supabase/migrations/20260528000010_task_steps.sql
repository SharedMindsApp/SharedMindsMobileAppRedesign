-- ── Task steps ─────────────────────────────────────────────────────────
--
-- A task can hold a small, ordered checklist of sub-steps. This is the ADHD
-- "break the boulder into pebbles" primitive: when a whole task is too heavy
-- to start, you tick off one small step instead — and a single step can be
-- promoted into its own first-class task when it grows up.
--
-- Steps belong to a task and inherit ALL of their visibility/permission from
-- it: if you can see/manage the parent task, you can see/manage its steps.
-- We express that with EXISTS sub-queries against `tasks` (keyed on the
-- indexed task_id), reusing the same helper functions the tasks policies use
-- (is_space_member / can_manage_task / is_project_member), so a shared
-- project's collaborators get steps for free with no extra wiring.

create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  done boolean not null default false,
  completed_at timestamptz,
  -- When a step is promoted into its own task, we link the two so the UI can
  -- show "→ became a task" and avoid double-promoting. ON DELETE SET NULL so
  -- deleting the promoted task doesn't cascade back to the step.
  promoted_task_id uuid references public.tasks(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_steps_task_id_idx on public.task_steps (task_id, sort_order);

-- Reuse the shared updated_at trigger function (defined in the identity spine).
drop trigger if exists task_steps_set_updated_at on public.task_steps;
create trigger task_steps_set_updated_at
  before update on public.task_steps
  for each row execute function public.set_updated_at();

alter table public.task_steps enable row level security;

-- SELECT — you can see a step if you can see its parent task.
drop policy if exists task_steps_select on public.task_steps;
create policy task_steps_select on public.task_steps
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id
        and (
          public.is_space_member(t.space_id)
          or t.assigned_to = auth.uid()
          or (t.project_id is not null and public.is_project_member(t.project_id))
        )
    )
  );

-- INSERT — you can add a step if you can manage the parent task, and you must
-- stamp yourself as the creator.
drop policy if exists task_steps_insert on public.task_steps;
create policy task_steps_insert on public.task_steps
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id
        and (
          public.can_manage_task(t.space_id, t.project_id)
          or t.assigned_to = auth.uid()
        )
    )
  );

-- UPDATE — same management check, both sides of the row change.
drop policy if exists task_steps_update on public.task_steps;
create policy task_steps_update on public.task_steps
  for update
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id
        and (
          public.can_manage_task(t.space_id, t.project_id)
          or t.assigned_to = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id
        and (
          public.can_manage_task(t.space_id, t.project_id)
          or t.assigned_to = auth.uid()
        )
    )
  );

-- DELETE — same management check.
drop policy if exists task_steps_delete on public.task_steps;
create policy task_steps_delete on public.task_steps
  for delete using (
    exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id
        and (
          public.can_manage_task(t.space_id, t.project_id)
          or t.assigned_to = auth.uid()
        )
    )
  );
