# Mind Mesh V2 Plan Generation Layer

## Overview

The plan generation layer converts high-level intents and Guardrails events into executable plans.

**Prime Rule:** Generate plans, never execute. Delegate to existing planners, never implement new logic.

---

## Modules

### 1. Plan Service (`planService.ts`)

Converts user intents into executable plans.

**Main Function:**
```typescript
planFromIntent(intent: MindMeshIntent, context: PlanContext): PlanResult
```

**Supported Intents (8 types, MVP only):**
- `MoveContainer` - Move container to new position
- `ResizeContainer` - Resize container dimensions
- `NestContainer` - Nest child into parent
- `UnnestContainer` - Remove from parent
- `ActivateGhostContainer` - Materialize ghost
- `CreateManualNode` - Create user-defined relationship
- `DeleteNode` - Delete manual or auto-generated node
- `ResetLayout` - Reset to default hierarchy

**Process:**
1. Validate intent is supported
2. Fetch required entities from context
3. Call existing planner function (delegation)
4. Convert planner output to `PlanMutation[]`
5. Wrap in `MindMeshPlan`
6. Return plan (never execute)

---

### 2. Guardrails Adapter (`guardrailsAdapter.ts`)

Converts Guardrails events into Mind Mesh plans.

**Main Function:**
```typescript
planFromGuardrailsEvent(
  event: GuardrailsEvent,
  context: GuardrailsAdapterContext
): GuardrailsAdapterResult
```

**Supported Events (7 types):**
- `TrackCreated` - New track in Guardrails
- `TrackDeleted` - Track removed
- `TrackUpdated` - Track properties changed
- `SubtrackCreated` - New subtrack
- `TaskCreated` - New task
- `TaskDeleted` - Task removed
- `TaskUpdated` - Task properties changed

**Process:**
1. Receive Guardrails event (authoritative)
2. Determine Mind Mesh impact
3. Respect layout state (broken vs intact)
4. Call ghost materialisation planners
5. Return plan (never execute)

---

## Key Types

### PlanContext

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
```

Context required for plan generation (read-only state).

---

### PlanResult

```typescript
interface PlanResult {
  success: boolean;
  plan: MindMeshPlan | null;
  errors: string[];
  warnings: string[];
}
```

Result of plan generation (plan or explicit errors).

---

### MindMeshIntent

```typescript
type MindMeshIntent =
  | { type: 'MoveContainer'; containerId: string; newPosition: { x: number; y: number }; }
  | { type: 'ResizeContainer'; containerId: string; newDimensions: { width: number; height: number }; }
  | { type: 'NestContainer'; childId: string; parentId: string; }
  | { type: 'UnnestContainer'; childId: string; }
  | { type: 'ActivateGhostContainer'; containerId: string; reason: ActivationReason; }
  | { type: 'CreateManualNode'; sourcePortId: string; targetPortId: string; relationshipType: string; relationshipDirection: string; }
  | { type: 'DeleteNode'; nodeId: string; isManual: boolean; }
  | { type: 'ResetLayout'; force: boolean; };
```

High-level user intents (CLOSED list, no new types may be added).

---

### GuardrailsEvent

```typescript
type GuardrailsEvent =
  | { type: 'TrackCreated'; trackId: string; projectId: string; title: string; parentTrackId?: string | null; }
  | { type: 'TrackDeleted'; trackId: string; projectId: string; }
  | { type: 'TrackUpdated'; trackId: string; projectId: string; updates: { title?: string; parentTrackId?: string | null; }; }
  | { type: 'SubtrackCreated'; subtrackId: string; parentTrackId: string; projectId: string; title: string; }
  | { type: 'TaskCreated'; taskId: string; trackId: string; projectId: string; title: string; }
  | { type: 'TaskDeleted'; taskId: string; trackId: string; projectId: string; }
  | { type: 'TaskUpdated'; taskId: string; trackId: string; projectId: string; updates: { title?: string; trackId?: string; }; };
