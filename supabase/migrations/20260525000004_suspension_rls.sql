-- Enforce suspension at the RLS layer for write paths.
--
-- AuthProvider already signs suspended users out on next login, but an
-- existing session could write for the lifetime of that session. We close
-- the gap by adding a helper function and tightening the INSERT policies
-- on every user-content surface: messages, posts, connections, flags,
-- session declarations.
--
-- We use a SECURITY DEFINER helper so we can call it from policies
-- without touching the policy expression itself for every row.

CREATE OR REPLACE FUNCTION public.current_user_is_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid()
       AND suspended_until IS NOT NULL
       AND suspended_until > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_suspended() TO authenticated;

-- ── Tighten write policies ─────────────────────────────────────────────
--
-- Pattern: for each table, find the existing "insert own" policy and
-- replace it with one that ALSO checks the user is not suspended.
-- We use DROP IF EXISTS + CREATE so it's idempotent if rerun.

-- Global chat
DROP POLICY IF EXISTS "chat_insert_own" ON public.global_chat_messages;
CREATE POLICY "chat_insert_own"
  ON public.global_chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.current_user_is_suspended());

-- DMs
DROP POLICY IF EXISTS "dm_insert_own" ON public.dm_messages;
CREATE POLICY "dm_insert_own"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND NOT public.current_user_is_suspended());

-- Community posts (column is `author_id` not `user_id`)
DROP POLICY IF EXISTS "posts_insert_own" ON public.community_posts;
CREATE POLICY "posts_insert_own"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT public.current_user_is_suspended());

-- Community post replies (column is `author_id` not `user_id`)
DROP POLICY IF EXISTS "replies_insert_own" ON public.community_post_replies;
CREATE POLICY "replies_insert_own"
  ON public.community_post_replies FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT public.current_user_is_suspended());

-- Connection requests
DROP POLICY IF EXISTS "connections_insert_requester" ON public.connections;
CREATE POLICY "connections_insert_requester"
  ON public.connections FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND NOT public.current_user_is_suspended());

-- Focus sessions (declaring a new session)
DROP POLICY IF EXISTS "sessions_insert_own" ON public.focus_sessions;
CREATE POLICY "sessions_insert_own"
  ON public.focus_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.current_user_is_suspended());

-- Note: blocking, reporting (content_flags), and reading remain available
-- to suspended users — they can still safety-flag others and view their
-- own past content. They just can't create new content or social bonds.
