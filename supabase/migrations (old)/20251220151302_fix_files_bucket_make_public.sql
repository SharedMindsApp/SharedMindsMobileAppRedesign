/*
  # Make Files Bucket Public

  ## Summary
  Makes the files storage bucket public to allow SVG and other file viewing on the canvas.

  ## Changes
  - Make the files bucket public
  - Simplify RLS policies for authenticated user access
  
  ## Security
  - Users can upload files to their own folders
  - All authenticated users can view files (for shared spaces)
  - Users can only update/delete files in their own folder
*/

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  true, -- Make it public
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/csv',
    'text/html',
    'text/markdown',
    'application/zip',
    'application/x-zip-compressed',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view accessible files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own folder files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploaded files" ON storage.objects;

-- Policy: Authenticated users can upload files to their own folder
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Authenticated users can view all files
CREATE POLICY "Authenticated users can view files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'files');

-- Policy: Users can update files in their own folder only
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete files in their own folder
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
