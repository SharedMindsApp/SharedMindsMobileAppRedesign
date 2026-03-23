# Mind Mesh V2 Orchestration Layer

## Overview

The orchestration layer coordinates plan generation and execution services.

**Prime Rule:** Orchestrate only. No logic, no retries, no inference. Just call A, then call B, return result.

---

## Core Functions

### handleUserIntent()

Sequences user intent → plan → execute → result.

**Signature:**
```typescript
handleUserIntent(
  intent: MindMeshIntent,
  context: OrchestrationContext
): Promise<OrchestrationResult>
```

**Flow:**
1. Build `PlanContext` from `OrchestrationContext`
2. Call `planFromIntent(intent, context)` (delegation)
3. If planning fails → return error (do NOT execute)
4. Build `ExecutionContext` from `OrchestrationContext`
5. Call `executePlan(plan, context)` (delegation)
6. Return combined result

**Example:**
```typescript
const intent: MindMeshIntent = {
  type: 'MoveContainer',
  containerId: 'container_123',
  newPosition: { x: 100, y: 200 },
};

const context: OrchestrationContext = {
  userId: 'user_abc',
  workspaceId: 'ws_xyz',
  timestamp: new Date().toISOString(),
  workspace: currentWorkspace,
  currentLock: activeLock,
  containers: allContainers,
  nodes: allNodes,
  ports: allPorts,
  references: allReferences,
};

const result = await handleUserIntent(intent, context);

if (result.success) {
  console.log('Success:', result.planId);
} else {
  console.error('Failed:', getAllErrors(result));
}
```

---

### handleGuardrailsEvent()

Sequences Guardrails event → plan → execute → result.

**Signature:**
```typescript
handleGuardrailsEvent(
  event: GuardrailsEvent,
  context: OrchestrationContext
): Promise<OrchestrationResult>
```

**Flow:**
1. Build `GuardrailsAdapterContext` from `OrchestrationContext`
2. Call `planFromGuardrailsEvent(event, context)` (delegation)
3. If no plan produced → return success with no-op (valid)
4. If planning fails → return error (do NOT execute)
5. Build `ExecutionContext` from `OrchestrationContext`
6. Call `executePlan(plan, context)` (delegation)
7. Return combined result

**Example:**
```typescript
const event: GuardrailsEvent = {
  type: 'TrackCreated',
  trackId: 'track_456',
  projectId: 'project_789',
  title: 'New Feature Track',
  parentTrackId: null,
};

const context: OrchestrationContext = {
  userId: 'system',
  workspaceId: 'ws_xyz',
  timestamp: new Date().toISOString(),
  workspace: currentWorkspace,
  currentLock: null,
  containers: allContainers,
  nodes: allNodes,
  ports: allPorts,
  references: allReferences,
};

const result = await handleGuardrailsEvent(event, context);

if (result.success && !isNoOp(result)) {
  console.log('Synced:', result.planId);
}
```

---

## Utility Functions

### isNoOp()

Check if result is a no-op (no plan executed).

```typescript
isNoOp(result: OrchestrationResult): boolean
```

Returns `true` if:
- `success === true`
- `planId === null`
- `planningErrors.length === 0`

**Example:**
```typescript
if (result.success && isNoOp(result)) {
  console.log('No action needed');
}
```

---

### getAllErrors()

Extract all errors from result (planning + execution).

```typescript
getAllErrors(result: OrchestrationResult): string[]
```

**Example:**
```typescript
if (!result.success) {
  console.error('Errors:', getAllErrors(result));
}
```

---

### getAllWarnings()

Extract all warnings from result (planning + execution).

```typescript
getAllWarnings(result: OrchestrationResult): string[]
```

**Example:**
```typescript
const warnings = getAllWarnings(result);
if (warnings.length > 0) {
  console.warn('Warnings:', warnings);
}
```

---

## Key Types

### OrchestrationContext

