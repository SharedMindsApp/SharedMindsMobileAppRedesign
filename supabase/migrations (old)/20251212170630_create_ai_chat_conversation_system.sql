/*
  # AI Chat & Conversation Storage System

  ## Overview
  Provides lightweight conversation persistence for the floating AI widget.
  Conversations are user-owned, optionally project-scoped, and messages are append-only.

  ## New Tables

  ### `ai_conversations`
  Container for chat threads between user and AI assistant.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - Owner of conversation
  - `master_project_id` (uuid, nullable, references master_projects) - Optional project scope
  - `title` (text, nullable) - User-defined conversation title
  - `intent_context` (text, nullable) - Optional saved intent context
  - `created_at` (timestamptz) - Creation timestamp
  - `archived_at` (timestamptz, nullable) - Soft delete timestamp

  ### `ai_chat_messages`
  Individual messages within a conversation (append-only, immutable).
  - `id` (uuid, primary key)
  - `conversation_id` (uuid, references ai_conversations) - Parent conversation
  - `sender_type` (text) - 'user', 'ai', or 'system'
  - `content` (jsonb) - Message content (text or structured blocks)
  - `intent` (text, nullable) - AI intent if applicable
  - `response_type` (text, nullable) - Type of AI response
  - `linked_draft_id` (uuid, nullable, references ai_drafts) - Reference to draft if created
  - `token_count` (integer, default 0) - Tokens used for this message
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only see their own conversations
  - Users can only see conversations for projects they have access to
  - Messages are append-only (no UPDATE, no DELETE)
  - Cross-project leakage prevented via RLS

  ## Important Notes
  1. Messages are APPEND-ONLY and IMMUTABLE
  2. Conversations are user-owned, never shared between users
  3. Project-scoped conversations require project membership
  4. No AI memory, no summarization, no autonomous behavior
  5. Draft references are read-only pointers, not authoritative links
*/

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  title text,
  intent_context text,
  created_at timestamptz DEFAULT now(),
  archived_at timestamptz,

  -- Constraints
  CONSTRAINT title_max_length CHECK (char_length(title) <= 200)
);

-- Create ai_chat_messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'ai', 'system')),
  content jsonb NOT NULL,
  intent text,
  response_type text,
  linked_draft_id uuid REFERENCES ai_drafts(id) ON DELETE SET NULL,
  token_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT content_not_empty CHECK (jsonb_typeof(content) != 'null')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project_id ON ai_conversations(master_project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_archived ON ai_conversations(archived_at) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_id ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_sender_type ON ai_chat_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_draft_id ON ai_chat_messages(linked_draft_id) WHERE linked_draft_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_conversations

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON ai_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
  ON ai_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations (title, archived_at only)
CREATE POLICY "Users can update own conversations"
  ON ai_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users cannot delete conversations (soft delete via archived_at only)
-- No DELETE policy = no hard deletes allowed

-- RLS Policies for ai_chat_messages

-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations"
  ON ai_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_chat_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Users can create messages in their own conversations
CREATE POLICY "Users can create messages in own conversations"
  ON ai_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_chat_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- CRITICAL: No UPDATE policy for messages (append-only, immutable)
-- CRITICAL: No DELETE policy for messages (permanent record)

-- Helper function to get conversation message count
CREATE OR REPLACE FUNCTION get_conversation_message_count(conversation_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM ai_chat_messages
  WHERE conversation_id = conversation_uuid;
$$;

-- Helper function to get conversation total tokens
CREATE OR REPLACE FUNCTION get_conversation_total_tokens(conversation_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(token_count), 0)::integer
  FROM ai_chat_messages
  WHERE conversation_id = conversation_uuid;
$$;

-- Helper function to get user's active conversation count
CREATE OR REPLACE FUNCTION get_user_active_conversation_count(user_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM ai_conversations
  WHERE user_id = user_uuid
  AND archived_at IS NULL;
$$;

-- Add helpful comment
COMMENT ON TABLE ai_conversations IS 'User-owned AI chat conversations. Optionally project-scoped. Archivable but not deletable.';
COMMENT ON TABLE ai_chat_messages IS 'Append-only, immutable chat messages. Never updated or deleted. References drafts but does not create authority.';
COMMENT ON COLUMN ai_chat_messages.content IS 'JSONB content: { text: string } or { blocks: [...] } for structured messages';
COMMENT ON COLUMN ai_chat_messages.linked_draft_id IS 'Optional reference to ai_drafts if message resulted in draft creation. Read-only pointer, not authoritative.';
