-- ─────────────────────────────────────────────────────────────────
-- Phase + milestone deadlines
--
-- Each phase can now carry an optional target_date and a deadline_type:
--   'flexible' — a soft aim. We surface "on track / past target" gently,
--                never punitively.
--   'hard'     — a firm date. Slipping it reads as "overdue".
--
-- Milestones already have target_date (inherited from the old goals
-- table); they gain the same deadline_type flag so the on-target chip
-- can distinguish a soft target from a hard commitment.
--
-- No backfill needed — both columns are nullable / defaulted, and
-- existing rows simply have no deadline until the user sets one.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS deadline_type text
    CHECK (deadline_type IN ('flexible', 'hard'));

ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS deadline_type text
    CHECK (deadline_type IN ('flexible', 'hard'));

COMMENT ON COLUMN public.project_phases.target_date IS
  'Optional date this phase is aimed at. NULL = no deadline.';
COMMENT ON COLUMN public.project_phases.deadline_type IS
  'flexible = soft aim (gentle nudge), hard = firm date (overdue when missed). NULL when no target_date.';
COMMENT ON COLUMN public.project_milestones.deadline_type IS
  'flexible = soft aim, hard = firm date. Pairs with the existing target_date column.';
