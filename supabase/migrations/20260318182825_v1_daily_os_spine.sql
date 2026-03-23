-- V1 Migration 004: Daily Operating System Spine

-- 1. `brain_state_entries`
create table public.brain_state_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  state text not null check (state in ('hyperfocus', 'energised', 'steady', 'distracted', 'low_battery', 'brain_fog')),
  entered_at timestamptz not null,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now()
);

create index brain_state_entries_user_time_idx
on public.brain_state_entries(user_id, entered_at desc);

alter table public.brain_state_entries enable row level security;

create policy "brain_state_entries_select_self"
on public.brain_state_entries
for select
using (user_id = auth.uid());

create policy "brain_state_entries_insert_self"
on public.brain_state_entries
for insert
with check (user_id = auth.uid());


-- 2. `responsibilities`
create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  type text not null check (type in ('recurring', 'one_off')),
  category text,
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  recurrence_rule jsonb,
  due_on date,
  scheduled_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger responsibilities_set_updated_at
before update on public.responsibilities
for each row execute function public.set_updated_at();

create index responsibilities_space_active_idx
on public.responsibilities(space_id, is_active);

alter table public.responsibilities enable row level security;

create policy "responsibilities_select_if_space_member"
on public.responsibilities
for select
using (public.is_space_member(space_id));

create policy "responsibilities_manage_if_space_manageable"
on public.responsibilities
for all
using (public.can_manage_space(space_id))
with check (public.can_manage_space(space_id));


-- 3. `responsibility_completions`
create table public.responsibility_completions (
  id uuid primary key default gen_random_uuid(),
  responsibility_id uuid not null references public.responsibilities(id) on delete cascade,
  completed_by uuid not null references public.profiles(id) on delete restrict,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  notes text,
  unique (responsibility_id, completed_on, completed_by)
);

create index responsibility_completions_completed_by_idx
on public.responsibility_completions(completed_by, completed_on desc);

alter table public.responsibility_completions enable row level security;

create policy "responsibility_completions_select_if_responsibility_visible"
on public.responsibility_completions
for select
using (
  exists (
    select 1
    from public.responsibilities r
    where r.id = responsibility_id
      and public.is_space_member(r.space_id)
  )
);

create policy "responsibility_completions_insert_if_responsibility_visible"
on public.responsibility_completions
for insert
with check (
  completed_by = auth.uid()
  and exists (
    select 1
    from public.responsibilities r
    where r.id = responsibility_id
      and public.is_space_member(r.space_id)
  )
);


-- 4. `activity_logs`
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  activity_date date not null,
  start_time time not null,
  end_time time,
  duration_mins integer,
  title text not null,
  category text,
  brain_state text,
  visibility text not null check (visibility in ('private', 'space', 'restricted')) default 'private',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger activity_logs_set_updated_at
before update on public.activity_logs
for row execute function public.set_updated_at();

create index activity_logs_user_date_idx
on public.activity_logs(user_id, activity_date desc);

create index activity_logs_space_date_idx
on public.activity_logs(space_id, activity_date desc);

alter table public.activity_logs enable row level security;

create policy "activity_logs_select_visible"
on public.activity_logs
for select
using (
  (visibility = 'private' and user_id = auth.uid())
  or (visibility = 'space' and public.is_space_member(space_id))
  or (
    visibility = 'restricted'
    and user_id = auth.uid()
  )
);

create policy "activity_logs_insert_self"
on public.activity_logs
for insert
with check (user_id = auth.uid());

create policy "activity_logs_update_self"
on public.activity_logs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- 5. `checkins`
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  checkin_date date not null,
  checkin_type text not null check (checkin_type in ('morning', 'afternoon', 'evening')),
  brain_state text,
  prompt_text text not null,
  response_text text,
  audio_url text,
  status text not null check (status in ('generated', 'answered', 'skipped')) default 'generated',
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (user_id, checkin_date, checkin_type)
);

create index checkins_user_date_idx
on public.checkins(user_id, checkin_date desc);

alter table public.checkins enable row level security;

create policy "checkins_all_self"
on public.checkins
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- 6. `checkin_messages`
create table public.checkin_messages (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  author_type text not null check (author_type in ('user', 'assistant')),
  message_text text not null,
  created_at timestamptz not null default now()
);

create index checkin_messages_checkin_idx
on public.checkin_messages(checkin_id, created_at);

alter table public.checkin_messages enable row level security;

create policy "checkin_messages_select_if_checkin_self"
on public.checkin_messages
for select
using (
  exists (
    select 1
    from public.checkins c
    where c.id = checkin_id
      and c.user_id = auth.uid()
  )
);

create policy "checkin_messages_insert_if_checkin_self"
on public.checkin_messages
for insert
with check (
  exists (
    select 1
    from public.checkins c
    where c.id = checkin_id
      and c.user_id = auth.uid()
  )
);


-- 7. `journal_entries`
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  entry_date date not null,
  sleep_quality integer check (sleep_quality between 1 and 5),
  bed_time time,
  wake_time time,
  exercise_done boolean,
  exercise_type text,
  exercise_mins integer,
  water_litres numeric(4,1),
  day_rating integer check (day_rating between 1 and 5),
  wins text,
  struggles text,
  tomorrow_intention text,
  reflection text,
  visibility text not null check (visibility in ('private', 'space', 'restricted')) default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

create index journal_entries_user_date_idx
on public.journal_entries(user_id, entry_date desc);

alter table public.journal_entries enable row level security;

create policy "journal_entries_select_visible"
on public.journal_entries
for select
using (
  (visibility = 'private' and user_id = auth.uid())
  or (visibility = 'space' and public.is_space_member(space_id))
  or (
    visibility = 'restricted'
    and user_id = auth.uid()
  )
);

create policy "journal_entries_insert_self"
on public.journal_entries
for insert
with check (user_id = auth.uid());

create policy "journal_entries_update_self"
on public.journal_entries
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- 8. `reports`
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  report_date date not null,
  report_type text not null check (report_type in ('daily', 'weekly')),
  title text not null,
  summary text,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index reports_user_date_idx
on public.reports(user_id, report_date desc);

alter table public.reports enable row level security;

create policy "reports_all_self"
on public.reports
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
