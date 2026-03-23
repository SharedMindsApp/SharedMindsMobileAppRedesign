/*
  # Update Domain Type Constraints to Match Domain Config

  1. Updates
    - Update check constraint on guardrails_project_type_domains to include 'health' and remove 'passion'
    - Domains now: work, personal, creative, health (matching domainConfig.ts)

  2. Notes
    - Aligns database constraints with frontend domain configuration
    - 'creative' maps to "Startup" display name
    - 'health' maps to "Health" display name
*/

-- Drop old constraint
ALTER TABLE guardrails_project_type_domains 
DROP CONSTRAINT IF EXISTS guardrails_project_type_domains_domain_type_check;

-- Add new constraint with correct domain types
ALTER TABLE guardrails_project_type_domains
ADD CONSTRAINT guardrails_project_type_domains_domain_type_check 
CHECK (domain_type IN ('work', 'personal', 'creative', 'health'));
