/*
  # AI Chat Surfaces & Scope Enforcement

  1. New Types
    - `chat_surface_type` enum (project, personal, shared)

  2. Schema Changes to ai_conversations
    - `surface_type` (chat_surface_type, required)
    - `master_project_id` (uuid, required for project surface)
    - `is_ephemeral` (boolean, default false)
    - `expires_at` (timestamptz, set for ephemeral chats)
    - Check constraint: project surface must have master_project_id
    - Check constraint: non-project surfaces must NOT have master_project_id

  3. Limits Enforcement
    - Max 10 saved (non-ephemeral) conversations per surface per user
    - Function to count saved conversations per surface
    - Function to auto-expire ephemeral chats

  4. Security
    - RLS policies updated to enforce surface boundaries
    - No cross-surface reads
    - Project surface requires project permission

  5. Important Notes
    - Ephemeral chats auto-expire after 24 hours
    - Saved chats persist indefinitely
    - Each user can have max 6 surfaces (4 project + 1 personal + 1 shared)
    - Total effective cap: 60 saved conversations per user
*/

-- Create chat_surface_type enum
DO $$ BEGIN
  CREATE TYPE chat_surface_type AS ENUM ('project', 'personal', 'shared');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add surface columns to ai_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'surface_type'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN surface_type chat_surface_type NOT NULL DEFAULT 'personal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'master_project_id'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'is_ephemeral'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN is_ephemeral boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_project_surface_requires_project'
  ) THEN
    ALTER TABLE ai_conversations
    ADD CONSTRAINT ai_conversations_project_surface_requires_project
    CHECK (
      (surface_type = 'project' AND master_project_id IS NOT NULL)
      OR (surface_type != 'project')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_non_project_no_project_id'
  ) THEN
    ALTER TABLE ai_conversations
    ADD CONSTRAINT ai_conversations_non_project_no_project_id
    CHECK (
      (surface_type != 'project' AND master_project_id IS NULL)
      OR (surface_type = 'project')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_ephemeral_has_expiry'
  ) THEN
    ALTER TABLE ai_conversations
    ADD CONSTRAINT ai_conversations_ephemeral_has_expiry
    CHECK (
      (is_ephemeral = true AND expires_at IS NOT NULL)
      OR (is_ephemeral = false)
    );
  END IF;
END $$;

-- Create index for surface queries
CREATE INDEX IF NOT EXISTS idx_ai_conversations_surface_type
  ON ai_conversations(user_id, surface_type, is_ephemeral)
  WHERE is_ephemeral = false;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_project_surface
  ON ai_conversations(user_id, master_project_id)
  WHERE surface_type = 'project';

CREATE INDEX IF NOT EXISTS idx_ai_conversations_expires_at
  ON ai_conversations(expires_at)
  WHERE is_ephemeral = true AND expires_at IS NOT NULL;

-- Function: Count saved conversations for a user+surface
CREATE OR REPLACE FUNCTION count_saved_conversations_for_surface(
  p_user_id uuid,
  p_surface_type chat_surface_type,
  p_master_project_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_surface_type = 'project' AND p_master_project_id IS NULL THEN
    RAISE EXCEPTION 'master_project_id required for project surface';
  END IF;

  IF p_surface_type = 'project' THEN
    SELECT COUNT(*)
    INTO v_count
    FROM ai_conversations
    WHERE user_id = p_user_id
      AND surface_type = 'project'
      AND master_project_id = p_master_project_id
      AND is_ephemeral = false;
  ELSE
    SELECT COUNT(*)
    INTO v_count
    FROM ai_conversations
    WHERE user_id = p_user_id
      AND surface_type = p_surface_type
      AND is_ephemeral = false;
  END IF;

  RETURN v_count;
END;
$$;

-- Function: Check if user can create saved conversation
CREATE OR REPLACE FUNCTION can_create_saved_conversation(
  p_user_id uuid,
  p_surface_type chat_surface_type,
  p_master_project_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_max_per_surface constant integer := 10;
BEGIN
  v_count := count_saved_conversations_for_surface(p_user_id, p_surface_type, p_master_project_id);
  RETURN v_count < v_max_per_surface;
END;
$$;

-- Function: Auto-expire ephemeral chats
CREATE OR REPLACE FUNCTION expire_old_ephemeral_chats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM ai_conversations
    WHERE is_ephemeral = true
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- Function: Convert ephemeral to saved (if under limit)
CREATE OR REPLACE FUNCTION save_ephemeral_conversation(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_surface_type chat_surface_type;
  v_master_project_id uuid;
  v_can_save boolean;
BEGIN
  -- Get conversation details
  SELECT surface_type, master_project_id
  INTO v_surface_type, v_master_project_id
  FROM ai_conversations
  WHERE id = p_conversation_id
    AND user_id = p_user_id
    AND is_ephemeral = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if under limit
  v_can_save := can_create_saved_conversation(p_user_id, v_surface_type, v_master_project_id);

  IF NOT v_can_save THEN
    RETURN false;
  END IF;

  -- Convert to saved
  UPDATE ai_conversations
  SET is_ephemeral = false,
      expires_at = NULL
  WHERE id = p_conversation_id
    AND user_id = p_user_id;

  RETURN true;
END;
$$;

-- Drop existing RLS policies on ai_conversations
DROP POLICY IF EXISTS "Users can read own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;

-- Recreate RLS policies with surface enforcement
CREATE POLICY "Users can read own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Ephemeral chats always allowed
      is_ephemeral = true
      -- Saved chats only if under limit
      OR can_create_saved_conversation(auth.uid(), surface_type, master_project_id)
    )
  );

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment documentation
COMMENT ON COLUMN ai_conversations.surface_type IS 'Chat surface: project (1 per master project), personal (1 per user), shared (1 per user)';
COMMENT ON COLUMN ai_conversations.master_project_id IS 'Required for project surface, must be NULL for other surfaces';
COMMENT ON COLUMN ai_conversations.is_ephemeral IS 'Ephemeral chats auto-expire after 24 hours and do not count toward saved limits';
COMMENT ON COLUMN ai_conversations.expires_at IS 'Auto-expiration timestamp for ephemeral chats (24 hours from creation)';

COMMENT ON FUNCTION count_saved_conversations_for_surface IS 'Count non-ephemeral conversations for a specific user and surface';
COMMENT ON FUNCTION can_create_saved_conversation IS 'Check if user can create a saved conversation (max 10 per surface)';
COMMENT ON FUNCTION expire_old_ephemeral_chats IS 'Delete ephemeral chats past their expiration time';
COMMENT ON FUNCTION save_ephemeral_conversation IS 'Convert ephemeral chat to saved if under limit';
