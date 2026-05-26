-- ─────────────────────────────────────────────────────────────────
-- Milestones + Phases hierarchy
--
-- Previously: project_goals held the single "checkpoint" layer. The
-- flat model forced the AI to compress vastly different work units
-- (everything shipped vs. everything pending) into 3-6 chips, which
-- collapsed fidelity badly — see the "40% Core session loop" debacle.
--
-- New model:
--   Project
--     └── Milestones — destinations (Beta launch · 100 users · etc.)
--         └── Phases — work between milestones
--             └── Tasks (existing)
--
-- Milestone weights sum to 100% of the project.
-- Phase weights sum to 100% within their milestone.
-- Project completion = Σ (milestone_weight × milestone_completion / 100)
-- Milestone completion = Σ (done phase weights within it).
--
-- The rename keeps all existing rows (none yet in production), all
-- RLS policies, indexes, FKs, and triggers — just renames the table.
-- Phase tables are new from scratch.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. Rename project_goals → project_milestones ─────────────────
ALTER TABLE public.project_goals RENAME TO project_milestones;

-- Rename indexes for clarity (idempotent)
ALTER INDEX IF EXISTS project_goals_pkey RENAME TO project_milestones_pkey;

-- Rename RLS policies for clarity
ALTER POLICY "goals_select_member" ON public.project_milestones RENAME TO "milestones_select_member";
ALTER POLICY "goals_insert_member" ON public.project_milestones RENAME TO "milestones_insert_member";
ALTER POLICY "goals_update_member" ON public.project_milestones RENAME TO "milestones_update_member";
ALTER POLICY "goals_delete_member" ON public.project_milestones RENAME TO "milestones_delete_member";

-- Rename trigger for consistency (drop + recreate)
DROP TRIGGER IF EXISTS project_goals_set_updated_at ON public.project_milestones;
CREATE TRIGGER project_milestones_set_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.project_milestones IS
  'Major checkpoints / destinations within a project (e.g. Beta launch, 100 paying users). Weights sum to ~100% of project. Each milestone holds nested phases.';

-- ── 2. Create project_phases ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_phases (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  -- Nullable milestone_id so phases can exist standalone (e.g. when the
  -- user creates a phase before assigning it to a milestone). In normal
  -- use, every phase belongs to a milestone.
  milestone_id uuid references public.project_milestones(id) on delete set null,
  title        text not null,
  description  text,
  -- % contribution of this phase to its parent milestone's completion.
  -- Sum across phases within a single milestone should be ~100.
  weight_pct   smallint check (weight_pct between 0 and 100),
  completed_at timestamptz,
  sort_order   int not null default 0,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

CREATE TRIGGER project_phases_set_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS project_phases_project_idx
  ON public.project_phases(project_id, sort_order);
CREATE INDEX IF NOT EXISTS project_phases_milestone_idx
  ON public.project_phases(milestone_id, sort_order);

COMMENT ON TABLE public.project_phases IS
  'Work units between milestones. Each phase contributes weight_pct to its parent milestone (sum ~100 within a milestone). Phase completion drives milestone completion drives project completion.';

-- ── 3. RLS for project_phases ────────────────────────────────────
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phases_select_member" ON public.project_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_phases.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "phases_insert_member" ON public.project_phases
  FOR INSERT WITH CHECK (
    NOT public.current_user_is_suspended() AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_phases.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "phases_update_member" ON public.project_phases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_phases.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "phases_delete_member" ON public.project_phases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_phases.project_id
      AND project_members.user_id = auth.uid()
    )
  );
