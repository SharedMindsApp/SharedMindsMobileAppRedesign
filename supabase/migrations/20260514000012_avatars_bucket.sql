-- Avatars bucket: public-readable, owner-writable.
-- Path convention: avatars/{user_id}.{ext}
-- All RLS storage policies live on storage.objects.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2 * 1024 * 1024, -- 2 MB cap (client resizes to 512x512 JPEG, ~80–200 KB typical)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS policies on storage.objects ─────────────────────────────────

-- Anyone (including unauthenticated) can read avatars.
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Only the file owner (matched by auth.uid() prefix in filename) can insert.
-- Filename convention: "{user_id}.{ext}" — first path segment = uid.
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (split_part(name, '.', 1) = auth.uid()::text)
);

-- Owner can replace (upsert) their own avatar.
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (split_part(name, '.', 1) = auth.uid()::text)
);

-- Owner can delete their own avatar.
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (split_part(name, '.', 1) = auth.uid()::text)
);
