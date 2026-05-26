-- ─────────────────────────────────────────────────────────────────
-- Project cover images
--
-- Users can attach an optional cover image to a project. Image is
-- stored in the `project-covers` Supabase storage bucket (public-read
-- so we don't need signed URLs for rendering), with write access
-- gated to project owners via the file path.
--
-- Files live at: project-covers/<project_id>/<uuid>.<ext>
-- The first folder segment IS the project_id, which RLS checks
-- against project_members to confirm ownership.
-- ─────────────────────────────────────────────────────────────────

-- 1. Add the URL column to projects.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN public.projects.cover_image_url IS
  'Public URL of the project cover image. NULL = use the project color gradient as the hero background.';

-- 2. Create the storage bucket (public-read so unsigned <img src> works).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-covers',
  'project-covers',
  true,
  4 * 1024 * 1024,  -- 4 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS — read is public (handled by bucket.public=true).
--    Write/update/delete require the caller to be a project owner.
--    storage.foldername(name) returns the segments of the object path;
--    the first segment is the project_id we encode in the upload path.

DROP POLICY IF EXISTS "project_covers_insert_owner" ON storage.objects;
CREATE POLICY "project_covers_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-covers'
    AND EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id::text = (storage.foldername(name))[1]
        AND pm.user_id = auth.uid()
        AND pm.role    = 'owner'
    )
  );

DROP POLICY IF EXISTS "project_covers_update_owner" ON storage.objects;
CREATE POLICY "project_covers_update_owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-covers'
    AND EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id::text = (storage.foldername(name))[1]
        AND pm.user_id = auth.uid()
        AND pm.role    = 'owner'
    )
  );

DROP POLICY IF EXISTS "project_covers_delete_owner" ON storage.objects;
CREATE POLICY "project_covers_delete_owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-covers'
    AND EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id::text = (storage.foldername(name))[1]
        AND pm.user_id = auth.uid()
        AND pm.role    = 'owner'
    )
  );
