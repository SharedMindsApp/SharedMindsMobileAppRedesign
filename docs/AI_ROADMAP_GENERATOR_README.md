# AI Roadmap Generator Backend System

## Overview

The AI Roadmap Generator is a comprehensive backend system that uses Large Language Models (LLMs) to automatically generate project roadmaps with actionable tasks, organized by tracks and subtracks.

## Architecture

### Components

1. **Type Definitions** (`src/lib/guardrails/ai/types.ts`)
   - Defines all interfaces for inputs, outputs, and data structures
   - Type-safe contracts for the entire system

2. **LLM Provider** (`src/lib/guardrails/ai/llmProvider.ts`)
   - Abstraction layer supporting multiple LLM providers
   - Supports: OpenAI, Anthropic, Groq
   - Mock injection for testing

3. **Safe JSON Parser** (`src/lib/guardrails/ai/utils/safeLLMJson.ts`)
   - Sanitizes malformed JSON from LLM responses
   - Auto-fixes common issues (trailing commas, unescaped chars)
   - Multiple fallback strategies

4. **Prompt Builder** (`src/lib/guardrails/ai/promptBuilder.ts`)
   - Pure function for generating LLM prompts
   - Domain-aware context
   - Handles tracks, subtracks, and constraints

5. **Database Writer** (`src/lib/guardrails/ai/databaseWriter.ts`)
   - Writes generated roadmap items to database
   - Creates sections automatically
   - Links items to tracks and subtracks
   - Groups items by generation_group UUID

6. **Main Generator** (`src/lib/guardrails/ai/roadmapGenerator.ts`)
   - Orchestrates the entire generation flow
   - Error handling at each step
   - Logs all attempts to ai_logs table

7. **Edge Function API** (`supabase/functions/generate-ai-roadmap/index.ts`)
   - REST API endpoint for frontend
   - Authentication and authorization
   - Prevents duplicate generations

## Database Schema

### New Tables

#### `ai_logs`
Tracks all AI generation attempts for debugging and improvement.

```sql
- id: uuid (primary key)
- master_project_id: uuid (foreign key)
- generation_group: uuid
- model: text
- prompt: text
- output: text (nullable)
- error: text (nullable)
- tokens_used: integer
- created_at: timestamptz
```

### Modified Tables

#### `roadmap_items`
Added fields for AI generation:

```sql
- generation_group: uuid (nullable)
- subtrack_id: uuid (nullable, foreign key)
- estimated_hours: integer (nullable)
```

## Configuration

### Environment Variables (Frontend)

Set ONE of the following API keys:

```bash
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_MODEL=gpt-4-turbo-preview  # optional

VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_ANTHROPIC_MODEL=claude-3-sonnet-20240229  # optional

VITE_GROQ_API_KEY=gsk_...
VITE_GROQ_MODEL=mixtral-8x7b-32768  # optional
```

### Environment Variables (Edge Function)

Set in Supabase Dashboard > Edge Functions > Secrets:

```bash
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Frontend API Call

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-roadmap`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      projectId: 'uuid-here',
      allowRegeneration: false,
    }),
  }
);

const result = await response.json();
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "generationGroup": "uuid",
  "itemsCreated": 24,
  "items": [
    {
      "id": "uuid",
      "title": "Market validation",
      "trackId": "uuid",
      "subtrackId": "uuid"
    }
  ],
  "timelineSuggestions": {
    "recommended_duration_weeks": 12,
    "notes": "Assumes 10 hours/week capacity"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "generationGroup": "uuid",
  "itemsCreated": 0,
  "error": "Failed to communicate with AI service",
  "errorDetails": "API key not configured"
}
```

## Frontend Integration (Direct)

You can also use the frontend library directly:

```typescript
import { generateRoadmapFromProjectId } from '@/lib/guardrails/ai/roadmapGenerator';

const result = await generateRoadmapFromProjectId(projectId, false);

if (result.success) {
  console.log(`Created ${result.itemsCreated} items`);
  console.log('Timeline:', result.timelineSuggestions);
} else {
  console.error('Error:', result.error);
}
```

## Features

### Safety & Reliability

1. **Idempotent Operations**
   - Prevents duplicate generations by default
   - Set `allowRegeneration: true` to force new generation

2. **Error Logging**
   - Every generation attempt logged to `ai_logs`
   - Includes prompt, response, and errors
   - Useful for debugging and prompt improvement

3. **Graceful Degradation**
   - LLM errors don't break project creation
   - Returns structured error objects
   - Database writes are atomic per item

4. **Multi-Provider Support**
   - Automatically selects configured provider
   - Easy to switch between OpenAI, Anthropic, Groq
   - Mock provider for testing

### Generation Groups

Each AI generation creates a unique `generation_group` UUID that:
- Links all items created together
- Allows tracking multiple generation runs
- Enables filtering/deletion of AI-generated content
- Distinguishes AI items from manually created items

### Intelligent Parsing

The safe JSON parser handles common LLM output issues:
- Extracts JSON from markdown code blocks
- Removes trailing commas
- Fixes unquoted object keys
- Multiple sanitization attempts
- Clear error messages

## Testing

### Mock LLM Provider

```typescript
import { overrideLLMProvider } from '@/lib/guardrails/ai/llmProvider';

overrideLLMProvider(async (prompt: string) => {
  return JSON.stringify({
    roadmap: [/* mock data */],
    timeline_suggestions: { recommended_duration_weeks: 8 }
  });
});

const result = await generateRoadmapFromAI(input);

overrideLLMProvider(null);
```

### Unit Test Structure

The architecture supports unit testing:

1. **Prompt Builder** - Pure function, deterministic
2. **JSON Parser** - Test with malformed samples
3. **Database Writer** - Test with mock Supabase client
4. **Main Generator** - Test with mock LLM provider

## Limitations

1. **LLM Rate Limits**
   - Respects provider rate limits
   - No built-in retry logic (add if needed)

2. **Cost Considerations**
   - Each generation uses 2000-4000 tokens
   - Logs store full prompts and responses
   - Consider token budgets for production

3. **Quality Variance**
   - LLM output quality varies
   - Review generated items before using
   - Iterate on prompts for better results

## Monitoring & Debugging

### View AI Logs

```sql
SELECT
  created_at,
  model,
  error,
  LEFT(prompt, 100) as prompt_preview,
  LEFT(output, 100) as output_preview
FROM ai_logs
WHERE master_project_id = 'project-uuid'
ORDER BY created_at DESC;
```

### Count Generations

```sql
SELECT generation_group, COUNT(*) as items_count
FROM roadmap_items
WHERE generation_group IS NOT NULL
GROUP BY generation_group;
```

### Delete AI-Generated Items

```sql
DELETE FROM roadmap_items
WHERE generation_group = 'uuid-to-delete';
```

## Future Enhancements

1. **Retry Logic** - Auto-retry on transient errors
2. **Streaming** - Stream items as they're generated
3. **Batch Processing** - Generate multiple projects in parallel
4. **Custom Templates** - User-defined prompt templates
5. **Feedback Loop** - Learn from user edits to improve prompts
6. **Token Budget** - Track and limit token usage per user
7. **Quality Scoring** - Rate generated content quality
8. **A/B Testing** - Test different prompts and models

## Support

For issues or questions:
1. Check `ai_logs` table for error details
2. Verify API keys are configured
3. Review prompt builder output
4. Test JSON parser with raw LLM response
5. Check database RLS policies