```typescript
interface OrchestrationContext {
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

Minimal context for orchestration. Orchestrator builds plan and execution contexts from this.

---

### OrchestrationResult

```typescript
interface OrchestrationResult {
  success: boolean;
  planId: string | null;
  executionResult: ExecutionResult | null;
  planningErrors: string[];
  planningWarnings: string[];
  executionErrors: string[];
  executionWarnings: string[];
  failureCategory?: FailureCategory;
  failureStage: 'planning' | 'execution' | null;
}
```

Combined result from planning and execution. Contains all errors, warnings, and failure information.

---

## Architectural Principles

### 1. Orchestrator Never Mutates State

- No database operations
- No Supabase imports
- Only calls existing services

### 2. Orchestrator Never Generates Plans

- No planning logic
- All planning delegated to planService.ts and guardrailsAdapter.ts

### 3. Orchestrator Never Executes Partial Flows

- Planning failure stops execution
- No partial state changes

### 4. Does Not Depend on UI or Transport

- Transport-agnostic
- Can be called from HTTP, WebSocket, CLI, tests

### 5. All Logic Lives in Existing Layers

- Validation: validation.ts
- Layout: layout.ts
- Interaction: interactions.ts
- Planning: planService.ts, guardrailsAdapter.ts
- Execution: execution.ts
- Orchestration: orchestrator.ts (coordination only)

### 6. This Layer Can Be Deleted

- Orchestrator is thin wrapper
- Core services still work without it
- Easy to recreate with different approach

---

## Error Handling

### Planning Errors

If planning fails:
- `result.planningErrors` contains errors
- `result.failureStage = 'planning'`
- `result.executionResult = null`
- Execution never happens

### Execution Errors

If execution fails:
- `result.executionErrors` contains errors
- `result.failureCategory` contains failure type
- `result.failureStage = 'execution'`
- `result.executionResult` contains full execution result

### Never Swallowed

Orchestrator never:
- Swallows errors
- Translates errors into success
- Hides validation failures
- Hides precondition failures
- Hides execution failures
- Hides rollback warnings

All errors propagated to caller.

---

## Lock Handling

### Orchestrator Does NOT Acquire Locks

- Lock acquisition is execution service concern
- Orchestrator passes lock state through
- Execution service enforces locking

### Never Bypasses Requirements

- Lock failure = explicit error
- No retries on lock failure
- No fallback without lock

---

## Integration Examples

### HTTP Endpoint

```typescript
app.post('/api/mindmesh/move-container', async (req, res) => {
  const { containerId, newPosition } = req.body;
  const userId = req.user.id;
  const workspaceId = req.params.workspaceId;

  // Build intent
  const intent: MindMeshIntent = {
    type: 'MoveContainer',
    containerId,
    newPosition,
  };

  // Fetch state
  const state = await fetchWorkspaceState(workspaceId);

  // Build context
  const context: OrchestrationContext = {
    userId,
    workspaceId,
    timestamp: new Date().toISOString(),
    workspace: state.workspace,
    currentLock: state.currentLock,
    containers: state.containers,
    nodes: state.nodes,
    ports: state.ports,
    references: state.references,
  };

  // Orchestrate
  const result = await handleUserIntent(intent, context);

  // Return
  if (result.success) {
    res.json({ success: true, planId: result.planId });
  } else {
    res.status(400).json({
      success: false,
      errors: getAllErrors(result),
      failureStage: result.failureStage,
    });
  }
});
```

---

### Guardrails Event Listener

```typescript
async function onGuardrailsChange(event: GuardrailsEvent) {
  const workspaceId = deriveWorkspaceId(event.projectId);
  const state = await fetchWorkspaceState(workspaceId);

  const context: OrchestrationContext = {
    userId: 'system',
    workspaceId,
    timestamp: new Date().toISOString(),
    workspace: state.workspace,
    currentLock: null,
    containers: state.containers,
    nodes: state.nodes,
    ports: state.ports,
    references: state.references,
  };

  const result = await handleGuardrailsEvent(event, context);

  if (result.success) {
    if (isNoOp(result)) {
      console.log('No-op:', event.type);
    } else {
      console.log('Synced:', result.planId);
    }
  } else {
    console.error('Failed:', getAllErrors(result));
  }
}
```

---

## Summary

The orchestration layer is pure coordination:

✅ Sequences plan generation and execution
✅ Never mutates state
✅ Never generates plans
✅ Never executes partial flows
✅ Transport-agnostic
✅ All logic in existing layers
✅ Can be deleted and rewritten
✅ Never swallows errors

**Files:**
- `orchestrator.ts` - Orchestration layer
- `ORCHESTRATION_README.md` - This file

**Dependencies:**
- planService.ts (plan generation)
- guardrailsAdapter.ts (Guardrails sync)
- execution.ts (plan execution)

**Next:**
- Transport layer (HTTP/WebSocket)
- Guardrails event listener
- UI layer
