/*
  # AI Provider Registry and Feature Model Routing

  ## Overview
  Implements admin-controlled AI provider registry and feature-based model routing
  to dynamically select which provider/model to use per feature without code changes.

  ## New Tables

  ### ai_providers
  Registry of available AI providers (OpenAI, Anthropic, Perplexity, etc.)
  - `id` (uuid, primary key)
  - `name` (text, unique) - Provider identifier (e.g., "openai")
  - `display_name` (text) - Human-readable name
  - `is_enabled` (boolean) - Whether provider is active
  - `supports_tools` (boolean) - Supports function calling
  - `supports_streaming` (boolean) - Supports streaming responses
  - `created_at`, `updated_at` (timestamptz)

  ### ai_provider_models
  Models available per provider with capabilities and pricing
  - `id` (uuid, primary key)
  - `provider_id` (uuid, foreign key) - Links to ai_providers
  - `model_key` (text) - Provider-specific model identifier
  - `display_name` (text) - Human-readable name
  - `capabilities` (jsonb) - Structured capabilities (chat, reasoning, vision, etc.)
  - `context_window_tokens` (int) - Max context window
  - `max_output_tokens` (int) - Max output length
  - `cost_input_per_1m` (numeric, nullable) - Cost per 1M input tokens
  - `cost_output_per_1m` (numeric, nullable) - Cost per 1M output tokens
  - `is_enabled` (boolean) - Whether model is active
  - `created_at`, `updated_at` (timestamptz)

  ### ai_feature_routes
  Routing rules mapping features to models with constraints
  - `id` (uuid, primary key)
  - `feature_key` (text) - Feature identifier (e.g., "ai_chat")
  - `surface_type` (text, nullable) - project/personal/shared or null for default
  - `master_project_id` (uuid, nullable) - Optional project-specific override
  - `provider_model_id` (uuid, foreign key) - Target model
  - `is_fallback` (boolean) - Whether this is a fallback route
  - `priority` (int) - Route priority (higher wins)
  - `constraints` (jsonb) - Budget/intent constraints
  - `is_enabled` (boolean) - Whether route is active
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - Only admins can modify provider/model/route configuration
  - All users can read (needed for routing resolution)
  - API keys NEVER stored in database
*/

-- Create ai_providers table
CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  supports_tools boolean DEFAULT false NOT NULL,
  supports_streaming boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create ai_provider_models table
CREATE TABLE IF NOT EXISTS ai_provider_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES ai_providers(id) ON DELETE CASCADE NOT NULL,
  model_key text NOT NULL,
  display_name text NOT NULL,
  capabilities jsonb DEFAULT '{}'::jsonb NOT NULL,
  context_window_tokens int NOT NULL,
  max_output_tokens int NOT NULL,
  cost_input_per_1m numeric(10, 4),
  cost_output_per_1m numeric(10, 4),
  is_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(provider_id, model_key)
);