```

Guardrails events that trigger Mind Mesh updates (CLOSED list).

---

## Architectural Principles

### 1. Plans Generated, Never Executed

**Why:**
- Plans can be validated before execution
- Plans can be queued, batched, or deferred
- Plans can be rolled back
- Plans are testable without side effects
- Clear separation of concerns

**Implementation:**
- No calls to `executePlan()` anywhere
- No database writes, no Supabase imports
- Pure functions with no side effects

---

### 2. All Logic Delegated

**Why:**
- No duplication (logic exists once)
- No drift (changes update everywhere)
- No bugs (tested planners reused)
- No complexity (thin translation layer)

**Delegation:**
- Plan service calls existing interaction planners
- Guardrails adapter calls ghost materialisation planners
- No new planning logic implemented

**Planners Used:**

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

### 3. Layout State Respected at Plan Time

**Why:**
- User intent preservation (if layout broken, keep broken)
- Hierarchy vs freeform (intact uses hierarchy, broken uses freeform)
- Consistent behavior (all plans respect same mode)
- Plan-time decision (not execution-time)

**Implementation:**
- Every planner receives `workspace.hasBrokenDefaultLayout`
- If intact: default hierarchy positioning
- If broken: free-floating spawn
- Ghost materialisation respects layout mode

---

### 4. Guardrails Authority Preserved

**Why:**
- Guardrails owns projects, tracks, tasks (authoritative)
- Mind Mesh visualizes (derivative)
- One-way sync: Guardrails → Mind Mesh
- No Guardrails mutations

**Implementation:**
- Adapter only converts events to plans
- No Guardrails table writes
- Container metadata references Guardrails entities
- Mind Mesh is read-only consumer

---

### 5. Explicit Failure Handling

**No partial plans, no fallbacks:**
- Invalid intent → explicit error, no plan
- Planner throws → explicit error, no plan
- Entity missing → explicit error, no plan
- Validation fails → explicit error, no plan

**Result structure:**
- `success: boolean` - Plan generated or not
- `plan: MindMeshPlan | null` - Plan if successful
- `errors: string[]` - Explicit errors
- `warnings: string[]` - Non-fatal issues

---

## Usage Examples

### Example 1: User Moves Container

```typescript
import { planFromIntent } from './planService';
import { executePlan } from './execution';

// Build context from current state
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
const planResult = planFromIntent(intent, context);

if (planResult.success && planResult.plan) {
  // Pass plan to execution service
  const executionContext = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    timestamp: context.timestamp,
    currentLock: context.currentLock,
  };

  const result = await executePlan(planResult.plan, executionContext);

  if (result.success) {
    console.log('Plan executed successfully');
  } else {
    console.error('Execution failed:', result.errors);
  }
} else {
  console.error('Plan generation failed:', planResult.errors);
}
```

---

### Example 2: Guardrails Track Created

```typescript
import { planFromGuardrailsEvent } from './guardrailsAdapter';
import { executePlan } from './execution';

// Build context from current Mind Mesh state
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
const adapterResult = planFromGuardrailsEvent(event, context);

if (adapterResult.success && adapterResult.plan) {
  // Pass plan to execution service
  const executionContext = {
    userId: 'system',
    workspaceId: context.workspaceId,
    timestamp: context.timestamp,
    currentLock: null, // System operations may not require lock
  };

  const result = await executePlan(adapterResult.plan, executionContext);

  if (result.success) {
    console.log('Guardrails sync successful');
  } else {
    console.error('Execution failed:', result.errors);
  }
} else {
  if (adapterResult.warnings.length > 0) {
    console.warn('Adapter warnings:', adapterResult.warnings);
  }
  if (adapterResult.errors.length > 0) {
    console.error('Adapter failed:', adapterResult.errors);
  }
}
```

---

### Example 3: Multiple Plans (Batch)

```typescript
// Generate multiple plans
const plans: MindMeshPlan[] = [];

const intent1: MindMeshIntent = { type: 'MoveContainer', ... };
const result1 = planFromIntent(intent1, context);
if (result1.success && result1.plan) plans.push(result1.plan);

const intent2: MindMeshIntent = { type: 'ResizeContainer', ... };
const result2 = planFromIntent(intent2, context);
if (result2.success && result2.plan) plans.push(result2.plan);

