-- Premium waitlist — capture demand for a paid tier before billing exists.
--
-- The "Upgrade to Premium" CTA (Settings + match-me-now locks) routes to an
-- /upgrade page where an interested user joins this list. One row per user;
-- re-joining is an idempotent upsert. Admins read the whole list to gauge
-- willingness-to-pay.
--
-- We denormalise email + display_name at join time so the admin view doesn't
-- need a cross-schema join into auth.users.

create table if not exists public.premium_waitlist (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  -- Optional self-reported signals to qualify demand.
  price_band    text,           -- e.g. '£5-10', '£10-15', '£15-20', '£20+'
  reason        text,           -- free text: what they'd use premium for
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.premium_waitlist enable row level security;

-- A user manages only their own waitlist row.
drop policy if exists "premium_waitlist own select" on public.premium_waitlist;
create policy "premium_waitlist own select" on public.premium_waitlist
  for select using (auth.uid() = user_id);

drop policy if exists "premium_waitlist own insert" on public.premium_waitlist;
create policy "premium_waitlist own insert" on public.premium_waitlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "premium_waitlist own update" on public.premium_waitlist;
create policy "premium_waitlist own update" on public.premium_waitlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admins can read every row (for the demand dashboard).
drop policy if exists "premium_waitlist admin read" on public.premium_waitlist;
create policy "premium_waitlist admin read" on public.premium_waitlist
  for select using (public.is_admin());

create index if not exists premium_waitlist_created_at_idx
  on public.premium_waitlist (created_at desc);
