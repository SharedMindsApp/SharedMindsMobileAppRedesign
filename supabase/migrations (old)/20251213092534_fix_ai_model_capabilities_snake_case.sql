/*
  # Fix AI Model Capabilities Key Naming

  This migration normalizes capability keys from snake_case to camelCase.
  
  Background: Some models had capabilities stored with snake_case keys (long_context)
  while others used camelCase (longContext). This causes validation failures.
  
  Changes:
  - Updates all existing ai_provider_models to use consistent camelCase keys
  - Converts long_context to longContext for all models
*/

-- Update all models to normalize capabilities to camelCase
UPDATE ai_provider_models
SET capabilities = jsonb_build_object(
  'chat', COALESCE((capabilities->>'chat')::boolean, false),
  'reasoning', COALESCE((capabilities->>'reasoning')::boolean, false),
  'vision', COALESCE((capabilities->>'vision')::boolean, false),
  'search', COALESCE((capabilities->>'search')::boolean, false),
  'longContext', COALESCE(
    (capabilities->>'longContext')::boolean, 
    (capabilities->>'long_context')::boolean, 
    false
  ),
  'tools', COALESCE((capabilities->>'tools')::boolean, false)
)
WHERE capabilities IS NOT NULL;