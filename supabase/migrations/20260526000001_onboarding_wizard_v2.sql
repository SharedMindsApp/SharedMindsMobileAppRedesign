-- ─────────────────────────────────────────────────────────────────
-- Onboarding Wizard v2
--
-- Replaces the old `onboarding_completed` boolean (which existed only
-- to show/hide the 4-step mini-modal) with a richer flag set that drives
-- the new compulsory 9-step wizard covering profile, skills, intentions
-- day preference, first project, project goals, and first tasks.
--
-- Why a new column instead of reusing `onboarding_completed`?
--   • `onboarding_completed` was back-filled to TRUE for all existing users
--     (migration 20260514000006). Reusing it would require resetting it,
--     which is noisy and potentially confusing for RLS / audit logs.
--   • A timestamptz gives us "when did they finish?" for analytics — more
--     useful than a boolean.
--   • NULL = wizard not yet done; non-NULL = done. Clean and readable.
--
-- `intentions_reminder_day`: day-of-week the user chose for setting their
--   weekly intentions. 0 = Sunday, 1 = Monday, …, 6 = Saturday.
--   NULL until the user picks a day in the wizard.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wizard_v2_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS intentions_reminder_day smallint
    CHECK (intentions_reminder_day BETWEEN 0 AND 6);

-- Allow authenticated users to update their own wizard flag and
-- intentions day (the update RLS policy on profiles should already
-- cover this via the existing "Users can update own profile" policy,
-- but we add a belt-and-braces comment for clarity).
-- No explicit new policy needed — the existing profiles UPDATE policy
-- covers all columns for `auth.uid() = id`.

COMMENT ON COLUMN public.profiles.wizard_v2_completed_at IS
  'NULL = user has not completed the onboarding wizard v2. Non-NULL = timestamp when they finished it. Used as the hard gate in CoreApp.tsx.';

COMMENT ON COLUMN public.profiles.intentions_reminder_day IS
  '0=Sunday 1=Monday … 6=Saturday. Day the user chose for their weekly intention-setting. Set during the onboarding wizard.';
