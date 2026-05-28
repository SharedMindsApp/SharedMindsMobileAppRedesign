-- ── Session captures (the distraction "parking lot") ───────────────────
--
-- A frictionless place to drop distractions + unexpected things DURING a
-- focus session or quick timer, so they don't hijack the work. You park the
-- thought, stay on task, and triage afterward — at the debrief you convert
-- the keepers into tasks; the rest sit in a persistent parking-lot inbox
-- until you clear them.
--
--   text             — the parked note
--   resolved_at      — null while it's still in the lot; set when triaged
--   promoted_task_id — the task it became, if converted (else null)
--
-- Self-owned: a capture is private to the user who wrote it, even in a group
-- session. RLS is a plain user_id = auth.uid() check.

create table if not exists public.session_captures (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.focus_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  resolved_at timestamptz,
  promoted_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Inbox query: a user's still-open captures, newest first.
create index if not exists session_captures_open_idx
  on public.session_captures (user_id, created_at desc)
  where resolved_at is null;
-- Per-session lookup for the debrief.
create index if not exists session_captures_session_idx
  on public.session_captures (session_id);

alter table public.session_captures enable row level security;

drop policy if exists session_captures_select on public.session_captures;
create policy session_captures_select on public.session_captures
  for select using (user_id = auth.uid());

drop policy if exists session_captures_insert on public.session_captures;
create policy session_captures_insert on public.session_captures
  for insert with check (user_id = auth.uid());

drop policy if exists session_captures_update on public.session_captures;
create policy session_captures_update on public.session_captures
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists session_captures_delete on public.session_captures;
create policy session_captures_delete on public.session_captures
  for delete using (user_id = auth.uid());
