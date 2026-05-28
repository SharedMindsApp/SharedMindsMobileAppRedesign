-- ============================================================
-- Project "Next action" — the single, always-one next step
-- Migration: 20260528000006_project_next_action
--
-- The core ADHD-execution feature: every project carries ONE tiny,
-- pre-decided next step (free text — deliberately NOT a task list,
-- which is itself overwhelming). It collapses "what do I do?" into a
-- single sentence that's waiting whenever the user returns, killing
-- both task-initiation paralysis and re-entry cost.
--
--   next_action              the one next step (nullable = none set)
--   next_action_updated_at   when it was last set/changed (powers
--                            "set 3 days ago" + re-entry copy)
--   last_activity_at         bumped on next-action change, session
--                            finish, or task done — drives the idle /
--                            re-entry state and momentum sorting
--
-- No new RLS needed: existing project policies cover these columns.
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Seed last_activity_at so existing projects sort sensibly from day one.
UPDATE public.projects
SET last_activity_at = COALESCE(last_activity_at, updated_at, created_at)
WHERE last_activity_at IS NULL;

COMMENT ON COLUMN public.projects.next_action IS
  'The single pre-decided next step for this project (free text). NULL = none set.';
COMMENT ON COLUMN public.projects.last_activity_at IS
  'Last meaningful activity (next-action change, session finish, task done). Drives re-entry/idle state + momentum sort.';
