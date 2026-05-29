-- match_skips — "I saw you waiting and chose to start my own door instead."
--
-- When someone opens the Match-me-now sheet, sees a same-purpose door already
-- waiting, and chooses to open their OWN door anyway, we honour that choice:
-- the two people are hidden from each other's open-door lists for a cooldown
-- (~30 min) so neither gets routed back into a pairing they just passed on.
--
-- One row encodes a BIDIRECTIONAL hide: fetchOpenSessions() reads rows where
-- the caller is EITHER the skipper or the skipped party and excludes the other
-- person. So a single insert by the skipper hides each from the other.
--
-- Deliberately soft + ephemeral: it's a "not right now," not a block. The row
-- expires on its own; there's no UI to manage a permanent block list.

create table if not exists public.match_skips (
  id                uuid primary key default gen_random_uuid(),
  skipper_user_id   uuid not null references auth.users(id) on delete cascade,
  skipped_user_id   uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '30 minutes'),
  unique (skipper_user_id, skipped_user_id),
  check (skipper_user_id <> skipped_user_id)
);

-- Reverse lookup (find rows where I'm the skipped party) + expiry sweeps.
create index if not exists match_skips_skipped_idx on public.match_skips (skipped_user_id);
create index if not exists match_skips_expires_idx on public.match_skips (expires_at);

alter table public.match_skips enable row level security;

-- Either party may read the row (needed for the bidirectional filter).
drop policy if exists "match_skips read own" on public.match_skips;
create policy "match_skips read own" on public.match_skips
  for select using (auth.uid() in (skipper_user_id, skipped_user_id));

-- Only the skipper can create / refresh / clear their own skip.
drop policy if exists "match_skips insert own" on public.match_skips;
create policy "match_skips insert own" on public.match_skips
  for insert with check (skipper_user_id = auth.uid());

drop policy if exists "match_skips update own" on public.match_skips;
create policy "match_skips update own" on public.match_skips
  for update using (skipper_user_id = auth.uid()) with check (skipper_user_id = auth.uid());

drop policy if exists "match_skips delete own" on public.match_skips;
create policy "match_skips delete own" on public.match_skips
  for delete using (skipper_user_id = auth.uid());
