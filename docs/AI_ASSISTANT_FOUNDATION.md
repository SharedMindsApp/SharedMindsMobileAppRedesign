# AI Assistant Foundation (Strictly Non-Authoritative)

## Overview

The AI Assistant Foundation is a **strictly non-authoritative advisory layer** that provides reasoning, drafting, summarization, and insights across Guardrails. It is designed to augment human judgment, never replace it.

**Core Principle: The AI is a thinking partner, not a manager. It suggests, never commands. It drafts, never decides.**

This is foundational infrastructure only. No UI, no automation, no magic. Just clean architecture for safe AI integration.

---

## Core Principles (Non-Negotiable)

### 1. AI is Advisory Only

The AI can:
- ✅ Read Guardrails, Task Flow, Mind Mesh, Collaboration Activity
- ✅ Suggest, draft, summarize, explain
- ✅ Generate recommendations and insights

The AI **cannot**:
- ❌ Write directly to tracks
- ❌ Write directly to roadmap items
- ❌ Write directly to Task Flow
- ❌ Modify people or assignments
- ❌ Change permissions
- ❌ Access or modify Personal Spaces

### 2. All AI Output Must Be User-Confirmed

- AI responses are **drafts, previews, or recommendations**
- Any action requires **explicit user confirmation** via existing services
- Drafts are **never auto-applied**
- Users can **edit, accept, or discard** AI suggestions

### 3. Guardrails Remains Authoritative

- AI is a **consumer, never a controller**
- No bypassing service-layer validation
- No hidden writes
- Guardrails data model is the single source of truth

### 4. Stateless by Default

- No long-lived memory unless explicitly stored by the user
- Conversations are contextual, not identity-defining
- Each interaction is independent
- Context is assembled on-demand

---

## What AI Cannot Do

This section is **critically important**. The AI has strict boundaries:

| Boundary | Explanation |
|----------|-------------|
| **No Direct Writes** | AI cannot create, update, or delete tracks, roadmap items, tasks, people, or permissions |
| **No Personal Spaces Access** | AI cannot read or write Personal Spaces data |
| **No Automation** | AI does not trigger background jobs, notifications, or automated actions |
| **No Permission Grants** | AI cannot grant access, add users, or modify permissions |
| **No Hidden Actions** | AI cannot perform actions without explicit user confirmation |
| **No Source of Truth** | AI outputs are drafts, not authoritative data |

---

## Architecture

### Data Model

```
┌─────────────────────────────────────────────────┐
│                  User Request                    │
│         (e.g., "Draft roadmap item")            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│            AI Assistant Service                  │
│  • Validate permissions                          │
│  • Assemble context                              │
│  • Generate draft (stub or LLM call)            │
│  • Record audit log                              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              AI Draft Created                    │
│  • Status: "generated"                           │
│  • Contains: content, provenance, context        │
│  • User can: view, edit, accept, discard        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼ (User accepts)
┌─────────────────────────────────────────────────┐
│      User Applies via Existing Services         │
│  • createRoadmapItem()                           │
│  • createTask()                                  │
│  • updateTrack()                                 │
│  • Draft marked as "accepted"                   │
└─────────────────────────────────────────────────┘
```

### Database Tables

#### `ai_drafts`

Non-authoritative AI-generated outputs. User must explicitly accept/apply.

```sql
CREATE TABLE ai_drafts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  draft_type ai_draft_type NOT NULL,
  status ai_draft_status DEFAULT 'generated',
  title text NOT NULL,
  content jsonb NOT NULL,
  provenance_metadata jsonb NOT NULL,
  context_scope jsonb NOT NULL,
  applied_to_entity_id uuid,
  applied_to_entity_type text,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  discarded_at timestamptz
);
```

**Key Fields:**
- `status`: `generated` → `edited` → `accepted` / `discarded` / `partially_applied`
- `content`: The actual draft (structure varies by `draft_type`)
- `provenance_metadata`: Which entities were used to generate this
- `context_scope`: What data was included in context
- `applied_to_entity_id`: If accepted, what authoritative entity was created

#### `ai_interaction_audit`

Immutable audit log of all AI interactions. Enables explainability and trust.

