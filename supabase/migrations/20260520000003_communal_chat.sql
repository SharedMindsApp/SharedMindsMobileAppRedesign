-- ============================================================
-- Communal Chat
-- Migration: 20260520000003_communal_chat
--
-- One global chat room shared by all authenticated users.
-- Realtime-enabled so messages arrive instantly via subscription.
-- ============================================================


-- ============================================================
-- 1. global_chat_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.global_chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Efficient lookup for the "load last 50" query + subscription ordering
CREATE INDEX IF NOT EXISTS global_chat_messages_created_idx
  ON public.global_chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS global_chat_messages_user_idx
  ON public.global_chat_messages(user_id);


-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop first so re-running the migration is always safe
DROP POLICY IF EXISTS "chat_select"     ON public.global_chat_messages;
DROP POLICY IF EXISTS "chat_insert"     ON public.global_chat_messages;
DROP POLICY IF EXISTS "chat_delete_own" ON public.global_chat_messages;

-- Any authenticated user can read all messages
CREATE POLICY "chat_select"
  ON public.global_chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own messages
CREATE POLICY "chat_insert"
  ON public.global_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages (moderation: admins via service role)
CREATE POLICY "chat_delete_own"
  ON public.global_chat_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- 3. Realtime — enable for live message delivery
-- ============================================================

-- Add to the realtime publication so subscribers get INSERT events instantly.
-- The DO block is idempotent; if already added, the exception is swallowed.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;
EXCEPTION WHEN OTHERS THEN
  -- Table already in publication, or publication doesn't exist yet — safe to ignore
  RAISE NOTICE 'supabase_realtime publication: %', SQLERRM;
END;
$$;


-- ============================================================
-- 4. Maintenance: purge messages older than 30 days
--    Call via pg_cron on Pro, or manually as needed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_old_chat_messages()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.global_chat_messages
  WHERE created_at < now() - INTERVAL '30 days';
$$;

-- Register purge cron if pg_cron is available (Pro plan)
DO $$
BEGIN
  PERFORM cron.schedule(
    'purge-chat-messages',
    '0 3 * * *',   -- 03:00 UTC daily
    'SELECT public.purge_old_chat_messages();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — schedule purge_old_chat_messages manually: %', SQLERRM;
END;
$$;


-- ============================================================
-- 5. Helper: fetch online user count
--    Returns count of profiles seen in the last 10 minutes.
--    Called by the chat panel header ("● X online").
-- ============================================================

CREATE OR REPLACE FUNCTION public.fetch_online_user_count()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.profiles
  WHERE last_seen_at > now() - INTERVAL '10 minutes';
$$;

GRANT EXECUTE ON FUNCTION public.fetch_online_user_count() TO authenticated;
