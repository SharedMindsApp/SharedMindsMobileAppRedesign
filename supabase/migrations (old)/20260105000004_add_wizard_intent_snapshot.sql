/*
  # Add Wizard Intent Snapshot to Master Projects

  Adds a nullable JSONB column `wizard_intent_snapshot` to `master_projects` table
  to store the complete ProjectIntentSnapshot from the Review step.

  This allows users to:
  - Retrieve their wizard summary even if they exit the wizard
  - View what was sent to Reality Check Funnel #1
  - Resume the wizard with all their data intact

  Structure (ProjectIntentSnapshot):
  {
    "domain": "string | null",
    "projectType": "string | null",
    "projectName": "string",
    "idea": {
      "description": "string",
      "startingPoint": "string",
      "expectations": "string"
    },
    "goals": ["string"],
    "clarifySignals": {
      "timeExpectation": "string | null",
      "weeklyCommitment": "string | null",
      "experienceLevel": "string | null",
      "dependencyLevel": "string | null",
      "resourceAssumption": "string | null",
      "scopeClarity": "string | null",
      "contextNotes": {
        "timeExpectation": "string",
        "weeklyCommitment": "string",
        ...
      }
    }
  }

  This column is optional - existing rows will have NULL.
*/

-- Add wizard_intent_snapshot column to master_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'master_projects' AND column_name = 'wizard_intent_snapshot'
  ) THEN
    ALTER TABLE master_projects
    ADD COLUMN wizard_intent_snapshot jsonb;
  END IF;
END $$;

-- Add comment to document the structure
COMMENT ON COLUMN master_projects.wizard_intent_snapshot IS 'JSONB object storing the complete ProjectIntentSnapshot from the Review step, including domain, projectType, idea (3 fields), goals, and clarifySignals';




