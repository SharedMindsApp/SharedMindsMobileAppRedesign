/*
  # Create Fridge Groups/Frames Table

  1. New Tables
    - `fridge_groups`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `created_by` (uuid, nullable, references profiles)
      - `title` (text, editable name for the group)
      - `x` (integer, group position x)
      - `y` (integer, group position y)
      - `width` (integer, group width)
      - `height` (integer, group height)
      - `color` (text, optional background color)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `group_id` column to `fridge_widgets` table
    - Set ON DELETE SET NULL so widgets aren't deleted when group is deleted

  3. Security
    - No RLS for now (wide-open for testing)
*/

-- Create fridge_groups table
CREATE TABLE IF NOT EXISTS fridge_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New Group',
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  width integer NOT NULL DEFAULT 500,
  height integer NOT NULL DEFAULT 400,
  color text DEFAULT 'gray',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add group_id to fridge_widgets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fridge_widgets' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE fridge_widgets ADD COLUMN group_id uuid REFERENCES fridge_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fridge_groups_household ON fridge_groups(household_id);
CREATE INDEX IF NOT EXISTS idx_fridge_widgets_group ON fridge_widgets(group_id);

-- Disable RLS for now (for testing)
ALTER TABLE fridge_groups DISABLE ROW LEVEL SECURITY;