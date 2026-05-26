-- Project productivity: goals (Roadmap tab) + notes (Notes tab).
--
-- A "goal" here is a phase or deliverable the project is chasing — title,
-- optional target date, mark-complete. Kept deliberately lite: no
-- dependencies, no sub-goals, no Gantt. If the feature gets adopted we
-- layer richer concepts later.
--
-- Activity tab is deliberately not given a table — it's a derived feed
-- joining tasks / focus_sessions / project_members / project_goals
-- by created_at client-side. Adding an `activity_log` table would be
-- duplication and a maintenance burden for a feature that's purely a
-- read-side projection.

-- ── project_goals ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  target_date  date,        -- nullable — goals can be aspirational
  completed_at timestamptz, -- nullable — set when marked complete
  sort_order   int  NOT NULL DEFAULT 0,
  created_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_goals_project_idx
  ON public.project_goals (project_id, sort_order, target_date NULLS LAST);

ALTER TABLE public.project_goals ENABLE ROW LEVEL SECURITY;

-- Any project member can SELECT / INSERT / UPDATE / DELETE goals.
-- We don't enforce role distinctions at the goal level (matches the
-- tasks policy — same RLS pattern).

DROP POLICY IF EXISTS "goals_select_member" ON public.project_goals;
CREATE POLICY "goals_select_member"
  ON public.project_goals FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
     WHERE pm.project_id = project_goals.project_id
       AND pm.user_id    = auth.uid()
  ));

DROP POLICY IF EXISTS "goals_insert_member" ON public.project_goals;
CREATE POLICY "goals_insert_member"
  ON public.project_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.project_members pm
             WHERE pm.project_id = project_goals.project_id
               AND pm.user_id    = auth.uid())
    AND NOT public.current_user_is_suspended()
  );

DROP POLICY IF EXISTS "goals_update_member" ON public.project_goals;
CREATE POLICY "goals_update_member"
  ON public.project_goals FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
     WHERE pm.project_id = project_goals.project_id
       AND pm.user_id    = auth.uid()
  ));

DROP POLICY IF EXISTS "goals_delete_member" ON public.project_goals;
CREATE POLICY "goals_delete_member"
  ON public.project_goals FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
     WHERE pm.project_id = project_goals.project_id
       AND pm.user_id    = auth.uid()
  ));

-- Bump updated_at on UPDATE.
CREATE OR REPLACE FUNCTION public.touch_project_goals_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS project_goals_set_updated_at ON public.project_goals;
CREATE TRIGGER project_goals_set_updated_at
  BEFORE UPDATE ON public.project_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_goals_updated_at();

-- ── project_notes ──────────────────────────────────────────────────────
-- Long-form project thinking lives WITH the project, not in a separate
-- doc tool. Each note is a freeform text block. Multiple notes per project
-- so users can have separate "scratch" / "decisions" / "research" blocks
-- without forcing structure on day one.

CREATE TABLE IF NOT EXISTS public.project_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       text,
  body        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_notes_project_idx
  ON public.project_notes (project_id, updated_at DESC);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Members can read all notes in the project. Only the author can edit or
-- delete their own — keeps collaborative notes from being silently rewritten.

DROP POLICY IF EXISTS "project_notes_select_member" ON public.project_notes;
CREATE POLICY "project_notes_select_member"
  ON public.project_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_members pm
     WHERE pm.project_id = project_notes.project_id
       AND pm.user_id    = auth.uid()
  ));

DROP POLICY IF EXISTS "project_notes_insert_member" ON public.project_notes;
CREATE POLICY "project_notes_insert_member"
  ON public.project_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.project_members pm
                 WHERE pm.project_id = project_notes.project_id
                   AND pm.user_id    = auth.uid())
    AND NOT public.current_user_is_suspended()
  );

DROP POLICY IF EXISTS "project_notes_update_author" ON public.project_notes;
CREATE POLICY "project_notes_update_author"
  ON public.project_notes FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "project_notes_delete_author" ON public.project_notes;
CREATE POLICY "project_notes_delete_author"
  ON public.project_notes FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_project_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS project_notes_set_updated_at ON public.project_notes;
CREATE TRIGGER project_notes_set_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_notes_updated_at();
