-- Per-participant intentions: each session participant declares their own
-- intention in the waiting room. The row in session_outcomes is created at
-- that moment; the outcome is filled in later by the debrief.
--
-- Originally outcome was NOT NULL because rows were only created at debrief
-- time. Relax that so we can insert intention-only rows pre-start.

ALTER TABLE session_outcomes
  ALTER COLUMN outcome DROP NOT NULL;

-- Outcome stays constrained to the same enum when set — the CHECK constraint
-- already allows NULL by default (CHECK constraints only fail on FALSE,
-- not on UNKNOWN). No change needed there.

COMMENT ON COLUMN session_outcomes.outcome IS
  'Outcome picked in the live debrief. NULL until the debrief runs. NOT NULL once filled in.';
COMMENT ON COLUMN session_outcomes.declared_goal IS
  'What this participant said they were working on. Captured in the waiting room or at session declaration time.';
