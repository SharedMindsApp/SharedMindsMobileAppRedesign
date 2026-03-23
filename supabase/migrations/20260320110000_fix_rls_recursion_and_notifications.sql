-- V1 Migration 007: Fix RLS infinite recursion + notifications table
--
-- Problem: spaces SELECT policy calls is_space_member() which queries
-- space_members, whose SELECT policy also calls is_space_member() → stack overflow.
-- Fix: Recreate is_space_member() as SECURITY DEFINER so it bypasses RLS on space_members.

-- ============================================================
-- 1. FIX RLS RECURSION: Make helper functions SECURITY DEFINER
-- ============================================================

-- Drop and recreate is_space_member as SECURITY DEFINER
create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = p_space_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
$$;

-- Same for space_role
create or replace function public.space_role(p_space_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sm.role
  from public.space_members sm
  where sm.space_id = p_space_id
    and sm.user_id = auth.uid()
    and sm.status = 'active'
  limit 1
$$;

-- Same for can_manage_space (it calls space_role which is now SECURITY DEFINER)
create or replace function public.can_manage_space(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.space_role(p_space_id) in ('owner', 'collaborator')
$$;

-- Same for is_project_member
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  )
$$;


-- ============================================================
-- 2. NOTIFICATIONS TABLE
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  is_read boolean not null default false,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_read_idx
on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_all_self"
on public.notifications
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