-- Create ai_feature_routes table
CREATE TABLE IF NOT EXISTS ai_feature_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  surface_type text,
  master_project_id uuid REFERENCES master_projects(id) ON DELETE CASCADE,
  provider_model_id uuid REFERENCES ai_provider_models(id) ON DELETE CASCADE NOT NULL,
  is_fallback boolean DEFAULT false NOT NULL,
  priority int DEFAULT 0 NOT NULL,
  constraints jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CHECK (surface_type IS NULL OR surface_type IN ('project', 'personal', 'shared'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_provider_models_provider_id ON ai_provider_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_models_enabled ON ai_provider_models(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_feature_routes_feature_key ON ai_feature_routes(feature_key);
CREATE INDEX IF NOT EXISTS idx_ai_feature_routes_surface_type ON ai_feature_routes(surface_type);
CREATE INDEX IF NOT EXISTS idx_ai_feature_routes_project_id ON ai_feature_routes(master_project_id) WHERE master_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_feature_routes_priority ON ai_feature_routes(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feature_routes_enabled ON ai_feature_routes(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feature_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read access for all authenticated, write access for admins only

-- ai_providers policies
CREATE POLICY "Anyone can view enabled providers"
  ON ai_providers FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "Admins can view all providers"
  ON ai_providers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert providers"
  ON ai_providers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update providers"
  ON ai_providers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete providers"
  ON ai_providers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ai_provider_models policies
CREATE POLICY "Anyone can view enabled models"
  ON ai_provider_models FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "Admins can view all models"
  ON ai_provider_models FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert models"
  ON ai_provider_models FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update models"
  ON ai_provider_models FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete models"
  ON ai_provider_models FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ai_feature_routes policies
CREATE POLICY "Anyone can view enabled routes"
  ON ai_feature_routes FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "Admins can view all routes"
  ON ai_feature_routes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert routes"
  ON ai_feature_routes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update routes"
  ON ai_feature_routes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete routes"
  ON ai_feature_routes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed default providers and models
INSERT INTO ai_providers (name, display_name, is_enabled, supports_tools, supports_streaming) VALUES
  ('anthropic', 'Anthropic', true, true, true),
  ('openai', 'OpenAI', true, true, true),
  ('perplexity', 'Perplexity', false, false, true)
ON CONFLICT (name) DO NOTHING;

-- Seed Anthropic models
INSERT INTO ai_provider_models (provider_id, model_key, display_name, capabilities, context_window_tokens, max_output_tokens, cost_input_per_1m, cost_output_per_1m, is_enabled)
SELECT
  p.id,
  'claude-3-5-sonnet-20241022',
  'Claude 3.5 Sonnet',
  '{"chat": true, "reasoning": true, "vision": true, "tools": true, "long_context": true}'::jsonb,
  200000,
  8192,
  3.00,
  15.00,
  true
FROM ai_providers p WHERE p.name = 'anthropic'
ON CONFLICT (provider_id, model_key) DO NOTHING;

INSERT INTO ai_provider_models (provider_id, model_key, display_name, capabilities, context_window_tokens, max_output_tokens, cost_input_per_1m, cost_output_per_1m, is_enabled)
SELECT
  p.id,
  'claude-3-5-haiku-20241022',
  'Claude 3.5 Haiku',
  '{"chat": true, "reasoning": true, "vision": true, "tools": true, "long_context": false}'::jsonb,
  200000,
  8192,
  1.00,
  5.00,
  true
FROM ai_providers p WHERE p.name = 'anthropic'
ON CONFLICT (provider_id, model_key) DO NOTHING;

-- Seed OpenAI models
INSERT INTO ai_provider_models (provider_id, model_key, display_name, capabilities, context_window_tokens, max_output_tokens, cost_input_per_1m, cost_output_per_1m, is_enabled)
SELECT
  p.id,
  'gpt-4.1-mini',
  'GPT-4.1 Mini',
  '{"chat": true, "reasoning": true, "vision": false, "tools": true, "long_context": false}'::jsonb,
  128000,
  16384,
  0.15,
  0.60,
  true
FROM ai_providers p WHERE p.name = 'openai'
ON CONFLICT (provider_id, model_key) DO NOTHING;

INSERT INTO ai_provider_models (provider_id, model_key, display_name, capabilities, context_window_tokens, max_output_tokens, cost_input_per_1m, cost_output_per_1m, is_enabled)
SELECT
  p.id,
  'gpt-4o',
  'GPT-4o',
  '{"chat": true, "reasoning": true, "vision": true, "tools": true, "long_context": false}'::jsonb,
  128000,
  16384,
  2.50,
  10.00,
  true
FROM ai_providers p WHERE p.name = 'openai'
ON CONFLICT (provider_id, model_key) DO NOTHING;

-- Create default routing: Use Claude 3.5 Sonnet for all features by default
INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'ai_chat',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 100000, "max_output_tokens": 4096}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-sonnet-20241022'
ON CONFLICT DO NOTHING;

INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'draft_generation',
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

INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'project_summary',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 100000, "max_output_tokens": 2048}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-sonnet-20241022'
ON CONFLICT DO NOTHING;

-- Use cheaper Haiku for meal planner
INSERT INTO ai_feature_routes (feature_key, surface_type, provider_model_id, is_fallback, priority, constraints, is_enabled)
SELECT
  'spaces_meal_planner',
  NULL,
  m.id,
  false,
  100,
  '{"max_context_tokens": 50000, "max_output_tokens": 1024}'::jsonb,
  true
FROM ai_provider_models m
JOIN ai_providers p ON m.provider_id = p.id
WHERE p.name = 'anthropic' AND m.model_key = 'claude-3-5-haiku-20241022'
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_ai_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_registry_updated_at();

CREATE TRIGGER update_ai_provider_models_updated_at
  BEFORE UPDATE ON ai_provider_models
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_registry_updated_at();

CREATE TRIGGER update_ai_feature_routes_updated_at
  BEFORE UPDATE ON ai_feature_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_registry_updated_at();
