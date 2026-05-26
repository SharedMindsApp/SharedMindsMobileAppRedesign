-- Task ↔ session lifecycle plumbing.
--
-- Two changes:
--   1. Link tasks to weekly intentions, so completing a session task can
--      automatically tick off the strategic intention it serves.
--   2. Add a small denormalized "last_session_outcome" cache so the task
--      picker can sort "continue from yesterday" tasks to the top without
--      a per-row subquery on every render.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS weekly_intention_id uuid REFERENCES weekly_intentions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_session_outcome text
    CHECK (last_session_outcome IN ('finished', 'partially', 'something_came_up', 'no_answer')),
  ADD COLUMN IF NOT EXISTS last_session_at timestamptz,
  ADD COLUMN IF NOT EXISTS sessions_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS tasks_weekly_intention_idx
  ON tasks(weekly_intention_id) WHERE weekly_intention_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_continue_idx
  ON tasks(last_session_at DESC NULLS LAST)
  WHERE status IN ('inbox', 'active')
    AND last_session_outcome IN ('partially', 'something_came_up');

COMMENT ON COLUMN tasks.weekly_intention_id IS
  'If this task is tracking a weekly intention, the FK to it. Completing the task auto-marks the intention completed.';
COMMENT ON COLUMN tasks.last_session_outcome IS
  'Outcome of the most recent debrief for this task. Used by the picker to surface "continue from where you left off" cards.';
COMMENT ON COLUMN tasks.last_session_at IS
  'Timestamp of the most recent session linked to this task.';
COMMENT ON COLUMN tasks.sessions_count IS
  'Running count of sessions worked on this task. Drives "3 sessions logged" badges.';
