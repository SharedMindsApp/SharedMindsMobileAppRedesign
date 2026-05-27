-- Retire the dm_messages_notify trigger so DMs stop duplicating into
-- the notifications bell.
--
-- Why: the Chat nav tab + the Messages page already display an unread
-- count read directly from `dm_messages` / `dm_participants.last_read_at`.
-- The bell has been mirroring those as `new_dm` notification rows since
-- 20260520000002_email_pipeline.sql — which doubles every DM (one badge
-- on the bell, one badge on the Chat tab) and forces users to mark them
-- read in two places.
--
-- The LinkedIn / Facebook / X pattern is clean separation: bell = app +
-- session activity, envelope/chat icon = DMs. Each surface owns its own
-- unread state. We adopt that here by simply dropping the trigger.
--
-- We DON'T drop the `new_dm` type from the CHECK constraint or remove
-- it from the category mapper — old rows persist in production and we
-- want them to render correctly until they're naturally dismissed. The
-- email pipeline (`dispatch-notifications`) also doesn't fire for DMs
-- anymore as a side effect (no rows to dispatch), which matches the
-- expectation that DMs are an in-app social channel, not an email one.

DROP TRIGGER IF EXISTS dm_messages_notify ON public.dm_messages;

-- Leave notify_on_dm() the function definition alone — it's harmless
-- as orphan code and we may want to revive it for a digest-style
-- "you have N unread DMs from M people" daily roll-up later. If/when
-- we're sure it stays dead, a future migration can DROP FUNCTION.

COMMENT ON FUNCTION public.notify_on_dm() IS
  'Retired in 20260527000021 — trigger dropped. Function kept on disk for possible future digest reuse.';
