/*
  # Add Archive Fields to Master Projects

  1. Changes
    - Add `is_archived` boolean field to master_projects (default false)
    - Add `archived_at` timestamp field to master_projects (nullable)
    - Add `abandonment_reason` text field to master_projects (nullable)
    - Update the one-project-per-domain constraint to only apply to non-archived projects

  2. Security
    - No RLS changes needed
    - Fields accessible through existing policies

  3. Notes
    - Archived projects should be excluded from main queries
    - Completing or abandoning a project frees the domain for new projects
    - Archiving is purely for historical record keeping
*/

-- Drop the existing unique constraint on domain_id
DROP INDEX IF EXISTS idx_master_projects_one_per_domain;

-- Add new fields to master_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE master_projects ADD COLUMN is_archived boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE master_projects ADD COLUMN archived_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'abandonment_reason'
  ) THEN
    ALTER TABLE master_projects ADD COLUMN abandonment_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE master_projects ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Create a partial unique index to ensure only one non-archived project per domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_projects_one_per_domain_not_archived
  ON master_projects(domain_id)
  WHERE is_archived = false;

-- Create an index for querying archived projects
CREATE INDEX IF NOT EXISTS idx_master_projects_archived ON master_projects(is_archived, archived_at);
CREATE INDEX IF NOT EXISTS idx_master_projects_completed ON master_projects(status, completed_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_master_projects_abandoned ON master_projects(status, updated_at) WHERE status = 'abandoned';