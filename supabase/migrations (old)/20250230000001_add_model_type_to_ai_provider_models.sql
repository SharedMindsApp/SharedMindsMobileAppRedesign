/*
  # Add model_type to ai_provider_models

  ## Overview
  Adds a `model_type` column to distinguish between:
  - `language_model` - Traditional LLMs (OpenAI, Anthropic)
  - `search_ai` - Search/Retrieval AI (Perplexity)

  ## Changes
  - Add `model_type` column (text, default 'language_model')
  - Set existing models to 'language_model'
  - Set Perplexity models to 'search_ai'
  - Make token/cost fields nullable for search_ai models
*/

-- Add model_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_provider_models' AND column_name = 'model_type'
  ) THEN
    ALTER TABLE ai_provider_models
    ADD COLUMN model_type text DEFAULT 'language_model' NOT NULL
    CHECK (model_type IN ('language_model', 'search_ai'));
  END IF;
END $$;

-- Update existing models to language_model (explicit, though default handles it)
UPDATE ai_provider_models
SET model_type = 'language_model'
WHERE model_type IS NULL OR model_type = 'language_model';

-- Make context_window_tokens and max_output_tokens nullable first
-- (Needed before we can set them to null for Perplexity models)
ALTER TABLE ai_provider_models
ALTER COLUMN context_window_tokens DROP NOT NULL,
ALTER COLUMN max_output_tokens DROP NOT NULL;

-- Update Perplexity models to search_ai and clear token fields
UPDATE ai_provider_models
SET 
  model_type = 'search_ai',
  context_window_tokens = NULL,
  max_output_tokens = NULL,
  cost_input_per_1m = NULL,
  cost_output_per_1m = NULL
WHERE provider_id IN (
  SELECT id FROM ai_providers WHERE name = 'perplexity'
);

-- Add comment
COMMENT ON COLUMN ai_provider_models.model_type IS 'Type of AI model: language_model (traditional LLM) or search_ai (search/retrieval AI like Perplexity)';
