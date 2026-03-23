/*
  # Create Encrypted Messaging System
  
  1. New Tables
    - conversations: Stores conversation metadata (household/direct/group)
    - conversation_participants: Tracks who is in each conversation with their encrypted keys
    - messages: Stores encrypted messages (ciphertext only, no plaintext)
    - profile_keys: Stores user public keys and encrypted private keys
  
  2. Enums
    - conversation_type: household, direct, group
    - participant_role: member, admin
    - message_type: text, system, info
  
  3. Security Features
    - All messages stored as ciphertext only
    - Each participant has their own encrypted copy of the conversation key
    - Profile keys are private to each user
    - Professionals can only join conversations for approved households
    - Complete RLS enforcement for all operations
  
  4. Important Notes
    - No plaintext message content is ever stored
    - Server never has access to decrypted content
    - End-to-end encryption handled client-side
    - This migration does NOT modify existing SharedMinds tables
*/

-- Create enum types for messaging system
DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('household', 'direct', 'group');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE participant_role AS ENUM ('member', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'system', 'info');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_conversations_household_id ON conversations(household_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role participant_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  encrypted_conversation_key text NOT NULL,
  UNIQUE(conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
  ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile_id 
  ON conversation_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active 
  ON conversation_participants(conversation_id, profile_id) 
  WHERE left_at IS NULL;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  nonce text NOT NULL,
  message_type message_type DEFAULT 'text',
  has_attachments boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Create profile_keys table
CREATE TABLE IF NOT EXISTS profile_keys (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_keys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR CONVERSATIONS
-- ============================================

-- Users can view conversations they are participants in
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.left_at IS NULL
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Conversation creators and admins can update conversations
CREATE POLICY "Conversation admins can update"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.role = 'admin'
      AND cp.left_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.role = 'admin'
      AND cp.left_at IS NULL
    )
  );

-- ============================================
-- RLS POLICIES FOR CONVERSATION_PARTICIPANTS
-- ============================================

-- Users can view participants in conversations they're part of
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.left_at IS NULL
    )
  );

-- Users can add participants to conversations (with professional restrictions)
CREATE POLICY "Users can add participants with restrictions"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be an admin of the conversation
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.role = 'admin'
      AND cp.left_at IS NULL
    )
    AND (
      -- If adding a professional to a household conversation
      -- they must have approved access to that household
      NOT EXISTS (
        SELECT 1 FROM profiles p
        JOIN conversations c ON c.id = conversation_participants.conversation_id
        WHERE p.id = conversation_participants.profile_id
        AND p.role = 'professional'
        AND c.household_id IS NOT NULL
      )
      OR
      EXISTS (
        SELECT 1 FROM professional_households ph
        JOIN conversations c ON c.id = conversation_participants.conversation_id
        WHERE ph.professional_id = conversation_participants.profile_id
        AND ph.household_id = c.household_id
        AND ph.status = 'approved'
      )
    )
  );

-- Users can update their own participation or admins can update others
CREATE POLICY "Users can update participation"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (
    -- Own participation
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Or conversation admin
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.role = 'admin'
      AND cp.left_at IS NULL
    )
  )
  WITH CHECK (
    -- Own participation
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Or conversation admin
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.role = 'admin'
      AND cp.left_at IS NULL
    )
  );

-- ============================================
-- RLS POLICIES FOR MESSAGES
-- ============================================

-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.left_at IS NULL
      AND (
        cp.joined_at <= messages.created_at
        OR messages.message_type = 'system'
      )
    )
  );

-- Users can send messages in conversations they're part of
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a participant
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
      AND cp.left_at IS NULL
    )
    AND
    -- Sender must be the authenticated user
    sender_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    sender_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES FOR PROFILE_KEYS
-- ============================================

-- Users can only view their own keys
CREATE POLICY "Users can view only their own keys"
  ON profile_keys FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own keys
CREATE POLICY "Users can insert their own keys"
  ON profile_keys FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can update their own keys
CREATE POLICY "Users can update their own keys"
  ON profile_keys FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own keys
CREATE POLICY "Users can delete their own keys"
  ON profile_keys FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ADDITIONAL HELPER FUNCTIONS (OPTIONAL)
-- ============================================

-- Function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when new message is added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_conversation_on_new_message'
  ) THEN
    CREATE TRIGGER update_conversation_on_new_message
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION update_conversation_timestamp();
  END IF;
END $$;