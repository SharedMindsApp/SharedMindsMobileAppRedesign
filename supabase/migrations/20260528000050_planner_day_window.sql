-- ─────────────────────────────────────────────────────────────────
-- Planner day window
--
-- The home planner's hour grid was a fixed 7am–9pm. These let each user
-- set their own visible day window (same-day range) so early birds, late
-- owls and evening workers see the hours that matter to them.
--
-- start < end, both 0–23 (the grid renders rows from start to end
-- inclusive). Overnight/cross-midnight windows are intentionally out of
-- scope for now.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS planner_start_hour smallint NOT NULL DEFAULT 7
    CHECK (planner_start_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS planner_end_hour smallint NOT NULL DEFAULT 22
    CHECK (planner_end_hour BETWEEN 1 AND 23);

COMMENT ON COLUMN public.profiles.planner_start_hour IS
  'First hour shown on the home planner grid (0–23). Default 7 = 7am.';
COMMENT ON COLUMN public.profiles.planner_end_hour IS
  'Last hour shown on the home planner grid (1–23). Default 22 = 10pm.';
