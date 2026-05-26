-- Wanted skills — the skill names (from the curated catalogue) a member
-- would love to find in other members. Distinct from `seeking` (which is
-- task-oriented, e.g. "Cold email review") because this is identity-
-- oriented: "I'd love to connect with a fundraising person."
--
-- Used as a third match dimension in Pulse (🧲 wanted = my wanted ∩ their
-- skills) and as a visible signal on the People/Connections directory so
-- others can self-identify a match.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wanted_skills text[] NOT NULL DEFAULT '{}';

-- GIN index for fast array-overlap queries (same pattern as the existing
-- offering/seeking columns).
CREATE INDEX IF NOT EXISTS profiles_wanted_skills_idx
  ON profiles USING gin(wanted_skills);