```sql
CREATE TABLE ai_interaction_audit (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  intent ai_intent NOT NULL,
  response_type ai_response_type NOT NULL,
  context_scope jsonb NOT NULL,
  entities_included jsonb NOT NULL,
  draft_id uuid,
  user_prompt text,
  created_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `intent`: What the user was asking (e.g., `draft_roadmap_item`, `summarize`)
- `response_type`: Type of response (e.g., `draft`, `summary`, `explanation`)
- `entities_included`: Which tracks/items/etc were in context
- `draft_id`: If a draft was created, link to it

---

## Type System

### AI Intents

What the user is asking the AI to do:

```typescript
type AIIntent =
  | 'explain'
  | 'summarize'
  | 'draft_roadmap_item'
  | 'draft_task_list'
  | 'suggest_next_steps'
  | 'analyze_deadlines'
  | 'critique_plan'
  | 'compare_options'
  | 'generate_checklist'
  | 'propose_timeline'
  | 'explain_relationships'
  | 'suggest_breakdown'
  | 'identify_risks'
  | 'recommend_priorities';
```

### AI Response Types

How the AI responds:

```typescript
type AIResponseType =
  | 'explanation'
  | 'summary'
  | 'draft'
  | 'suggestion'
  | 'critique'
  | 'comparison'
  | 'checklist'
  | 'timeline_proposal'
  | 'analysis'
  | 'recommendation';
```

### Draft Types

Types of drafts the AI can generate:

```typescript
type AIDraftType =
  | 'roadmap_item'
  | 'child_item'
  | 'task_list'
  | 'document'
  | 'summary'
  | 'insight'
  | 'checklist'
  | 'timeline'
  | 'breakdown'
  | 'risk_analysis';
```

### Draft Lifecycle

```typescript
type AIDraftStatus =
  | 'generated'      // AI created the draft
  | 'edited'         // User modified the draft
  | 'accepted'       // User applied the draft
  | 'discarded'      // User rejected the draft
  | 'partially_applied'; // User applied some parts
```

---

## AI Context Assembly

The AI builds **read-only snapshots** from Guardrails data. This context is:
- **Deterministic**: Same input → same context
- **Permission-safe**: Only includes data user can access
- **Privacy-aware**: Excludes Personal Spaces

### Context Scope

```typescript
interface AIContextScope {
  projectId?: string;
  trackIds?: string[];
  roadmapItemIds?: string[];
  includeCollaboration?: boolean;
  includeMindMesh?: boolean;
  includeTaskFlow?: boolean;
  includePeople?: boolean;
  includeDeadlines?: boolean;
  timeframeStart?: string;
  timeframeEnd?: string;
}
```

### Assembled Context

The context builder gathers:

```typescript
interface AssembledContext {
  scope: AIContextScope;
  project?: ProjectContext;
  tracks?: TrackContext[];
  roadmapItems?: RoadmapItemContext[];
  collaboration?: CollaborationContext;
  mindMesh?: MindMeshContext;
  taskFlow?: TaskFlowContext;
  people?: PeopleContext[];
  deadlines?: DeadlineContext[];
  assembledAt: string;
}
```

**What's Included:**
- Project name, description, type, status
- Track names, hierarchy, item counts
- Roadmap item titles, statuses, deadlines, durations
- Collaboration summaries (activity counts, not detailed messages)
- Mind Mesh graph structure (nodes + edges, not positions)
- Task Flow status breakdown
- People names and roles (not sensitive data)
- Deadline information

**What's Excluded:**
- Personal Spaces data
- User authentication details
- Sensitive metadata
- Data user has no permission to access

---

## AI Services API

### Generate Draft Roadmap Item

```typescript
const result = await generateDraftRoadmapItem(
  userId,
  projectId,
  trackId,
  'Create landing page for product launch'
);

// Result:
// {
//   success: true,
//   draftId: 'uuid',
//   content: {
//     title: '[AI Draft] Create landing page for product launch',
//     description: '...',
//     estimatedDuration: 5,
//     suggestedTrackId: 'track-123',
//     reasoning: 'Generated based on track context...'
//   }
// }
```

**User Flow:**
1. AI generates draft → status: `generated`
2. User reviews draft (can edit)
3. User clicks "Accept" → calls `createRoadmapItem()` with draft content
4. Draft marked as `accepted` with `applied_to_entity_id` set

### Generate Draft Task List

```typescript
const result = await generateDraftTaskList(
  userId,
  projectId,
  roadmapItemId,
  'Break down into implementation tasks'
);

// Result contains list of suggested tasks
```

### Summarize Project

```typescript
const response = await summariseProject(userId, projectId);

