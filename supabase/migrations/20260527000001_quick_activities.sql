-- Quick Activities — the vocabulary of recurring focus work.
--
-- Two tables:
--
--   • activity_templates — a global, admin-curated library of preset
--     activities (Cold calling, Code review, Social posts, …) tagged
--     with the work_types they apply to. Read-only for users.
--
--   • user_activities — each user's personal list. Starts empty;
--     auto-seeded from templates that match the user's work_types
--     on first read via the seed_user_activities() RPC. Users can
--     adopt, customise, or add their own from scratch.
--
-- Why two tables?
--   Templates are the curated vocabulary we control. User activities
--   are owned per-user and tracked over time (last_used_at,
--   sessions_count) so the Quick Timer can surface "your most-used"
--   without per-render queries. Decoupling lets us evolve the library
--   without disturbing existing users — adding a new template doesn't
--   silently appear in their list; they have to opt in.

-- ── activity_templates ──────────────────────────────────────────

create table if not exists public.activity_templates (
  id              uuid primary key default gen_random_uuid(),
  label           text not null,
  emoji           text not null,
  /** Default session duration in minutes — the Quick Timer pre-fills
   *  this when the activity is picked. User can override. */
  default_minutes integer not null default 25 check (default_minutes between 5 and 180),
  /** Which work_types this activity applies to. Used by the seed
   *  RPC to pre-populate matching activities into user_activities.
   *  Matches the WORK_TYPES list in SettingsPage. */
  work_types      text[] not null default '{}',
  /** Lower numbers appear first within a work-type group. We use
   *  this to surface the most-used activities first when seeding. */
  sort_order      integer not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists activity_templates_active_idx
  on public.activity_templates(is_active, sort_order);

alter table public.activity_templates enable row level security;

drop policy if exists "activity_templates_read_all" on public.activity_templates;
create policy "activity_templates_read_all"
on public.activity_templates for select
to anon, authenticated
using (is_active = true);

-- ── user_activities ─────────────────────────────────────────────

create table if not exists public.user_activities (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  /** Nullable — links to the source template if this activity was
   *  seeded from the library. Custom activities have template_id = null. */
  template_id     uuid references public.activity_templates(id) on delete set null,
  label           text not null,
  emoji           text not null default '⏱️',
  default_minutes integer not null default 25 check (default_minutes between 5 and 180),
  /** Manual ordering for the Quick Timer dropdown — most-recently
   *  used floats to the top via the bump_user_activity_usage() RPC. */
  sort_order      integer not null default 100,
  /** Soft delete so we don't lose historical session ↔ activity links. */
  archived_at     timestamptz,
  /** Aggregate stats — bumped by bump_user_activity_usage() each
   *  time a session starts pinned to this activity. */
  last_used_at    timestamptz,
  sessions_count  integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists user_activities_owner_idx
  on public.user_activities(user_id, archived_at);

create index if not exists user_activities_recent_idx
  on public.user_activities(user_id, last_used_at desc nulls last)
  where archived_at is null;

-- Each user can't have two activities with the same label (case-insensitive).
-- Prevents duplicates when seed runs twice (e.g. user re-opens onboarding).
create unique index if not exists user_activities_unique_label
  on public.user_activities(user_id, lower(label))
  where archived_at is null;

alter table public.user_activities enable row level security;

drop policy if exists "user_activities_select_own" on public.user_activities;
create policy "user_activities_select_own"
on public.user_activities for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_activities_insert_own" on public.user_activities;
create policy "user_activities_insert_own"
on public.user_activities for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_activities_update_own" on public.user_activities;
create policy "user_activities_update_own"
on public.user_activities for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_activities_delete_own" on public.user_activities;
create policy "user_activities_delete_own"
on public.user_activities for delete
to authenticated
using (user_id = auth.uid());

-- ── Seed RPC ────────────────────────────────────────────────────
-- Called lazily on first time the user opens the Quick Timer picker
-- (cheaper than a wizard hook + works for existing users). Picks the
-- top-N templates per work_type the user has selected and inserts
-- into user_activities, idempotently.

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
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(work_types, '{}')
  into v_work_types
  from public.profiles
  where id = v_uid;

  -- No work types yet — also include the 'universal' bucket so the
  -- user still gets something. Defined as templates tagged 'all'.
  if v_work_types is null or array_length(v_work_types, 1) is null then
    v_work_types := array['all'];
  else
    v_work_types := array_append(v_work_types, 'all');
  end if;

  with ranked as (
    select
      t.id, t.label, t.emoji, t.default_minutes, t.sort_order,
      row_number() over (
        partition by wt
        order by t.sort_order, t.label
      ) as rn
    from public.activity_templates t
    cross join unnest(v_work_types) as wt
    where t.is_active = true
      and t.work_types && array[wt]   -- overlaps
  ),
  picks as (
    select distinct on (id) id, label, emoji, default_minutes, sort_order
    from ranked
    where rn <= p_per_work_type
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

-- Lightweight "bump" RPC — called after a session starts pinned to an
-- activity. Increments sessions_count + sets last_used_at. We do this
-- server-side so the timestamp is canonical (not client clock).

create or replace function public.bump_user_activity_usage(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_activities
  set sessions_count = sessions_count + 1,
      last_used_at = now()
  where id = p_activity_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.bump_user_activity_usage(uuid) to authenticated;

-- ── Seed the library ────────────────────────────────────────────
-- ~110 curated activities across the 8 work_types + a universal bucket.
-- Sort_order within a work_type roughly reflects "how typical is this
-- activity for this role" — the seed RPC takes the lowest N per type.

insert into public.activity_templates (label, emoji, default_minutes, work_types, sort_order) values
  -- Designer
  ('Wireframing',           '🖋️', 25, '{designer}',                  10),
  ('Visual exploration',    '🎯', 50, '{designer}',                  20),
  ('Component design',      '🧩', 50, '{designer}',                  30),
  ('Design review',         '🔁', 25, '{designer}',                  40),
  ('Spec / handoff',        '📐', 25, '{designer}',                  50),
  ('Mockup polish',         '🖼️', 25, '{designer}',                  60),
  ('Design system upkeep',  '📚', 50, '{designer}',                  70),
  ('Usability test prep',   '🧪', 25, '{designer}',                  80),
  -- Developer
  ('Bug triage',            '🐛', 25, '{developer}',                 10),
  ('Feature build',         '🛠️', 50, '{developer}',                 20),
  ('Code review',           '👀', 25, '{developer}',                 30),
  ('Refactor',              '🔧', 50, '{developer}',                 40),
  ('Test writing',          '🧪', 25, '{developer}',                 50),
  ('Docs writing',          '📖', 25, '{developer}',                 60),
  ('Deploy / release',      '🚢', 25, '{developer}',                 70),
  ('Pair programming',      '🤝', 50, '{developer}',                 80),
  ('Architecture think',    '🧠', 50, '{developer}',                 90),
  -- Writer / Creator
  ('Outline',               '🗒️', 25, '{writer}',                    10),
  ('First draft',           '📝', 50, '{writer}',                    20),
  ('Edit / revise',         '✂️', 25, '{writer}',                    30),
  ('Research',              '🔍', 50, '{writer,researcher}',         40),
  ('Interview',             '🎙️', 50, '{writer,researcher}',         50),
  ('Newsletter writing',    '📬', 50, '{writer,marketer}',           60),
  ('Blog post',             '📰', 50, '{writer,marketer}',           70),
  ('Script writing',        '🎬', 50, '{writer,filmmaker}',          80),
  ('Reading / input',       '📚', 25, '{writer,researcher}',         90),
  -- Founder
  ('Cold calling',          '☎️', 25, '{founder,consultant}',        10),
  ('Investor outreach',     '🗓️', 25, '{founder}',                   20),
  ('Metrics review',        '📊', 25, '{founder,consultant}',        30),
  ('Customer calls',        '🤝', 50, '{founder,consultant}',        40),
  ('Strategy writing',      '✍️', 50, '{founder}',                   50),
  ('Fundraising prep',      '💰', 50, '{founder}',                   60),
  ('Roadmap / planning',    '🧭', 50, '{founder}',                   70),
  ('Hiring / interviews',   '👥', 25, '{founder}',                   80),
  ('Inbox triage',          '🔥', 25, '{founder,consultant}',        90),
  ('Big-picture think',     '💡', 50, '{founder}',                  100),
  -- Filmmaker / Producer
  ('Edit cut',              '🎞️', 50, '{filmmaker}',                  10),
  ('Colour grading',        '🎨', 50, '{filmmaker}',                  20),
  ('Sound mix',             '🎵', 50, '{filmmaker}',                  30),
  ('Pre-production planning','📋', 50, '{filmmaker}',                  40),
  ('Crew/cast outreach',    '📞', 25, '{filmmaker}',                  50),
  ('Client review export',  '📤', 25, '{filmmaker}',                  60),
  ('Treatment writing',     '📑', 50, '{filmmaker}',                  70),
  ('Budget / quoting',      '💰', 25, '{filmmaker,consultant}',       80),
  ('Footage review',        '🎬', 25, '{filmmaker}',                  90),
  -- Marketer
  ('Social posts',          '📱', 25, '{marketer}',                  10),
  ('Analytics review',      '📊', 25, '{marketer}',                  20),
  ('Email campaign',        '📧', 50, '{marketer}',                  30),
  ('Ad creative',           '📈', 50, '{marketer}',                  40),
  ('Campaign brief',        '🎯', 25, '{marketer}',                  50),
  ('Landing page copy',     '✍️', 50, '{marketer,writer}',           60),
  ('SEO research',          '🔍', 25, '{marketer}',                  70),
  ('Influencer outreach',   '🤝', 25, '{marketer}',                  80),
  ('Press / PR',            '📰', 25, '{marketer}',                  90),
  -- Consultant
  ('Client deliverable',    '📊', 50, '{consultant}',                10),
  ('Discovery call',        '📞', 50, '{consultant}',                20),
  ('Proposal writing',      '📑', 50, '{consultant}',                30),
  ('Data analysis',         '📈', 50, '{consultant,researcher}',     40),
  ('Workshop prep',         '🎤', 50, '{consultant}',                50),
  ('Meeting followup',      '📝', 25, '{consultant}',                60),
  ('Pipeline / CRM update', '💼', 25, '{consultant,founder}',        70),
  ('Client check-ins',      '📨', 25, '{consultant}',                80),
  ('Invoicing / billing',   '💰', 25, '{consultant,filmmaker,founder}', 90),
  -- Researcher
  ('Literature review',     '📚', 50, '{researcher}',                10),
  ('Data collection',       '🧪', 50, '{researcher}',                20),
  ('Analysis',              '📊', 50, '{researcher}',                30),
  ('Writing up',            '📝', 50, '{researcher}',                40),
  ('Conference prep',       '🎤', 50, '{researcher}',                50),
  ('Participant outreach',  '👥', 25, '{researcher}',                60),
  ('Grant writing',         '📑', 50, '{researcher}',                70),
  ('Methodology design',    '🗂️', 50, '{researcher}',                80),
  -- Universal — show to everyone via the 'all' bucket
  ('Inbox zero',            '🔥', 25, '{all}',                       10),
  ('Plan tomorrow',         '📅', 15, '{all}',                       20),
  ('Admin / paperwork',     '🧹', 25, '{all}',                       30),
  ('Learning / course',     '📚', 50, '{all}',                       40),
  ('Reflection / journal',  '🧘', 15, '{all}',                       50),
  ('Deep think',            '🤔', 50, '{all}',                       60),
  ('Weekly review',         '🗓️', 25, '{all}',                       70),
  ('Difficult conversation','📞', 25, '{all}',                       80),
  ('Finance / bookkeeping', '🧾', 25, '{all}',                       90),
  ('Errands / life admin',  '🛒', 15, '{all}',                      100)
on conflict do nothing;
