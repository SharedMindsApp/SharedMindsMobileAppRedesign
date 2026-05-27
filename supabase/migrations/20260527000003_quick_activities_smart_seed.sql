-- Smarter activity seeding.
--
-- The previous seed (20260527000002) did "top-5 per work_type, global
-- cap of 10 by sort_order." That gave fair coverage across roles but
-- ignored three signals the profile actually exposes:
--
--   1. ORDER of work_types — the first selected is the user's primary
--      identity. They should see more of those activities.
--   2. MULTI-TAG affinity — an activity tagged with several of the
--      user's roles ("Customer interview" → marketer + researcher +
--      founder) is more relevant than one tagged with just one. The
--      old algorithm scored both equally.
--   3. Universal demotion — "Inbox zero" at sort_order 10 was beating
--      every role-specific activity in the top-10 cap. Universal
--      should fill remaining slots, not crowd out role specifics.
--
-- New algorithm: weighted score per template, then take top 10.
--
--   weight(work_type, position) =
--     position == 0 → 3.0    -- primary
--     position == 1 → 2.0    -- secondary
--     position >= 2 → 1.0    -- additional
--     'all'        → 0.4    -- universal contribution
--
--   score(template) =
--     sum of weight(wt, pos) for each user work_type wt matched
--     + 0.5 * (matched_count - 1)   -- multi-tag bonus
--     - 0.01 * sort_order            -- tie-break preference
--
-- Then ORDER BY score DESC, sort_order ASC, label ASC LIMIT 10.
--
-- For users with 0 work_types we fall through to pure 'all' top-10
-- which is the day-zero experience.

create or replace function public.seed_user_activities(p_per_work_type integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_work_types text[];
  v_inserted   integer := 0;
  v_total_cap  integer := 10;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- p_per_work_type is no longer used by the scoring algorithm but
  -- kept in the signature so existing client calls don't break.
  perform p_per_work_type;

  select coalesce(work_types, '{}')
  into v_work_types
  from public.profiles
  where id = v_uid;

  if v_work_types is null then
    v_work_types := '{}';
  end if;

  -- Build a (work_type, weight) lookup table from the user's selected
  -- roles in their ordered position, plus an 'all' bucket at low
  -- weight for universal activities.
  with weighted_types as (
    select wt, weight from (
      select
        coalesce(v_work_types[1], '__none__') as wt,
        3.0::numeric as weight
      where v_work_types[1] is not null
      union all
      select v_work_types[2], 2.0 where v_work_types[2] is not null
      union all
      -- All remaining work_types get weight 1.0
      select unnest(v_work_types[3:array_upper(v_work_types,1)]), 1.0
      where array_upper(v_work_types, 1) >= 3
      union all
      select 'all', 0.4
    ) src
  ),
  -- Score every active template by summing weights for matched
  -- work_types, plus a multi-tag bonus, minus a small sort_order
  -- tiebreak so similarly-scored items still respect curated order.
  scored as (
    select
      t.id,
      t.label,
      t.emoji,
      t.default_minutes,
      t.sort_order,
      sum(wt.weight) + 0.5 * greatest(0, count(*) - 1) - 0.01 * t.sort_order as score
    from public.activity_templates t
    join weighted_types wt on t.work_types && array[wt.wt]
    where t.is_active = true
    group by t.id, t.label, t.emoji, t.default_minutes, t.sort_order
  ),
  -- Take top N globally by score, then sort_order, then label.
  picks as (
    select id, label, emoji, default_minutes, sort_order
    from scored
    order by score desc, sort_order asc, label asc
    limit v_total_cap
  )
  insert into public.user_activities
    (user_id, template_id, label, emoji, default_minutes, sort_order)
  select v_uid, p.id, p.label, p.emoji, p.default_minutes, p.sort_order
  from picks p
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.seed_user_activities(integer) to authenticated;

-- Notes for future work:
--   • Skills are also on profiles.skills (text[]) but activity
--     templates aren't tagged by skill. If we later add a skills[]
--     column to activity_templates this same algorithm extends
--     naturally — just another weighted_types union with a skill
--     weight (say 0.7 — meaningful but below secondary role).
--   • Once users accumulate session history, we could re-rank
--     by sessions_count to surface their actual habits. That'd be
--     a separate "personalise activities" RPC users opt into rather
--     than a seed change.
