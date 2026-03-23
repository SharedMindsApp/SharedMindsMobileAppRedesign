/*
  # Create Message Reactions Table

  1. New Tables
    - `message_reactions`
      - `id` (uuid, primary key) - Unique reaction identifier
      - `message_id` (uuid, foreign key) - References messages table
      - `profile_id` (uuid, foreign key) - User who reacted
      - `emoji` (text) - Emoji character (e.g., '👍', '❤️')
      - `created_at` (timestamptz) - When reaction was added

  2. Security
    - Enable RLS on `message_reactions` table
    - Users can view reactions on messages they can see
    - Users can add reactions to messages in their conversations
    - Users can only delete their own reactions
    - Professionals can only react to messages in conversations they're part of

  3. Constraints
    - Unique constraint: one emoji per user per message
    - Foreign key cascade on message deletion
*/

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) <= 10),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, profile_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_profile_id ON message_reactions(profile_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on accessible messages"
  ON message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.profile_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can add reactions to accessible messages"
  ON message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.profile_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON message_reactions
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());
