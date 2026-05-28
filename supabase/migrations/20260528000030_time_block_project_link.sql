-- ─────────────────────────────────────────────────────────────────
-- Link time blocks to a project
--
-- A block can now be pinned to a project so the home planner can hold
-- one project in the morning and another in the afternoon, and the tasks
-- shown inside a block are scoped to that project. Nullable — a block can
-- still be a general/unlinked slot (break, personal, admin).
--
-- Soft model: the block stores only project_id. The tasks "inside" it are
-- that project's tasks scheduled for the block's day — no per-task block
-- column, so a task is never trapped in a single block.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.daily_time_blocks
  ADD COLUMN IF NOT EXISTS project_id uuid
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS daily_time_blocks_project_idx
  ON public.daily_time_blocks(project_id);

COMMENT ON COLUMN public.daily_time_blocks.project_id IS
  'Optional project this block is dedicated to. Tasks shown inside the block are scoped to this project. NULL = general block.';
