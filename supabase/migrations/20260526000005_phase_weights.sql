-- ─────────────────────────────────────────────────────────────────
-- Phase weights — phases contribute to project completion
--
-- Each phase (project_goals row) can carry a weight_pct indicating its
-- contribution to the project's overall completion. Sum across a
-- project's phases should be ~100; live project progress = sum of
-- completed phase weights.
--
-- This makes the user's gut estimate on the project_shape step a
-- starting hypothesis, not the source of truth. ADHD users notoriously
-- mis-estimate progress; phase-driven completion gives them an
-- objective reading.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.project_goals
  ADD COLUMN IF NOT EXISTS weight_pct smallint
    CHECK (weight_pct BETWEEN 0 AND 100);

COMMENT ON COLUMN public.project_goals.weight_pct IS
  '% contribution of this phase to project completion. Sum across a project should be ~100. Live project completion = sum of weight_pct where completed_at IS NOT NULL.';
