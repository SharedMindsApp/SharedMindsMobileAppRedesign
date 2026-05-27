-- Retire the auto-share of new projects to the community feed.
--
-- The original trigger (20260519000006_community_feed.sql) posted
-- every new project to the community feed with its full title +
-- description, unless the user set is_private=true. That's the
-- wrong default — projects are by their nature sensitive
-- (confidential client work, personal goals, side projects users
-- aren't ready to talk about). A privacy model should be private
-- by default, not public-unless-flagged.
--
-- This migration:
--   1. Drops the `project_started_community_post` trigger so future
--      projects don't auto-post.
--   2. Soft-hides existing auto-posted project posts by deleting
--      them. The original projects are unaffected — only the
--      community post copies of their data go away. Users see them
--      vanish from the feed on next refresh.
--
-- The function `community_post_on_project_started()` stays on disk
-- (orphaned) in case we want to revive a manual "Share this
-- project" action later — that would call the function explicitly
-- on user button-press rather than via an INSERT trigger. Clean
-- separation between automatic data leak and user-initiated share.

-- 1. Drop the auto-post trigger
DROP TRIGGER IF EXISTS project_started_community_post ON public.projects;

-- 2. Remove existing auto-posted project posts. The 'is_auto = true'
-- filter narrows to rows created by the trigger we just dropped —
-- manual posts that happen to reference a project (e.g. someone
-- wrote a "Working on" post linked to a project) are kept because
-- those WERE user-initiated.
DELETE FROM public.community_posts
WHERE post_type = 'project_started'
  AND is_auto = true;

COMMENT ON FUNCTION public.community_post_on_project_started() IS
  'Retired in 20260528000001 — auto-trigger dropped. Function kept '
  'on disk so a future user-initiated "Share this project" button '
  'can call it explicitly.';
