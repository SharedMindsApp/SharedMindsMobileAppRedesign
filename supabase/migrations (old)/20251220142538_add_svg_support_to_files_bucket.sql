/*
  # Add SVG support to files storage bucket

  ## Summary
  Updates the 'files' storage bucket to allow image/svg+xml mime type for SVG graphics.

  ## Changes
  - Add 'image/svg+xml' to the allowed_mime_types array for the files bucket
*/

-- Update the files bucket to allow SVG files
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
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
WHERE id = 'files';
