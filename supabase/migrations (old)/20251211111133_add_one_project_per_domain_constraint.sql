/*
  # Add One Master Project Per Domain Constraint

  1. Changes
    - Drop the partial unique index that only enforced one active project per domain
    - Add a full unique constraint to ensure only ONE master project per domain (regardless of status)
    - This prevents users from creating multiple master projects in the same domain

  2. Security
    - No RLS changes needed
    - Constraint enforced at database level

  3. Notes
    - This is a breaking change from the previous design which allowed multiple projects per domain
    - Users can now only have ONE master project per domain ever
    - To create a new project in a domain, users must delete the existing project first
*/

-- Drop the partial index that only enforced one active project per domain
DROP INDEX IF EXISTS idx_master_projects_one_active_per_domain;

-- Add a unique constraint to ensure only one project per domain (regardless of status)
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_projects_one_per_domain
  ON master_projects(domain_id);