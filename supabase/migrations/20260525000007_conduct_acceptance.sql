-- Track when a user accepted the community conduct gate.
--
-- Shown as a blocking modal before their first session. NULL = never
-- accepted (or pre-existed the modal). Once set, we don't show it again
-- unless we revise the conduct text — at which point a future migration
-- can null this out for everyone to force re-acceptance.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS conduct_accepted_at timestamptz;

-- Optional: track which version of the conduct text was accepted, so we
-- can detect stale acceptances if we revise wording.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS conduct_accepted_version text;
