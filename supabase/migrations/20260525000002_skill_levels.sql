-- Self-rated proficiency per skill. Keys are skill names (must match an
-- entry in profiles.skills); values are integers 1..5 mapped to:
--   1 = Beginner    2 = Novice       3 = Intermediate
--   4 = Advanced    5 = Expert
--
-- We keep the existing `skills text[]` column as the source of truth for
-- "do you have this skill" (so the GIN index + array-overlap match queries
-- don't change). `skill_levels` is overlaid for display + ranking.
--
-- Any skill in `skills` without an entry here is treated as level
-- "unspecified" by the UI.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skill_levels jsonb NOT NULL DEFAULT '{}'::jsonb;
