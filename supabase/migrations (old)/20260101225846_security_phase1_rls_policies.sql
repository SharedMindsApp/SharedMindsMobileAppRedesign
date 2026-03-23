/*
  # Security Hardening Phase 1: Add RLS Policies
  
  Adds minimal, explicit RLS policies to tables that have RLS enabled but no policies.
  
  NO PERMISSION EXPANSION - follows existing patterns in the codebase.
  
  Tables updated (2):
  - waitlist (public INSERT, owner SELECT/UPDATE)
  - side_project_tasks (owner manages via side_projects ownership)
*/

-- ============================================================================
-- WAITLIST POLICIES
-- ============================================================================
-- Purpose: Public waitlist signup table
-- Ownership: user_id (set after conversion from email-only signup)
-- Pattern: Public can join, only owner can read/update their entry

-- Public can insert (anyone can join waitlist)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can read their own waitlist entry
CREATE POLICY "Users can read own waitlist entry"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own waitlist entry
CREATE POLICY "Users can update own waitlist entry"
  ON public.waitlist
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SIDE_PROJECT_TASKS POLICIES
-- ============================================================================
-- Purpose: Tasks within side projects
-- Ownership: Via side_projects -> master_projects -> user_id
-- Pattern: Follows existing side_projects ownership model

-- Users can view tasks for their side projects
CREATE POLICY "Users can view tasks for their side projects"
  ON public.side_project_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM side_projects sp
      JOIN master_projects mp ON sp.master_project_id = mp.id
      WHERE sp.id = side_project_tasks.side_project_id
        AND mp.user_id = auth.uid()
    )
  );

-- Users can create tasks for their side projects
CREATE POLICY "Users can create tasks for their side projects"
  ON public.side_project_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM side_projects sp
      JOIN master_projects mp ON sp.master_project_id = mp.id
      WHERE sp.id = side_project_tasks.side_project_id
        AND mp.user_id = auth.uid()
    )
  );

-- Users can update tasks for their side projects
CREATE POLICY "Users can update tasks for their side projects"
  ON public.side_project_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM side_projects sp
      JOIN master_projects mp ON sp.master_project_id = mp.id
      WHERE sp.id = side_project_tasks.side_project_id
        AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM side_projects sp
      JOIN master_projects mp ON sp.master_project_id = mp.id
      WHERE sp.id = side_project_tasks.side_project_id
        AND mp.user_id = auth.uid()
    )
  );

-- Users can delete tasks for their side projects
CREATE POLICY "Users can delete tasks for their side projects"
  ON public.side_project_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM side_projects sp
      JOIN master_projects mp ON sp.master_project_id = mp.id
      WHERE sp.id = side_project_tasks.side_project_id
        AND mp.user_id = auth.uid()
    )
  );
