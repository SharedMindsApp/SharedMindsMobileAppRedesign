/*
  # Create Files Storage Bucket

  ## Summary
  Creates the 'files' storage bucket for the Files widget system with proper RLS policies.

  ## Changes
  - Create 'files' storage bucket with public access disabled
  - Add RLS policies for authenticated users to:
    - Upload files to their own folder
    - View/download their own files
    - Delete their own files
  
  ## Security
  - Users can only access files in folders matching their user_id
  - All operations require authentication
*/

-- Create the files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view/download their own files
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
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

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
