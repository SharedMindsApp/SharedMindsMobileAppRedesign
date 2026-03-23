/*
  # Create Calendar Event Type Colors Table

  Stores user-customized colors for each event type.
  Allows users to personalize how different event types appear in their calendar.

  1. New Table
    - `calendar_event_type_colors`
      - `user_id` (uuid, foreign key to auth.users)
      - `event_type` (text, event type: 'event', 'meeting', 'appointment', etc.)
      - `color` (text, hex color or color token)
      - `updated_at` (timestamptz)
      - PRIMARY KEY (user_id, event_type)

  2. Constraints
    - One color per event type per user
    - Cascade delete when user is deleted

  3. Security
    - Enable RLS
    - Users can only manage their own color settings

  4. Indexes
    - Index on user_id for fast user queries
*/

-- Create calendar_event_type_colors table
CREATE TABLE IF NOT EXISTS calendar_event_type_colors (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  color text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (user_id, event_type),
  
  -- Ensure event_type is valid
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'event', 'meeting', 'appointment', 'time_block', 'goal', 
      'habit', 'meal', 'task', 'reminder', 'travel_segment', 'milestone'
    )
  )
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_calendar_event_type_colors_user_id 
  ON calendar_event_type_colors(user_id);

-- Enable RLS
ALTER TABLE calendar_event_type_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own color settings
CREATE POLICY "Users can view their own event type colors"
  ON calendar_event_type_colors
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own color settings
CREATE POLICY "Users can create their own event type colors"
  ON calendar_event_type_colors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own color settings
CREATE POLICY "Users can update their own event type colors"
  ON calendar_event_type_colors
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own color settings
CREATE POLICY "Users can delete their own event type colors"
  ON calendar_event_type_colors
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_event_type_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_event_type_colors_updated_at
  BEFORE UPDATE ON calendar_event_type_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_type_colors_updated_at();
