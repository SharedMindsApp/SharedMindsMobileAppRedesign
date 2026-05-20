-- Fix: materialize_recurring_sessions throws 22007 ("invalid input syntax
-- for type timestamp") and never inserts any rows.
--
-- Root cause: `v_target_date + (i * interval '7 days')` returns a *timestamp*
-- (not a date), so `::text` produces "2026-05-25 00:00:00". Concatenating
-- " " + time_local (e.g. "10:00") gives "2026-05-25 00:00:00 10:00", which
-- is not a valid timestamp literal — the RPC errors and rolls back.
--
-- Fix: cast back to date before stringifying. We also rebuild the timestamp
-- with `make_timestamp` for clarity — no string concatenation needed.

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
  v_hour int;
  v_minute int;
  i int;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if weeks_ahead is null or weeks_ahead < 1 then weeks_ahead := 1; end if;
  if weeks_ahead > 26 then weeks_ahead := 26; end if;

  for v_template in
    select * from public.recurring_session_templates where enabled
  loop
    -- "Now" in the template's tz, used to determine the next matching weekday
    v_now_local := (now() at time zone v_template.timezone);
    v_target_date := (v_now_local::date);

    -- Walk forward to the first matching day_of_week
    while extract(dow from v_target_date)::int <> v_template.day_of_week loop
      v_target_date := v_target_date + interval '1 day';
    end loop;

    -- Parse 'HH:MM' once per template
    v_hour   := split_part(v_template.time_local, ':', 1)::int;
    v_minute := split_part(v_template.time_local, ':', 2)::int;

    for i in 0..(weeks_ahead - 1) loop
      -- Compose a local timestamp from the date + parsed HH:MM, then interpret
      -- it in the template's timezone to produce a real timestamptz.
      -- (v_target_date + interval) returns a timestamp, so cast back to date
      -- before passing to make_timestamp.)
      v_scheduled_at := make_timestamp(
        extract(year  from (v_target_date + (i * interval '7 days'))::date)::int,
        extract(month from (v_target_date + (i * interval '7 days'))::date)::int,
        extract(day   from (v_target_date + (i * interval '7 days'))::date)::int,
        v_hour,
        v_minute,
        0
      ) at time zone v_template.timezone;

      v_target_end := v_scheduled_at + (v_template.duration_minutes || ' minutes')::interval;

      -- Skip if already in the past (5-minute tolerance)
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