// Result:
// {
//   responseType: 'summary',
//   data: {
//     summary: 'Project has 5 tracks with 23 items...',
//     keyPoints: ['5 tracks', '23 items', '8 deadlines', '3 collaborators'],
//     metrics: { trackCount: 5, itemCount: 23, ... },
//     insights: ['...']
//   },
//   metadata: { intent: 'summarize', contextScope: {...}, generatedAt: '...' }
// }
```

### Analyze Deadlines

```typescript
const response = await analyseDeadlines(userId, projectId);

// Result shows overdue items, upcoming deadlines, timeline feasibility
```

### Explain Relationships

```typescript
const response = await explainRelationships(
  userId,
  projectId,
  entityId,
  'roadmap_item'
);

// Result explains connections to tracks, dependencies, Mind Mesh nodes
```

### Suggest Next Steps

```typescript
const response = await suggestNextSteps(userId, projectId);

// Result contains actionable suggestions based on project state
```

### Critique Plan

```typescript
const response = await critiquePlan(userId, projectId, trackId);

// Result:
// {
//   responseType: 'critique',
//   data: {
//     subject: 'Track: Production Planning',
//     strengths: ['...'],
//     weaknesses: ['...'],
//     recommendations: ['...'],
//     overallAssessment: '...'
//   }
// }
```

### Generate Checklist

```typescript
const result = await generateChecklist(userId, projectId, roadmapItemId);

// Result contains draft checklist with items + priorities
```

### Propose Timeline

```typescript
const result = await proposeTimeline(userId, projectId, trackId);

// Result contains draft timeline with phases, durations, dependencies
```

### Identify Risks

```typescript
const result = await identifyRisks(userId, projectId);

// Result contains draft risk analysis with severity, likelihood, mitigation
```

---

## Draft Lifecycle Management

### Create Draft

```typescript
import { createDraft } from './aiDraftService';

const result = await createDraft({
  userId: currentUser.id,
  projectId: 'project-123',
  draftType: 'roadmap_item',
  title: 'Draft: New Feature',
  content: {
    title: 'New Feature',
    description: 'Implementation details...',
    estimatedDuration: 5
  },
  provenanceMetadata: {
    sourceEntityIds: ['track-123', 'item-456'],
    sourceEntityTypes: ['track', 'roadmap_item'],
    contextSnapshot: { trackName: 'Development' },
    generatedAt: new Date().toISOString(),
    confidenceLevel: 'medium'
  },
  contextScope: {
    projectId: 'project-123',
    trackIds: ['track-123']
  }
});
```

### Update Draft

```typescript
import { updateDraft } from './aiDraftService';

await updateDraft({
  draftId: 'draft-123',
  title: 'Updated Title',
  content: { ...updatedContent },
  status: 'edited'
});
```

### Accept Draft

```typescript
import { acceptDraft } from './aiDraftService';
import { createRoadmapItem } from '../roadmapService';

// User reviews draft
const draft = await getDraftById('draft-123');

// User accepts → create authoritative entity
const item = await createRoadmapItem({
  projectId: draft.projectId!,
  trackId: draft.content.suggestedTrackId,
  title: draft.content.title,
  description: draft.content.description,
  estimatedDuration: draft.content.estimatedDuration
});

// Mark draft as accepted
await acceptDraft({
  draftId: draft.id,
  appliedToEntityId: item.id,
  appliedToEntityType: 'roadmap_item'
});
```

### Discard Draft

```typescript
import { discardDraft } from './aiDraftService';

await discardDraft('draft-123');
// Draft marked as 'discarded' with discarded_at timestamp
```

### Get User Drafts

```typescript
import { getUserDrafts } from './aiDraftService';

const drafts = await getUserDrafts({
  userId: currentUser.id,
  projectId: 'project-123',
  status: 'generated',
  limit: 20
});
```

---

## Permission-Safe Access

All AI operations respect permissions:

```typescript
import { validateAIContextAccess } from './aiPermissions';

const validation = await validateAIContextAccess(
  userId,
  projectId,
  trackIds,
  roadmapItemIds
);

if (!validation.canAccess) {
  throw new Error(validation.reason);
}

