/**
 * Global Notifications System
 * 
 * Phase: Notifications Framework
 * 
 * Creates:
 * - notifications table (immutable notification records)
 * - notification_preferences table (user-level settings)
 * - push_tokens table (device token management)
 * 
 * Security:
 * - RLS enabled on all tables
 * - Users can only see their own notifications
 * - Users can only manage their own preferences
 */

-- ============================================================================
-- Notifications Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Classification
  type TEXT NOT NULL CHECK (type IN ('system', 'calendar', 'guardrails', 'planner', 'social')),
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Source tracking
  source_type TEXT CHECK (source_type IN ('project', 'event', 'task', 'system', 'alignment', 'goal', 'habit')),
  source_id TEXT,
  action_url TEXT,
  
  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.notifications IS 'Global notification records. Immutable log of all user notifications.';

-- ============================================================================
-- Notification Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Global toggles
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  do_not_disturb BOOLEAN NOT NULL DEFAULT false,
  
  -- Category preferences (in-app)
  calendar_reminders BOOLEAN NOT NULL DEFAULT true,
  guardrails_updates BOOLEAN NOT NULL DEFAULT true,
  planner_alerts BOOLEAN NOT NULL DEFAULT true,
  system_messages BOOLEAN NOT NULL DEFAULT true,
  
  -- Category preferences (push)
  calendar_reminders_push BOOLEAN NOT NULL DEFAULT false,
  guardrails_updates_push BOOLEAN NOT NULL DEFAULT false,
  planner_alerts_push BOOLEAN NOT NULL DEFAULT false,
  system_messages_push BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

COMMENT ON TABLE public.notification_preferences IS 'User-level notification preferences and settings.';

-- ============================================================================
-- Push Tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token details
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  -- Metadata
  device_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint per user/token
  UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_last_used ON public.push_tokens(last_used_at);

-- RLS Policies
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON public.push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.push_tokens IS 'Device push notification tokens for mobile and web push.';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get unread count for user
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id
    AND is_read = false;
  
  RETURN v_count;
END;
$$;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify user owns these notifications
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.get_unread_notification_count IS 'Returns count of unread notifications for a user.';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marks all notifications as read for a user.';
