-- ============================================================
-- Project page performance — add missing project_id indexes
-- Migration: 20260528000007_project_perf_indexes
--
-- The projects list + detail pages do a lot of "rows WHERE project_id
-- = X" and "WHERE project_id IN (...)" lookups, plus the RLS
-- visibility function can_see_project() runs an EXISTS against
-- project_members for every project row in a SELECT. None of these
-- child tables had a project_id index, so every lookup was a
-- sequential scan — fine with a handful of rows, increasingly slow as
-- data grows (the reported 6s+ load).
--
-- These indexes turn those scans into index lookups. All are additive,
-- IF NOT EXISTS, and safe to run on a live DB.
-- ============================================================

-- The big one: member-count query (.in('project_id', …)) on the list,
-- the members fetch on detail, AND the per-row RLS EXISTS check in
-- can_see_project() / can_see_project_members(). Composite so it serves
-- both "by project" and "by project + user" (the membership EXISTS).
CREATE INDEX IF NOT EXISTS project_members_project_user_idx
  ON public.project_members (project_id, user_id);

-- getProjectStats() aggregates these by project_id across all the
-- user's projects (.in('project_id', …)).
CREATE INDEX IF NOT EXISTS project_phases_project_idx
  ON public.project_phases (project_id);

CREATE INDEX IF NOT EXISTS project_milestones_project_idx
  ON public.project_milestones (project_id);

-- Notes tab on the detail page.
CREATE INDEX IF NOT EXISTS project_notes_project_idx
  ON public.project_notes (project_id);

-- "Recent sessions" on the detail page filters focus_sessions by
-- project_id. Partial index — most sessions have no project.
CREATE INDEX IF NOT EXISTS focus_sessions_project_idx
  ON public.focus_sessions (project_id)
  WHERE project_id IS NOT NULL;

-- Speed up the space-membership half of can_see_project(): it filters
-- space_members on (space_id, user_id, status). Existing indexes are
-- (user_id) and (space_id, status); a composite covers the exact
-- predicate.
CREATE INDEX IF NOT EXISTS space_members_space_user_status_idx
  ON public.space_members (space_id, user_id, status);
