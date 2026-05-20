-- Projects Lite MVP
--
-- Plumbing layer for the Projects feature: backfills personal spaces,
-- auto-creates them for new signups, ties focus_sessions to projects with
-- a proper FK, extends RLS so project members (not just space members) can
-- collaborate on tasks + see each other's pinned sessions, and adds an
-- email-link invite flow.
--
-- The projects / project_members / tasks tables themselves are unchanged —
-- they survived from 20260318182824_v1_planning_spine.sql.


-- ============================================================
-- 1. Personal-space backfill + auto-provision trigger
-- ============================================================
--
-- App-side SpaceService.bootstrapPersonalSpace already runs on login, but
-- belt-and-suspenders: a Postgres trigger guarantees every new profile gets
-- a personal space + owner membership without depending on the client.

-- 1a. Backfill: profiles with zero spaces get one + membership
do $$
declare
  p record;
  new_space_id uuid;
begin
  for p in
    select pr.id
    from public.profiles pr
    where not exists (
      select 1
      from public.space_members sm
      where sm.user_id = pr.id
        and sm.status = 'active'
    )
  loop
    insert into public.spaces (type, name, created_by)
    values ('personal', 'Personal Space', p.id)
    returning id into new_space_id;

    insert into public.space_members (space_id, user_id, role, status)
    values (new_space_id, p.id, 'owner', 'active');
  end loop;
end $$;

-- 1b. Trigger on profile insert → create personal space + owner membership
create or replace function public.create_personal_space_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_space_id uuid;
begin
  insert into public.spaces (type, name, created_by)
  values ('personal', 'Personal Space', new.id)
  returning id into new_space_id;

  insert into public.space_members (space_id, user_id, role, status)
  values (new_space_id, new.id, 'owner', 'active');

  return new;
end;
$$;

drop trigger if exists profiles_create_personal_space on public.profiles;
create trigger profiles_create_personal_space
after insert on public.profiles
for each row execute function public.create_personal_space_for_profile();


-- ============================================================
-- 2. focus_sessions.project_id → real FK
-- ============================================================
-- Column was added in 20260514000001 as a plain uuid (no FK). Now that the
-- Projects feature is real, add the constraint with ON DELETE SET NULL so
-- archived/deleted projects don't break historical session rows.

-- Guard against pre-existing orphan values (set them to NULL first)
update public.focus_sessions
set project_id = null
where project_id is not null
  and not exists (
    select 1 from public.projects p where p.id = focus_sessions.project_id
  );

alter table public.focus_sessions
  drop constraint if exists focus_sessions_project_id_fkey;

alter table public.focus_sessions
  add constraint focus_sessions_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

create index if not exists focus_sessions_project_id_idx
  on public.focus_sessions(project_id)
  where project_id is not null;


-- ============================================================
-- 3. Extend focus_sessions SELECT policy
-- ============================================================
-- Project members should see *all* sessions pinned to a shared project so
-- the project detail page can show "recent sessions" across collaborators.

drop policy if exists "focus_sessions_select_policy" on public.focus_sessions;
create policy "focus_sessions_select_policy"
on public.focus_sessions for select
using (
  user_id = auth.uid()
  or status = 'active'
  or (
    project_id is not null
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = focus_sessions.project_id
        and pm.user_id = auth.uid()
    )
  )
);


-- ============================================================
-- 4. Relax tasks RLS so project members can manage shared tasks
-- ============================================================
-- Today: tasks_insert_if_manageable requires can_manage_space(), which means
-- a project collaborator from a different space can't add tasks to a shared
-- project. Relax: project owner/collaborator role is also sufficient.

create or replace function public.can_manage_task(p_space_id uuid, p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_space(p_space_id)
    or (
      p_project_id is not null
      and exists (
        select 1 from public.project_members pm
        where pm.project_id = p_project_id
          and pm.user_id = auth.uid()
          and pm.role in ('owner', 'collaborator')
      )
    )
$$;

drop policy if exists "tasks_insert_if_manageable" on public.tasks;
create policy "tasks_insert_if_manageable"
on public.tasks
for insert
with check (
  public.can_manage_task(space_id, project_id)
  and created_by = auth.uid()
);

drop policy if exists "tasks_update_if_manageable" on public.tasks;
create policy "tasks_update_if_manageable"
on public.tasks
for update
using (
  public.can_manage_task(space_id, project_id)
  or assigned_to = auth.uid()
)
with check (
  public.can_manage_task(space_id, project_id)
  or assigned_to = auth.uid()
);


-- ============================================================
-- 5. project_invites — email-link invite flow
-- ============================================================
create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invite_token text not null unique,
  invited_email text,
  role text not null default 'collaborator'
    check (role in ('collaborator', 'viewer')),
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists project_invites_token_idx
  on public.project_invites(invite_token)
  where accepted_at is null;
create index if not exists project_invites_project_idx
  on public.project_invites(project_id);

alter table public.project_invites enable row level security;

-- Project members (any role) can see invites for their project
drop policy if exists "project_invites_select_if_member" on public.project_invites;
create policy "project_invites_select_if_member"
on public.project_invites for select
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
  )
);

-- Anonymous/authenticated users may resolve an invite by token to view
-- its target project on the accept page. Token is the secret here.
drop policy if exists "project_invites_select_by_token" on public.project_invites;
create policy "project_invites_select_by_token"
on public.project_invites for select
to anon, authenticated
using (
  accepted_at is null
  and expires_at > now()
);

-- Project owners/collaborators can create invites for their project
drop policy if exists "project_invites_insert_if_can_manage" on public.project_invites;
create policy "project_invites_insert_if_can_manage"
on public.project_invites for insert
with check (
  invited_by = auth.uid()
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'collaborator')
  )
);

-- Project owners can delete (revoke) any invite for their project
drop policy if exists "project_invites_delete_if_owner" on public.project_invites;
create policy "project_invites_delete_if_owner"
on public.project_invites for delete
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
  )
);


-- ============================================================
-- 6. RPC: accept_project_invite(token)
-- ============================================================
-- Race-safe: only fires if the invite is unaccepted and unexpired. Returns
-- the project id on success, raises on failure. SECURITY DEFINER so the
-- caller doesn't need direct INSERT permission on project_members.

create or replace function public.accept_project_invite(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.project_invites;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'must be signed in to accept an invite' using errcode = '42501';
  end if;

  -- Lock the invite row so concurrent accepts don't double-insert membership
  select * into v_invite
  from public.project_invites
  where invite_token = token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invite is invalid, expired, or already accepted'
      using errcode = '22023';
  end if;

  -- Insert membership idempotently (in case user is already a member)
  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, v_user, v_invite.role)
  on conflict (project_id, user_id) do nothing;

  -- Mark accepted
  update public.project_invites
  set accepted_by = v_user,
      accepted_at = now()
  where id = v_invite.id;

  return v_invite.project_id;
end;
$$;

revoke all on function public.accept_project_invite(text) from public;
grant execute on function public.accept_project_invite(text) to authenticated;
