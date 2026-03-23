# AI Task Breakdown Implementation Guide

**Document Purpose**: Technical guide explaining how AI-generated task breakdowns are created, from user request to saved micro-steps.

**Last Updated**: January 2025  
**Status**: Phase 1 MVP - Simplified, Focused, No Premature Optimization

---

## Overview

The AI task breakdown system transforms overwhelming tasks into manageable micro-steps using AI-powered analysis. This document explains the **Phase 1 MVP** flow: simple, reliable, and focused on core value.

**Phase 1 Objective**: Turn an overwhelming task into a non-threatening first step. Nothing else matters yet.

---

## Phase 1 Scope: What We're Building

### ✅ What We ARE Doing (Phase 1)

- **AI-powered breakdown generation** - Use AI to break down any task into 3-6 micro-steps
- **Explicit user context** - User selects context ("too big", "low energy", etc.)
- **Manual editing** - User can edit, add, remove, reorder steps before saving
- **Micro-step persistence** - Save breakdown and track step completion
- **Simple fallback** - Use rule-based breakdown if AI fails
- **Core value delivery** - Help users start overwhelming tasks

### ❌ What We're NOT Doing (Phase 1)

- **Pattern learning** - No `todo_breakdown_patterns` table, no success rate tracking
- **Cognitive load inference** - No `cognitiveOverloadLevel` calculation, no inferred psychology
- **Time estimates** - No `estimatedMinutes` (misleading for ADHD users with time blindness)
- **Similarity matching** - No `extractTaskPattern()`, no pattern reuse
- **Optimization** - No caching, no batch processing, no cost optimization
- **Learning promises** - No "system learns and improves" messaging

**Why?** We don't yet know:
- What "success" really means (completion ≠ usefulness)
- How to reliably infer cognitive state
- What patterns are actually useful
- How users will actually use the feature

**Phase 1 Promise**: Support, not learning. Help users start, not optimize them.

---

## Current State vs. Proposed State

### Current Implementation (Rule-Based)

The existing `taskBreakdownService.ts` uses **rule-based pattern matching**:

```typescript
// Current approach: Hard-coded patterns
// Note: Existing service uses energyMode and cognitiveLoad, but Phase 1 AI service does not
if (title.includes('clean') || title.includes('tidy')) {
  if (cognitiveLoad === 'high' || adaptedEnergy === 'low') {
    microSteps = ['Put one thing away', 'Stop'];
  } else {
    microSteps = ['Put dishes in the sink', 'Wipe one surface', 'Take rubbish out'];
  }
}
```

**Limitations**:
- Only handles predefined task types (clean, write, email, plan, research, prepare)
- Generic fallback for unknown tasks
- No understanding of task complexity or context
- Limited adaptability

### Proposed Implementation (AI-Powered - Phase 1)

The enhanced system uses **AI to generate context-aware breakdowns** for any task type, using explicit user context only (no inference, no learning in Phase 1).

---

## AI Breakdown Generation Flow

### Step 1: User Initiates Breakdown

**Trigger Points** (Phase 1 - Explicit Only):
1. User clicks "Break this down" button on a task
2. Optional gentle suggestion based on task length or keywords (e.g., long title, verbs like "organise", "plan", "sort")
3. User explicitly requests breakdown in modal

**Phase 1 Approach**: No implicit detection logic. Suggestions are simple keyword/length based, not intelligent analysis.

**Component**: `TaskBreakdownModal.tsx` or `UnifiedTodoList.tsx`

```typescript
// User action (Phase 1 - no energyMode)
const handleBreakdown = async () => {
  const breakdown = await generateAITaskBreakdown({
    taskTitle: "Clean my room",
    context: "too_big", // Explicit user selection only
    userId: currentUser.id
  });
  // Display breakdown for user review
};
```

**What We're NOT Doing (Phase 1)**:
- ❌ System intelligence to detect complexity
- ❌ Implicit task analysis
- ❌ Energy mode inference or input
- ❌ Hidden heuristics

### Step 2: Gather Explicit Context Only

**Service**: `intelligentTodoService.ts` (new service)

**Phase 1 Approach**: Use only explicit user input. No inference, no patterns, no learning.

