# Mind Mesh V2 - Prompt 8: Plan Generation Layer

## Overview

Implemented the plan generation layer that converts high-level intents and Guardrails events into executable plans.

**Prime Rule:** Generate plans, never execute. Delegate to existing planners, never implement new logic.

---

## What Was Implemented

### 1. Plan Service (`planService.ts` - 760+ lines)

**Core Function:**

`planFromIntent(intent: MindMeshIntent, context: PlanContext): PlanResult`

Converts user intents into executable plans by delegating to existing planners.

**Supported Intents (8 types, MVP only):**

1. `MoveContainer` - Move container to new position
2. `ResizeContainer` - Resize container dimensions
3. `NestContainer` - Nest child container into parent
4. `UnnestContainer` - Remove container from parent
5. `ActivateGhostContainer` - Materialize ghost container
6. `CreateManualNode` - Create user-defined relationship
7. `DeleteNode` - Delete manual or auto-generated node
8. `ResetLayout` - Reset to default hierarchy layout

**Key Types:**

```typescript
interface PlanContext {
  userId: string;
  workspaceId: string;
  timestamp: string;
  workspace: MindMeshWorkspace;
  currentLock: MindMeshCanvasLock | null;
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
}

interface PlanResult {
  success: boolean;
  plan: MindMeshPlan | null;
  errors: string[];
  warnings: string[];
}
```

**Process:**

1. Validate intent is supported
2. Fetch required entities from context
3. Call existing planner function (delegation only)
4. Convert planner output to `PlanMutation[]`
5. Wrap in `MindMeshPlan`
6. Return plan (never execute)

---

### 2. Guardrails Adapter (`guardrailsAdapter.ts` - 690+ lines)

**Core Function:**

`planFromGuardrailsEvent(event: GuardrailsEvent, context: GuardrailsAdapterContext): GuardrailsAdapterResult`

Converts Guardrails events into Mind Mesh plans by delegating to ghost materialisation planners.

**Supported Guardrails Events (7 types):**

1. `TrackCreated` - New track created in Guardrails
2. `TrackDeleted` - Track deleted from Guardrails
3. `TrackUpdated` - Track properties updated
4. `SubtrackCreated` - New subtrack created
5. `TaskCreated` - New task created
6. `TaskDeleted` - Task deleted
7. `TaskUpdated` - Task properties updated

**Key Types:**

```typescript
type GuardrailsEvent =
  | { type: 'TrackCreated'; trackId: string; projectId: string; title: string; parentTrackId?: string | null; }
  | { type: 'TrackDeleted'; trackId: string; projectId: string; }
  | { type: 'TaskCreated'; taskId: string; trackId: string; projectId: string; title: string; }
  // ... and more

interface GuardrailsAdapterContext {
  userId: string;
  workspaceId: string;
  timestamp: string;
  workspace: MindMeshWorkspace;
  currentLock: MindMeshCanvasLock | null;
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
  references: MindMeshContainerReference[];
}
```

**Process:**

1. Receive Guardrails event (authoritative)
2. Determine Mind Mesh impact
3. Respect layout state (broken vs intact)
4. Call ghost materialisation planners
5. Return plan (never execute)

---

## Architectural Principles

### 1. Plans are Generated, Never Executed

**Why separation matters:**

- **Validation:** Plans can be validated before execution
- **Queueing:** Plans can be queued, batched, or deferred
- **Rollback:** Plans can be rolled back atomically
- **Testing:** Plans are testable without side effects
- **Clarity:** Clear separation of concerns

**Implementation:**

- Plan service returns `MindMeshPlan` objects
- No calls to `executePlan()` anywhere in plan service
- No database writes, no Supabase imports
- Pure functions with no side effects

---

### 2. All Logic Delegated to Existing Planners

**Why delegation is critical:**

- **No duplication:** Logic exists once, in one place
- **No drift:** Changes to planning logic update everywhere
- **No bugs:** Tested planners are reused
- **No complexity:** Adapter is thin translation layer

**Delegation pattern:**

```typescript
// Plan service calls existing interaction planner
const planResult = planContainerMove(
  container,
  newPosition,
  userId,
  workspace,
  currentLock
);

// Converts planner output to PlanMutation[]
const mutations: PlanMutation[] = [];
if (planResult.containerUpdate) {
  mutations.push({
    type: 'update_container',
    containerId: planResult.containerUpdate.containerId,
    updates: planResult.containerUpdate.updates,
  });
}

// Wraps in MindMeshPlan
const plan: MindMeshPlan = {
  id: generatePlanId(),
  workspaceId: context.workspaceId,
  mutations,
  description: '...',
  eventsToEmit: events,
};
```

