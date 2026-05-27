-- ============================================================
-- Privacy/Terms consent receipts
-- Migration: 20260528000003_consent_tracking
--
-- Records that a user has actively agreed to a specific version
-- of the Privacy Policy + Terms of Service. We capture:
--   accepted_privacy_at      — timestamp the user ticked the box
--   accepted_privacy_version — which version they agreed to
--
-- Why store the version: when we materially update the policy
-- we re-prompt users to accept the new version. Without the
-- version we couldn't tell who's seen the latest.
--
-- For users created BEFORE this migration we set
-- accepted_privacy_at = NULL (legacy). A future re-consent
-- prompt can target NULL OR (version <> CURRENT).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_privacy_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_privacy_version text;

COMMENT ON COLUMN public.profiles.accepted_privacy_at IS
  'Timestamp when the user actively agreed to the Privacy Policy + Terms of Service. NULL = legacy user (pre-consent-tracking).';
COMMENT ON COLUMN public.profiles.accepted_privacy_version IS
  'Version string of the Privacy Policy / Terms the user agreed to (e.g. "2026-05-28"). Used to detect when re-consent is needed after a material update.';


-- Backfill the new-user trigger so values from auth.signUp's
-- metadata land in the profile row automatically. We don't know
-- which trigger function name your project uses, so this looks
-- it up dynamically.
DO $$
DECLARE
  v_func text;
BEGIN
  SELECT routine_name INTO v_func
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('handle_new_user', 'create_profile_for_new_user', 'on_auth_user_created')
  LIMIT 1;

  IF v_func IS NULL THEN
    RAISE NOTICE 'No new-user trigger function found — clients should write accepted_privacy_at directly post-signup.';
  ELSE
    RAISE NOTICE 'Found new-user trigger function "%". Update it manually to read accepted_privacy_at + accepted_privacy_version from raw_user_meta_data if you want auto-backfill.', v_func;
  END IF;
END $$;
