-- Community Coworking Pivot: create/extend focus_sessions and open RLS for community presence

-- 1. Create focus_sessions if it does not already exist
--    (it may have been created manually; IF NOT EXISTS makes this safe either way)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  project_id                uuid,
  domain_id                 uuid,                -- nullable — community sessions don't use guardrails domains
  start_time                timestamptz not null default now(),
  end_time                  timestamptz,
  ended_at                  timestamptz,
  status                    text not null default 'active'
                              check (status in ('active', 'paused', 'completed', 'cancelled')),
  intended_duration_minutes integer,
  actual_duration_minutes   integer,
  focus_score               numeric,
  drift_count               integer not null default 0,
  distraction_count         integer not null default 0,
  target_end_time           timestamptz,
  goal_minutes              integer,
  -- Community session fields
  session_goal              text,
  session_task_id           uuid references public.tasks(id) on delete set null,
  session_outcome           text check (session_outcome in ('finished', 'partially', 'something_came_up')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- 2. If the table already existed, add the community columns idempotently
ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS session_goal text,
  ADD COLUMN IF NOT EXISTS session_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_outcome text CHECK (
    session_outcome IN ('finished', 'partially', 'something_came_up')
  );

-- 3. Make domain_id nullable for community sessions (no-op if already nullable)
ALTER TABLE public.focus_sessions
  ALTER COLUMN domain_id DROP NOT NULL;

-- 4. Index for RLS subquery and live feed queries
CREATE INDEX IF NOT EXISTS focus_sessions_status_idx
  ON public.focus_sessions(status);

CREATE INDEX IF NOT EXISTS focus_sessions_user_status_idx
  ON public.focus_sessions(user_id, status);

-- 5. RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own sessions
CREATE POLICY IF NOT EXISTS "focus_sessions_insert_self"
ON public.focus_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own sessions
CREATE POLICY IF NOT EXISTS "focus_sessions_update_self"
ON public.focus_sessions FOR UPDATE
USING (user_id = auth.uid());

-- Open SELECT: own sessions always visible; any member's ACTIVE session visible
DROP POLICY IF EXISTS "focus_sessions_select_self" ON public.focus_sessions;
DROP POLICY IF EXISTS "focus_sessions_select_policy" ON public.focus_sessions;
CREATE POLICY "focus_sessions_select_policy"
ON public.focus_sessions FOR SELECT
USING (
  user_id = auth.uid()    -- always see your own sessions (all statuses)
  OR status = 'active'    -- see any member's currently active sessions
);

-- 6. Expand profiles visibility so session cards can show display_name
DROP POLICY IF EXISTS "profiles_select_active_session_owners" ON public.profiles;
CREATE POLICY "profiles_select_active_session_owners"
ON public.profiles FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.focus_sessions fs
    WHERE fs.user_id = id
      AND fs.status = 'active'
  )
);

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_focus_session_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS focus_sessions_updated_at ON public.focus_sessions;
CREATE TRIGGER focus_sessions_updated_at
  BEFORE UPDATE ON public.focus_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_focus_session_updated_at();

-- 8. Reset all users to the new MVP navigation
UPDATE public.user_ui_preferences
SET favourite_nav_tabs = '["sessions","tasks","projects","settings"]'::jsonb;