```typescript
export async function generateAITaskBreakdown(params: {
  taskTitle: string;
  context?: TaskBreakdownContext; // Explicit user selection only
  userId: string;
}): Promise<TaskBreakdownResult> {
  
  // Phase 1: Simple context gathering
  // No pattern loading, no cognitive load inference, no similarity matching
  const aiContext = {
    taskTitle: params.taskTitle,
    context: params.context, // User's explicit selection: "too_big", "low_energy", etc.
    userId: params.userId, // For audit/logging only
  };
  
  // Generate breakdown via AI
  return await callAIBreakdownService(aiContext);
}
```

**What We're NOT Doing (Phase 1)**:
- ❌ Loading user patterns
- ❌ Inferring cognitive load
- ❌ Finding similar patterns
- ❌ Predicting preferences
- ❌ Any form of "learning"

### Step 3: Build AI Prompt (Phase 1 - Simple & Reliable)

**Service**: `intelligentTodoService.ts` → `buildBreakdownPrompt()`

**Key Change**: Less clever, more reliable. No time estimates, no inferred psychology.

```typescript
function buildBreakdownPrompt(context: AIBreakdownContext): string {
  const contextDescription = context.context 
    ? getContextDescription(context.context)
    : 'general difficulty';

  const systemPrompt = `You help people with ADHD break down tasks so they feel safe to start.

Rules:
- Steps must be extremely small and concrete
- Avoid perfection or full completion framing
- Include permission to stop
- Use neutral, encouraging language
- 3-6 steps maximum

Context:
- Task: "${context.taskTitle}"
- User says: "${contextDescription}"

Generate micro-steps that:
- Are actionable and specific
- Build on each other logically
- Include at least one "permission to stop" step
- Use simple, clear language

${context.context === 'emotional_resistance' 
  ? 'Include acknowledgment and permission language.' 
  : ''}
${context.context === 'too_big' || context.context === 'dont_know_where_to_start'
  ? 'Keep it ultra-simple - maximum 4 steps.' 
  : ''}

Respond with JSON only:
{
  "microSteps": [
    { "title": "Very small actionable step" }
  ],
  "encouragementMessage": "Optional, gentle"
}`;

  return systemPrompt;
}

function getContextDescription(context: TaskBreakdownContext): string {
  const descriptions = {
    'too_big': 'This feels too big',
    'dont_know_where_to_start': "I don't know where to start",
    'boring_low_energy': 'I have low energy',
    'time_pressure': 'I feel time pressure',
    'emotional_resistance': 'This feels emotionally difficult',
  };
  return descriptions[context] || 'general difficulty';
}
```

**What We Removed (Phase 1)**:
- ❌ Time estimates (`estimatedMinutes`)
- ❌ Energy mode inference
- ❌ Cognitive load inference
- ❌ Preferred step count
- ❌ Pattern-based adaptation

### Step 4: Call AI Execution Service

**Service**: Uses existing `aiExecutionService` infrastructure

**Phase 1 Approach**: Simple, direct AI call. No complex context assembly.

```typescript
async function callAIBreakdownService(
  context: AIBreakdownContext
): Promise<TaskBreakdownResult> {
  
  // Build the prompt (Phase 1 - simple and reliable)
  const systemPrompt = buildBreakdownPrompt(context);
  const userPrompt = `Break down this task: "${context.taskTitle}"`;
  
  // Call AI execution service
  const aiResponse = await aiExecutionService.execute({
    userId: context.userId,
    intent: 'breakdown_task', // New intent for task breakdown
    featureKey: 'intelligent_todo', // New feature key
    surfaceType: 'personal', // Personal space context
    systemPrompt,
    userPrompt,
    temperature: 0.7, // Balanced creativity/consistency
    maxTokens: 800, // Enough for 6 steps + encouragement (Phase 1 limit)
  });
  
  // Parse AI response
  const parsed = parseAIResponse(aiResponse.text);
  
  // Transform to TaskBreakdownResult (Phase 1 - Simplified)
  return {
    taskTitle: context.taskTitle,
    microSteps: parsed.microSteps.map(step => step.title),
    context: context.context,
    encouragementMessage: parsed.encouragementMessage,
  };
}
```

