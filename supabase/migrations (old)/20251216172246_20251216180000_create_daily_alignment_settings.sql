/*
  # Daily Alignment Settings

  1. New Tables
    - `daily_alignment_settings` - User preferences for working hours and breaks
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `work_start_time` (time) - When work day starts
      - `work_end_time` (time) - When work day ends
      - `lunch_break_start` (time) - Lunch break start
      - `lunch_break_duration` (integer) - Minutes for lunch
      - `enable_morning_break` (boolean) - Enable morning break
      - `morning_break_start` (time) - Morning break start
      - `morning_break_duration` (integer) - Minutes for morning break
      - `enable_afternoon_break` (boolean) - Enable afternoon break
      - `afternoon_break_start` (time) - Afternoon break start
      - `afternoon_break_duration` (integer) - Minutes for afternoon break
      - `blocked_times` (jsonb) - Array of {start_time, end_time, label} for custom blocks
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `daily_alignment_settings` table
    - Add policies for authenticated users to manage their own settings

  3. Default Values
    - Work hours: 9 AM to 5 PM
    - Lunch break: 12 PM for 60 minutes
    - Morning/afternoon breaks disabled by default
*/

-- Create daily alignment settings table
CREATE TABLE IF NOT EXISTS daily_alignment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  work_start_time time DEFAULT '09:00:00' NOT NULL,
  work_end_time time DEFAULT '17:00:00' NOT NULL,
  lunch_break_start time DEFAULT '12:00:00',
  lunch_break_duration integer DEFAULT 60,
  enable_morning_break boolean DEFAULT false,
  morning_break_start time DEFAULT '10:30:00',
  morning_break_duration integer DEFAULT 15,
  enable_afternoon_break boolean DEFAULT false,
  afternoon_break_start time DEFAULT '15:00:00',
  afternoon_break_duration integer DEFAULT 15,
  blocked_times jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_alignment_settings ENABLE ROW LEVEL SECURITY;

-- Policies for users to manage their own settings
CREATE POLICY "Users can view own alignment settings"
  ON daily_alignment_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alignment settings"
  ON daily_alignment_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alignment settings"
  ON daily_alignment_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alignment settings"
  ON daily_alignment_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_alignment_settings_user_id ON daily_alignment_settings(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_daily_alignment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_alignment_settings_updated_at
  BEFORE UPDATE ON daily_alignment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_alignment_settings_updated_at();