// Execute plans sequentially
for (const plan of plans) {
  const result = await executePlan(plan, executionContext);
  if (!result.success) {
    console.error('Plan failed:', result.errors);
    break; // Stop on first failure
  }
}
```

---

## Verification

### No Execution or Mutation

```bash
# Verify no execution calls
grep -n "executePlan" planService.ts guardrailsAdapter.ts
# Returns: No matches

# Verify no database operations
grep -n "supabase\|\.insert\|\.update\|\.delete" planService.ts guardrailsAdapter.ts
# Returns: Only property access, no database calls

# Verify no locking
grep -n "acquireLock\|releaseLock" planService.ts guardrailsAdapter.ts
# Returns: No matches

# Verify no telemetry
grep -n "emitTelemetry" planService.ts guardrailsAdapter.ts
# Returns: No matches
```

All verifications pass. Plan generation layer is pure functions with no side effects.

---

### Build Status

```bash
npm run build
# ✓ 2131 modules transformed
# ✓ built in 19.56s
# No errors
```

Plan generation layer compiles successfully with no errors.

---

## Integration with Other Layers

### Upstream Dependencies

**Validation Layer:**
- Not directly used (planners handle validation)
- Planners call validation functions internally

**Layout Layer:**
- `planGhostMaterialisation` - Ghost container creation
- `planResetToDefaultLayout` - Layout reset

**Interaction Layer:**
- `planContainerActivation` - Ghost activation
- `planContainerMove` - Position updates
- `planContainerResize` - Dimension updates
- `planContainerNesting` - Parent-child relationships
- `planContainerUnnesting` - Remove parent
- `planManualNodeCreation` - User-defined nodes
- `planNodeDeletion` - Node removal

### Downstream Consumers

**Execution Layer:**
- Receives `MindMeshPlan` from plan service
- Executes plans atomically with locking
- Emits events only on success
- Persists telemetry after commit

**Telemetry Layer:**
- Receives events from execution layer
- Not called directly by plan generation

---

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// Test intent → plan conversion
describe('planFromIntent', () => {
  it('should generate move plan for valid intent', () => {
    const result = planFromIntent(moveIntent, mockContext);
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan?.mutations[0].type).toBe('update_container');
  });

  it('should return error for missing container', () => {
    const result = planFromIntent(moveIntent, emptyContext);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Container not found');
  });
});

// Test Guardrails event → plan conversion
describe('planFromGuardrailsEvent', () => {
  it('should generate ghost container for track creation', () => {
    const result = planFromGuardrailsEvent(trackCreatedEvent, mockContext);
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan?.mutations[0].type).toBe('create_container');
  });

  it('should warn if container already exists', () => {
    const result = planFromGuardrailsEvent(trackCreatedEvent, contextWithExisting);
    expect(result.success).toBe(true);
    expect(result.plan).toBeNull();
    expect(result.warnings).toContain('Container already exists');
  });
});
```

### Integration Tests (Recommended)

```typescript
// Test full flow: intent → plan → execution
describe('full plan flow', () => {
  it('should move container successfully', async () => {
    const planResult = planFromIntent(moveIntent, context);
    expect(planResult.success).toBe(true);

    const execResult = await executePlan(planResult.plan!, executionContext);
    expect(execResult.success).toBe(true);

    // Verify container moved in database
    const container = await fetchContainer(containerId);
    expect(container.xPosition).toBe(newX);
    expect(container.yPosition).toBe(newY);
  });
});
```

---

## Summary

The plan generation layer is a **thin, deterministic translation layer** that:

✅ Converts intents to plans (high-level → executable)
✅ Delegates to existing planners (no new logic)
✅ Respects layout state (broken vs intact)
✅ Preserves Guardrails authority (one-way sync)
✅ Handles failures explicitly (no silent errors)
✅ Never executes (plans only, no side effects)
✅ No database writes (pure functions)
✅ No canvas locking (execution service concern)
✅ No telemetry (emitted after execution)
✅ Minimal code (prefer delegation)

**Files:**
- `planService.ts` - User intent → plans (760 lines)
- `guardrailsAdapter.ts` - Guardrails events → plans (690 lines)
- `PLAN_GENERATION_README.md` - This file

**Next Steps:**
- Implement UI event → intent translation
- Implement Guardrails event listener
- Orchestrate plan execution flow
