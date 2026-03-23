/*
  # Add color_scheme to Stack Card Items

  1. Changes
    - Add color_scheme column to stack_card_items table
    - Default to 'cyan' for existing cards
  
  2. Notes
    - Each card in the stack can now have its own color
    - Supports pastel revision card aesthetic
*/

-- Add color_scheme column to stack_card_items
ALTER TABLE stack_card_items 
ADD COLUMN IF NOT EXISTS color_scheme text DEFAULT 'cyan' NOT NULL;

-- Add check constraint for valid colors
ALTER TABLE stack_card_items
DROP CONSTRAINT IF EXISTS stack_card_items_color_scheme_check;

ALTER TABLE stack_card_items
ADD CONSTRAINT stack_card_items_color_scheme_check 
CHECK (color_scheme IN ('cyan', 'lavender', 'mint', 'pink', 'yellow', 'gray'));
