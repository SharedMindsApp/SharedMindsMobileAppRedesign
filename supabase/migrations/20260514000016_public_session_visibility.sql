-- Public visibility of community activity for the marketing site.
--
-- Anonymous (unauthenticated) visitors to sharedminds.app need to see what
-- coworking activity is happening / planned, so they can decide whether
-- it's worth signing up. Without visible activity, the calendar looks
-- dead and conversion suffers.
--
-- This migration explicitly grants the `anon` role read access to:
--   1. Non-solo ACTIVE sessions (already implicitly allowed, made explicit here)
--   2. Non-solo SCHEDULED sessions (the new bit — for the public calendar)
--
-- Solo sessions remain private (status filter excludes them). Private 1-on-1
-- sessions that have been claimed are still visible — that's intentional,
-- they're still part of "what's happening today" even if joining is closed.
--
-- Profile data joined via foreign key (display_name, avatar_url) is already
-- visible to anon via the existing profiles policy.

DROP POLICY IF EXISTS "focus_sessions_public_community_view" ON public.focus_sessions;
CREATE POLICY "focus_sessions_public_community_view"
ON public.focus_sessions FOR SELECT
TO anon
USING (
  -- Active community sessions (live "working now" feed)
  (status = 'active' AND session_mode <> 'solo')
  -- Upcoming scheduled community sessions (public calendar)
  OR (status = 'scheduled' AND session_mode <> 'solo' AND scheduled_at IS NOT NULL)
  -- Recently shipped sessions (last 24h) — social proof for the marketing site
  OR (
    status = 'completed'
    AND session_mode <> 'solo'
    AND ended_at IS NOT NULL
    AND ended_at > (now() - interval '24 hours')
  )
);
