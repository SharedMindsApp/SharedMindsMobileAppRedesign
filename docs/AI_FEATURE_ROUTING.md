# AI Feature Routing

## Overview

The AI Feature Routing system dynamically selects which AI provider and model to use for each feature (chat, draft generation, meal planner, etc.) without requiring code changes. Routing is configured by administrators and respects all existing safety boundaries.

## Architecture

### Database Table: `ai_feature_routes`

Stores routing rules mapping features to models.

**Columns:**
- `id` (uuid) - Primary key
- `feature_key` (text) - Feature identifier (NOT NULL)
- `surface_type` (text, nullable) - "project", "personal", "shared", or NULL for default
- `master_project_id` (uuid, nullable) - Optional project-specific override
- `provider_model_id` (uuid) - Foreign key to `ai_provider_models` (NOT NULL)
- `is_fallback` (boolean) - Whether this is a fallback route
- `priority` (int) - Route priority (higher wins)
- `constraints` (jsonb) - Budget and intent constraints
- `is_enabled` (boolean) - Whether the route is active
- `created_at`, `updated_at` (timestamptz) - Timestamps

**Check constraint:** `surface_type IN ('project', 'personal', 'shared')` or NULL

### Indexes

- `feature_key` - For fast lookup
- `surface_type` - For surface-specific routing
- `master_project_id` - For project-specific routing
- `priority` (DESC) - For priority-based selection
- `is_enabled` - For enabled route filtering

## Feature Keys

### Defined Feature Keys

```typescript
type FeatureKey =
  | 'ai_chat'                  // General conversational chat
  | 'draft_generation'         // Draft creation (roadmap items, tasks, etc.)
  | 'project_summary'          // Project summarization
  | 'deadline_analysis'        // Deadline feasibility analysis
  | 'mind_mesh_explain'        // Mind mesh node explanations
  | 'taskflow_assist'          // Task flow assistance
  | 'spaces_meal_planner'      // Meal planning
  | 'spaces_notes_assist'      // Note-taking assistance
  | 'reality_check_assist'     // Reality/feasibility checking
  | 'offshoot_analysis'        // Offshoot idea analysis
```

### Intent to Feature Mapping

The system automatically maps AI intents to feature keys:

```typescript
const INTENT_TO_FEATURE_MAP = {
  'draft_roadmap_item': 'draft_generation',
  'draft_track': 'draft_generation',
  'draft_milestone': 'draft_generation',
  'suggest_tasks': 'taskflow_assist',
  'explain_node': 'mind_mesh_explain',
  'analyze_deadline': 'deadline_analysis',
  'summarize_project': 'project_summary',
  'meal_suggestion': 'spaces_meal_planner',
  'note_assist': 'spaces_notes_assist',
  'check_feasibility': 'reality_check_assist',
  'analyze_offshoot': 'offshoot_analysis',
  'general': 'ai_chat',
  'conversational': 'ai_chat',
};
```

## Route Constraints

Routes can specify constraints as JSONB:

```typescript
interface RouteConstraints {
  maxContextTokens?: number;        // Max input tokens
  maxOutputTokens?: number;         // Max output tokens
  maxCostWeight?: number;           // Cost limit (optional)
  allowedIntents?: string[];        // Whitelist intents
  disallowedIntents?: string[];     // Blacklist intents
}
```

### Example Constraints

```json
{
  "maxContextTokens": 100000,
  "maxOutputTokens": 4096,
  "allowedIntents": ["draft_roadmap_item", "draft_track"],
  "disallowedIntents": ["explain_node"]
}
```

## Route Resolution Algorithm

### Resolution Steps

1. **Determine Feature Key**
   - Use explicit `featureKey` if provided
   - Otherwise infer from `intent` using `INTENT_TO_FEATURE_MAP`

2. **Fetch Candidate Routes**
   - Query all enabled routes for the feature key
   - Filter by enabled provider models
   - Filter by enabled providers

3. **Calculate Specificity**
   - Project-specific match: specificity = 3
   - Surface-specific match: specificity = 2
   - Default (no surface/project): specificity = 1
   - Non-matching surface/project: excluded

4. **Filter by Intent**
   - Exclude if intent is in `disallowedIntents`
   - Exclude if `allowedIntents` exists and intent not included

5. **Select Best Route**
   - Sort by specificity (DESC)
   - Then by priority (DESC)
   - Then by `is_fallback` (non-fallback preferred)
   - Return first match

6. **Fallback**
   - If no route found, use hardcoded default (Claude 3.5 Sonnet)
   - Log warning to console

### Resolution Specificity Examples

**Example 1: Project-specific override**
```
Request: { featureKey: 'ai_chat', surface: 'project', projectId: 'abc123' }

Routes:
1. feature='ai_chat', surface=NULL, project=NULL → specificity 1
2. feature='ai_chat', surface='project', project=NULL → specificity 2
3. feature='ai_chat', surface='project', project='abc123' → specificity 3 ✓

Selected: Route 3 (most specific)
```

**Example 2: Surface-specific route**
```
Request: { featureKey: 'draft_generation', surface: 'personal' }

Routes:
1. feature='draft_generation', surface=NULL → specificity 1
2. feature='draft_generation', surface='personal' → specificity 2 ✓
3. feature='draft_generation', surface='project' → excluded (wrong surface)

Selected: Route 2 (surface match)
```

**Example 3: Default route**
```
Request: { featureKey: 'spaces_meal_planner' }

Routes:
1. feature='spaces_meal_planner', surface=NULL → specificity 1 ✓

Selected: Route 1 (default)
```

## Default Routing Configuration

The system seeds with the following default routes:

