-- ============================================================
-- Content Moderation Infrastructure
-- ============================================================
-- 1. Soft-delete columns on all message surfaces
-- 2. content_flags  — user-submitted reports
-- 3. moderation_actions — immutable admin audit log
-- 4. user_blocks    — self-serve user blocking
-- 5. Remove / replace the 30-day chat purge cron (safeguarding)
-- 6. Update notification type constraint → add 'content_flagged'
-- 7. RLS policies for every new table
-- ============================================================

-- ── 1. Soft-delete columns ───────────────────────────────────

-- Global chat
ALTER TABLE public.global_chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- DMs
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Community posts
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Post replies
ALTER TABLE public.community_post_replies
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 2. content_flags — one row per user report ──────────────

CREATE TABLE IF NOT EXISTS public.content_flags (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flagged_user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Exactly one of these should be non-null (polymorphic ref)
  flagged_chat_id      uuid REFERENCES public.global_chat_messages(id) ON DELETE SET NULL,
  flagged_dm_id        uuid REFERENCES public.dm_messages(id)           ON DELETE SET NULL,
  flagged_post_id      uuid REFERENCES public.community_posts(id)       ON DELETE SET NULL,
  flagged_reply_id     uuid REFERENCES public.community_post_replies(id) ON DELETE SET NULL,
  flagged_session_id   uuid REFERENCES public.focus_sessions(id)        ON DELETE SET NULL,

  -- Report metadata
  reason               text NOT NULL CHECK (reason IN (
                          'harassment', 'hate_speech', 'spam',
                          'inappropriate', 'safety_concern', 'other'
                       )),
  notes                text,

  -- Content snapshot — preserved even after the original is deleted
  content_snapshot     text,
  content_type         text NOT NULL CHECK (content_type IN (
                          'chat', 'dm', 'post', 'reply', 'session'
                       )),

  -- Workflow
  status               text NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'resolved', 'dismissed')),
  auto_flagged         boolean NOT NULL DEFAULT false,  -- set true when AI triggered this
  auto_flag_score      numeric(5,4),                   -- OpenAI moderation score 0–1

  created_at           timestamptz NOT NULL DEFAULT now(),
  resolved_at          timestamptz,
  resolved_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS content_flags_status_idx    ON public.content_flags (status);
CREATE INDEX IF NOT EXISTS content_flags_reporter_idx  ON public.content_flags (reporter_id);
CREATE INDEX IF NOT EXISTS content_flags_user_idx      ON public.content_flags (flagged_user_id);
CREATE INDEX IF NOT EXISTS content_flags_created_idx   ON public.content_flags (created_at DESC);

-- ── 3. moderation_actions — immutable audit log ─────────────

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_id          uuid REFERENCES public.content_flags(id) ON DELETE SET NULL,
  action           text NOT NULL CHECK (action IN (
                     'content_removed',     -- message/post soft-deleted by admin
                     'user_warned',         -- notification sent to flagged user
                     'user_suspended',      -- account suspended (manual step)
                     'flag_dismissed',      -- false positive, no action taken
                     'auto_flagged'         -- AI automatically created a flag
                   )),
  target_user_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_type     text,
  content_id       uuid,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_admin_idx  ON public.moderation_actions (admin_id);
CREATE INDEX IF NOT EXISTS moderation_actions_flag_idx   ON public.moderation_actions (flag_id);
CREATE INDEX IF NOT EXISTS moderation_actions_created_idx ON public.moderation_actions (created_at DESC);

-- ── 4. user_blocks ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks (blocked_id);

-- ── 5. Safeguarding: disable the 30-day chat purge ──────────
-- The original migration registered purge_old_chat_messages() with pg_cron.
-- We disable it here; messages must be retained for safeguarding purposes.
-- Admins can manually purge non-flagged, non-reported messages via the
-- admin panel if needed, with an audit trail.

DO $$
BEGIN
  -- Unschedule the cron job if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron'
  ) THEN
    PERFORM cron.unschedule('purge-old-chat-messages');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not installed or job doesn't exist — silently continue
  NULL;
END;
$$;

-- ── 6. Notification type: add 'content_flagged' ─────────────

DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      -- Scheduled
      'session_reminder_24h', 'session_reminder_15min',
      'weekly_review_prompt',
      'onboarding_day_1', 'onboarding_day_3', 'onboarding_day_7',
      'community_session_reminder',
      -- Reactive social
      'new_dm', 'post_reply', 'post_reaction',
      'connection_request', 'connection_accepted',
      'project_invite', 'stuck_help_offered',
      -- Session lifecycle
      'partner_joined', 'session_now', 'partner_no_show', 'session_completed',
      -- Moderation
      'content_flagged',   -- sent to admins when a new flag arrives
      'content_warning'    -- sent to a user whose content was actioned
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ── 7. RLS ───────────────────────────────────────────────────

ALTER TABLE public.content_flags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks         ENABLE ROW LEVEL SECURITY;

-- content_flags: users can create + read their own; admins can see all
CREATE POLICY "flags_insert_own"
  ON public.content_flags FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "flags_select_own"
  ON public.content_flags FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "flags_select_admin"
  ON public.content_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "flags_update_admin"
  ON public.content_flags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- moderation_actions: insert-only for admins; read for admins
CREATE POLICY "mod_actions_insert_admin"
  ON public.moderation_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mod_actions_select_admin"
  ON public.moderation_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- user_blocks: users manage their own blocks
CREATE POLICY "blocks_insert_own"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_select_own"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- ── 8. Helper: notify admins when a new flag is submitted ────

CREATE OR REPLACE FUNCTION public.notify_admins_on_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  -- Fan out a notification to every admin
  FOR v_admin IN
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, body, related_id, deep_link
    ) VALUES (
      v_admin.id,
      'content_flagged',
      'New content report',
      'A ' || NEW.content_type || ' was reported for ' || NEW.reason || '.',
      NEW.id,
      '/admin/moderation'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_flag_created ON public.content_flags;
CREATE TRIGGER on_flag_created
  AFTER INSERT ON public.content_flags
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_flag();

-- ── 9. RPC: open_flag_count() — for admin nav badge ─────────

CREATE OR REPLACE FUNCTION public.open_flag_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.content_flags WHERE status = 'open';
$$;

GRANT EXECUTE ON FUNCTION public.open_flag_count() TO authenticated;
