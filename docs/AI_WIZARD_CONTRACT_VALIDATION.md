# AI Wizard Contract & Validation Layer

## Overview

This document describes the comprehensive AI contract and validation layer for the Project Wizard. This system guarantees that AI outputs are always schema-valid, AI failures never corrupt wizard state, and the wizard remains usable even when AI is unavailable.

## Core Principles (Non-Negotiable)

1. **AI output is draft-only** - AI never writes directly to the database
2. **AI must return structured JSON only** - No markdown, no prose
3. **All AI responses must validate before use** - Schema validation is mandatory
4. **AI failure must never block project creation** - Graceful degradation always available
5. **No silent failures** - All errors are logged and communicated
6. **Costs and retries are controlled** - Hard limits prevent runaway spending

## Architecture

```
User Input
    ↓
WizardAIService (calls AI with JSON-only prompts)
    ↓
Raw AI Response
    ↓
wizardAIValidator (validates against Zod schemas)
    ↓
    ├─ Success → Return validated data
    │
    └─ Failure → Retry once (if allowed)
              ↓
              ├─ Success → Return validated data
              │
              └─ Failure → Throw AIValidationError
                        ↓
                        ProjectWizardContext catches error
                        ↓
                        Display AIErrorBanner
                        ↓
                        User can:
                        - Retry (if retries remaining)
                        - Continue manually
                        - Reset wizard
```

## File Structure

### Core Validation Layer

**`src/lib/guardrails/ai/wizardAISchemas.ts`**
- Defines Zod schemas for all AI-returned structures
- Exports TypeScript types inferred from schemas
- Provides centralized schema registry

**`src/lib/guardrails/ai/wizardAIValidator.ts`**
- `validateAIResponse()` - Main validation function with retry logic
- `safeValidateAIResponse()` - Non-throwing validation for optional AI features
- `extractJSONFromResponse()` - Extracts JSON from potentially messy responses
- `AIValidationError` - Custom error class for validation failures

**`src/lib/guardrails/ai/wizardAIService.ts`**
- High-level API for wizard AI features
- All methods return `WizardAICallResult<T>` with success/error info
- Enforces JSON-only responses via system prompts
- Tracks session limits and retry counts

### Session Safety

**Database Migration: `add_wizard_ai_safety_flags.sql`**
- Adds `ai_attempts_count`, `ai_failed_at_step`, `ai_disabled`, `ai_last_error` to `wizard_sessions`
- Provides functions: `increment_wizard_ai_attempt()`, `mark_wizard_ai_step_failed()`, `disable_wizard_ai()`
- Enforces max 10 AI calls per session via check constraint

**`src/contexts/ProjectWizardContext.tsx`**
- Added `aiError`, `aiDisabledForSession`, `aiSessionId` to state
- Methods: `setAIError()`, `disableAIForSession()`, `clearAIError()`
- Generates unique session ID on wizard init/reset

### UI Feedback

**`src/components/guardrails/wizard/AIErrorBanner.tsx`**
- `AIErrorBanner` - Shows errors with retry/continue options
- `AILoadingState` - Shows spinner during AI calls
- `AIDisabledNotice` - Informs user AI is disabled for session

## Usage Examples

### Calling AI with Validation

```typescript
import { WizardAIService } from '../lib/guardrails/ai/wizardAIService';
import { useProjectWizard } from '../contexts/ProjectWizardContext';

function MyWizardStep() {
  const { state, setAIError, disableAIForSession } = useProjectWizard();
  const [isLoading, setIsLoading] = useState(false);

  const handleAIAnalysis = async () => {
    setIsLoading(true);

    const result = await WizardAIService.analyzeProjectIdea(
      projectIdea,
      state.aiSessionId
    );

    setIsLoading(false);

    if (!result.success) {
      setAIError(result.error || 'AI analysis failed');

      if (result.errorDetails?.includes('session limit')) {
        disableAIForSession();
      }
      return;
    }

    // Use validated data
    const intake = result.data;
    console.log('Goals:', intake.goals);
  };

  return (
    <div>
      <AIErrorBanner
        error={state.aiError}
        onRetry={handleAIAnalysis}
        onContinueManually={() => {
          // Skip to manual flow
        }}
        retriesRemaining={1}
      />

      {isLoading && <AILoadingState message="Analyzing your project..." />}

      {/* Rest of UI */}
    </div>
  );
}
```

### Adding a New AI Schema

1. **Define the schema in `wizardAISchemas.ts`:**

```typescript
export const AINewFeatureSchema = z.object({
  field1: z.string(),
  field2: z.number().min(0).max(100),
  field3: z.enum(['option1', 'option2', 'option3']),
});

export type AINewFeature = z.infer<typeof AINewFeatureSchema>;

export const WizardAISchemas = {
  // ...existing schemas
  newFeature: AINewFeatureSchema,
};
```

2. **Add method to `WizardAIService`:**

```typescript
static async generateNewFeature(
  input: string,
  sessionId: string
): Promise<WizardAICallResult<AINewFeature>> {
  if (sessionTracker.isSessionDisabled(sessionId)) {
    return {
      success: false,
      error: 'AI is disabled for this session',
      retriesUsed: 0,
    };
  }

  const initialCallCount = sessionTracker.getCallCount(sessionId);

  try {
    const schemaDescription = JSON.stringify({
      field1: 'string description',
      field2: 'number between 0 and 100',
      field3: 'one of: option1|option2|option3',
    }, null, 2);

    const prompt = `${buildJSONOnlySystemPrompt(schemaDescription)}

