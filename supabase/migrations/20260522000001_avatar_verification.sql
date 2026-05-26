-- Avatar face-verification status.
--
-- Layered on top of the existing OpenAI safety moderation (which only
-- rejects unsafe content). We now also verify that the avatar is a real
-- photograph of a single human face, so that camera-off participants
-- can't remain semi-anonymous behind cartoons, logos, or pet photos.
--
-- Flow:
--   1. User uploads avatar  → status='pending'
--   2. moderate-avatar runs → status='approved' | 'rejected_face' | 'rejected_safety'
--   3. Camera-off in video sessions is gated on status='approved'
--
-- Existing users with avatars are marked 'pending' so they get re-run
-- through the new verification flow on next login.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'avatar_verification_status') THEN
    CREATE TYPE avatar_verification_status AS ENUM (
      'none',              -- no avatar uploaded
      'pending',           -- uploaded, moderation in progress / queued
      'approved',          -- passes safety + face verification
      'rejected_face',     -- safety OK, but not a real human face
      'rejected_safety'    -- failed safety moderation
    );
  END IF;
END$$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_status avatar_verification_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS avatar_rejection_reason text;

-- Backfill: any existing user with an avatar gets 'pending' so the next
-- login triggers re-verification. Users without an avatar stay 'none'.
UPDATE profiles
SET avatar_status = 'pending'
WHERE avatar_url IS NOT NULL
  AND avatar_status = 'none';

-- Helpful index for queries that filter on status (e.g. admin queue).
CREATE INDEX IF NOT EXISTS profiles_avatar_status_idx ON profiles(avatar_status);

COMMENT ON COLUMN profiles.avatar_status IS
  'Verification status of the uploaded avatar. Only "approved" avatars are considered verified profile photos; users with any other status cannot turn off their camera in video sessions.';
COMMENT ON COLUMN profiles.avatar_rejection_reason IS
  'Human-readable reason returned by the moderation step when status is rejected_face or rejected_safety. Shown to the user so they know what to fix.';
