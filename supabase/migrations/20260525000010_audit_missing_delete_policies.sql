-- Audit fix: tables with RLS enabled but no DELETE policy.
--
-- Same root cause as 20260525000009_tasks_delete_policy.sql — RLS is
-- deny-by-default, so any client-side .delete() against these tables
-- silently returns "0 rows affected" rather than an error. The
-- optimistic UI hides the row but the next refetch restores it.
--
-- Audit found four affected client paths:
--   • ProjectService.deleteProject        → projects
--   • ReflectionService.deleteIntention   → weekly_intentions
--   • ReflectionService.deleteReflection  → weekly_reflections
--   • DailyOSService.deletePlan           → daily_plans
--
-- Intentionally NOT covered (immutable by design):
--   • content_flags, moderation_actions, flag_evidence, user_warnings
--     → audit log; admins can soft-action but never hard-delete
--   • dm_messages, global_chat_messages
--     → safeguarding retention; soft-delete via deleted_at only

-- ── projects ─────────────────────────────────────────────────────────
-- Only the owner can hard-delete a project. Collaborators can only
-- leave (delete their own project_members row, policy already exists).
DROP POLICY IF EXISTS "projects_delete_if_owner" ON public.projects;
CREATE POLICY "projects_delete_if_owner"
  ON public.projects FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
     WHERE pm.project_id = projects.id
       AND pm.user_id    = auth.uid()
       AND pm.role       = 'owner'
  ));

-- ── weekly_intentions ────────────────────────────────────────────────
-- Personal to the user; only they can delete.
DROP POLICY IF EXISTS "weekly_intentions_delete_own" ON public.weekly_intentions;
CREATE POLICY "weekly_intentions_delete_own"
  ON public.weekly_intentions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── weekly_reflections ───────────────────────────────────────────────
DROP POLICY IF EXISTS "weekly_reflections_delete_own" ON public.weekly_reflections;
CREATE POLICY "weekly_reflections_delete_own"
  ON public.weekly_reflections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── daily_plans ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "daily_plans_delete_own" ON public.daily_plans;
CREATE POLICY "daily_plans_delete_own"
  ON public.daily_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
