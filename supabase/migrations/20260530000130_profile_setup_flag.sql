-- profile_setup_completed_at — tracks the optional profile-setup wizard.
--
-- Distinct from onboarding_completed (the signup gate) and wizard_v2_completed_at.
-- Set when the user finishes OR dismisses the post-signup "make your profile
-- advertising-grade" wizard, so it doesn't re-prompt.

alter table public.profiles
  add column if not exists profile_setup_completed_at timestamptz;
