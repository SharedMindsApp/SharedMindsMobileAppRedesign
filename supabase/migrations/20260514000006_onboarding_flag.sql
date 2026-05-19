-- Onboarding completion flag
-- Existing users are marked complete so they don't see onboarding on next login.
-- New users default to false and are shown onboarding after sign-up.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark all current users as already onboarded
UPDATE public.profiles SET onboarding_completed = true;
