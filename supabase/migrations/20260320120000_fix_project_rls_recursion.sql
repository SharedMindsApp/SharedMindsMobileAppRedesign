-- V1 Migration 008: Fix project_members ↔ projects RLS recursion
--
-- Problem: projects SELECT checks project_members (via is_project_member),
-- project_members SELECT checks projects (to get space_id for is_space_member),
-- which checks project_members again → infinite recursion.
--
-- Fix: Replace project_members SELECT policy with a simpler one that doesn't
-- reference the projects table. Members can see their own memberships directly,
-- or memberships in spaces they belong to (checked via SECURITY DEFINER function).

-- ============================================================
-- 1. Fix project_members SELECT policy (break the cycle)
-- ============================================================
drop policy if exists "project_members_select_if_project_visible" on public.project_members;

-- Simple policy: you can see memberships where you are a member,
-- or where you can manage the project's space.
-- Use a SECURITY DEFINER helper to avoid recursion.
create or replace function public.can_see_project_members(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    -- You are a member of this project
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    -- You are a member of the project's space
    select 1 from public.projects p
    join public.space_members sm on sm.space_id = p.space_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
    where p.id = p_project_id
  )
$$;

create policy "project_members_select_visible"
on public.project_members
for select
using (public.can_see_project_members(project_id));


-- ============================================================
-- 2. Fix project_members manage policy (same recursion issue)
-- ============================================================
drop policy if exists "project_members_manage_if_project_manageable" on public.project_members;

create or replace function public.can_manage_project_members(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    join public.space_members sm on sm.space_id = p.space_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
      and sm.role in ('owner', 'collaborator')
    where p.id = p_project_id
  )
$$;

create policy "project_members_manage_if_manageable"
on public.project_members
for insert
with check (public.can_manage_project_members(project_id));

create policy "project_members_update_if_manageable"
on public.project_members
for update
using (public.can_manage_project_members(project_id))
with check (public.can_manage_project_members(project_id));

create policy "project_members_delete_if_manageable"
on public.project_members
for delete
using (public.can_manage_project_members(project_id));


-- ============================================================
-- 3. Fix projects SELECT policy (uses is_project_member which
--    queries project_members, whose policy now doesn't recurse)
--    But let's also make it use SECURITY DEFINER for safety.
-- ============================================================
drop policy if exists "projects_select_visible" on public.projects;

create or replace function public.can_see_project(p_project_id uuid, p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.space_members sm
    where sm.space_id = p_space_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  )
$$;

create policy "projects_select_visible"
on public.projects
for select
using (public.can_see_project(id, space_id));


-- ============================================================
-- 4. Fix tasks SELECT policy (references project_members)
-- ============================================================
drop policy if exists "tasks_select_if_space_or_project_visible" on public.tasks;

create or replace function public.can_see_task(p_space_id uuid, p_project_id uuid, p_assigned_to uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Space member
    exists (
      select 1 from public.space_members sm
      where sm.space_id = p_space_id
        and sm.user_id = auth.uid()
        and sm.status = 'active'
    )
    -- Assigned to me
    or (p_assigned_to = auth.uid())
    -- Project member
    or (
      p_project_id is not null
      and exists (
        select 1 from public.project_members pm
        where pm.project_id = p_project_id
          and pm.user_id = auth.uid()
      )
    )
$$;

create policy "tasks_select_visible"
on public.tasks
for select
using (public.can_see_task(space_id, project_id, assigned_to));


-- ============================================================
-- 5. get_user_active_project RPC function
-- ============================================================
create or replace function public.get_user_active_project(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_project_id
  from public.user_active_projects
  where user_id = p_user_id
  limit 1
$$;
