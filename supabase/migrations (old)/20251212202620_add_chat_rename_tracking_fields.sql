/*
  # Add Chat Rename Tracking Fields

  1. Schema Changes to ai_conversations
    - `user_renamed` (boolean, default false) - Set to true when user manually renames
    - `auto_named_from_first_message` (boolean, default false) - Set to true after first-message auto-rename

  2. Purpose
    - Track whether a conversation has been manually renamed by the user
    - Track whether the first-message auto-rename has occurred
    - Prevent auto-renaming after user has manually renamed
    - Enable deterministic, non-AI-based chat naming

  3. Important Notes
    - These flags are write-once (never reset automatically)
    - Once user_renamed = true, all auto-renaming is disabled
    - auto_named_from_first_message prevents multiple auto-renames
    - No AI involvement in naming logic
*/

-- Add rename tracking columns to ai_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'user_renamed'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN user_renamed boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'auto_named_from_first_message'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN auto_named_from_first_message boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for efficient querying of rename-eligible conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_rename_eligible
  ON ai_conversations(user_id, user_renamed, auto_named_from_first_message)
  WHERE user_renamed = false AND auto_named_from_first_message = false;

-- Add comment documentation
COMMENT ON COLUMN ai_conversations.user_renamed IS 'True when user has manually renamed the conversation. Disables all auto-renaming permanently.';
COMMENT ON COLUMN ai_conversations.auto_named_from_first_message IS 'True after deterministic first-message auto-rename. Prevents duplicate auto-renames.';