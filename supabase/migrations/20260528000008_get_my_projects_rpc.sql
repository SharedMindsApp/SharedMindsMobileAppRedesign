-- ============================================================
-- get_my_projects() — fast, single-query project fetch
-- Migration: 20260528000008_get_my_projects_rpc
--
-- Problem: the client fetched projects via a plain SELECT gated by the
-- projects RLS policy `can_see_project(id, space_id)` — a SECURITY
-- DEFINER plpgsql/sql function that runs EXISTS sub-queries. Postgres
-- evaluates that function per candidate row, and under the cold-load
-- connection-pool pressure the nested sub-queries stall waiting for a
-- pool slot. Observed: a 1-row fetch taking 11–16s, while a sibling
-- project_members query ran in ~200ms.
--
-- Fix: do the whole visibility decision inside ONE SECURITY DEFINER
-- function as a normal WHERE with EXISTS. Because it's definer-owned,
-- RLS on `projects` is bypassed inside it (no per-row policy-function
-- call), and the planner optimises the EXISTS as semi-joins using the
-- created_by / project_members / space_members indexes. One round trip,
-- one plan, no nested RLS.
-- ============================================================

create or replace function public.get_my_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.projects p
  where p.status <> 'archived'
    and (
      p.created_by = auth.uid()
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p.id and pm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.space_members sm
        where sm.space_id = p.space_id
          and sm.user_id = auth.uid()
          and sm.status = 'active'
      )
    )
  order by p.updated_at desc;
$$;

grant execute on function public.get_my_projects() to authenticated;
