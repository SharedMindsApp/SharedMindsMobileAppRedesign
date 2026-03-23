# Files Bucket MIME Types Update

## Database Update Required

The files storage bucket needs to have its MIME types expanded to support more file formats. Run this SQL command in your Supabase SQL Editor:

```sql
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  -- Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
  'application/msword', -- .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- .xlsx
  'application/vnd.ms-excel', -- .xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- .pptx
  'application/vnd.ms-powerpoint', -- .ppt
  -- Text
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  -- Archives
  'application/zip',
  'application/x-zip-compressed',
  -- Audio
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  -- Video
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo'
]
WHERE id = 'files';
```

## What This Does

Expands the supported file types for the Files widget to include:
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Text Files**: TXT, CSV, HTML, Markdown
- **Archives**: ZIP
- **Media**: MP3, MP4, WAV, MOV, AVI

## UI Updates

The Files widget now includes:
- Client-side validation before upload
- User-friendly error messages showing supported formats
- Better error handling with dismissible alerts
