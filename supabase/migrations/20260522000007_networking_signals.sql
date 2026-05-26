-- Lightweight networking signals on profiles.
--
-- Two new optional tag arrays so members can passively signal:
--   • offering  — "I can help with these things"
--   • seeking   — "I'd love help with these things"
--
-- Tag values come from a curated list (src/core/data/networkingTags.ts)
-- so matching stays clean — no "marketing" vs "Marketing" vs "mktg" noise.
--
-- The Pulse tab on the home dashboard surfaces matches between these
-- arrays (your offering ∩ someone's seeking, and vice versa).
--
-- `is_demo` flags seed users for pre-launch UI testing — easy bulk-removal
-- before going live:
--   DELETE FROM auth.users WHERE id IN (SELECT id FROM profiles WHERE is_demo);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS offering text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seeking  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_demo  boolean NOT NULL DEFAULT false;

-- GIN indexes on the arrays so tag-overlap queries are fast at scale.
-- Used by Pulse-tab "match me with people who offer X" queries.
CREATE INDEX IF NOT EXISTS profiles_offering_idx ON profiles USING gin(offering);
CREATE INDEX IF NOT EXISTS profiles_seeking_idx  ON profiles USING gin(seeking);

-- Index for "hide demo users in production" filtering once we're live.
CREATE INDEX IF NOT EXISTS profiles_is_demo_idx ON profiles(is_demo) WHERE is_demo = true;

COMMENT ON COLUMN profiles.offering IS
  'Tags from the curated NETWORKING_OFFERING_TAGS list. What this person can help others with.';
COMMENT ON COLUMN profiles.seeking IS
  'Tags from the curated NETWORKING_SEEKING_TAGS list. What this person would love help with.';
COMMENT ON COLUMN profiles.is_demo IS
  'True for seed/template profiles created for UI testing. Remove all before launch.';
