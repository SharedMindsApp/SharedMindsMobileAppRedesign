/*
  Create Fridge Board Interactive System

  1. New Tables
    - fridge_widgets
      - id (uuid, primary key)
      - household_id (uuid, foreign key)
      - created_by (uuid, foreign key to members)
      - widget_type (text) - note, task, calendar, goal, habit, photo, insight, reminder, agreement, custom
      - title (text)
      - content (jsonb) - flexible storage for widget-specific data
      - color (text) - widget color theme
      - icon (text) - lucide icon name
      - created_at (timestamptz)
      - updated_at (timestamptz)

    - fridge_widget_layouts
      - id (uuid, primary key)
      - widget_id (uuid, foreign key to fridge_widgets)
      - member_id (uuid, foreign key to members)
      - position_x (integer) - grid position x
      - position_y (integer) - grid position y
      - size_mode (text) - icon, mini, full
      - z_index (integer) - stacking order
      - rotation (numeric) - slight tilt angle
      - is_collapsed (boolean) - collapsed state
      - group_id (uuid, nullable) - for clustering widgets
      - updated_at (timestamptz) - for auto-save tracking

  2. Widget Types Content Structure
    - note: {text: string, fontSize: string}
    - task: {description: string, completed: boolean, dueDate: date}
    - calendar: {eventCount: number, nextEvent: object}
    - goal: {progress: number, targetDate: date}
    - habit: {streak: number, lastCompleted: date}
    - photo: {imageUrl: string, caption: string}
    - insight: {summary: string, category: string}
    - reminder: {message: string, time: timestamp, priority: string}
    - agreement: {rules: array, agreedBy: array}
    - custom: {any flexible data}

  3. Security
    - Widget content is shared (all household members can read/write)
    - Layout is personal (users can only read/write their own layout)
    - Enable RLS on both tables

  4. Indexes
    - Index on household_id for widgets
    - Index on member_id for layouts
    - Index on widget_id for layouts
    - Index on updated_at for auto-save queries

  5. Notes
    - Content is shared across household
    - Layout is personal per user
    - Auto-save on every layout change
    - Grid is 50px squares (10x10 unit system)
*/

-- Drop existing fridge_board_items if it exists (we're replacing it)
DROP TABLE IF EXISTS fridge_board_items CASCADE;

-- Create fridge_widgets table (shared content)
CREATE TABLE IF NOT EXISTS fridge_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES members(id) ON DELETE SET NULL,
  widget_type text NOT NULL CHECK (widget_type IN ('note', 'task', 'calendar', 'goal', 'habit', 'photo', 'insight', 'reminder', 'agreement', 'custom')),
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  color text DEFAULT 'yellow',
  icon text DEFAULT 'sticky-note',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fridge_widget_layouts table (personal layout)
CREATE TABLE IF NOT EXISTS fridge_widget_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid REFERENCES fridge_widgets(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  size_mode text DEFAULT 'mini' CHECK (size_mode IN ('icon', 'mini', 'full')),
  z_index integer DEFAULT 0,
  rotation numeric DEFAULT 0,
  is_collapsed boolean DEFAULT false,
  group_id uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(widget_id, member_id)
);

-- Enable RLS
ALTER TABLE fridge_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_widget_layouts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_household ON fridge_widgets(household_id);
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_type ON fridge_widgets(widget_type);
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_updated ON fridge_widgets(updated_at);

CREATE INDEX IF NOT EXISTS idx_widget_layouts_widget ON fridge_widget_layouts(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_layouts_member ON fridge_widget_layouts(member_id);
CREATE INDEX IF NOT EXISTS idx_widget_layouts_updated ON fridge_widget_layouts(updated_at);

-- RLS Policies for fridge_widgets (shared content)
CREATE POLICY "Users can read household widgets"
  ON fridge_widgets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_widgets.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert household widgets"
  ON fridge_widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_widgets.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household widgets"
  ON fridge_widgets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_widgets.household_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_widgets.household_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household widgets"
  ON fridge_widgets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.household_id = fridge_widgets.household_id
      AND members.user_id = auth.uid()
    )
  );

-- RLS Policies for fridge_widget_layouts (personal layout)
CREATE POLICY "Users can read own widget layouts"
  ON fridge_widget_layouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = fridge_widget_layouts.member_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own widget layouts"
  ON fridge_widget_layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = fridge_widget_layouts.member_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own widget layouts"
  ON fridge_widget_layouts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = fridge_widget_layouts.member_id
      AND members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = fridge_widget_layouts.member_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own widget layouts"
  ON fridge_widget_layouts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = fridge_widget_layouts.member_id
      AND members.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for fridge_widgets
DROP TRIGGER IF EXISTS update_fridge_widgets_updated_at ON fridge_widgets;
CREATE TRIGGER update_fridge_widgets_updated_at
  BEFORE UPDATE ON fridge_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for fridge_widget_layouts
DROP TRIGGER IF EXISTS update_fridge_widget_layouts_updated_at ON fridge_widget_layouts;
CREATE TRIGGER update_fridge_widget_layouts_updated_at
  BEFORE UPDATE ON fridge_widget_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();