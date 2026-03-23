/*
  # Create Fridge Canvas Widget System

  1. New Tables
    - `fridge_widgets`
      - `id` (uuid, primary key) - Unique widget identifier
      - `household_id` (uuid, foreign key) - Links to household
      - `created_by` (uuid, foreign key) - User who created the widget
      - `widget_type` (text) - Type of widget (note, reminder, calendar, goal, habit, photo, insight, custom)
      - `content` (jsonb) - Widget-specific content data
      - `shared` (boolean) - Whether content is shared with household
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `fridge_widget_positions`
      - `id` (uuid, primary key) - Unique position record
      - `widget_id` (uuid, foreign key) - Links to widget
      - `user_id` (uuid, foreign key) - User who owns this position
      - `x` (integer) - X position on canvas
      - `y` (integer) - Y position on canvas
      - `width` (integer) - Widget width
      - `height` (integer) - Widget height
      - `z_index` (integer) - Stacking order
      - `view_mode` (text) - Display mode: icon, mini, full
      - `rotation` (decimal) - Rotation angle in degrees
      - `collapsed` (boolean) - Whether widget is collapsed
      - `updated_at` (timestamptz) - Last position update

  2. Security
    - Enable RLS on both tables
    - Users can view widgets in their household
    - Users can create widgets in their household
    - Users can update their own widget positions
    - Users can update widgets they created
*/

-- Create widget types enum
DO $$ BEGIN
  CREATE TYPE widget_type AS ENUM (
    'note',
    'reminder',
    'calendar',
    'goal',
    'habit',
    'photo',
    'insight',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create view mode enum
DO $$ BEGIN
  CREATE TYPE widget_view_mode AS ENUM ('icon', 'mini', 'full');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create fridge_widgets table
CREATE TABLE IF NOT EXISTS fridge_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type widget_type NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_household ON fridge_widgets(household_id);
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_created_by ON fridge_widgets(created_by);

-- Create fridge_widget_positions table
CREATE TABLE IF NOT EXISTS fridge_widget_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid NOT NULL REFERENCES fridge_widgets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  width integer NOT NULL DEFAULT 200,
  height integer NOT NULL DEFAULT 200,
  z_index integer NOT NULL DEFAULT 0,
  view_mode widget_view_mode DEFAULT 'mini',
  rotation decimal(5,2) DEFAULT 0,
  collapsed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(widget_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_positions_widget ON fridge_widget_positions(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_positions_user ON fridge_widget_positions(user_id);

-- Enable RLS
ALTER TABLE fridge_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_widget_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fridge_widgets

-- Users can view widgets in their household
CREATE POLICY "Users can view household widgets"
  ON fridge_widgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fridge_widgets.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.status = 'active'
    )
  );

-- Users can create widgets in their household
CREATE POLICY "Users can create household widgets"
  ON fridge_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = fridge_widgets.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.status = 'active'
    )
    AND created_by = auth.uid()
  );

-- Users can update widgets they created
CREATE POLICY "Users can update own widgets"
  ON fridge_widgets FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete widgets they created
CREATE POLICY "Users can delete own widgets"
  ON fridge_widgets FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for fridge_widget_positions

-- Users can view their own widget positions
CREATE POLICY "Users can view own positions"
  ON fridge_widget_positions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own widget positions
CREATE POLICY "Users can create own positions"
  ON fridge_widget_positions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM fridge_widgets
      WHERE fridge_widgets.id = fridge_widget_positions.widget_id
      AND EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = fridge_widgets.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.status = 'active'
      )
    )
  );

-- Users can update their own widget positions
CREATE POLICY "Users can update own positions"
  ON fridge_widget_positions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own widget positions
CREATE POLICY "Users can delete own positions"
  ON fridge_widget_positions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_fridge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_fridge_widgets_updated_at ON fridge_widgets;
CREATE TRIGGER update_fridge_widgets_updated_at
  BEFORE UPDATE ON fridge_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_fridge_updated_at();

DROP TRIGGER IF EXISTS update_fridge_widget_positions_updated_at ON fridge_widget_positions;
CREATE TRIGGER update_fridge_widget_positions_updated_at
  BEFORE UPDATE ON fridge_widget_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_fridge_updated_at();