---

### 3. Layout State Respected at Plan Time

**Why layout state is consulted here:**

- **User intent preservation:** If user breaks layout, keep it broken
- **Hierarchy vs freeform:** Intact layout uses hierarchy, broken uses freeform
- **Consistent behavior:** All plans respect same layout mode
- **Plan-time decision:** Not execution-time, for consistency

**Implementation:**

- Every planner receives `workspace.hasBrokenDefaultLayout`
- If layout intact: use default hierarchy positioning
- If layout broken: spawn containers free-floating
- Ghost materialisation respects layout mode
- Layout reset can restore default hierarchy

---

### 4. Guardrails Authority Preserved

**Why Guardrails is authoritative:**

- **Source of truth:** Guardrails owns projects, tracks, tasks
- **One-way sync:** Guardrails → Mind Mesh (not vice versa)
- **No mutation:** Adapter never writes to Guardrails
- **Read-only:** Mind Mesh visualizes, doesn't modify

**Implementation:**

- Adapter only converts events to plans
- No Guardrails table writes anywhere
- Container metadata references Guardrails entities
- Mind Mesh is derivative, Guardrails is primary

---

### 5. Explicit Failure Handling

**No partial plans, no fallbacks:**

- If intent is invalid → explicit error, no plan
- If planner throws → explicit error, no plan
- If entity missing → explicit error, no plan
- If validation fails → explicit error, no plan

**Result structure:**

```typescript
interface PlanResult {
  success: boolean;
  plan: MindMeshPlan | null;
  errors: string[];
  warnings: string[];
}
```

Caller decides what to do with errors. No silent failures.

---

## What is NOT Implemented

**Explicitly excluded (by design):**

❌ **No execution calls** - Plans are returned, not executed
❌ **No database writes** - No Supabase imports or mutations
❌ **No canvas locking** - Locking is execution service concern
❌ **No telemetry emission** - Telemetry emitted after execution
❌ **No Regulation logic** - Regulation is separate system
❌ **No UI code** - This is pure logic layer
❌ **No retries or inference** - Fail explicitly on errors
❌ **No background tasks** - Synchronous planning only
❌ **No new planning logic** - Everything delegated to existing planners

---

## Verification Checklist

### ✅ Plans Generated but Never Executed

**Verified:**
```bash
grep -n "executePlan" planService.ts guardrailsAdapter.ts
# Returns: No matches
```

No execution calls anywhere in plan generation layer.

---

### ✅ All Logic Delegated to Existing Planners

**Verified:**

- `planService.ts` imports 8 existing planner functions
- `guardrailsAdapter.ts` imports 2 layout planner functions
- No new planning logic implemented
- All handlers call existing planners and convert results

**Delegation functions:**

From `interactions.ts`:
- `planContainerActivation`
- `planContainerMove`
- `planContainerResize`
- `planContainerNesting`
- `planContainerUnnesting`
- `planManualNodeCreation`
- `planNodeDeletion`

From `layout.ts`:
- `planGhostMaterialisation`
- `planResetToDefaultLayout`

---

### ✅ Layout State Respected at Plan Time

**Verified:**

- Every planner receives `workspace` with `hasBrokenDefaultLayout`
- Ghost materialisation checks layout state
- Layout reset checks layout state before resetting
- No execution-time layout decisions

---

### ✅ Guardrails Authority Preserved

**Verified:**

```bash
grep -n "supabase" guardrailsAdapter.ts
# Returns: No matches
```

No Guardrails table writes. Adapter is read-only translation layer.

---

### ✅ No Execution, Mutation, or Side Effects

**Verified:**

```bash
# No database operations
grep -n "supabase\|\.insert\|\.update\|\.delete" planService.ts guardrailsAdapter.ts
# Returns: Only property access, no database calls

# No locking
grep -n "acquireLock\|releaseLock" planService.ts guardrailsAdapter.ts
# Returns: No matches

# No telemetry
grep -n "emitTelemetry" planService.ts guardrailsAdapter.ts
# Returns: No matches
```

Pure functions with no side effects.

---

### ✅ No Schema or Telemetry Changes

**Verified:**

- No new database tables
- No new migrations
- No telemetry type modifications
- Only uses existing types from execution and interaction layers

