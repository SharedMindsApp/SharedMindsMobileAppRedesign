# AI Routing Capability Validation

## Overview

The AI routing system now validates that models have the required capabilities for each feature before routing requests. This ensures that features requiring specific capabilities (like `search` for Perplexity) only route to compatible models.

## How It Works

### 1. Feature Requirements

Each feature in the registry specifies required capabilities:

```typescript
spaces_recipe_generation: {
  key: 'spaces_recipe_generation',
  label: 'Recipe Generation',
  requiredCapabilities: ['search'], // Requires search capability
  // ...
}
```

### 2. Capability Validation

When resolving routes, the system:

1. **Fetches Route Candidates** - Gets all enabled routes for the feature
2. **Validates Capabilities** - Checks each model against feature requirements
3. **Filters Invalid Routes** - Removes routes where models don't have required capabilities
4. **Selects Best Route** - Chooses from valid candidates based on specificity and priority

### 3. Capability Normalization

Capabilities are normalized when loading from the database to ensure consistent format:

```typescript
const normalizedCapabilities = {
  chat: rawCapabilities.chat || false,
  reasoning: rawCapabilities.reasoning || false,
  vision: rawCapabilities.vision || false,
  search: rawCapabilities.search || false, // CRITICAL for Perplexity
  longContext: rawCapabilities.longContext || rawCapabilities.long_context || false,
  tools: rawCapabilities.tools || false,
};
```

## Required Capabilities by Feature

| Feature | Required Capabilities | Example Models |
|---------|----------------------|----------------|
| `spaces_recipe_generation` | `search` | Perplexity: sonar, sonar-pro |
| `spaces_meal_planner` | `chat` | OpenAI, Anthropic, Perplexity |
| `spaces_grocery_assist` | `chat`, `reasoning` | OpenAI, Anthropic |
| `ai_chat` | `chat` | OpenAI, Anthropic, Perplexity |
| `draft_generation` | `chat`, `reasoning` | OpenAI, Anthropic |
| `project_summary` | `chat`, `reasoning`, `longContext` | OpenAI, Anthropic |

## Perplexity Models

Perplexity models are configured as `search_ai` type and must have:
- ✅ `search: true` capability
- ✅ Model type: `search_ai`
- ✅ Provider: `perplexity`

### Example Perplexity Model Configuration

```json
{
  "modelKey": "sonar",
  "displayName": "Perplexity Sonar",
  "modelType": "search_ai",
  "capabilities": {
    "search": true,
    "chat": true
  }
}
```

## Validation Flow

```
Request: spaces_recipe_generation
    ↓
Fetch routes for feature
    ↓
For each route:
    ↓
  Load model from database
    ↓
  Normalize capabilities
    ↓
  Validate: model.capabilities.search === true?
    ↓
  ✓ Valid → Add to candidates
  ✗ Invalid → Skip (log warning)
    ↓
Select best route from valid candidates
    ↓
Return resolved route
```

## Logging

The system logs capability validation results:

```
[AI ROUTING] Route candidates after capability validation {
  featureKey: 'spaces_recipe_generation',
  totalRoutes: 3,
  validCandidates: 1,
  candidates: [
    {
      provider: 'perplexity',
      model: 'sonar',
      capabilities: { search: true, chat: true }
    }
  ]
}
```

If a model is invalid, a warning is logged:

```
[AI ROUTING] Model does not have required capabilities {
  featureKey: 'spaces_recipe_generation',
  modelId: 'model-123',
  modelKey: 'gpt-4',
  missingCapabilities: ['search'],
  modelCapabilities: { chat: true, reasoning: true }
}
```

## Benefits

1. **Type Safety** - Only compatible models are used for each feature
2. **Clear Errors** - Invalid routes are logged with specific missing capabilities
3. **Automatic Filtering** - No manual configuration needed - system validates automatically
4. **Future-Proof** - New features can specify requirements and routing adapts

## Troubleshooting

### Issue: "No routes found" for recipe generation

**Possible causes:**
1. No routes configured for `spaces_recipe_generation`
2. Routes exist but models don't have `search` capability
3. Routes are disabled

**Solution:**
1. Check Admin → AI Feature Routing
2. Verify Perplexity models have `search: true` capability
3. Ensure routes are enabled

### Issue: Route exists but not being used

**Possible causes:**
1. Model missing required capability
2. Route disabled
3. Lower priority than other routes

**Solution:**
1. Check model capabilities in Admin → AI Providers
2. Verify `search` capability is enabled for Perplexity models
3. Check route priority and enable status

## Configuration Checklist

When setting up Perplexity for recipe generation:

- [ ] Perplexity provider is enabled
- [ ] Perplexity model is enabled
- [ ] Model has `search: true` capability
- [ ] Model type is `search_ai`
- [ ] Route configured for `spaces_recipe_generation`
- [ ] Route surface type is `shared` (or blank for default)
- [ ] Route is enabled
- [ ] Route has appropriate priority

## Code Changes

### Files Modified

1. **`src/lib/guardrails/ai/aiRoutingService.ts`**
   - Added `validateModelForFeature` import
   - Added capability validation in `fetchRouteCandidates`
   - Enhanced `mapModelFromDB` to normalize capabilities
   - Added logging for validation results

2. **`src/lib/guardrails/ai/featureRegistry.ts`**
   - Already had `validateModelForFeature` function
   - `spaces_recipe_generation` requires `['search']`

### Validation Logic

```typescript
// In fetchRouteCandidates
const capabilityValidation = validateModelForFeature(mappedModel.capabilities, featureKey);

if (!capabilityValidation.valid) {
  console.warn('[AI ROUTING] Model does not have required capabilities', {
    featureKey,
    modelId: mappedModel.id,
    modelKey: mappedModel.modelKey,
    missingCapabilities: capabilityValidation.missingCapabilities,
  });
  continue; // Skip this route
}
```

This ensures that only models with the required capabilities are considered for routing.
