-- ─────────────────────────────────────────────────────────────────
-- Project shape fields (for AI roadmap generation)
--
-- These columns describe the SHAPE of a project so the AI roadmap
-- generator can produce relevant phases. A 70%-complete client film
-- script with a fixed deadline needs "Polish second act → Send to
-- producer for notes" — not "Research → Outline → Draft" boilerplate.
--
-- All fields are nullable so existing projects don't need backfill.
--
-- Inspired by the legacy Guardrails framework's "idea → intent →
-- feasibility → execution" model and its differentiation between
-- passion/work/client/startup projects.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS started_status text
    CHECK (started_status IN ('new', 'in_progress')),
  ADD COLUMN IF NOT EXISTS initial_completion_pct smallint
    CHECK (initial_completion_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS project_type text
    CHECK (project_type IN ('passion', 'client', 'employment', 'freelance')),
  ADD COLUMN IF NOT EXISTS deadline_flexibility text
    CHECK (deadline_flexibility IN ('fixed', 'flexible', 'none'));

COMMENT ON COLUMN public.projects.started_status IS
  '"new" = brand-new project at creation. "in_progress" = user was already working on this. Used by AI roadmap generator to scaffold from current state.';

COMMENT ON COLUMN public.projects.initial_completion_pct IS
  'User-estimated completion at project creation (0-100). Snapshot only — never updated. Live progress comes from task/goal completion.';

COMMENT ON COLUMN public.projects.project_type IS
  'passion | client | employment | freelance. Drives AI tone (passion = momentum + intrinsic motivation; client = deliverables + check-ins).';

COMMENT ON COLUMN public.projects.deadline_flexibility IS
  'fixed | flexible | none. Combined with target_date to drive AI nudge intensity and phase granularity.';
