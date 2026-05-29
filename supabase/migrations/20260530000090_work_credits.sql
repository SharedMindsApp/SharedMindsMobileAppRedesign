-- work_credits — an IMDB-style body of work on the profile.
--
-- Distinct from `projects` (active, on-platform, looking-for-help) and from the
-- intent layer (what I want now). This is PROOF: past work + the specific role
-- you played. Credits, not jobs — "Cinematographer on This Film", not "worked
-- at Studio X 2019–2021". Role-specific, link to the work, skills used.
--
-- Slice 1 is self-listed only. Collaborator tagging + verification (so a credit
-- can be confirmed by the people you made it with) is a later slice — the
-- columns here leave room for it without a schema change.

create table if not exists public.work_credits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,                 -- the project / work
  role          text,                          -- your role(s) on it, e.g. "Lead Developer"
  description   text,                          -- one line: what you actually did
  year_label    text,                          -- freeform "2023" / "2021–2023" (no date math)
  url           text,                          -- link to the work itself
  thumbnail_url text,                           -- optional poster/preview image
  skills        text[] not null default '{}',  -- skills used on it
  sort_order    int not null default 0,        -- manual ordering (lower = first)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists work_credits_user_idx on public.work_credits (user_id, sort_order);

alter table public.work_credits enable row level security;

-- Readable by any authenticated member (profiles are already browsable). Only
-- the owner can write their own credits.
drop policy if exists "work_credits read" on public.work_credits;
create policy "work_credits read" on public.work_credits
  for select using (auth.role() = 'authenticated');

drop policy if exists "work_credits insert own" on public.work_credits;
create policy "work_credits insert own" on public.work_credits
  for insert with check (user_id = auth.uid());

drop policy if exists "work_credits update own" on public.work_credits;
create policy "work_credits update own" on public.work_credits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "work_credits delete own" on public.work_credits;
create policy "work_credits delete own" on public.work_credits
  for delete using (user_id = auth.uid());
