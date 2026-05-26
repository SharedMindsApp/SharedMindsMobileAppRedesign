-- ─────────────────────────────────────────────────────────────────
-- Profile industries
--
-- Industry is a different dimension from work_type. Work types describe
-- the *role* (Founder, Designer, Developer), industries describe the
-- *market* (Healthcare, Sports, Fashion). A "Founder in Healthcare"
-- needs very different suggested skills from a "Founder in Tech".
--
-- The onboarding wizard collects industries between the profile step
-- and the skills step so the skills picker can pre-feature relevant
-- categories (medical skills for a healthcare founder, combat-sports
-- skills for a fitness coach, etc.).
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS industries text[];

COMMENT ON COLUMN public.profiles.industries IS
  'Industries/markets the user works in. Curated list maintained client-side. Combined with work_types to tailor skill suggestions in onboarding.';
