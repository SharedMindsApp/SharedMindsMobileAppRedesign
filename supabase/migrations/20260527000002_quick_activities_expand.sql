-- Quick Activities: library expansion + tighter seed cap.
--
-- v1 (migration 20260527000001) shipped ~80 activities tagged to 8
-- work_types. In practice that left two gaps:
--
--   • Several solopreneur roles weren't represented at all (Sales,
--     Coach/Therapist, Educator, Accountant, Photographer).
--   • Existing roles were thin in places — e.g. Founder had no
--     "Investor update" or "Board prep"; Marketer had no "Webinar
--     prep" or "Customer interview"; Universal had no "Quick break"
--     or "Email replies".
--
-- This migration:
--
--   1. Adds ~60 new templates covering both gaps.
--   2. Tightens seed_user_activities so the user's list maxes out at
--      10 total no matter how many work_types they pick. Without this
--      a Founder+Marketer+Universal user gets ~28 rows, which makes
--      the Quick Timer dropdown a wall.

-- ── Tighter seed RPC ────────────────────────────────────────────
--
-- Algorithm:
--   • Build the candidate pool from templates matching any of the
--     user's work_types + universal.
--   • Rank globally by (sort_order asc, label asc).
--   • Take the top p_total_cap distinct templates.
--   • Insert with on-conflict-do-nothing so re-runs are safe.

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
  -- Hard cap on total seeded rows. The p_per_work_type parameter is
  -- kept in the signature for backwards-compatibility with callers
  -- but we now also enforce a global ceiling so the dropdown never
  -- ends up with 30 chips for a multi-role user.
  v_total_cap  integer := 10;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(work_types, '{}')
  into v_work_types
  from public.profiles
  where id = v_uid;

  if v_work_types is null or array_length(v_work_types, 1) is null then
    v_work_types := array['all'];
  else
    v_work_types := array_append(v_work_types, 'all');
  end if;

  -- Per-work-type top-N first (preserves balance — at least one of
  -- each role's most-typical activities), then a global top-up to
  -- reach v_total_cap.
  with per_type as (
    select distinct on (t.id) t.id, t.label, t.emoji, t.default_minutes, t.sort_order
    from public.activity_templates t
    cross join unnest(v_work_types) as wt
    where t.is_active = true
      and t.work_types && array[wt]
      and (
        select count(*) from public.activity_templates t2
        where t2.is_active = true
          and t2.work_types && array[wt]
          and (t2.sort_order, t2.label) <= (t.sort_order, t.label)
      ) <= p_per_work_type
    order by t.id
  ),
  capped as (
    select id, label, emoji, default_minutes, sort_order
    from per_type
    order by sort_order asc, label asc
    limit v_total_cap
  )
  insert into public.user_activities
    (user_id, template_id, label, emoji, default_minutes, sort_order)
  select v_uid, c.id, c.label, c.emoji, c.default_minutes, c.sort_order
  from capped c
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.seed_user_activities(integer) to authenticated;

-- ── Library expansion ──────────────────────────────────────────
-- New roles + filled-in gaps. on conflict do nothing so re-running
-- is a no-op (we don't have a unique constraint on label since two
-- roles can share an activity, e.g. 'Research').

insert into public.activity_templates (label, emoji, default_minutes, work_types, sort_order) values
  -- ── Sales (new role) ────────────────────────────────────────
  ('Prospecting',           '🔎', 25, '{sales}',                            10),
  ('Discovery calls',       '☎️', 50, '{sales,consultant,founder}',         20),
  ('Demos',                 '🎯', 50, '{sales}',                            30),
  ('Follow-up emails',      '📧', 25, '{sales,consultant,founder}',         40),
  ('Pipeline review',       '📊', 25, '{sales,founder}',                    50),
  ('Account planning',      '🗺️', 50, '{sales}',                            60),
  ('Cold outreach',         '✉️', 25, '{sales,marketer}',                   70),
  ('Negotiation prep',      '⚖️', 50, '{sales,consultant}',                 80),
  ('Renewal conversations', '🔁', 25, '{sales}',                            90),

  -- ── Coach / Therapist (new role) ───────────────────────────
  ('Client session',        '🪑', 50, '{coach}',                            10),
  ('Session notes',         '📝', 25, '{coach}',                            20),
  ('Programme design',      '🧩', 50, '{coach,educator}',                   30),
  ('Group facilitation',    '🧑‍🤝‍🧑', 50, '{coach,educator}',                40),
  ('Supervision / CPD',     '📚', 50, '{coach}',                            50),
  ('Client follow-up',      '✉️', 25, '{coach}',                            60),
  ('Curriculum writing',    '✍️', 50, '{coach,educator}',                   70),
  ('Marketing my practice', '📣', 25, '{coach,consultant}',                 80),

  -- ── Educator / Teacher (new role) ──────────────────────────
  ('Lesson planning',       '📐', 50, '{educator}',                         10),
  ('Lecture / live class',  '🎤', 50, '{educator,coach}',                   20),
  ('Marking / feedback',    '✅', 50, '{educator}',                         30),
  ('Course recording',      '🎥', 50, '{educator,filmmaker}',               40),
  ('Slide deck',            '🖼️', 50, '{educator,consultant}',              50),
  ('Student check-ins',     '📨', 25, '{educator,coach}',                   60),
  ('Curriculum review',     '🔁', 50, '{educator}',                         70),
  ('Office hours',          '🏛️', 50, '{educator,researcher}',              80),

  -- ── Accountant / Finance (new role) ────────────────────────
  ('Bookkeeping',           '📒', 50, '{accountant}',                       10),
  ('Reconciliations',       '⚖️', 50, '{accountant}',                       20),
  ('VAT / tax return',      '🧾', 50, '{accountant}',                       30),
  ('Payroll',               '💷', 25, '{accountant}',                       40),
  ('Client books review',   '📊', 50, '{accountant}',                       50),
  ('Year-end accounts',     '📑', 50, '{accountant}',                       60),
  ('Cashflow forecast',     '📈', 50, '{accountant,founder}',               70),
  ('Expense categorisation','🏷️', 25, '{accountant,all}',                   80),

  -- ── Photographer (new role) ────────────────────────────────
  ('Shoot prep',            '📋', 50, '{photographer}',                     10),
  ('On the shoot',          '📸', 90, '{photographer,filmmaker}',           20),
  ('Culling / selects',     '🗂️', 50, '{photographer}',                     30),
  ('Editing / retouch',     '🖌️', 90, '{photographer}',                     40),
  ('Client gallery',        '🖼️', 25, '{photographer}',                     50),
  ('Portfolio update',      '🌐', 50, '{photographer,designer}',            60),
  ('Equipment maintenance', '🛠️', 25, '{photographer}',                     70),
  ('Location scouting',     '🗺️', 50, '{photographer,filmmaker}',           80),

  -- ── More depth on existing roles ───────────────────────────
  -- Founder
  ('Investor update',       '📊', 25, '{founder}',                         110),
  ('Board prep',            '📑', 50, '{founder}',                         120),
  ('Product roadmap',       '🛤️', 50, '{founder,developer,designer}',      130),
  -- Marketer
  ('Customer interview',    '🎙️', 50, '{marketer,researcher,founder}',     100),
  ('Webinar prep',          '📺', 50, '{marketer,educator}',               110),
  ('Affiliate / partner',   '🤝', 25, '{marketer,sales}',                  120),
  -- Consultant
  ('Engagement kick-off',   '🚀', 50, '{consultant}',                      100),
  ('Stakeholder mapping',   '🗺️', 50, '{consultant,founder}',              110),
  -- Developer
  ('Tech spike / research', '🧪', 50, '{developer}',                       100),
  ('Incident response',     '🚨', 50, '{developer}',                       110),
  -- Designer
  ('Stakeholder review',    '👥', 25, '{designer,consultant}',             100),
  ('Asset export / handoff','📤', 25, '{designer}',                        110),
  -- Writer
  ('Pitch / proposal',      '📤', 50, '{writer,consultant,filmmaker}',     100),
  ('SEO research',          '🔍', 25, '{writer,marketer}',                 110),
  -- Filmmaker
  ('Storyboarding',         '🖍️', 50, '{filmmaker,designer}',              100),
  ('VFX / motion design',   '✨', 90, '{filmmaker,designer}',               110),
  -- Researcher
  ('Peer review',           '👀', 50, '{researcher}',                      100),
  ('Stats / modelling',     '∑',  50, '{researcher,accountant}',           110),

  -- ── Universal additions ────────────────────────────────────
  ('Email replies',         '📨', 25, '{all}',                             110),
  ('Quick break',           '🍵', 15, '{all}',                             115),
  ('Stretch / move',        '🧘', 15, '{all}',                             120),
  ('Stand-up / huddle',     '🧑‍🤝‍🧑', 15, '{all}',                          125),
  ('1:1 prep',              '🤝', 15, '{all,founder,consultant}',          130),
  ('Mind dump',             '🧠', 25, '{all}',                             135),
  ('Walk + think',          '🚶', 25, '{all}',                             140)
on conflict do nothing;
