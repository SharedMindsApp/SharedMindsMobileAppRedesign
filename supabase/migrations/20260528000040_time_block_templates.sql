-- ─────────────────────────────────────────────────────────────────
-- Weekly time-block templates
--
-- A reusable week shape the user can apply to any actual week. Each
-- template holds items keyed by day-of-week (0 = Monday … 6 = Sunday)
-- with a start time, duration, type and optional project. Breaks are
-- just items with block_type = 'break' (lunch, 10–15 min breathers),
-- so a template can pre-seed rest as well as work.
--
-- Applying a template materialises its items into real daily_time_blocks
-- rows for the chosen week's dates (handled in the service layer), at
-- which point tasks can be added to those live blocks.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.time_block_templates (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null
                          check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists time_block_templates_user_idx
  on public.time_block_templates(user_id);

create trigger time_block_templates_set_updated_at
  before update on public.time_block_templates
  for each row execute function public.set_updated_at();

create table if not exists public.time_block_template_items (
  id            uuid        primary key default gen_random_uuid(),
  template_id   uuid        not null references public.time_block_templates(id) on delete cascade,
  day_of_week   smallint    not null check (day_of_week between 0 and 6),  -- 0=Mon … 6=Sun
  start_time    time        not null,
  duration_mins smallint    not null default 60
                            check (duration_mins between 15 and 480),
  title         text        not null check (char_length(title) between 1 and 200),
  block_type    text        not null default 'focus'
                            check (block_type in ('focus', 'deep', 'admin', 'break', 'personal')),
  project_id    uuid        references public.projects(id) on delete set null,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists time_block_template_items_template_idx
  on public.time_block_template_items(template_id, day_of_week, start_time);

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.time_block_templates       enable row level security;
alter table public.time_block_template_items  enable row level security;

drop policy if exists "tbt_select_own" on public.time_block_templates;
create policy "tbt_select_own" on public.time_block_templates for select
  to authenticated using (user_id = auth.uid());
drop policy if exists "tbt_insert_own" on public.time_block_templates;
create policy "tbt_insert_own" on public.time_block_templates for insert
  to authenticated with check (user_id = auth.uid());
drop policy if exists "tbt_update_own" on public.time_block_templates;
create policy "tbt_update_own" on public.time_block_templates for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tbt_delete_own" on public.time_block_templates;
create policy "tbt_delete_own" on public.time_block_templates for delete
  to authenticated using (user_id = auth.uid());

-- Items inherit access from their parent template.
drop policy if exists "tbti_select_own" on public.time_block_template_items;
create policy "tbti_select_own" on public.time_block_template_items for select
  to authenticated using (exists (
    select 1 from public.time_block_templates t
    where t.id = template_id and t.user_id = auth.uid()));
drop policy if exists "tbti_insert_own" on public.time_block_template_items;
create policy "tbti_insert_own" on public.time_block_template_items for insert
  to authenticated with check (exists (
    select 1 from public.time_block_templates t
    where t.id = template_id and t.user_id = auth.uid()));
drop policy if exists "tbti_update_own" on public.time_block_template_items;
create policy "tbti_update_own" on public.time_block_template_items for update
  to authenticated using (exists (
    select 1 from public.time_block_templates t
    where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (
    select 1 from public.time_block_templates t
    where t.id = template_id and t.user_id = auth.uid()));
drop policy if exists "tbti_delete_own" on public.time_block_template_items;
create policy "tbti_delete_own" on public.time_block_template_items for delete
  to authenticated using (exists (
    select 1 from public.time_block_templates t
    where t.id = template_id and t.user_id = auth.uid()));

comment on table public.time_block_templates is
  'Reusable weekly time-block shapes. Applied to a real week materialises into daily_time_blocks.';
comment on column public.time_block_template_items.day_of_week is
  '0 = Monday … 6 = Sunday (Monday-first, matches the planner week).';