**What We're NOT Doing (Phase 1)**:
- ❌ Complex context assembly
- ❌ Pattern matching before AI call
- ❌ Similarity checking
- ❌ Multi-step context gathering

### Step 5: Parse & Validate AI Response (Phase 1 - No Time Estimates)

**Service**: `intelligentTodoService.ts` → `parseAIResponse()`

**Key Change**: Simplified response structure. No time estimates.

```typescript
interface AIBreakdownResponse {
  microSteps: Array<{
    title: string;
  }>;
  encouragementMessage?: string;
}

function parseAIResponse(aiText: string): AIBreakdownResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!parsed.microSteps || !Array.isArray(parsed.microSteps)) {
      throw new Error('Invalid microSteps array');
    }
    
    // Ensure all steps have required fields (title only)
    const validatedSteps = parsed.microSteps.map((step: any, index: number) => ({
      title: step.title || `Step ${index + 1}`,
    }));
    
    // Validate step count (3-6 for Phase 1)
    if (validatedSteps.length < 3 || validatedSteps.length > 6) {
      console.warn(`Step count ${validatedSteps.length} outside recommended range (3-6)`);
    }
    
    return {
      microSteps: validatedSteps,
      encouragementMessage: parsed.encouragementMessage,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    // Fallback to rule-based breakdown
    return generateFallbackBreakdown(context);
  }
}
```

**What We Removed (Phase 1)**:
- ❌ `estimatedMinutes` field
- ❌ `totalEstimatedMinutes` field
- ❌ `isOptional` field (can add later if needed)

### Step 6: User Reviews & Edits

**Component**: `TaskBreakdownModal.tsx`

**Phase 1 Approach**: Simple editing. User can modify breakdown before saving.

```typescript
// Display AI-generated breakdown
{breakdown.microSteps.map((step, index) => (
  <EditableMicroStep
    key={index}
    step={step}
    onEdit={(newText) => updateStep(index, newText)}
  />
))}

// User can:
// - Edit any step (change text)
// - Add new steps (optional)
// - Remove steps (optional)
// - Reorder steps (optional, can add later)

// Phase 1: Keep editing simple. No complex validation, no "smart" suggestions.
```

### Step 7: Save Breakdown to Database (Phase 1 - No Learning)

**Service**: `intelligentTodoService.ts` → `saveTaskBreakdown()`

**Phase 1 Approach**: Save breakdown only. No pattern learning, no success tracking, no optimization.

```typescript
export async function saveTaskBreakdown(
  todoId: string,
  breakdown: TaskBreakdownResult,
  userId: string
): Promise<void> {
  const { supabase } = await import('../supabase');
  
  // Update todo with breakdown flag
  const { data: todo, error: todoError } = await supabase
    .from('personal_todos')
    .update({
      has_breakdown: true,
      breakdown_context: breakdown.context,
      breakdown_generated_at: new Date().toISOString(),
    })
    .eq('id', todoId)
    .select()
    .single();
  
  if (todoError) throw todoError;
  
  // Save micro-steps (simple structure)
  const microStepsToInsert = breakdown.microSteps.map((stepTitle, index) => ({
    todo_id: todoId,
    title: stepTitle,
    order_index: index + 1,
    completed: false,
  }));
  
  const { error: stepsError } = await supabase
    .from('todo_micro_steps')
    .insert(microStepsToInsert);
  
  if (stepsError) throw stepsError;
  
  // Phase 1: That's it. No learning, no patterns, no optimization.
  // We can retroactively add learning once we have real usage data.
}
```

