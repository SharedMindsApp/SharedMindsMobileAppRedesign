/*
  # Add Reality Check Features to AI Routing

  Adds four new Reality Check features to the AI routing system:
  1. reality_check_initial - Initial Reality Check (Funnel #1)
  2. reality_check_secondary - Secondary Reality Check (Post-Wizard 2)
  3. reality_check_detailed - Detailed Reality Check (Post-Wizard 3)
  4. reality_check_reframe - Reality Check Reframe Assistant

  Each feature is configured with default routes using Claude 3.5 Sonnet,
  which provides the reasoning and structured output capabilities required.
*/

-- Add default routes for Initial Reality Check (Funnel #1)
-- Requires: Reasoning, Long context, Structured JSON output
INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'reality_check_initial',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 200000, "max_output_tokens": 4096}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-sonnet-20241022'
ON CONFLICT DO NOTHING;

-- Add default routes for Secondary Reality Check (Post-Wizard 2)
-- Requires: Reasoning, Structured output, Moderate context
INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'reality_check_secondary',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 150000, "max_output_tokens": 4096}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-sonnet-20241022'
ON CONFLICT DO NOTHING;

-- Add default routes for Detailed Reality Check (Post-Wizard 3)
-- Requires: Advanced reasoning, Long context, Structured output
INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'reality_check_detailed',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 200000, "max_output_tokens": 4096}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-sonnet-20241022'
ON CONFLICT DO NOTHING;

-- Add default routes for Reality Check Reframe Assistant
-- Requires: Reasoning, Text generation (non-creative, analytical), Structured output
INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'reality_check_reframe',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 150000, "max_output_tokens": 4096}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-sonnet-20241022'
ON CONFLICT DO NOTHING;




