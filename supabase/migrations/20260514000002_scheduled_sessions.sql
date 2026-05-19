-- Sprint 3: Scheduled sessions + shareable join links

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'drop_in'
    CHECK (session_type IN ('drop_in', 'scheduled')),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_title text,
  ADD COLUMN IF NOT EXISTS join_code text;

-- Unique index on join_code (allows nulls for drop-in sessions)
CREATE UNIQUE INDEX IF NOT EXISTS focus_sessions_join_code_idx
  ON public.focus_sessions(join_code)
  WHERE join_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS focus_sessions_scheduled_at_idx
  ON public.focus_sessions(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- Expand SELECT policy so any authenticated user can see upcoming scheduled sessions
-- (needed for the public join page to show session info)
DROP POLICY IF EXISTS "focus_sessions_select_policy" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select_policy"
ON public.focus_sessions FOR SELECT
USING (
  user_id = auth.uid()                                   -- always see own sessions
  OR status = 'active'                                   -- live sessions (community feed)
  OR (session_type = 'scheduled' AND status = 'scheduled') -- upcoming sessions (join page)
);
