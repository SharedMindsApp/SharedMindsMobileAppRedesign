/*
  # Add Reasoning Level to AI Provider Models
  
  Adds a nullable `reasoning_level` column to `ai_provider_models` table
  to store the admin-selectable reasoning level preset for OpenAI models.
  
  This is an admin-facing abstraction that expands into model-specific parameters
  at request time (max_completion_tokens + reasoning.effort for GPT-5,
  max_tokens + temperature for other OpenAI models).
  
  Allowed values: 'fast', 'balanced', 'deep', 'long_form'
  
  This column is optional - existing rows will have NULL, and the system
  will use default parameters if not specified.
*/

-- Add reasoning_level column to ai_provider_models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_provider_models' AND column_name = 'reasoning_level'
  ) THEN
    ALTER TABLE ai_provider_models
    ADD COLUMN reasoning_level text CHECK (reasoning_level IN ('fast', 'balanced', 'deep', 'long_form'));
  END IF;
END $$;

-- Add comment to document the purpose
COMMENT ON COLUMN ai_provider_models.reasoning_level IS 'Admin-selectable reasoning level preset for OpenAI models. Expands to model-specific parameters at request time. Allowed values: fast, balanced, deep, long_form';




