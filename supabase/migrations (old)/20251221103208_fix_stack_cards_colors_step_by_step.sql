/*
  # Fix Stack Cards Color Scheme - Step by Step
  
  1. Summary
    - Drop the constraint first
    - Update existing data
    - Add new constraint with correct colors
  
  2. Changes
    - Remove old constraint
    - Migrate data to new color values
    - Add new constraint matching the application code
*/

-- Step 1: Drop the existing constraint completely
ALTER TABLE stack_cards
DROP CONSTRAINT IF EXISTS stack_cards_color_scheme_check;

-- Step 2: Update existing data to use new color values
UPDATE stack_cards SET color_scheme = 'cyan' WHERE color_scheme IN ('blue', 'teal');
UPDATE stack_cards SET color_scheme = 'lavender' WHERE color_scheme = 'purple';
UPDATE stack_cards SET color_scheme = 'mint' WHERE color_scheme = 'green';
UPDATE stack_cards SET color_scheme = 'yellow' WHERE color_scheme = 'amber';
UPDATE stack_cards SET color_scheme = 'pink' WHERE color_scheme IN ('rose', 'pink');
UPDATE stack_cards SET color_scheme = 'gray' WHERE color_scheme = 'slate';

-- Step 3: Update the default value
ALTER TABLE stack_cards
ALTER COLUMN color_scheme SET DEFAULT 'cyan';

-- Step 4: Add new constraint with correct colors (matching stack_card_items)
ALTER TABLE stack_cards
ADD CONSTRAINT stack_cards_color_scheme_check 
CHECK (color_scheme IN ('cyan', 'lavender', 'mint', 'pink', 'yellow', 'gray'));
