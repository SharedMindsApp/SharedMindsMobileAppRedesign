# AI Provider Registry

## Overview

The AI Provider Registry is a database-driven system that allows administrators to configure which AI providers (OpenAI, Anthropic, Perplexity, etc.) and models are available in the application.

## Architecture

### Database Tables

#### `ai_providers`
Stores available AI provider configurations.

**Columns:**
- `id` (uuid) - Primary key
- `name` (text, unique) - Provider identifier (e.g., "openai", "anthropic")
- `display_name` (text) - Human-readable name
- `is_enabled` (boolean) - Whether the provider is active
- `supports_tools` (boolean) - Whether provider supports function calling
- `supports_streaming` (boolean) - Whether provider supports streaming responses
- `created_at`, `updated_at` (timestamptz) - Timestamps

#### `ai_provider_models`
Stores available models for each provider.

**Columns:**
- `id` (uuid) - Primary key
- `provider_id` (uuid) - Foreign key to `ai_providers`
- `model_key` (text) - Provider-specific model identifier
- `display_name` (text) - Human-readable name
- `capabilities` (jsonb) - Model capabilities (chat, reasoning, vision, tools, etc.)
- `context_window_tokens` (int) - Maximum context window size
- `max_output_tokens` (int) - Maximum output length
- `cost_input_per_1m` (numeric) - Cost per 1M input tokens (nullable)
- `cost_output_per_1m` (numeric) - Cost per 1M output tokens (nullable)
- `is_enabled` (boolean) - Whether the model is active
- `created_at`, `updated_at` (timestamptz) - Timestamps

**Unique constraint:** `(provider_id, model_key)`

### Security

**Row Level Security (RLS):**
- All authenticated users can read enabled providers and models
- Only admins can view disabled providers/models
- Only admins can insert, update, or delete providers/models

**Important:** API keys are NEVER stored in the database. They remain in environment variables.

## Provider Adapters

### Adapter Interface

```typescript
interface AIProviderAdapter {
  provider: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
  generate(request: NormalizedAIRequest): Promise<NormalizedAIResponse>;
  stream?(request: NormalizedAIRequest, callbacks: StreamCallback): Promise<void>;
}
```

### Implemented Adapters

1. **AnthropicAdapter** (`anthropicAdapter.ts`)
   - Supports Claude models
   - Streaming: Yes
   - Tools: Yes
   - Requires: `VITE_ANTHROPIC_API_KEY`

2. **OpenAIAdapter** (`openaiAdapter.ts`)
   - Supports GPT models
   - Streaming: Yes
   - Tools: Yes
   - Requires: `VITE_OPENAI_API_KEY`

3. **Perplexity** (placeholder)
   - Not implemented
   - Throws `ProviderNotConfiguredError`

### Adding New Providers

1. Create adapter class implementing `AIProviderAdapter`
2. Add to `providerFactory.ts`
3. Insert provider configuration in database
4. Set environment variable with API key

## Model Capabilities

Model capabilities are stored as JSONB with the following structure:

```json
{
  "chat": true,
  "reasoning": true,
  "vision": false,
  "search": false,
  "long_context": true,
  "tools": true
}
```

## Admin UI

### AI Providers Page (`/admin/ai-providers`)

Allows admins to:
- View all providers
- Enable/disable providers
- View models per provider
- Enable/disable individual models
- View model capabilities and pricing

### Features:
- Left panel: Provider list with enable/disable toggle
- Right panel: Model details table for selected provider
- Visual indicators for capabilities (streaming, tools)
- Cost information per 1M tokens

## Default Configuration

The system seeds with the following providers and models:

### Anthropic
- Claude 3.5 Sonnet (enabled)
- Claude 3.5 Haiku (enabled)

### OpenAI
- GPT-4.1 Mini (enabled)
- GPT-4o (enabled)

### Perplexity
- Disabled by default

## Error Handling

### Provider Errors

- `ProviderNotConfiguredError`: API key not set in environment
- `ModelNotSupportedError`: Model not supported by provider
- `ProviderAPIError`: API call failed (includes retry flag)

### Graceful Degradation

If a provider is disabled or unavailable, the routing system will:
1. Try fallback routes (if configured)
2. Use hardcoded default (Claude 3.5 Sonnet)
3. Log warning to console

## Environment Variables

Required environment variables per provider:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
```

**Security Note:** These are NOT stored in database and must be configured server-side.

## Migration

Default providers and models are seeded automatically via migration:
`20251212192247_create_ai_provider_registry_and_routing.sql`

## Monitoring

AI interactions are logged to `ai_interaction_audits` table with:
- Provider and model used
- Token usage
- Cost estimate
- Latency
- Route information