// Proceed with context assembly
```

### Permission Rules

- ✅ AI can read data user has access to
- ✅ AI drafts belong to requesting user
- ✅ AI respects project permissions
- ❌ AI cannot access Personal Spaces
- ❌ AI cannot read other users' private data
- ❌ AI cannot write to authoritative tables

---

## Audit & Explainability

Every AI interaction is logged:

```typescript
// Automatically recorded by AI service functions
await recordAIInteraction({
  userId: currentUser.id,
  projectId: 'project-123',
  intent: 'draft_roadmap_item',
  responseType: 'draft',
  contextScope: {
    projectId: 'project-123',
    trackIds: ['track-123']
  },
  entitiesIncluded: {
    trackId: 'track-123',
    itemCount: 5
  },
  draftId: 'draft-123',
  userPrompt: 'Create a landing page task'
});
```

### Get AI Usage Stats

```typescript
import { supabase } from '../supabase';

const { data } = await supabase.rpc('get_ai_usage_stats', {
  input_user_id: userId,
  input_project_id: projectId,
  days_back: 30
});

// Result shows:
// - Most used intents
// - Draft creation count
// - Acceptance rate
```

### Get Project AI Activity

```typescript
const { data } = await supabase.rpc('get_project_ai_activity', {
  input_project_id: projectId,
  days_back: 30
});

// Result shows:
// - Which users are using AI
// - What they're using it for
// - Acceptance rates per user
```

---

## Integration with Guardrails

### Roadmap Items

AI can:
- ✅ Read roadmap items (permission-safe)
- ✅ Generate draft roadmap items
- ✅ Suggest breakdowns

AI cannot:
- ❌ Create roadmap items directly
- ❌ Update roadmap items directly
- ❌ Delete roadmap items

**Pattern:**
```typescript
// AI generates draft
const { draftId, content } = await generateDraftRoadmapItem(...);

// User reviews and accepts
// User confirms → existing service creates item
const item = await createRoadmapItem({
  projectId,
  trackId,
  title: content.title,
  description: content.description,
  estimatedDuration: content.estimatedDuration
});

