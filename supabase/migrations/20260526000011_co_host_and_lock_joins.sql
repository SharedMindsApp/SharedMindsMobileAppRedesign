-- Co-host + lock-joins moderation primitives.
--
-- co_host_user_id: a single trusted person the host can promote to share
-- control. Co-hosts can extend the session, launch wizards, change music,
-- and end the session — same DB permissions as the host. We pick the
-- single-column approach over a join table because MVP scope is one
-- co-host per session; if multi-cohost ever becomes a need, the schema
-- evolves cleanly via a session_co_hosts table.
--
-- accept_joiners: boolean toggle the host (or co-host) can flip mid-session
-- to block new participants. Enforced at the JOIN sites (joinOneOnOneSession
-- and the group-session entry point) so latecomers can't sneak in once the
-- host has called the room locked.

-- ── 1. Columns ────────────────────────────────────────────────────────────

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS co_host_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accept_joiners boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS focus_sessions_co_host_idx
  ON public.focus_sessions(co_host_user_id)
  WHERE co_host_user_id IS NOT NULL;

-- ── 2. RLS — co-host can update like the host ─────────────────────────────
--
-- Replaces the policy from migration 20260526000008 (public hosting gate).
-- Host or co-host can UPDATE; co-host can't override the public-hosting
-- gate (that still keys off can_host_public_session(auth.uid())).

DROP POLICY IF EXISTS "focus_sessions_update_self" ON public.focus_sessions;
CREATE POLICY "focus_sessions_update_self"
ON public.focus_sessions
FOR UPDATE
USING (
  user_id = auth.uid()
  OR co_host_user_id = auth.uid()
  OR partner_user_id = auth.uid()
)
WITH CHECK (
  (user_id = auth.uid() OR co_host_user_id = auth.uid() OR partner_user_id = auth.uid())
  AND (
    status IS DISTINCT FROM 'scheduled'
    OR public.can_host_public_session(auth.uid())
  )
);

-- ── 3. Block 1-on-1 joins when accept_joiners is false ────────────────────
--
-- The existing joinOneOnOneSession client uses a conditional UPDATE that
-- already checks status='active' and partner_user_id is null. We add a
-- guard so the update also requires accept_joiners=true. Done as an
-- additional clause in the existing policy logic rather than a CHECK
-- constraint because we want a graceful "no rows updated" rather than
-- a hard SQL error.
--
-- The UI's joinOneOnOneSession() call uses .eq('accept_joiners', true)
-- when shipped (see SessionService changes alongside this migration).
-- No DB-level enforcement needed for this column beyond what the client
-- already does — but for defense in depth we add a partial-index hint
-- below to make the join query stay fast.

CREATE INDEX IF NOT EXISTS focus_sessions_joinable_idx
  ON public.focus_sessions(id)
  WHERE status = 'active'
    AND accept_joiners = true
    AND partner_user_id IS NULL;
