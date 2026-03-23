/*
  # Add Title Field to Stack Card Items

  ## Summary
  Enhances stack card items to support revision card format with separate title and content fields.

  ## Changes
  1. Add `title` field to stack_card_items table
    - Allows each card to have a heading/question separate from the content
    - Supports revision card use case (e.g., question on one side, answer below)
    - Optional field (default empty string)

  ## Notes
  - Title has no character limit (but UI will enforce reasonable limits)
  - Existing cards will have empty titles by default
  - This enables flashcard-style interactions
*/

-- Add title column to stack_card_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stack_card_items' AND column_name = 'title'
  ) THEN
    ALTER TABLE stack_card_items ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN stack_card_items.title IS
  'Card title/heading - useful for revision cards (e.g., question or topic name). Separate from main content.';