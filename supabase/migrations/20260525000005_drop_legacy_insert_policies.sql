-- Follow-up to 20260525000004_suspension_rls.sql.
--
-- The previous migration created suspension-guarded INSERT policies under
-- new names but didn't drop the original permissive policies (which had
-- different names than I expected). Postgres RLS combines policies for
-- the same command with OR — so a suspended user could still write
-- through the original policy.
--
-- Drop them now so only the guarded policies remain active.
--
-- Each DROP is IF EXISTS so this is idempotent / safe to re-run.

-- Global chat
DROP POLICY IF EXISTS "chat_insert" ON public.global_chat_messages;

-- DMs
DROP POLICY IF EXISTS "dm_messages_insert" ON public.dm_messages;

-- Community posts (manual user-authored posts)
DROP POLICY IF EXISTS "community_posts_insert_manual_self" ON public.community_posts;

-- Community post replies
DROP POLICY IF EXISTS "post_replies_insert_self" ON public.community_post_replies;

-- Focus session declarations
DROP POLICY IF EXISTS "focus_sessions_insert_self" ON public.focus_sessions;

-- Connection requests
DROP POLICY IF EXISTS "connections_insert" ON public.connections;

-- Verification helper — lists the live INSERT policies per table.
-- Run as admin if you want to confirm only the guarded versions remain:
--
--   SELECT tablename, policyname, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND cmd = 'INSERT'
--      AND tablename IN ('global_chat_messages', 'dm_messages',
--                        'community_posts', 'community_post_replies',
--                        'focus_sessions', 'connections')
--    ORDER BY tablename;