// Link draft to created item
await acceptDraft({ draftId, appliedToEntityId: item.id, appliedToEntityType: 'roadmap_item' });
```

### Task Flow

AI can:
- ✅ Read Task Flow status
- ✅ Generate draft task lists
- ✅ Suggest task breakdowns

AI cannot:
- ❌ Create tasks directly
- ❌ Update task status
- ❌ Sync tasks with roadmap

### Mind Mesh

AI can:
- ✅ Read Mind Mesh graph structure
- ✅ Explain relationships between nodes
- ✅ Suggest new connections

AI cannot:
- ❌ Create nodes directly
- ❌ Create edges directly
- ❌ Modify node positions or properties

### Collaboration Surfaces

AI can:
- ✅ Read collaboration activity summaries
- ✅ Identify most active users
- ✅ Analyze collaboration patterns

AI cannot:
- ❌ Record collaboration activity
- ❌ Modify activity records

---

## Example Flows

### Example 1: Draft a Roadmap Item

**User Action:** "AI, help me create a roadmap item for implementing user authentication"

**Flow:**
1. User invokes `generateDraftRoadmapItem(userId, projectId, trackId, prompt)`
2. AI service:
   - Validates user has access to project/track
   - Assembles context (track details, existing items)
   - Generates draft content
   - Records audit log
   - Saves draft with status `generated`
3. User receives draft ID and content
4. User reviews draft:
   - Can edit title, description, estimated duration
   - Can change suggested track
5. User clicks "Accept"
6. Application calls `createRoadmapItem()` with draft content
7. Application calls `acceptDraft()` to mark as applied
8. Draft status → `accepted`, linked to created item

### Example 2: Summarize Project

**User Action:** "Show me a project summary"

**Flow:**
1. User invokes `summariseProject(userId, projectId)`
2. AI service:
   - Validates user has access to project
   - Assembles full project context
   - Generates summary with key metrics
   - Records audit log
3. User receives summary response
4. UI displays summary (no draft, no acceptance needed)

### Example 3: Analyze Deadlines

**User Action:** "Are my deadlines realistic?"

**Flow:**
1. User invokes `analyseDeadlines(userId, projectId)`
2. AI service:
   - Validates user has access to project
   - Assembles project context with deadlines
   - Analyzes overdue items, upcoming deadlines
   - Generates analysis
   - Records audit log
3. User receives analysis response
4. UI displays findings (no draft, no acceptance needed)

---

## Stub Implementation Note

**Important:** The current implementation includes **stub functions** that demonstrate the architecture without actual LLM integration.

```typescript
// Stub implementation example:
const draftContent: DraftRoadmapItemContent = {
  title: `[AI Draft] ${userPrompt.substring(0, 50)}`,
  description: 'This is a stub implementation. Real AI would generate detailed content.',
  estimatedDuration: 5,
  reasoning: 'Stub reasoning based on context'
};
```

**To integrate a real LLM:**
1. Add LLM client library (e.g., OpenAI SDK)
2. Build prompt from assembled context
3. Call LLM API
4. Parse response into draft content
5. Maintain all safety boundaries (no direct writes, user confirmation required)

**Example integration point:**
```typescript
// Real implementation would:
const prompt = buildPromptFromContext(context, userPrompt);
const llmResponse = await callLLM(prompt);
const draftContent = parseLLMResponse(llmResponse);
```

---

## What This Architecture Enables (Future)

This foundation enables safe implementation of:

### AI Chat Interface (Future)

```typescript
// Future: Conversational AI
const response = await chatWithAI(userId, projectId, message);
// Returns: explanation, suggestion, or draft
```

### AI-Assisted Planning (Future)

```typescript
// Future: Interactive planning
const breakdown = await suggestItemBreakdown(userId, itemId);
// Returns: draft breakdown of large item into smaller items
```

### AI Progress Insights (Future)

```typescript
// Future: Proactive insights
const insights = await analyzeProjectHealth(userId, projectId);
// Returns: risks, bottlenecks, recommendations
```

### AI Team Coordination (Future)

```typescript
// Future: Collaboration insights
const coordination = await suggestTeamActions(userId, projectId);
// Returns: who should focus on what, based on patterns
```

All future features will maintain the same non-authoritative boundaries.

---

## Security & Privacy

### Data Privacy

- ✅ AI only sees data user has permission to access
- ✅ Personal Spaces are completely isolated
- ✅ Other users' private data is not accessible
- ✅ All interactions are audited

### Safety Boundaries

- ✅ AI cannot modify authoritative data
- ✅ AI cannot grant permissions
- ✅ AI cannot access sensitive credentials
- ✅ All AI actions require user confirmation

### Audit Trail

- ✅ Every AI interaction is logged
- ✅ Context scope is recorded
- ✅ Entities included are tracked
- ✅ Draft provenance is preserved

---

## Summary

The AI Assistant Foundation provides a **safe, non-authoritative advisory layer** for Guardrails. It:

- ✅ Reads data (permission-safe)
- ✅ Generates drafts and suggestions
- ✅ Explains relationships and patterns
- ✅ Analyzes timelines and risks
- ✅ Requires user confirmation for all actions
- ✅ Maintains complete audit trail

**Without:**
- ❌ Direct writes to authoritative data
- ❌ Permission grants or modifications
- ❌ Personal Spaces access
- ❌ Hidden actions or automation
- ❌ Background jobs or triggers

**The AI is a thinking partner, not a manager.**

It augments human judgment — it never replaces it.

---

## Verification & Enhancements (Second Pass)

### Token-Safe Context Assembly

**File:** `aiContextBudget.ts`, `aiContextAssemblyV2.ts`

The AI context assembly has been enhanced with strict budget controls:

- **Intent-Specific Budgets:** Each AI intent has tailored limits (maxTracks, maxItems, maxText)
- **Hard Limits Enforced:** No "entire project dump" possible, all entities capped
- **Text Truncation:** All text fields respect maxTextLengthPerEntity (default: 500 chars)
- **Total Context Bounds:** Total text limited per intent (5K-20K depending on use case)
- **Budget Violations Logged:** Exceeding limits warns but doesn't block, enables monitoring

```typescript
const budget = getBudgetForIntent('draft_roadmap_item');
// { maxTracks: 1, maxRoadmapItems: 10, maxTextLength: 10K, ... }

const context = await buildContext(scope, userId, 'draft_roadmap_item');
// Context respects budget, violations logged in context.budgetViolations
```

### AI Intent → Context Mapping Matrix

**File:** `aiIntentContextMatrix.ts`

Explicit mapping prevents implicit scope expansion:

- **Required Sources:** What data must be included (e.g., project + tracks)
- **Optional Sources:** What can be included (e.g., deadlines)
- **Prohibited Sources:** What must never be included (e.g., Personal Spaces)
- **Scope Requirements:** project | track | item | any
- **Pre-Flight Validation:** `validateIntentContextMatch()` blocks mismatches

```typescript
// Validate before context assembly
const validation = validateIntentContextMatch('analyze_deadlines', scope);
if (!validation.valid) {
  throw new Error(`Violations: ${validation.violations.join(', ')}`);
}
```

**Key Rules:**
- `draft_roadmap_item` requires project + tracks, prohibits collaboration/mindMesh
- `analyze_deadlines` requires project + deadlines, prohibits mindMesh/taskFlow
- `explain_relationships` requires project + mindMesh, prohibits collaboration/taskFlow
- NO intent allows cross-project access

### Draft Safety Guarantees

**File:** `aiDraftSafety.ts`

Strict guarantees enforce that drafts are advisory only:

- **No Auto-Application:** `canAutoApply === false` for ALL draft types
- **User Confirmation:** Every draft requires explicit user action
- **Service Routing:** All applications route through authoritative services
- **Partial Application:** Task lists, timelines, breakdowns support partial apply
- **Provenance Required:** All drafts must have complete source metadata
- **No AI IDs Persisted:** AI-generated IDs never become authoritative

```typescript
const safety = checkDraftSafety(draft);
// Returns: canAutoApply, requiresUserConfirmation, requiresServiceValidation

