/*
  # Create Project Type Domains Junction Table

  1. New Table
    - guardrails_project_type_domains (junction table)
      - id (uuid, primary key)
      - project_type_id (uuid, foreign key to guardrails_project_types)
      - domain_type (text, one of work, personal, passion, startup, creative)
      - created_at (timestamptz)
      - Unique constraint on (project_type_id, domain_type)

  2. Security
    - Enable RLS on new table
    - Read-only access for authenticated users

  3. Indexes
    - Index on project_type_id for efficient lookups
    - Index on domain_type for filtering

  4. Notes
    - Allows project types to appear in multiple domains
    - Many-to-many relationship between project types and domains
    - Supports all domain types work, personal, passion, startup, creative
*/

CREATE TABLE IF NOT EXISTS guardrails_project_type_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id uuid NOT NULL REFERENCES guardrails_project_types(id) ON DELETE CASCADE,
  domain_type text NOT NULL CHECK (domain_type IN ('work', 'personal', 'passion', 'startup', 'creative')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_type_id, domain_type)
);

CREATE INDEX IF NOT EXISTS idx_project_type_domains_project_type ON guardrails_project_type_domains(project_type_id);
CREATE INDEX IF NOT EXISTS idx_project_type_domains_domain ON guardrails_project_type_domains(domain_type);

ALTER TABLE guardrails_project_type_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project type domains"
  ON guardrails_project_type_domains
  FOR SELECT
  TO authenticated
  USING (true);