Input: "${input}"

Generate the new feature data.

Return the JSON object now:`;

    const data = await callAIWithJSONValidation<AINewFeature>(
      prompt,
      WizardAISchemas.newFeature,
      { step: 'generateNewFeature', sessionId }
    );

    return {
      success: true,
      data,
      retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to generate new feature',
      errorDetails: error instanceof Error ? error.message : String(error),
      retriesUsed: sessionTracker.getCallCount(sessionId) - initialCallCount - 1,
    };
  }
}
```

3. **Use it in your component with error handling as shown above**

## Session Limits & Safety

### Hard Limits

- **Max AI calls per session:** 10
- **Max retries per step:** 1 (2 total attempts per step)
- **Session expiry:** 7 days

### When Limits Are Hit

1. `ai_attempts_count` reaches 10 → `ai_disabled` set to `true`
2. `ai_disabled` is `true` → All AI methods return immediate error
3. User sees `AIDisabledNotice` with option to start new wizard session

### Resetting a Session

```typescript
// In UI component
import { WizardAIService } from '../lib/guardrails/ai/wizardAIService';

const handleResetWizard = () => {
  WizardAIService.resetSession(state.aiSessionId);
  resetWizard(); // From ProjectWizardContext
};
```

## Error Handling Patterns

### Pattern 1: Retry with Fallback

```typescript
const result = await WizardAIService.someMethod(input, sessionId);

if (!result.success) {
  if (result.retriesUsed < 1) {
    // Retry is available
    setAIError(result.error);
  } else {
    // No retries left, go manual
    setAIError('AI unavailable. Continue manually.');
    proceedToManualFlow();
  }
  return;
}

// Success - use result.data
```

### Pattern 2: Optional AI Enhancement

```typescript
// Try AI, but don't block on failure
const result = await WizardAIService.suggestTemplateMatch(
  projectIdea,
  templateIds,
  sessionId
);

if (result.success && result.data.confidence > 0.7) {
  // Use AI suggestion
  setSelectedTemplateId(result.data.templateId);
} else {
  // Show manual selection
  showTemplateSelector();
}
```

### Pattern 3: Graceful Degradation

```typescript
if (state.aiDisabledForSession || !WizardAIService.isAIAvailable()) {
  // Skip AI features entirely
  return <ManualWizardStep />;
}

// AI available - show enhanced UI
return <AIEnhancedWizardStep />;
```

## Testing AI Validation

### Test Invalid Responses

```typescript
import { safeValidateAIResponse } from '../lib/guardrails/ai/wizardAIValidator';
import { WizardAISchemas } from '../lib/guardrails/ai/wizardAISchemas';

// Invalid response (missing required fields)
const result = safeValidateAIResponse(
  { goals: [] }, // Invalid - empty array
  WizardAISchemas.projectIntake,
  { step: 'test', sessionId: 'test-123' }
);

console.assert(!result.success);
console.assert(result.error.issues.length > 0);
```

### Test Session Limits

```typescript
import { WizardAIService } from '../lib/guardrails/ai/wizardAIService';

const sessionId = 'test-session';

// Make 11 calls (exceeds limit of 10)
for (let i = 0; i < 11; i++) {
  const result = await WizardAIService.analyzeProjectIdea('test', sessionId);

  if (i < 10) {
    console.assert(result.success || result.error !== 'AI session limit reached');
  } else {
    console.assert(result.error === 'AI is disabled for this session');
  }
}

const stats = WizardAIService.getSessionStats(sessionId);
console.assert(stats.isDisabled === true);
console.assert(stats.callCount >= 10);
```

## Verification Checklist

- ✅ Invalid AI JSON does not crash wizard
- ✅ Retry happens once only per step
- ✅ Wizard proceeds without AI when disabled
- ✅ No AI output reaches DB without validation
- ✅ Schema mismatch is logged with details
- ✅ User always has a path forward (manual mode)
- ✅ Session limits are enforced
- ✅ Error messages are user-friendly, not technical

## Debugging

### Enable Verbose Logging

All validation failures log to console with:
- Step name
- Session ID
- Validation issues (field-by-field)
- Truncated raw response

Look for: `[WIZARD AI]` prefix in console

### Check Session Stats

```typescript
const stats = WizardAIService.getSessionStats(sessionId);
console.log('AI Calls:', stats.callCount);
console.log('Disabled:', stats.isDisabled);
console.log('Remaining:', stats.remainingCalls);
```

### Database Session Tracking

```sql
SELECT
  user_id,
  ai_attempts_count,
  ai_failed_at_step,
  ai_disabled,
  ai_last_error,
  created_at
FROM wizard_sessions
WHERE ai_attempts_count > 0
ORDER BY created_at DESC
LIMIT 10;
```

## What This System Does NOT Do

❌ AI does NOT write to database directly
❌ AI does NOT create projects without user confirmation
❌ AI does NOT auto-accept structures
❌ AI does NOT persist data without validation
❌ AI does NOT silently fail
❌ AI does NOT become authoritative over user choices

## Future Improvements

1. Add AI prompt versioning to track prompt effectiveness
2. Implement A/B testing for different prompt strategies
3. Add telemetry for validation failure patterns
4. Create admin dashboard for AI usage monitoring
5. Implement automatic prompt refinement based on failure patterns