---

### ✅ Build Successful

**Verified:**

```bash
npm run build
# ✓ 2131 modules transformed
# ✓ built in 19.56s
# No errors
```

All TypeScript compiles successfully.

---

## Usage Examples

### Example 1: User Moves Container

```typescript
import { planFromIntent } from './planService';

// Context from current workspace state
const context: PlanContext = {
  userId: 'user_123',
  workspaceId: 'ws_456',
  timestamp: new Date().toISOString(),
  workspace: currentWorkspace,
  currentLock: activeLock,
  containers: allContainers,
  nodes: allNodes,
  ports: allPorts,
};

// User intent
const intent: MindMeshIntent = {
  type: 'MoveContainer',
  containerId: 'container_789',
  newPosition: { x: 100, y: 200 },
};

// Generate plan (no execution)
const result = planFromIntent(intent, context);

if (result.success && result.plan) {
  // Pass plan to execution service
  await executePlan(result.plan, executionContext);
} else {
  console.error('Plan generation failed:', result.errors);
}
```

---

### Example 2: Guardrails Track Created

```typescript
import { planFromGuardrailsEvent } from './guardrailsAdapter';

// Context from current Mind Mesh state
const context: GuardrailsAdapterContext = {
  userId: 'system',
  workspaceId: 'ws_456',
  timestamp: new Date().toISOString(),
  workspace: currentWorkspace,
  currentLock: null,
  containers: allContainers,
  nodes: allNodes,
  ports: allPorts,
  references: allReferences,
};

// Guardrails event (from Guardrails system)
const event: GuardrailsEvent = {
  type: 'TrackCreated',
  trackId: 'track_abc',
  projectId: 'project_xyz',
  title: 'New Feature Track',
  parentTrackId: null,
};

// Generate plan (no execution)
const result = planFromGuardrailsEvent(event, context);

if (result.success && result.plan) {
  // Pass plan to execution service
  await executePlan(result.plan, executionContext);
} else {
  console.error('Adapter failed:', result.errors);
}
```

---

## Key Statistics

**Code:**
- **planService.ts:** ~760 lines
- **guardrailsAdapter.ts:** ~690 lines
- **Total:** ~1450 lines of pure planning logic

**Intent Types:** 8 (closed list)
**Guardrails Event Types:** 7 (closed list)
**Planner Functions Called:** 9 (all existing)
**Database Writes:** 0 (pure functions)
**Side Effects:** 0 (no execution, locking, or telemetry)

**Functions:**
- `planFromIntent()` - Main intent → plan converter
- `planFromGuardrailsEvent()` - Main Guardrails → plan converter
- 8 intent handler functions (delegation only)
- 7 Guardrails event handler functions (delegation only)
- 2 utility functions (`generatePlanId()`)

---

## Integration Points

### Upstream (Input)

**User Intents:**
- UI interactions → MindMeshIntent
- Intent passed to `planFromIntent()`
- Returns plan ready for execution

**Guardrails Events:**
- Guardrails system emits events
- Events passed to `planFromGuardrailsEvent()`
- Returns plan ready for execution

### Downstream (Output)

**Execution Service:**
- Plan generation returns `MindMeshPlan`
- Caller passes plan to `executePlan()`
- Execution service applies mutations atomically

**No direct execution:**
- Plan service never calls execution service
- Clear separation maintained
- Caller orchestrates flow

---

## Summary

The plan generation layer is a **thin, deterministic translation layer** that:

1. ✅ **Converts intents to plans** - High-level → executable
2. ✅ **Delegates to existing planners** - No new logic
3. ✅ **Respects layout state** - Broken vs intact
4. ✅ **Preserves Guardrails authority** - One-way sync
5. ✅ **Handles failures explicitly** - No silent errors
6. ✅ **Never executes** - Plans only, no side effects
7. ✅ **No database writes** - Pure functions
8. ✅ **No canvas locking** - Execution service concern
9. ✅ **No telemetry** - Emitted after execution
10. ✅ **Minimal code** - Prefer delegation

**Status:** ✅ Complete
**Next:** UI integration (convert UI events → intents → plans → execution)
**Build:** ✅ Successful

---

**Implementation Date:** December 2025
**Prompt:** 8/8 (Plan Generation Layer)
**Total Implementation Time:** 8 prompts
**Cumulative LOC:** ~7200 lines (validation + layout + interactions + telemetry + execution + planning)
**Cumulative Docs:** ~5500+ lines
