/*
  # Create Reports Table

  1. New Tables
    - `reports`
      - `id` (uuid, primary key) - Unique identifier for report
      - `household_id` (uuid, foreign key) - Links to households table
      - `generated_by` (uuid, foreign key) - User who generated the report
      - `content` (text) - The full report content
      - `metadata` (jsonb) - Additional metadata (member count, sections completed, etc.)
      - `created_at` (timestamptz) - When report was generated
  
  2. Security
    - Enable RLS on reports table
    - Users can view reports for their household
    - Users can generate reports for their household
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  generated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports in their household"
  ON reports FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for their household"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM members WHERE user_id = auth.uid()
    )
  );
