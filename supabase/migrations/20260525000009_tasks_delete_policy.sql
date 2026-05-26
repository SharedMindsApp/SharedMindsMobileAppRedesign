-- Bug fix: the `tasks` table had INSERT / UPDATE / SELECT policies but
-- no DELETE policy. RLS is deny-by-default, so every task delete was
-- silently filtered to zero affected rows — the UI's optimistic remove
-- hid the row but the next refetch restored it.
--
-- Mirrors the existing `tasks_update_if_manageable` pattern: you can
-- delete a task if you're a member of the space it lives in OR (when
-- the task is project-scoped) a member of that project.

DROP POLICY IF EXISTS "tasks_delete_if_manageable" ON public.tasks;

CREATE POLICY "tasks_delete_if_manageable"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    -- Space-scoped tasks: must be a space member
    (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.space_members sm
       WHERE sm.space_id = tasks.space_id
         AND sm.user_id  = auth.uid()
    ))
    OR
    -- Project-scoped tasks: must be a project member
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_members pm
       WHERE pm.project_id = tasks.project_id
         AND pm.user_id    = auth.uid()
    ))
  );
