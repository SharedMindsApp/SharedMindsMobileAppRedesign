/*
  # Create Files Widget System

  ## Summary
  Files widget allows users to upload, store, tag, and search files in Personal and Shared Spaces.
  Files are user-owned and serve as the source of truth for documents, images, and other files.

  ## Tables
  1. `files` - Core file storage metadata
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users) - File owner
    - `space_id` (uuid, FK to spaces, nullable for personal)
    - `space_type` (text) - 'personal' or 'shared'
    - `original_filename` (text) - Original name when uploaded
    - `display_filename` (text) - Current display name (can be renamed)
    - `file_type` (text) - pdf, docx, image, other
    - `mime_type` (text) - Full MIME type
    - `file_size` (bigint) - Size in bytes
    - `storage_path` (text) - Path in Supabase storage
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. `file_tags` - Global tag system
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users) - Tag creator
    - `name` (text) - Tag name
    - `created_at` (timestamptz)

  3. `file_tag_assignments` - Many-to-many junction
    - `file_id` (uuid, FK to files)
    - `tag_id` (uuid, FK to file_tags)
    - `created_at` (timestamptz)

  ## Security
  - Full RLS on all tables
  - Users can manage files in spaces they have access to
  - Shared space files respect space membership
  - Tags are user-specific

  ## Storage
  - Files stored in Supabase storage bucket 'files'
  - Path structure: {user_id}/{space_type}/{file_id}/{filename}
*/

-- Step 1: Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  space_type text NOT NULL CHECK (space_type IN ('personal', 'shared')),
  original_filename text NOT NULL,
  display_filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'docx', 'image', 'other')),
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create file_tags table
CREATE TABLE IF NOT EXISTS file_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Step 3: Create file_tag_assignments junction table
CREATE TABLE IF NOT EXISTS file_tag_assignments (
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (file_id, tag_id)
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_space_id ON files(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_space_type ON files(space_type);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_tags_user_id ON file_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(name);
CREATE INDEX IF NOT EXISTS idx_file_tag_assignments_file_id ON file_tag_assignments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_assignments_tag_id ON file_tag_assignments(tag_id);

-- Step 5: Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS policies for files

-- Users can view their own files in personal spaces
CREATE POLICY "Users can view own personal files"
  ON files FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND space_type = 'personal'
  );

-- Users can view files in shared spaces they're members of
CREATE POLICY "Users can view files in shared spaces"
  ON files FOR SELECT
  TO authenticated
  USING (
    space_type = 'shared'
    AND space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = files.space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

-- Users can upload files to their personal space
CREATE POLICY "Users can upload to personal space"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND space_type = 'personal'
  );

-- Users can upload files to shared spaces they're members of
CREATE POLICY "Users can upload to shared spaces"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND space_type = 'shared'
    AND space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = files.space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

-- Users can update their own files
CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 7: RLS policies for file_tags

-- Users can view their own tags
CREATE POLICY "Users can view own tags"
  ON file_tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create tags
CREATE POLICY "Users can create tags"
  ON file_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tags
CREATE POLICY "Users can update own tags"
  ON file_tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tags
CREATE POLICY "Users can delete own tags"
  ON file_tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 8: RLS policies for file_tag_assignments

-- Users can view tag assignments for files they have access to
CREATE POLICY "Users can view tag assignments"
  ON file_tag_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_tag_assignments.file_id
      AND (
        (files.user_id = auth.uid() AND files.space_type = 'personal')
        OR (
          files.space_type = 'shared'
          AND EXISTS (
            SELECT 1 FROM space_members
            WHERE space_members.space_id = files.space_id
            AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND space_members.status = 'active'
          )
        )
      )
    )
  );

-- Users can assign tags to their own files
CREATE POLICY "Users can assign tags to own files"
  ON file_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_tag_assignments.file_id
      AND files.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM file_tags
      WHERE file_tags.id = file_tag_assignments.tag_id
      AND file_tags.user_id = auth.uid()
    )
  );

-- Users can remove tag assignments from their own files
CREATE POLICY "Users can remove tags from own files"
  ON file_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_tag_assignments.file_id
      AND files.user_id = auth.uid()
    )
  );

-- Step 9: Add files to shared_space_links allowed item types
DO $$
BEGIN
  ALTER TABLE shared_space_links DROP CONSTRAINT IF EXISTS shared_space_links_item_type_check;
  
  ALTER TABLE shared_space_links ADD CONSTRAINT shared_space_links_item_type_check
    CHECK (item_type IN (
      'calendar_event',
      'task',
      'note',
      'roadmap_item',
      'goal',
      'habit',
      'reminder',
      'offshoot_idea',
      'side_project',
      'focus_session',
      'mind_mesh_node',
      'fridge_widget',
      'stack_card',
      'file'
    ));
END $$;

-- Step 10: Add helpful comments
COMMENT ON TABLE files IS
  'User files stored in Personal and Shared Spaces. Source of truth for documents, images, PDFs, etc.';

COMMENT ON TABLE file_tags IS
  'Global tag system for organizing files. Tags are user-specific and reusable.';

COMMENT ON TABLE file_tag_assignments IS
  'Many-to-many relationship between files and tags.';

COMMENT ON COLUMN files.space_type IS
  'Type of space: personal (user-only) or shared (team space)';

COMMENT ON COLUMN files.storage_path IS
  'Path to file in Supabase storage bucket';

COMMENT ON COLUMN files.file_type IS
  'Simplified file type: pdf, docx, image, or other';