| Feature Key | Surface | Model | Constraints |
|-------------|---------|-------|-------------|
| `ai_chat` | NULL (default) | Claude 3.5 Sonnet | 100K context, 4K output |
| `draft_generation` | NULL | Claude 3.5 Sonnet | 150K context, 4K output |
| `project_summary` | NULL | Claude 3.5 Sonnet | 100K context, 2K output |
| `spaces_meal_planner` | NULL | Claude 3.5 Haiku | 50K context, 1K output |

## Admin UI

### AI Routing Page (`/admin/ai-routing`)

Allows admins to:
- View routes grouped by feature
- See default, surface-specific, and project-specific routes
- Enable/disable individual routes
- Delete routes
- View route priorities and constraints

### Features:
- Accordion view per feature key
- Visual indicators for scope (default, surface, project)
- Fallback route indicators
- Priority display
- Constraint summary

## Integration with AI Pipeline

### AIExecutionService

The `AIExecutionService` integrates routing into all AI calls:

```typescript
const result = await aiExecutionService.execute({
  userId: '...',
  projectId: '...', // optional
  intent: 'draft_roadmap_item',
  surfaceType: 'project',
  systemPrompt: '...',
  userPrompt: '...',
});
```

**Flow:**
1. Resolve route via `aiRoutingService.resolveRoute()`
2. Get provider adapter via `getProviderAdapter()`
3. Build normalized request with budgets from route constraints
4. Execute via adapter
5. Record audit with provider/model info
6. Return response

### Streaming Support

```typescript
await aiExecutionService.executeStream(request, {
  onToken: (token) => console.log(token),
  onComplete: (response) => console.log('Done:', response),
  onError: (error) => console.error(error),
});
```

## Safety Boundaries Preserved

The routing system respects all existing safety constraints:

### ✅ Non-Authoritative Drafts
- AI responses remain as drafts requiring explicit user application
- No direct database writes from AI

### ✅ Surface Boundaries
- Project routes only active in project context
- Personal routes only for personal spaces
- No cross-surface data access

### ✅ Budget Enforcement
- Route constraints define max tokens
- System budgets act as hard limits
- Minimum of route and system budgets applied

### ✅ Intent Validation
- `allowedIntents` and `disallowedIntents` enforced
- Invalid intents rejected before execution

### ✅ Audit Trail
- Every AI interaction logged with provider/model
- Token usage and cost tracked
- Audit includes route information

## Error Handling

### Common Errors

**NoRouteFoundError**
- Thrown when no enabled route exists for feature
- Falls back to hardcoded default
- Logs warning

**ProviderNotConfiguredError**
- Thrown when API key missing
- Must be caught and reported to user

**ModelNotSupportedError**
- Thrown when model not supported by provider adapter
- Indicates configuration mismatch

**ProviderAPIError**
- Thrown on API failures
- Includes retry flag for transient errors

### Failure Modes

1. **Disabled Provider**: Route skipped, next candidate tried
2. **Disabled Model**: Route skipped, next candidate tried
3. **No Route**: Hardcoded fallback used with warning
4. **Missing API Key**: Error thrown, request fails
5. **API Error**: Error thrown with retry guidance

## Example Use Cases

### Use Case 1: Cheaper Model for Simple Features

Configure meal planner to use Claude 3.5 Haiku instead of Sonnet:

```sql
INSERT INTO ai_feature_routes (
  feature_key, provider_model_id, priority, constraints
) VALUES (
  'spaces_meal_planner',
  (SELECT id FROM ai_provider_models WHERE model_key = 'claude-3-5-haiku-20241022'),
  100,
  '{"maxContextTokens": 50000, "maxOutputTokens": 1024}'::jsonb
);
```

### Use Case 2: Project-Specific Model Override

Use GPT-4o for a specific high-priority project:

```sql
INSERT INTO ai_feature_routes (
  feature_key, surface_type, master_project_id, provider_model_id, priority
) VALUES (
  'draft_generation',
  'project',
  'project-uuid-here',
  (SELECT id FROM ai_provider_models WHERE model_key = 'gpt-4o'),
  200
);
```

### Use Case 3: Intent-Specific Routing

Use Haiku only for simple explanations:

```sql
INSERT INTO ai_feature_routes (
  feature_key, provider_model_id, constraints
) VALUES (
  'mind_mesh_explain',
  (SELECT id FROM ai_provider_models WHERE model_key = 'claude-3-5-haiku-20241022'),
  '{"allowedIntents": ["explain_node"]}'::jsonb
);
```

## Monitoring and Analytics

### Audit Data

AI interactions are logged with:
- `feature_key` - Which feature was used
- `provider` - Which provider (anthropic, openai)
- `model` - Which model (claude-3-5-sonnet-20241022)
- `route_id` - Which route was selected
- `token_usage` - Input/output tokens
- `cost_estimate` - Estimated cost
- `latency_ms` - Response time

### Query Examples

**Most used models:**
```sql
SELECT
  entities_included->>'model' as model,
  COUNT(*) as usage_count
FROM ai_interaction_audits
GROUP BY entities_included->>'model'
ORDER BY usage_count DESC;
```

**Cost by feature:**
```sql
SELECT
  entities_included->>'featureKey' as feature,
  SUM((entities_included->'costEstimate'->>'totalCost')::numeric) as total_cost
FROM ai_interaction_audits
WHERE entities_included->'costEstimate' IS NOT NULL
GROUP BY feature
ORDER BY total_cost DESC;
```

## Migration

Feature routing is created via migration:
`20251212192247_create_ai_provider_registry_and_routing.sql`

This migration includes:
- Table creation
- Indexes
- RLS policies
- Default provider/model seeding
- Default route seeding
