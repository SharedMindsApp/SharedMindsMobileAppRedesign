-- get_home_dashboard(uid uuid) → single-call RPC for the home page.
--
-- Before: the home dashboard fired 4 separate queries from the client and
-- did streak / best-week math client-side. Each query was its own
-- round-trip and the heaviest one (fetchProfileStats) shipped every
-- completed session row over the network. Bad for both latency and
-- perceived "all-at-once" feel.
--
-- Now: one RPC bundles everything home needs into a single JSON blob.
-- The Postgres server does the aggregation — no row payload back, just
-- the computed numbers + small projected arrays. Returns in ~30-80 ms
-- typically; client makes ONE call and renders the whole dashboard in
-- one paint when it resolves.
--
-- Sections still in scope (4 of them combined):
--   • Identity chips: totalSessions, finishedCount, completionRate,
--     currentStreak, connectionCount, hasAnySession (day-zero gate)
--   • Upcoming scheduled sessions (next 28 days, capped at 50)
--   • Recent ships (3 most recent with an outcome)
--   • Week session start_times (for the today/week grid)
--
-- Full profile-stats (best day, best week, longest streak, etc.) stays
-- in fetchProfileStats() and only loads on the Stats tab.

create or replace function public.get_home_dashboard(uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_sessions   int;
  v_finished_count   int;
  v_completion_rate  int;
  v_current_streak   int := 0;
  v_connection_count int;
  v_day_set          date[];
  v_d                date;
  v_idx              int;
  v_upcoming         jsonb;
  v_ships            jsonb;
  v_week_times       jsonb;
begin
  -- Counts + day set for streak math (one scan over completed sessions).
  select
    count(*)::int,
    count(*) filter (where session_outcome = 'finished')::int,
    coalesce(
      array_agg(distinct (coalesce(ended_at, end_time))::date)
        filter (where coalesce(ended_at, end_time) is not null),
      '{}'::date[]
    )
  into v_total_sessions, v_finished_count, v_day_set
  from public.focus_sessions
  where user_id = uid
    and status = 'completed';

  v_completion_rate := case
    when v_total_sessions > 0 then round(v_finished_count * 100.0 / v_total_sessions)::int
    else 0
  end;

  -- Current streak: walk back from today, stop on first gap.
  for v_idx in 0..365 loop
    v_d := current_date - v_idx;
    if v_d = any(v_day_set) then
      v_current_streak := v_current_streak + 1;
    elsif v_idx > 0 then
      exit;
    end if;
  end loop;

  -- Connection count.
  select count(*)::int into v_connection_count
  from public.connections
  where status = 'accepted'
    and (requester_id = uid or addressee_id = uid);

  -- Upcoming scheduled (next 28 days, capped at 50). Trimmed columns —
  -- home consumers don't need the full row.
  select coalesce(jsonb_agg(row_to_json(s) order by s.scheduled_at), '[]'::jsonb)
  into v_upcoming
  from (
    select
      fs.id, fs.user_id, fs.partner_user_id, fs.project_id,
      fs.session_title, fs.session_goal, fs.scheduled_at,
      fs.intended_duration_minutes, fs.session_mode,
      fs.session_purpose, fs.session_type, fs.status,
      fs.join_code, fs.recurring_template_id,
      fs.start_time, fs.target_end_time,
      jsonb_build_object(
        'display_name', p.display_name,
        'avatar_url',   p.avatar_url,
        'country_code', p.country_code,
        'work_type',    p.work_type
      ) as profiles,
      case
        when fs.project_id is not null then
          jsonb_build_object('id', pr.id, 'title', pr.title, 'color', pr.color)
        else null
      end as project
    from public.focus_sessions fs
    left join public.profiles p  on p.id  = fs.user_id
    left join public.projects pr on pr.id = fs.project_id
    where fs.status = 'scheduled'
      and fs.session_type = 'scheduled'
      and fs.scheduled_at <= now() + interval '28 days'
    order by fs.scheduled_at
    limit 50
  ) s;

  -- Recent ships (3 most recent completed with an outcome).
  select coalesce(jsonb_agg(row_to_json(s) order by coalesce(s.ended_at, s.end_time) desc), '[]'::jsonb)
  into v_ships
  from (
    select id, session_goal, session_title, session_outcome,
           intended_duration_minutes, ended_at, end_time
    from public.focus_sessions
    where user_id = uid
      and status = 'completed'
      and session_outcome is not null
    order by coalesce(ended_at, end_time) desc
    limit 3
  ) s;

  -- Week session start_times — last 7 days, used by the today/week grid.
  select coalesce(jsonb_agg(jsonb_build_object('start_time', start_time)), '[]'::jsonb)
  into v_week_times
  from public.focus_sessions
  where user_id = uid
    and start_time >= now() - interval '7 days';

  return jsonb_build_object(
    'totalSessions',     v_total_sessions,
    'finishedCount',     v_finished_count,
    'completionRate',    v_completion_rate,
    'currentStreak',     v_current_streak,
    'connectionCount',   v_connection_count,
    'hasAnySession',     v_total_sessions > 0,
    'upcomingScheduled', v_upcoming,
    'recentShips',       v_ships,
    'weekSessions',      v_week_times
  );
end;
$$;

grant execute on function public.get_home_dashboard(uuid) to authenticated;
