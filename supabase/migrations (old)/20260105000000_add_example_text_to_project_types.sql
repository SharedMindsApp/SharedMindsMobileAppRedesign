/*
  # Add Example Text to Project Types

  Adds a nullable JSONB column `example_text` to `guardrails_project_types` table
  to store wizard example text for the Idea step.

  Structure:
  {
    "idea": "string",
    "startingPoint": "string",
    "expectations": "string"
  }

  This column is optional - existing rows will have NULL, and the wizard
  will fall back to domain defaults if missing.
*/

-- Add example_text column to guardrails_project_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guardrails_project_types' AND column_name = 'example_text'
  ) THEN
    ALTER TABLE guardrails_project_types
    ADD COLUMN example_text jsonb;
  END IF;
END $$;

-- Add comment to document the structure
COMMENT ON COLUMN guardrails_project_types.example_text IS 'JSONB object with wizard example text for Idea step: { "idea": "string", "startingPoint": "string", "expectations": "string" }';





