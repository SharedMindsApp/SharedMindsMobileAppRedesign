-- ============================================================
-- Scheduled 1-on-1 invites
-- ============================================================
-- A scheduled 1-on-1 only makes sense WITH a specific person (otherwise
-- you'd use Match-me-now for a random partner). This migration adds the
-- invite ledger + accept RPC so a host can invite either:
--   • a connection  → invited_user_id set; the host also pre-sets
--                      focus_sessions.partner_user_id to reserve the seat.
--   • an email      → invited_email + invite_token; the recipient accepts
--                      via /session-invite/:token, which claims the seat.
--
-- Apply manually via the Supabase dashboard (same as the other pending
-- migrations). Safe to re-run (guards throughout).
-- ============================================================

-- ── 1. Extend notifications.type CHECK to allow 'session_invite' ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'notifications'
      AND constraint_name = 'notifications_type_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'notifications'
      AND constraint_name = 'notifications_type_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (type IN (
        -- Scheduled / time-based
        'session_reminder_24h',
        'session_reminder_15min',
        'session_reminder_5min',
        'weekly_review_prompt',
        'onboarding_day_1',
        'onboarding_day_3',
        'onboarding_day_7',
        'community_session_reminder',
        -- Reactive social
        'new_dm',
        'post_reply',
        'post_reaction',
        'connection_request',
        'connection_accepted',
        'project_invite',
        'stuck_help_offered',
        -- Session lifecycle
        'partner_joined',
        'session_now',
        'partner_no_show',
        'session_completed',
        'session_missed',
        'streak_at_risk',
        -- NEW: a connection/email was invited to a scheduled 1-on-1
        'session_invite'
      ));
  END IF;
END;
$$;

-- ── 2. session_invites table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.focus_sessions(id) ON DELETE CASCADE,
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Exactly one of these is set: a known user (connection) OR an email.
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email   text,
  -- Built-in gen_random_uuid() (no pgcrypto needed); two concatenated for
  -- a long, unguessable token.
  invite_token    text NOT NULL UNIQUE
                    DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  accepted_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_invites_target_chk
    CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS session_invites_session_idx ON public.session_invites(session_id);
CREATE INDEX IF NOT EXISTS session_invites_invited_user_idx ON public.session_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS session_invites_token_idx ON public.session_invites(invite_token);

ALTER TABLE public.session_invites ENABLE ROW LEVEL SECURITY;

-- Inviter manages invites for their own sessions; invitee can read theirs.
DROP POLICY IF EXISTS session_invites_select ON public.session_invites;
CREATE POLICY session_invites_select ON public.session_invites
  FOR SELECT USING (
    auth.uid() = invited_by
    OR auth.uid() = invited_user_id
  );

DROP POLICY IF EXISTS session_invites_insert ON public.session_invites;
CREATE POLICY session_invites_insert ON public.session_invites
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM public.focus_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS session_invites_delete ON public.session_invites;
CREATE POLICY session_invites_delete ON public.session_invites
  FOR DELETE USING (auth.uid() = invited_by);

-- ── 3. accept_session_invite(token) RPC ───────────────────────
-- SECURITY DEFINER: validates the token, claims the partner seat for the
-- caller (only if still open), and marks the invite accepted. Returns the
-- session id so the client can navigate to it. Idempotent-ish: re-accepting
-- your own already-accepted invite returns the session id again.
CREATE OR REPLACE FUNCTION public.accept_session_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite   public.session_invites%ROWTYPE;
  v_session  public.focus_sessions%ROWTYPE;
  v_uid      uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.session_invites WHERE invite_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v_invite.status = 'cancelled' THEN
    RAISE EXCEPTION 'This invite was cancelled';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  -- If it was addressed to a specific user, only that user may accept.
  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id <> v_uid THEN
    RAISE EXCEPTION 'This invite is for someone else';
  END IF;

  SELECT * INTO v_session FROM public.focus_sessions WHERE id = v_invite.session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session no longer exists';
  END IF;

  -- Claim the seat if still open (or already ours).
  IF v_session.partner_user_id IS NULL THEN
    UPDATE public.focus_sessions
      SET partner_user_id = v_uid
      WHERE id = v_session.id AND partner_user_id IS NULL;
  ELSIF v_session.partner_user_id <> v_uid THEN
    RAISE EXCEPTION 'This session already has a partner';
  END IF;

  UPDATE public.session_invites
    SET status = 'accepted', accepted_by = v_uid, accepted_at = now()
    WHERE id = v_invite.id AND status <> 'accepted';

  RETURN v_session.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_session_invite(text) TO authenticated;

-- ── 4. invite_connection_to_session(session, user) RPC ────────
-- Connection-invite path. SECURITY DEFINER so it can (a) reserve the seat
-- and (b) insert a notification row addressed to the invitee (a direct
-- client insert for another user would violate the notifications RLS).
-- Validates the caller owns a 1-on-1 session with an open seat.
CREATE OR REPLACE FUNCTION public.invite_connection_to_session(
  p_session_id uuid,
  p_user_id    uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session  public.focus_sessions%ROWTYPE;
  v_invite_id uuid;
  v_uid      uuid := auth.uid();
  v_host     text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot invite yourself';
  END IF;

  SELECT * INTO v_session FROM public.focus_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_session.user_id <> v_uid THEN
    RAISE EXCEPTION 'Only the host can invite';
  END IF;
  IF v_session.session_mode <> 'one_on_one' THEN
    RAISE EXCEPTION 'Only 1-on-1 sessions can be invited to';
  END IF;
  IF v_session.partner_user_id IS NOT NULL AND v_session.partner_user_id <> p_user_id THEN
    RAISE EXCEPTION 'This session already has a partner';
  END IF;

  -- Reserve the seat for the invitee.
  UPDATE public.focus_sessions
    SET partner_user_id = p_user_id
    WHERE id = p_session_id;

  -- Ledger row (accepted immediately for connections — the seat is reserved;
  -- they just need to show up).
  INSERT INTO public.session_invites (session_id, invited_by, invited_user_id, status, accepted_by, accepted_at)
    VALUES (p_session_id, v_uid, p_user_id, 'accepted', p_user_id, now())
    RETURNING id INTO v_invite_id;

  -- Notify the invitee.
  SELECT COALESCE(display_name, 'Someone') INTO v_host
    FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, type, title, body, related_id, deep_link, data)
    VALUES (
      p_user_id,
      'session_invite',
      v_host || ' invited you to a focus session',
      COALESCE(v_session.session_title, v_session.session_goal, 'A 1-on-1 focus session'),
      p_session_id,
      '/session/' || p_session_id::text,
      jsonb_build_object(
        'session_id', p_session_id,
        'host_name', v_host,
        'scheduled_at', v_session.scheduled_at
      )
    );

  RETURN v_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_connection_to_session(uuid, uuid) TO authenticated;
