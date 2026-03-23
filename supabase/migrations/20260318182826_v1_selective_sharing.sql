-- V1 Migration 005: Selective Sharing

-- 1. `share_policies`
create table public.share_policies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  access_level text not null check (access_level in ('view', 'collaborate')),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  check (owner_user_id <> target_user_id)
);

create index share_policies_owner_idx
on public.share_policies(owner_user_id);

create index share_policies_target_idx
on public.share_policies(target_user_id);

create index share_policies_resource_idx
on public.share_policies(resource_type, resource_id);

alter table public.share_policies enable row level security;

create policy "share_policies_select_participants"
on public.share_policies
for select
using (owner_user_id = auth.uid() or target_user_id = auth.uid());

create policy "share_policies_insert_owner"
on public.share_policies
for insert
with check (
  owner_user_id = auth.uid()
  and created_by = auth.uid()
  and exists (
    select 1
    from public.person_connections pc
    where (
      (pc.requester_id = owner_user_id and pc.addressee_id = target_user_id)
      or
      (pc.requester_id = target_user_id and pc.addressee_id = owner_user_id)
    )
    and pc.status = 'accepted'
  )
);

create policy "share_policies_delete_owner"
on public.share_policies
for delete
using (owner_user_id = auth.uid());
