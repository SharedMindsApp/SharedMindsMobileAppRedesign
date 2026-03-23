/*
  # Roadmap Item Deadline Extensions System

  1. Overview
    - Adds deadline extension tracking for roadmap items
    - Updates status enum to support deadline-aware workflow
    - Enables analytics-ready historical data capture

  2. New Tables
    - `roadmap_item_deadline_extensions`
      - Tracks every deadline extension with full history
      - Previous and new deadlines preserved
      - Optional reason for extension

  3. Status Updates
    - Adds 'pending' status (replaces 'not_started' semantic usage)
    - Adds 'cancelled' status (replaces 'archived' for void items)
    - Keeps existing statuses for backward compatibility

  4. Security
    - RLS enabled on extensions table
    - Same user access as roadmap_items

  5. Important Notes
    - Extensions are additive (never delete/update)
    - Original deadlines always recoverable from history
    - Completion/cancellation clears operational deadline state
    - Service layer computes derived deadline metadata
*/

-- Add new status values to enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'roadmap_item_status' 
    AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE roadmap_item_status ADD VALUE IF NOT EXISTS 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'roadmap_item_status' 
    AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE roadmap_item_status ADD VALUE IF NOT EXISTS 'cancelled';
  END IF;
END $$;

-- Create deadline extensions table
CREATE TABLE IF NOT EXISTS roadmap_item_deadline_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  previous_deadline date NOT NULL,
  new_deadline date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_extension_dates CHECK (new_deadline > previous_deadline)
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_deadline_extensions_item_id 
  ON roadmap_item_deadline_extensions(roadmap_item_id, created_at DESC);

-- Enable RLS
ALTER TABLE roadmap_item_deadline_extensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Match roadmap_items access patterns through track relationship
CREATE POLICY "Users can view extensions for their roadmap items"
  ON roadmap_item_deadline_extensions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN guardrails_tracks gt ON gt.id = ri.track_id
      JOIN master_projects mp ON mp.id = gt.master_project_id
      WHERE ri.id = roadmap_item_deadline_extensions.roadmap_item_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create extensions for their roadmap items"
  ON roadmap_item_deadline_extensions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmap_items ri
      JOIN guardrails_tracks gt ON gt.id = ri.track_id
      JOIN master_projects mp ON mp.id = gt.master_project_id
      WHERE ri.id = roadmap_item_deadline_extensions.roadmap_item_id
      AND mp.user_id = auth.uid()
    )
  );

-- No update or delete policies - extensions are immutable historical records