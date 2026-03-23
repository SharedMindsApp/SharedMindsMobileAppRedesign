/*
  # Create Stack Cards System

  ## Summary
  Stack Cards are short, glanceable thinking cards for quick review and presentation.
  They live within Personal and Shared Spaces as widgets.

  ## Tables
  1. `stack_cards` - Container for a stack of cards
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users)
    - `space_id` (uuid, FK to spaces, nullable for personal)
    - `title` (text) - Name of the stack
    - `color_scheme` (text) - Pastel color palette name
    - `is_collapsed` (boolean) - Whether stack is collapsed on canvas
    - `display_order` (integer) - Order in space
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. `stack_card_items` - Individual cards within a stack
    - `id` (uuid, primary key)
    - `stack_id` (uuid, FK to stack_cards)
    - `content` (text) - Card content (max 300 characters enforced in app)
    - `card_order` (integer) - Position in stack
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Full RLS on both tables
  - Users can manage their own stacks in personal spaces
  - Space members can view/edit stacks in shared spaces (based on space permissions)

  ## Notes
  - Character limit (300) is enforced at application layer
  - Cards are designed to be lightweight and glanceable
  - Stacks can be converted to Notes, Tasks, or Goals
  - Color schemes: soft pastels for calm, premium feel
*/

-- Step 1: Create stack_cards table
CREATE TABLE IF NOT EXISTS stack_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  color_scheme text NOT NULL DEFAULT 'blue' CHECK (color_scheme IN (
    'blue', 'purple', 'green', 'pink', 'amber', 'teal', 'rose', 'slate'
  )),
  is_collapsed boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create stack_card_items table
CREATE TABLE IF NOT EXISTS stack_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid NOT NULL REFERENCES stack_cards(id) ON DELETE CASCADE,
  content text NOT NULL,
  card_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_stack_cards_user_id ON stack_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_stack_cards_space_id ON stack_cards(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stack_card_items_stack_id ON stack_card_items(stack_id);
CREATE INDEX IF NOT EXISTS idx_stack_card_items_order ON stack_card_items(stack_id, card_order);

-- Step 4: Enable RLS
ALTER TABLE stack_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_card_items ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS policies for stack_cards

-- Users can view their own stacks in personal space
CREATE POLICY "Users can view own stacks"
  ON stack_cards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view stacks in shared spaces they're members of
CREATE POLICY "Users can view stacks in shared spaces"
  ON stack_cards FOR SELECT
  TO authenticated
  USING (
    space_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = stack_cards.space_id
      AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND space_members.status = 'active'
    )
  );

-- Users can create stacks in their personal space
CREATE POLICY "Users can create own stacks"
  ON stack_cards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own stacks
CREATE POLICY "Users can update own stacks"
  ON stack_cards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own stacks
CREATE POLICY "Users can delete own stacks"
  ON stack_cards FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 6: RLS policies for stack_card_items

-- Users can view cards in stacks they have access to
CREATE POLICY "Users can view cards in accessible stacks"
  ON stack_card_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stack_cards
      WHERE stack_cards.id = stack_card_items.stack_id
      AND (
        stack_cards.user_id = auth.uid()
        OR (
          stack_cards.space_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM space_members
            WHERE space_members.space_id = stack_cards.space_id
            AND space_members.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND space_members.status = 'active'
          )
        )
      )
    )
  );

-- Users can create cards in stacks they own
CREATE POLICY "Users can create cards in own stacks"
  ON stack_card_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stack_cards
      WHERE stack_cards.id = stack_card_items.stack_id
      AND stack_cards.user_id = auth.uid()
    )
  );

-- Users can update cards in stacks they own
CREATE POLICY "Users can update cards in own stacks"
  ON stack_card_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stack_cards
      WHERE stack_cards.id = stack_card_items.stack_id
      AND stack_cards.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stack_cards
      WHERE stack_cards.id = stack_card_items.stack_id
      AND stack_cards.user_id = auth.uid()
    )
  );

-- Users can delete cards in stacks they own
CREATE POLICY "Users can delete cards in own stacks"
  ON stack_card_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stack_cards
      WHERE stack_cards.id = stack_card_items.stack_id
      AND stack_cards.user_id = auth.uid()
    )
  );

-- Step 7: Add stack_card to shared_space_links allowed item types
DO $$
BEGIN
  -- Drop the existing CHECK constraint
  ALTER TABLE shared_space_links DROP CONSTRAINT IF EXISTS shared_space_links_item_type_check;

  -- Add new CHECK constraint with stack_card included
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
      'stack_card'
    ));
END $$;

-- Step 8: Add helpful comments
COMMENT ON TABLE stack_cards IS
  'Stack Cards are short, glanceable thinking cards for quick review and presentation. Each stack contains multiple cards.';

COMMENT ON TABLE stack_card_items IS
  'Individual cards within a Stack Card stack. Each card has a 300-character limit enforced at application layer.';

COMMENT ON COLUMN stack_cards.color_scheme IS
  'Pastel color palette for the entire stack. Options: blue, purple, green, pink, amber, teal, rose, slate';

COMMENT ON COLUMN stack_cards.is_collapsed IS
  'Whether the stack is collapsed on the canvas. Collapsed stacks show only the top card.';

COMMENT ON COLUMN stack_card_items.content IS
  'Card content with 300-character limit (enforced in application). Designed for glanceable, focused thoughts.';