**What We're NOT Doing (Phase 1)**:
- ❌ Pattern extraction
- ❌ Success rate tracking
- ❌ Usage counting
- ❌ Similarity matching
- ❌ Any form of "learning"

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Action                                              │
│    - Clicks "Break this down"                               │
│    - Or system suggests breakdown                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Gather Explicit Context (Phase 1)                       │
│    - User's selected context only                          │
│    - No pattern loading                                    │
│    - No inference                                           │
│    - No similar pattern matching                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Build AI Prompt (Phase 1 - Simple)                      │
│    - System prompt with ADHD principles                     │
│    - Explicit user context only                            │
│    - Task title and context                                 │
│    - JSON response format (no time estimates)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Call AI Service                                          │
│    - aiExecutionService.execute()                          │
│    - Intent: 'breakdown_task'                               │
│    - Feature: 'intelligent_todo'                           │
│    - Routes to appropriate AI provider                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. AI Provider Response                                    │
│    - OpenAI / Anthropic / Groq                              │
│    - Returns JSON with micro-steps                          │
│    - No time estimates (Phase 1)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Parse & Validate                                         │
│    - Extract JSON from response                             │
│    - Validate structure                                      │
│    - Fallback to rule-based if parsing fails                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Transform to TaskBreakdownResult                        │
│    - Map AI response to internal format                     │
│    - Add breakdown metadata (context, generated_at)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Display to User                                          │
│    - Show breakdown in modal                                │
│    - Allow editing, reordering, adding steps               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. User Confirms                                            │
│    - Reviews and edits if needed                            │
│    - Clicks "Save breakdown"                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Save to Database                                        │
│     - Update personal_todos (has_breakdown = true)         │
│     - Insert todo_micro_steps records                       │
│     - Store breakdown metadata                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Done (Phase 1)                                          │
│     - Breakdown saved                                       │
│     - No learning, no patterns, no optimization             │
│     - Ready for user to work through steps                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing AI Infrastructure

### New Intent Registration

**File**: `src/lib/guardrails/ai/providerRegistryTypes.ts`

```typescript
// Add new intent
export const INTENT_TO_FEATURE_MAP = {
  // ... existing intents
  'breakdown_task': 'intelligent_todo',
} as const;

// Add new feature key
export type FeatureKey = 
  | 'ai_chat'
  | 'roadmap_generator'
  | 'intelligent_todo' // NEW
  | // ... other features
```

### AI Routing Configuration

**File**: `src/lib/guardrails/ai/aiRoutingService.ts`

The routing service will automatically route `breakdown_task` intent to the appropriate AI provider based on:
- Feature key: `intelligent_todo`
- Surface type: `personal` (for personal todos)
- User's AI provider preferences
- Cost/performance optimization

### Provider Adapter

Uses existing provider adapters (`OpenAIAdapter`, `AnthropicAdapter`, etc.) - no changes needed. The adapters handle:
- API communication
- Token management
- Response parsing
- Error handling
- Streaming (if needed)

---

## Error Handling & Fallbacks

### AI Service Failure (Phase 1 - Simple Fallback)

```typescript
try {
  const breakdown = await callAIBreakdownService(context);
  return breakdown;
} catch (error) {
  console.error('AI breakdown failed:', error);
  
  // Fallback: Use rule-based breakdown (existing service)
  // Phase 1: Simple fallback, no pattern matching
  // Note: Existing generateTaskBreakdown may accept energyMode, but we don't pass it
  const fallback = await generateTaskBreakdown(
    context.taskTitle,
    context.context,
    undefined, // No energy mode in Phase 1
    undefined  // No user patterns in Phase 1
  );
  
  // If rule-based also fails, return minimal breakdown
  if (!fallback || !fallback.microSteps || fallback.microSteps.length === 0) {
    return {
      taskTitle: context.taskTitle,
      microSteps: ['Do the first small step', 'See if that\'s enough'],
      context: context.context,
    };
  }
  
  return fallback;
}
```

### Invalid AI Response

```typescript
function parseAIResponse(aiText: string): AIBreakdownResponse {
  try {
    // Parse JSON
    const parsed = JSON.parse(extractJSON(aiText));
    
    // Validate
    if (!isValidBreakdown(parsed)) {
      throw new Error('Invalid breakdown structure');
    }
    
    return parsed;
  } catch (error) {
    // Log for improvement
    logInvalidResponse(aiText, error);
    
    // Return fallback
    return generateFallbackBreakdown();
  }
}
```

---

## Performance Considerations (Phase 1)

**Phase 1 Approach**: Keep it simple. No premature optimization.

### What We're NOT Doing (Phase 1)

- ❌ **Caching by semantic similarity** - We don't know what "similar" means yet
- ❌ **Pattern reuse** - No patterns to reuse
- ❌ **Batch processing** - Not needed for MVP
- ❌ **Cost optimization** - Focus on value first

