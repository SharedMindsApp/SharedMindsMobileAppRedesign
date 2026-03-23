/*
  # Add server proxy flags to ai_providers

  ## Overview
  Adds flags to mark providers that require server-side proxy (like Perplexity)
  due to CORS restrictions or security requirements.

  ## Changes
  - Add `requires_server_proxy` column (boolean, default false)
  - Add `supports_browser_calls` column (boolean, default true)
  - Set Perplexity to require server proxy
*/

-- Add requires_server_proxy column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_providers' AND column_name = 'requires_server_proxy'
  ) THEN
    ALTER TABLE ai_providers
    ADD COLUMN requires_server_proxy boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add supports_browser_calls column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_providers' AND column_name = 'supports_browser_calls'
  ) THEN
    ALTER TABLE ai_providers
    ADD COLUMN supports_browser_calls boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Set Perplexity to require server proxy
UPDATE ai_providers
SET 
  requires_server_proxy = true,
  supports_browser_calls = false
WHERE name = 'perplexity';

-- Add comments
COMMENT ON COLUMN ai_providers.requires_server_proxy IS 'If true, API calls must go through server-side proxy (e.g., for CORS-restricted providers like Perplexity)';
COMMENT ON COLUMN ai_providers.supports_browser_calls IS 'If false, provider does not support direct browser API calls and must use server proxy';
