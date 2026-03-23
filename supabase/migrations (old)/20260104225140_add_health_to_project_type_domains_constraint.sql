/*
  # Add Health to Project Type Domains Constraint

  1. Updates
    - Update check constraint on guardrails_project_type_domains to include 'health'
    - Ensures 'health' domain type is accepted for project type domains

  2. Notes
    - Adds 'health' to the existing allowed domain types
    - Keeps existing domain types: work, personal, passion, startup, creative
    - Aligns with domain configuration that includes health domain
*/

-- Drop existing constraint if it exists
ALTER TABLE guardrails_project_type_domains 
DROP CONSTRAINT IF EXISTS guardrails_project_type_domains_domain_type_check;

-- Add new constraint with all domain types including health
ALTER TABLE guardrails_project_type_domains
ADD CONSTRAINT guardrails_project_type_domains_domain_type_check 
CHECK (domain_type IN ('work', 'personal', 'passion', 'startup', 'creative', 'health'));