### What We ARE Doing (Phase 1)

- ✅ **Simple error handling** - Fallback to rule-based if AI fails
- ✅ **Basic rate limiting** - Respect AI provider limits
- ✅ **Audit logging** - Track usage for future analysis (via existing `aiExecutionService`)

**Optimization can come later once we understand real usage patterns.**

---

## Cost Management (Phase 1)

**Phase 1 Approach**: Track costs, but don't optimize prematurely.

### Token Usage Tracking

The existing `aiExecutionService` already tracks tokens and costs automatically via audit logs. No additional tracking needed.

### What We're NOT Doing (Phase 1)

- ❌ Model selection optimization (use default routing)
- ❌ Aggressive caching (we don't know what to cache yet)
- ❌ Pattern-based cost reduction (no patterns yet)

**Cost optimization can come later once we understand:**
- Which tasks benefit most from AI breakdowns
- How often users regenerate breakdowns
- Real usage patterns vs. assumptions

---

## Testing Strategy

### Unit Tests

```typescript
describe('generateAITaskBreakdown', () => {
  it('should generate breakdown for cleaning task', async () => {
    const breakdown = await generateAITaskBreakdown({
      taskTitle: 'Clean my room',
      context: 'too_big', // Explicit user context only
      userId: 'test-user',
    });
    
    expect(breakdown.microSteps.length).toBeGreaterThan(0);
    expect(breakdown.microSteps.length).toBeLessThanOrEqual(6); // Phase 1 limit
    expect(breakdown.microSteps[0]).toContain('step');
    expect(breakdown.context).toBe('too_big');
  });
  
  it('should fallback on AI failure', async () => {
    // Mock AI failure
    mockAIExecutionService.mockRejectedValue(new Error('AI failed'));
    
    const breakdown = await generateAITaskBreakdown({
      taskTitle: 'Clean kitchen',
      context: 'dont_know_where_to_start',
      userId: 'test-user',
    });
    
    // Should still return breakdown (fallback to rule-based)
    expect(breakdown.microSteps).toBeDefined();
    expect(breakdown.microSteps.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('AI Breakdown Integration', () => {
  it('should complete full flow: request → AI → save', async () => {
    // 1. User requests breakdown (Phase 1 - explicit context only)
    const breakdown = await generateAITaskBreakdown({
      taskTitle: 'Organize my closet',
      context: 'too_big',
      userId: 'test-user',
    });
    
    expect(breakdown.microSteps.length).toBeGreaterThanOrEqual(3);
    expect(breakdown.microSteps.length).toBeLessThanOrEqual(6);
    
    // 2. User saves
    await saveTaskBreakdown(todoId, breakdown, userId);
    
    // 3. Verify saved
    const saved = await getTaskBreakdown(todoId);
    expect(saved.microSteps.length).toBe(breakdown.microSteps.length);
    expect(saved.context).toBe('too_big');
  });
});
```

---

## Phase 1 Summary

The AI task breakdown generation follows this simplified flow:

1. **User initiates** → Component calls service
2. **Gather explicit context** → User's selected context only (no inference)
3. **Build prompt** → Simple, reliable ADHD-friendly prompt
4. **Call AI** → Use existing `aiExecutionService`
5. **Parse response** → Extract and validate JSON (no time estimates)
6. **Display** → Show to user for review/editing
7. **Save** → Store in database (todos + micro_steps)
8. **Done** → No learning, no optimization, no patterns

**Phase 1 Key Principles**:
- ✅ Leverages existing AI infrastructure
- ✅ Handles any task type (not just predefined)
- ✅ Uses explicit user context only
- ✅ Falls back gracefully on errors
- ✅ Simple, reliable, focused on core value

**What We're NOT Doing (Phase 1)**:
- ❌ Pattern learning (premature - we don't know what success means)
- ❌ Cognitive load inference (fictional without real data)
- ❌ Time estimates (misleading for ADHD users)
- ❌ Success rate tracking (completion ≠ usefulness)
- ❌ Any form of "intelligence growth" promises

**Phase 1 Promise**: Support, not learning. Help users start, not optimize them.

---

**End of Implementation Guide**
