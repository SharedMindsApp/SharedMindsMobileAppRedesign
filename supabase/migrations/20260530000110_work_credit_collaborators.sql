-- work_credit_collaborators — verified, collaborative credits.
--
-- The owner of a work_credit can tag the members they made it with. Each tag
-- is pending until that member confirms — a confirmed co-credit on a specific
-- named piece of work is the trust signal LinkedIn endorsements can't match.
--
-- This slice covers EXISTING members only (no stubs / invites for non-members —
-- that's the consent-careful growth loop in a later slice).

create table if not exists public.work_credit_collaborators (
  id                   uuid primary key default gen_random_uuid(),
  credit_id            uuid not null references public.work_credits(id) on delete cascade,
  owner_user_id        uuid not null references auth.users(id) on delete cascade,  -- who tagged (credit owner)
  collaborator_user_id uuid not null references auth.users(id) on delete cascade,  -- the tagged member
  status               text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at           timestamptz not null default now(),
  responded_at         timestamptz,
  unique (credit_id, collaborator_user_id),
  check (owner_user_id <> collaborator_user_id)
);

create index if not exists wcc_collaborator_idx on public.work_credit_collaborators (collaborator_user_id, status);
create index if not exists wcc_credit_idx on public.work_credit_collaborators (credit_id);

alter table public.work_credit_collaborators enable row level security;

-- Readable when confirmed (so it shows on public profiles), or to either party
-- (so the owner sees pending tags and the collaborator sees their requests).
drop policy if exists "wcc read" on public.work_credit_collaborators;
create policy "wcc read" on public.work_credit_collaborators
  for select using (
    status = 'confirmed'
    or auth.uid() = owner_user_id
    or auth.uid() = collaborator_user_id
  );

-- Only the credit's owner may tag — and only on a credit they actually own.
drop policy if exists "wcc insert own credit" on public.work_credit_collaborators;
create policy "wcc insert own credit" on public.work_credit_collaborators
  for insert with check (
    owner_user_id = auth.uid()
    and exists (select 1 from public.work_credits w where w.id = credit_id and w.user_id = auth.uid())
  );

-- The tagged member confirms / declines (updates status).
drop policy if exists "wcc respond" on public.work_credit_collaborators;
create policy "wcc respond" on public.work_credit_collaborators
  for update using (collaborator_user_id = auth.uid()) with check (collaborator_user_id = auth.uid());

-- The owner can untag (remove a row).
drop policy if exists "wcc owner delete" on public.work_credit_collaborators;
create policy "wcc owner delete" on public.work_credit_collaborators
  for delete using (owner_user_id = auth.uid());
