-- Recurring session templates
--
-- Admin schedules recurring group sessions (e.g. "Sunday Reset · weekly ·
-- 18:00 Europe/London · 50min · group"). A bulk RPC materializes the next
-- N weeks into focus_sessions, idempotent on (template_id, scheduled_at).
--
-- Use case: small founding network needs predictable rhythms. The admin
-- creates the cadence; users see them in the regular calendar + upcoming
-- strip on the home page.


-- ============================================================
-- 1. focus_sessions: track origin + purpose
-- ============================================================
-- session_purpose tags admin-curated sessions so the UI can show "weekly
-- review" or "community" badges without coupling to a session title.
-- recurring_template_id ties a materialized session back to its template
-- (used for idempotency + cascading deletes if a template is removed).

alter table public.focus_sessions
  add column if not exists session_purpose text
    check (session_purpose in ('weekly_review', 'community', 'workshop'));

alter table public.focus_sessions
  add column if not exists recurring_template_id uuid;

-- Lookups for the home page strip + admin dashboard
create index if not exists focus_sessions_purpose_idx
  on public.focus_sessions(session_purpose)
  where session_purpose is not null;


-- ============================================================
-- 2. recurring_session_templates
-- ============================================================

create table if not exists public.recurring_session_templates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  -- 0 = Sunday, 1 = Monday … 6 = Saturday (matches JS Date.getDay)
  day_of_week smallint not null check (day_of_week between 0 and 6),
  -- 'HH:MM' 24-hour, local to `timezone`
  time_local text not null check (time_local ~ '^[0-2][0-9]:[0-5][0-9]$'),
  timezone text not null default 'Europe/London',
  duration_minutes smallint not null check (duration_minutes in (25, 50, 90)),
  session_mode text not null default 'group'
    check (session_mode in ('group', 'one_on_one', 'solo')),
  session_purpose text check (session_purpose in ('weekly_review', 'community', 'workshop')),
  quiet_mode boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_session_templates_enabled_idx
  on public.recurring_session_templates(enabled, day_of_week);

drop trigger if exists recurring_session_templates_set_updated_at on public.recurring_session_templates;
create trigger recurring_session_templates_set_updated_at
before update on public.recurring_session_templates
for each row execute function public.set_updated_at();

alter table public.recurring_session_templates enable row level security;

-- Admin-only manage
drop policy if exists "recurring_templates_admin_manage" on public.recurring_session_templates;
create policy "recurring_templates_admin_manage"
on public.recurring_session_templates for all
using (public.is_admin())
with check (public.is_admin());

-- All authenticated users may read enabled templates (used for "we run a
-- weekly reset at 6pm" disclosure on the home page / about copy)
drop policy if exists "recurring_templates_read_enabled" on public.recurring_session_templates;
create policy "recurring_templates_read_enabled"
on public.recurring_session_templates for select
to authenticated
using (enabled);


-- ============================================================
-- 3. FK on the lookup column we added in step 1
-- ============================================================
-- Done here so the templates table exists first.

alter table public.focus_sessions
  drop constraint if exists focus_sessions_recurring_template_id_fkey;

alter table public.focus_sessions
  add constraint focus_sessions_recurring_template_id_fkey
  foreign key (recurring_template_id)
  references public.recurring_session_templates(id)
  on delete set null;

-- Idempotency key for the materializer — same template + scheduled_at means
-- "already inserted." Allows the admin to re-run materialize without dupes.
create unique index if not exists focus_sessions_template_scheduled_unique
  on public.focus_sessions(recurring_template_id, scheduled_at)
  where recurring_template_id is not null;


-- ============================================================
-- 4. RPC: materialize_recurring_sessions(weeks_ahead)
-- ============================================================
-- Admin clicks "Materialize next 4 weeks" → this RPC walks every enabled
-- template, computes the next `weeks_ahead` occurrence dates in the
-- template's timezone, and inserts focus_sessions rows. ON CONFLICT DO
-- NOTHING (via the unique index above) keeps it idempotent.
--
-- Returns the count of newly-inserted sessions so the UI can toast a
-- "Scheduled 12 sessions" confirmation.

create or replace function public.materialize_recurring_sessions(weeks_ahead int default 4)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
  v_now_local timestamptz;
  v_target_date date;
  v_scheduled_at timestamptz;
  v_target_end timestamptz;
  v_inserted int := 0;
  v_admin_user uuid := auth.uid();
  v_join_code text;
  i int;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  -- Clamp weeks_ahead to a sane range
  if weeks_ahead is null or weeks_ahead < 1 then weeks_ahead := 1; end if;
  if weeks_ahead > 26 then weeks_ahead := 26; end if;

  for v_template in
    select * from public.recurring_session_templates where enabled
  loop
    -- Build occurrences in the template's timezone. We compute the next
    -- occurrence date by walking forward day-by-day from "today in tz"
    -- until we hit the template's day_of_week. Then we step weekly.
    v_now_local := (now() at time zone v_template.timezone);
    v_target_date := (v_now_local::date);

    -- Walk forward to the first matching day_of_week.
    -- Postgres extract(dow ...) returns 0=Sun..6=Sat, matching our schema.
    while extract(dow from v_target_date)::int <> v_template.day_of_week loop
      v_target_date := v_target_date + interval '1 day';
    end loop;

    for i in 0..(weeks_ahead - 1) loop
      -- Combine date + local time + tz to get a real timestamptz
      v_scheduled_at := ((v_target_date + (i * interval '7 days'))::text || ' ' || v_template.time_local)::timestamp
                       at time zone v_template.timezone;
      v_target_end := v_scheduled_at + (v_template.duration_minutes || ' minutes')::interval;

      -- Skip if already in the past (within 5 min tolerance)
      if v_scheduled_at < now() - interval '5 minutes' then
        continue;
      end if;

      -- Random join code
      v_join_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

      insert into public.focus_sessions (
        user_id, status, session_type, session_title, session_goal,
        scheduled_at, start_time, target_end_time,
        intended_duration_minutes, join_code,
        session_mode, quiet_mode, session_purpose, recurring_template_id,
        drift_count, distraction_count
      )
      values (
        v_admin_user, 'scheduled', 'scheduled', v_template.title, v_template.description,
        v_scheduled_at, v_scheduled_at, v_target_end,
        v_template.duration_minutes, v_join_code,
        v_template.session_mode, v_template.quiet_mode, v_template.session_purpose, v_template.id,
        0, 0
      )
      on conflict (recurring_template_id, scheduled_at) where recurring_template_id is not null
      do nothing;

      if FOUND then
        v_inserted := v_inserted + 1;
      end if;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.materialize_recurring_sessions(int) from public;
grant execute on function public.materialize_recurring_sessions(int) to authenticated;
