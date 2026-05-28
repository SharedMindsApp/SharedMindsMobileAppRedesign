-- ============================================================
-- Login-free email unsubscribe
-- Migration: 20260528000004_email_unsubscribe
--
-- Legal context: PECR (UK) + CAN-SPAM (US) require a working
-- opt-out in every marketing/non-essential email. Gmail & Yahoo's
-- 2024 bulk-sender rules additionally require a one-click
-- List-Unsubscribe header (RFC 8058). The app already has
-- per-category email toggles in Settings, but those require login.
-- This adds a tokenised unsubscribe that works WITHOUT logging in,
-- straight from the email.
--
--   profiles.email_unsubscribe_token — opaque, unguessable, unique
--     per user. Embedded in the unsubscribe URL + List-Unsubscribe
--     header of every outbound email.
--
--   unsubscribe_by_token(token, category) — SECURITY DEFINER RPC
--     that flips the relevant email_* preference(s) off. 'all' turns
--     off every NON-ESSENTIAL email category. Essential mail
--     (password reset, email confirmation, account/security, and
--     deletion confirmations) is transactional and never gated by
--     these preferences, so it is unaffected.
-- ============================================================

-- 1. Token column ---------------------------------------------
-- gen_random_uuid() is available in Supabase by default. Two
-- concatenated UUIDs (dashes stripped) give a 64-char opaque token.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_unsubscribe_token text
    DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

-- Backfill any existing rows that predate the default.
UPDATE public.profiles
SET email_unsubscribe_token =
    (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
WHERE email_unsubscribe_token IS NULL;

-- Enforce presence + uniqueness now that everyone has one.
ALTER TABLE public.profiles
  ALTER COLUMN email_unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unsubscribe_token_idx
  ON public.profiles (email_unsubscribe_token);


-- 2. Which email categories are user-controllable (non-essential).
--    Anything NOT in this set is essential/transactional and cannot
--    be unsubscribed (it isn't gated by notification_preferences at
--    all). Kept as a guard so a tampered ?cat= can't touch unknown
--    columns.
--    Columns: email_session_reminders, email_messages,
--    email_post_replies, email_connection_requests,
--    email_weekly_review, email_onboarding,
--    email_community_sessions, email_marketing.


-- 3. Tokenised unsubscribe RPC --------------------------------
-- Returns a small JSON blob the confirmation page can display
-- (display name + what was turned off). Runs as definer so the
-- anonymous caller (no session — they clicked from an email) can
-- update their own preferences via the token only.
CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(
  p_token    text,
  p_category text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_name    text;
  v_col     text;
  v_allowed text[] := ARRAY[
    'email_session_reminders',
    'email_messages',
    'email_post_replies',
    'email_connection_requests',
    'email_weekly_review',
    'email_onboarding',
    'email_community_sessions',
    'email_marketing'
  ];
BEGIN
  -- Resolve the user from the opaque token.
  SELECT id, display_name INTO v_user_id, v_name
  FROM public.profiles
  WHERE email_unsubscribe_token = p_token;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- Make sure a preferences row exists (defaults applied on insert).
  INSERT INTO public.notification_preferences (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_category = 'all' THEN
    -- Turn off every non-essential email category.
    UPDATE public.notification_preferences SET
      email_session_reminders  = false,
      email_messages           = false,
      email_post_replies       = false,
      email_connection_requests= false,
      email_weekly_review      = false,
      email_onboarding         = false,
      email_community_sessions = false,
      email_marketing          = false,
      updated_at               = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object('ok', true, 'name', v_name, 'scope', 'all');
  END IF;

  -- Single category — validate against the allowlist to prevent
  -- arbitrary column updates via a tampered parameter.
  IF NOT (p_category = ANY(v_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_category');
  END IF;

  v_col := p_category;
  EXECUTE format(
    'UPDATE public.notification_preferences SET %I = false, updated_at = now() WHERE user_id = $1',
    v_col
  ) USING v_user_id;

  RETURN jsonb_build_object('ok', true, 'name', v_name, 'scope', v_col);
END;
$$;

-- Anonymous (clicked from email, not logged in) + authenticated.
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(text, text) TO anon, authenticated;
