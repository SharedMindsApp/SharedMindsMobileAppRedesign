-- ============================================================
-- DM Privacy / Do Not Disturb
-- Migration: 20260520000004_dm_privacy
--
-- Adds dm_privacy to profiles:
--   'open'              — anyone can DM you (default)
--   'connections_only'  — only accepted connections can DM you
--   'do_not_disturb'    — nobody can start a new DM with you
--
-- Enforcement happens in the get_or_create_dm() RPC so it's
-- enforced at the DB layer regardless of which client calls it.
-- ============================================================


-- 1. Add the column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dm_privacy text NOT NULL DEFAULT 'open'
  CHECK (dm_privacy IN ('open', 'connections_only', 'do_not_disturb'));


-- 2. Helper: check whether current user is allowed to DM another user.
--    Returns true if allowed, false if not.
--    Used by get_or_create_dm() below.
CREATE OR REPLACE FUNCTION public.check_dm_allowed(recipient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privacy  text;
  v_connected boolean;
BEGIN
  -- Fetch recipient's privacy setting
  SELECT dm_privacy INTO v_privacy
  FROM public.profiles
  WHERE id = recipient_id;

  IF v_privacy IS NULL THEN
    -- Profile not found — allow (fail open)
    RETURN true;
  END IF;

  -- Do not disturb: always block
  IF v_privacy = 'do_not_disturb' THEN
    RETURN false;
  END IF;

  -- Connections only: check for accepted connection
  IF v_privacy = 'connections_only' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.person_connections
      WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = recipient_id)
          OR
          (addressee_id = auth.uid() AND requester_id = recipient_id)
        )
    ) INTO v_connected;

    RETURN v_connected;
  END IF;

  -- 'open' — allow everyone
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_dm_allowed(uuid) TO authenticated;


-- 3. Replace get_or_create_dm() to enforce dm_privacy.
--    If the recipient blocks the sender, raises an exception
--    with a SQLSTATE that the client can detect.
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_privacy         text;
BEGIN
  -- Users cannot DM themselves
  IF other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot create a conversation with yourself'
      USING ERRCODE = 'P0001';
  END IF;

  -- Enforce dm_privacy (skip check if DM already exists — user already connected)
  SELECT EXISTS (
    SELECT 1
    FROM public.dm_participants p1
    JOIN public.dm_participants p2 ON p1.conversation_id = p2.conversation_id
    WHERE p1.user_id = auth.uid()
      AND p2.user_id = other_user_id
  ) INTO STRICT v_conversation_id
  USING (SELECT id FROM public.dm_conversations LIMIT 1); -- dummy; we re-query below

  -- Simpler: try to find existing conversation first
  SELECT p1.conversation_id INTO v_conversation_id
  FROM public.dm_participants p1
  JOIN public.dm_participants p2 ON p1.conversation_id = p2.conversation_id
  WHERE p1.user_id = auth.uid()
    AND p2.user_id = other_user_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    -- Conversation already exists — no privacy gate needed
    RETURN v_conversation_id;
  END IF;

  -- NEW conversation: check privacy gate
  IF NOT public.check_dm_allowed(other_user_id) THEN
    SELECT dm_privacy INTO v_privacy FROM public.profiles WHERE id = other_user_id;

    IF v_privacy = 'do_not_disturb' THEN
      RAISE EXCEPTION 'This person is not accepting messages right now'
        USING ERRCODE = 'P0002', HINT = 'do_not_disturb';
    ELSE
      RAISE EXCEPTION 'This person only accepts messages from their connections'
        USING ERRCODE = 'P0002', HINT = 'connections_only';
    END IF;
  END IF;

  -- Create new conversation
  INSERT INTO public.dm_conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.dm_participants (conversation_id, user_id) VALUES
    (v_conversation_id, auth.uid()),
    (v_conversation_id, other_user_id);

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;