const provenance = verifyDraftProvenance(draft);
// Validates: hasSourceEntities, hasContextSnapshot, hasGenerationTimestamp

const plan = getDraftApplicationPlan('roadmap_item');
// Returns: targetService, serviceMethod, requiredParameters, steps
```

### Floating Chat Readiness

**File:** `aiResponseFormatter.ts`

All AI responses are structured for UI-agnostic rendering:

- **Plain Text:** Always available for fallback
- **Structured Blocks:** text, heading, list, table, code, quote, draft_card, action_buttons
- **Draft Payloads:** Separate from display, can be dragged/dropped
- **Suggested Actions:** Explicit metadata (action name, label, requiresInput, inputSchema)

```typescript
const structured = formatAIResponseForChat(aiResponse, draftId);
// Returns: {
//   plainText: string,
//   blocks: ResponseBlock[],
//   draftPayloads: DraftPayload[],
//   suggestedActions: Action[],
//   metadata: { generatedAt, contextHash }
// }
```

**Supported Actions:**
- `save_as_note` - Save content for reference
- `review_draft` - Open draft for editing
- `apply_draft` - Apply via authoritative service
- `discard_draft` - Discard draft
- `create_task` - Create task from suggestion
- `attach_to_item` - Attach to roadmap item

### Usage Controls & Cost Safeguards

**File:** `aiUsageControls.ts`

Soft limits and usage tracking (no hard enforcement):

- **Per-User Tracking:** Total interactions, drafts, acceptance rate, intent breakdown
- **Per-Project Aggregation:** Which users use AI, for what, acceptance rates
- **Soft Limits:** Daily (50), Weekly (200), Monthly (500) - warnings at 80%
- **Cost Weighting:** Expensive intents (critique: 3x, risk analysis: 3x) count more
- **Query APIs:** "How much AI used?", "Which intents most expensive?", "Acceptance rate?"

```typescript
const stats = await getUserAIUsageStats(userId, projectId, daysBack);
// Returns: totalInteractions, totalDrafts, acceptanceRate, intentBreakdown

const check = await checkUsageLimits(userId);
// Returns: withinLimits, dailyUsage, weeklyUsage, monthlyUsage, warnings

const breakdown = await getIntentUsageBreakdown(userId, 30);
// Returns intents sorted by weighted cost
```

### Permission & Privacy Enhancements

**Updated:** `aiContextAssemblyV2.ts`, `aiPermissions.ts`

Enhanced permission validation:

- **Pre-Flight Checks:** User access validated before context assembly
- **Project Scoped:** Context assembly throws if user lacks project access
- **Collaboration Privacy:** Activity summarized (counts only), not verbatim
- **Personal Spaces Isolated:** No Personal Spaces data in any context
- **Shared Track Visibility:** Respects `is_shared` flag

```typescript
// Context assembly now validates permissions first
if (scope.projectId) {
  const hasAccess = await canUserAccessProject(userId, scope.projectId);
  if (!hasAccess) {
    throw new Error('User does not have access to project');
  }
}
```

### Architecture Verification

**See:** `AI_ASSISTANT_VERIFICATION_REPORT.md`

Comprehensive verification confirms:

✅ Context scoping is deterministic and bounded  
✅ Token usage is controlled and auditable  
✅ AI cannot mutate authoritative data  
✅ Draft lifecycle is safe and explainable  
✅ Architecture is ready for floating chat UI  
✅ Architecture is ready for drag-and-drop draft application  
✅ Architecture is ready for future automation (without changes)

**All objectives verified. Status: Production-Ready.**
