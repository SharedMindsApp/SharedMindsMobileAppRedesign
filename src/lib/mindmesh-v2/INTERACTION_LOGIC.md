# Mind Mesh V2 Interaction Logic

## Overview

The interaction logic layer translates user actions into state transitions. It answers three questions:

1. **What just happened?** (event detection)
2. **What should change?** (state planning)
3. **What is now allowed or blocked?** (permission enforcement)

**Critical:** This is logic-only, not UI or rendering.

---

## Core Principles

### 1. Explicit Intent Only

The system never infers user psychology or intent beyond explicit actions.

**Explicit Actions:**
- User drags container
- User connects node
- User nests container
- User clicks "Activate"
- User acquires lock

**NOT Inferred:**
- "User probably wants..."
- "This seems like..."
- "Maybe they meant..."

### 2. Ghost Activation is Always Explicit

Ghost containers activate only when user directly interacts:

```typescript
// Activation triggers:
- User drags ghost → activate
- User connects node to/from ghost → activate
- User nests something into ghost → activate
- User clicks "Activate" button → activate
- Parent container nested (cascade) → activate

// NOT activation triggers:
- Time passes
- User hovers
- User views
- System decides
```

### 3. User Actions Permanently Override Auto-Layout

Once user demonstrates control, system backs off forever (until explicit reset).

```typescript
// Layout-breaking actions:
- Move container manually
- Nest container manually (non-default)
- Activate container
- Hide auto-generated nodes

// Effect:
workspace.hasBrokenDefaultLayout = true  // Permanent until reset
```

### 4. No Silent Structural Changes

All changes are planned and approved. No surprise mutations.

```typescript
// Every operation returns a plan:
{
  containerUpdate: {...} | null,  // Explicit
  workspaceUpdate: {...} | null,  // Explicit
  event: {...} | null,             // Explicit
  errors: [...]                    // Explicit
}
```

### 5. Canvas Lock is Enforced Everywhere

All write operations require canvas lock. No exceptions.

```typescript
// Every write operation checks:
const lockCheck = validateWritePermission(workspaceId, userId, currentLock);
if (!lockCheck.valid) {
  return { errors: ['Lock required'], ... };
}
```

### 6. Nodes Never Gain Meaning

Nodes are relationships only. Containers are semantic units.

- ✅ Nodes connect ports
- ✅ Nodes have relationship types
- ❌ Nodes never have title/body
- ❌ Nodes never have semantic content

---

## Architecture

### Operation Flow

```
User Action
    ↓
Interaction Logic (this layer)
    ↓
State Transition Plan
    ↓
Validation Check
    ↓
Execute Plan (services layer)
    ↓
Emit Event (internal)
```

### Separation of Concerns

| Layer | Responsibility | NOT Responsible For |
|-------|---------------|---------------------|
| **Interaction Logic** | Detect intent, plan changes | UI rendering, database writes |
| **Validation** | Check invariants | Planning operations |
| **Layout Logic** | Compute positions | User interaction |
| **Services** | Execute plans | Planning what to do |

---

## API Reference

### Container Activation

#### `canActivateContainer()`

Checks if a container can be activated.

**Input:**
- `container` - Container to check
- `userId` - User attempting activation
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  allowed: boolean;
  reason?: string;
}
```

**Rules:**
- Ghost containers can be activated
- Active containers cannot be re-activated
- Requires canvas lock

---

#### `planContainerActivation()`

Plans activation of a ghost container.

**Input:**
- `container` - Container to activate
- `reason` - Why activation is happening
- `userId` - User performing action
- `workspace` - Current workspace
- `currentLock` - Current canvas lock

**Activation Reasons:**
- `user_drag` - User started dragging
- `user_connect_node` - User connected node
- `user_nest` - User nested something
- `user_explicit` - User clicked "Activate"
- `cascade_from_parent` - Parent nested, activating child

**Output:**
```typescript
{
  containerUpdate: { containerId, updates: { isGhost: false } } | null;
  workspaceUpdate: Partial<MindMeshWorkspace> | null;  // If breaks layout
  event: InteractionEvent | null;
  errors: string[];
}
```

**Effects:**
- Sets `isGhost = false`
- Breaks layout if not already broken
- Emits `container_activated` event

**Example:**
```typescript
const plan = planContainerActivation(
  ghostContainer,
  'user_drag',
  userId,
  workspace,
  currentLock
);

if (plan.errors.length === 0) {
  // Execute plan (services layer)
  await updateContainer(plan.containerUpdate);
  if (plan.workspaceUpdate) {
    await updateWorkspace(plan.workspaceUpdate);
  }
  interactionEvents.emit(plan.event);
}
```

---

#### `getCascadeActivationTargets()`

Checks if activating a container would cascade to children.

**Input:**
- `containerId` - Container being activated
- `allContainers` - All containers in workspace

**Output:** `string[]` - IDs of containers that would cascade activate

**Use Case:** When nesting a ghost into another container, both parent and all ghost children should activate.

---

### Container Movement & Resize

#### `planContainerMove()`

Plans a container position update.

**Input:**
- `container` - Container to move
- `newPosition` - New position `{ x, y }`
- `userId` - User performing action
- `workspace` - Current workspace
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  containerUpdate: { containerId, updates: { xPosition, yPosition } } | null;
  workspaceUpdate: Partial<MindMeshWorkspace> | null;  // If breaks layout
  activationPlan: {...} | null;  // If ghost involved
  event: InteractionEvent | null;
  layoutBreakEvent: InteractionEvent | null;
  errors: string[];
}
```

**Effects:**
- Updates position
- Activates ghost if involved
- Breaks layout if movement is manual
- Requires canvas lock

**Example:**
```typescript
const plan = planContainerMove(
  container,
  { x: 250, y: 150 },
  userId,
  workspace,
  currentLock
);

if (plan.errors.length === 0) {
  // Execute activation first if needed
  if (plan.activationPlan?.containerUpdate) {
    await updateContainer(plan.activationPlan.containerUpdate);
  }

  // Then execute move
  await updateContainer(plan.containerUpdate);

  // Update workspace if layout broken
  if (plan.workspaceUpdate) {
    await updateWorkspace(plan.workspaceUpdate);
  }

  // Emit events
  if (plan.activationPlan?.event) {
    interactionEvents.emit(plan.activationPlan.event);
  }
  if (plan.event) {
    interactionEvents.emit(plan.event);
  }
  if (plan.layoutBreakEvent) {
    interactionEvents.emit(plan.layoutBreakEvent);
  }
}
```

---

#### `planContainerResize()`

Plans a container dimension update.

**Input:**
- `container` - Container to resize
- `newDimensions` - New dimensions `{ width, height }`
- `userId` - User performing action
- `workspace` - Current workspace
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  containerUpdate: { containerId, updates: { width, height } } | null;
  activationPlan: {...} | null;  // If ghost involved
  event: InteractionEvent | null;
  errors: string[];
}
```

**Effects:**
- Updates dimensions
- Activates ghost if involved
- Does NOT break layout (visual only)
- Requires canvas lock

---

### Nesting & Un-nesting

#### `planContainerNesting()`

Plans nesting a container under a parent.

**Input:**
- `child` - Container to nest
- `parent` - Parent container (or null to un-nest)
- `userId` - User performing action
- `workspace` - Current workspace
- `allContainers` - All containers (for cycle detection)
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  childUpdate: { containerId, updates: { parentContainerId } } | null;
  workspaceUpdate: Partial<MindMeshWorkspace> | null;  // If breaks layout
  childActivation: {...} | null;  // If child is ghost
  parentActivation: {...} | null;  // If parent is ghost
  event: InteractionEvent | null;
  layoutBreakEvent: InteractionEvent | null;
  errors: string[];
}
```

**Effects:**
- Updates nesting
- Activates child if ghost
- Activates parent if ghost
- Breaks layout if non-default nesting
- Validates no cycles

**Example:**
```typescript
const plan = planContainerNesting(
  childContainer,
  parentContainer,
  userId,
  workspace,
  allContainers,
  currentLock
);

if (plan.errors.length === 0) {
  // Activate child if needed
  if (plan.childActivation?.containerUpdate) {
    await updateContainer(plan.childActivation.containerUpdate);
  }

  // Activate parent if needed
  if (plan.parentActivation?.containerUpdate) {
    await updateContainer(plan.parentActivation.containerUpdate);
  }

  // Execute nesting
  await updateContainer(plan.childUpdate);

  // Update workspace if layout broken
  if (plan.workspaceUpdate) {
    await updateWorkspace(plan.workspaceUpdate);
  }

  // Emit all events
  // ... (similar to move example)
}
```

---

#### `planContainerUnnesting()`

Plans un-nesting a container (restoring to root level).

**Input:** Same as `planContainerNesting` but `parent` is always `null`

**Output:** Same as `planContainerNesting`

**Effect:** Sets `parentContainerId = null`, does not delete nodes

---

### Node Operations

#### `planManualNodeCreation()`

Plans creation of a manual node.

**Input:**
- `sourcePort` - Source port
- `targetPort` - Target port
- `sourceContainer` - Source container
- `targetContainer` - Target container
- `userId` - User performing action
- `workspace` - Current workspace
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  nodeInput: {
    workspaceId,
    sourcePortId,
    targetPortId,
    isAutoGenerated: false
  } | null;
  sourceActivation: {...} | null;  // If source is ghost
  targetActivation: {...} | null;  // If target is ghost
  event: InteractionEvent | null;
  errors: string[];
}
```

**Effects:**
- Creates manual node
- Activates source container if ghost
- Activates target container if ghost
- Does NOT break layout
- Validates ports, workspace consistency

---

#### `planNodeDeletion()`

Plans deletion of a node.

**Input:**
- `node` - Node to delete
- `userId` - User performing action
- `workspace` - Current workspace
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  allowed: boolean;
  event: InteractionEvent | null;
  errors: string[];
}
```

**Rules:**
- Auto-generated nodes cannot be deleted (only hidden)
- Manual nodes can be freely deleted
- Does not delete containers

---

#### `wouldHidingNodeBreakLayout()`

Checks if hiding an auto-generated node would break layout.

**Input:**
- `node` - Node being hidden
- `workspace` - Current workspace

**Output:** `boolean`

**Logic:**
```typescript
// Only auto-generated nodes affect layout
if (!node.isAutoGenerated) return false;

// Already broken, no effect
if (workspace.hasBrokenDefaultLayout) return false;

// Hiding auto-generated node = rejecting hierarchy viz = breaks layout
return true;
```

---

### Canvas Lock Enforcement

#### `planCanvasLockAcquisition()`

Plans acquisition of canvas lock.

**Input:**
- `workspaceId` - Workspace to lock
- `userId` - User acquiring lock
- `durationMs` - Lock duration in milliseconds
- `existingLock` - Current lock (if any)

**Output:**
```typescript
{
  lockInput: {
    workspaceId,
    userId,
    expiresAt
  } | null;
  event: InteractionEvent | null;
  errors: string[];
}
```

**Rules:**
- Must be explicit
- Single user only
- Validates duration

---

#### `planCanvasLockRelease()`

Plans release of canvas lock.

**Input:**
- `lock` - Lock to release
- `userId` - User releasing lock
- `isTimeout` - Whether release is due to timeout

**Output:**
```typescript
{
  allowed: boolean;
  event: InteractionEvent | null;
  errors: string[];
}
```

**Rules:**
- Must be lock holder (unless timeout)
- Can be explicit or timeout-based

---

#### `assertCanvasWriteAllowed()`

Asserts that user can perform write operations.

**Input:**
- `workspaceId` - Workspace being modified
- `userId` - User performing operation
- `currentLock` - Current canvas lock

**Output:**
```typescript
{
  allowed: boolean;
  reason?: string;
}
```

**Usage:** All write operations must call this first.

---

#### `shouldAutoReleaseLock()`

Checks if a lock has expired and should be auto-released.

**Input:** `lock` - Lock to check

**Output:** `boolean`

---

### Interaction Events

#### Event Types

```typescript
type InteractionEvent =
  | { type: 'container_activated'; containerId; reason; timestamp; userId }
  | { type: 'container_moved'; containerId; fromPosition; toPosition; timestamp; userId }
  | { type: 'container_resized'; containerId; fromDimensions; toDimensions; timestamp; userId }
  | { type: 'container_nested'; childId; parentId; previousParentId; timestamp; userId }
  | { type: 'node_created'; nodeId; sourcePortId; targetPortId; isAutoGenerated; timestamp; userId }
  | { type: 'node_deleted'; nodeId; wasAutoGenerated; timestamp; userId }
  | { type: 'layout_broken'; workspaceId; breakEvent; timestamp; userId }
  | { type: 'lock_acquired'; workspaceId; timestamp; userId }
  | { type: 'lock_released'; workspaceId; timestamp; userId };
```

#### Event Emitter

```typescript
// Subscribe to events
const unsubscribe = interactionEvents.subscribe((event) => {
  console.log('Interaction event:', event);
  // Future: Send to Regulation system
});

// Emit event (done automatically by planning functions)
interactionEvents.emit({
  type: 'container_activated',
  containerId: 'container-123',
  reason: 'user_drag',
  timestamp: new Date().toISOString(),
  userId: 'user-456'
});

// Unsubscribe
unsubscribe();
```

**Important:** Events are NOT persisted to database yet. They're emitted in-memory for future Regulation integration.

---

### Helper Utilities

#### `batchContainerUpdates()`

Combines multiple container updates into a single batch.

**Input:** Array of container updates

**Output:** Deduplicated updates

**Use Case:** When multiple operations affect same container, merge updates.

---

#### `collectEvents()`

Extracts all events from multiple operation plans.

**Input:** Array of operation plans

**Output:** All non-null events

**Use Case:** Collecting events to emit after batch operations.

---

#### `collectErrors()`

Checks if any errors occurred in operation plans.

**Input:** Array of operation plans

**Output:** All errors found

---

#### `requiresWorkspaceUpdate()`

Determines if an operation would require workspace update.

**Input:** Array of operation plans

**Output:** `boolean`

**Use Case:** Check if layout would break before committing.

---

## Interaction Patterns

### Pattern 1: Simple Container Move

```typescript
// User drags container to new position
const plan = planContainerMove(
  container,
  { x: newX, y: newY },
  userId,
  workspace,
  currentLock
);

if (plan.errors.length > 0) {
  // Show error to user
  return;
}

// Execute plan
if (plan.activationPlan?.containerUpdate) {
  await updateContainer(plan.activationPlan.containerUpdate);
  interactionEvents.emit(plan.activationPlan.event);
}

await updateContainer(plan.containerUpdate);
interactionEvents.emit(plan.event);

if (plan.workspaceUpdate) {
  await updateWorkspace(plan.workspaceUpdate);
  interactionEvents.emit(plan.layoutBreakEvent);
}
```

---

### Pattern 2: Nesting with Activation

```typescript
// User drags child container into parent
const plan = planContainerNesting(
  childContainer,
  parentContainer,
  userId,
  workspace,
  allContainers,
  currentLock
);

if (plan.errors.length > 0) {
  // Show error to user
  return;
}

// Execute activations first
if (plan.childActivation?.containerUpdate) {
  await updateContainer(plan.childActivation.containerUpdate);
  interactionEvents.emit(plan.childActivation.event);
}

if (plan.parentActivation?.containerUpdate) {
  await updateContainer(plan.parentActivation.containerUpdate);
  interactionEvents.emit(plan.parentActivation.event);
}

// Then execute nesting
await updateContainer(plan.childUpdate);
interactionEvents.emit(plan.event);

// Update workspace if layout broken
if (plan.workspaceUpdate) {
  await updateWorkspace(plan.workspaceUpdate);
  interactionEvents.emit(plan.layoutBreakEvent);
}
```

---

### Pattern 3: Manual Node Creation

```typescript
// User connects two ports
const plan = planManualNodeCreation(
  sourcePort,
  targetPort,
  sourceContainer,
  targetContainer,
  userId,
  workspace,
  currentLock
);

if (plan.errors.length > 0) {
  // Show error to user
  return;
}

// Execute activations first
if (plan.sourceActivation?.containerUpdate) {
  await updateContainer(plan.sourceActivation.containerUpdate);
  interactionEvents.emit(plan.sourceActivation.event);
}

if (plan.targetActivation?.containerUpdate) {
  await updateContainer(plan.targetActivation.containerUpdate);
  interactionEvents.emit(plan.targetActivation.event);
}

// Then create node
const node = await createNode(plan.nodeInput);

// Emit node creation event
interactionEvents.emit({
  type: 'node_created',
  nodeId: node.id,
  sourcePortId: sourcePort.id,
  targetPortId: targetPort.id,
  isAutoGenerated: false,
  timestamp: new Date().toISOString(),
  userId
});
```

---

### Pattern 4: Batch Operations

```typescript
// User performs multiple operations at once
const movePlan1 = planContainerMove(...);
const movePlan2 = planContainerMove(...);
const nestPlan = planContainerNesting(...);

// Collect errors
const allErrors = collectErrors(movePlan1, movePlan2, nestPlan);
if (allErrors.length > 0) {
  // Show errors to user
  return;
}

// Batch container updates
const updates = batchContainerUpdates([
  movePlan1.containerUpdate,
  movePlan2.containerUpdate,
  nestPlan.childUpdate,
  // Plus any activations
].filter(Boolean));

// Execute batch
for (const update of updates) {
  await updateContainer(update);
}

// Check if workspace needs update
if (requiresWorkspaceUpdate(movePlan1, movePlan2, nestPlan)) {
  await updateWorkspace(movePlan1.workspaceUpdate);  // They'll all be same
}

// Emit all events
const events = collectEvents(movePlan1, movePlan2, nestPlan);
for (const event of events) {
  interactionEvents.emit(event);
}
```

---

## Testing Scenarios

### Test 1: Ghost Activation on Drag

```typescript
const ghostContainer = { id: 'c1', isGhost: true, ... };
const workspace = { hasBrokenDefaultLayout: false };

const plan = planContainerActivation(
  ghostContainer,
  'user_drag',
  'user-123',
  workspace,
  currentLock
);

expect(plan.containerUpdate.updates.isGhost).toBe(false);
expect(plan.workspaceUpdate.hasBrokenDefaultLayout).toBe(true);
expect(plan.event.type).toBe('container_activated');
expect(plan.event.reason).toBe('user_drag');
```

---

### Test 2: Move Breaks Layout

```typescript
const container = { id: 'c1', xPosition: 100, yPosition: 100, isGhost: false };
const workspace = { hasBrokenDefaultLayout: false };

const plan = planContainerMove(
  container,
  { x: 250, y: 150 },
  'user-123',
  workspace,
  currentLock
);

expect(plan.containerUpdate.updates.xPosition).toBe(250);
expect(plan.workspaceUpdate.hasBrokenDefaultLayout).toBe(true);
expect(plan.layoutBreakEvent.type).toBe('layout_broken');
expect(plan.layoutBreakEvent.breakEvent).toBe('manual_container_move');
```

---

### Test 3: Nesting Activates Both

```typescript
const ghostChild = { id: 'c1', isGhost: true, parentContainerId: null };
const ghostParent = { id: 'c2', isGhost: true };

const plan = planContainerNesting(
  ghostChild,
  ghostParent,
  'user-123',
  workspace,
  allContainers,
  currentLock
);

expect(plan.childActivation.containerUpdate.updates.isGhost).toBe(false);
expect(plan.parentActivation.containerUpdate.updates.isGhost).toBe(false);
expect(plan.childUpdate.updates.parentContainerId).toBe('c2');
```

---

### Test 4: Auto-Generated Node Cannot Be Deleted

```typescript
const autoNode = { id: 'n1', isAutoGenerated: true };

const plan = planNodeDeletion(autoNode, 'user-123', workspace, currentLock);

expect(plan.allowed).toBe(false);
expect(plan.errors[0]).toContain('Cannot delete auto-generated nodes');
```

---

### Test 5: Lock Required for Write

```typescript
const noLock = null;

const plan = planContainerMove(
  container,
  { x: 250, y: 150 },
  'user-123',
  workspace,
  noLock
);

expect(plan.errors.length).toBeGreaterThan(0);
expect(plan.errors[0]).toContain('lock');
```

---

## Invariants

### I1. Activation is Always Explicit

✅ Ghost containers activate only on direct user interaction
✅ Activation reason is always tracked
✅ No inferred or automatic activation

### I2. User Actions Override Auto-Layout

✅ Manual move breaks layout permanently
✅ Manual nest breaks layout permanently
✅ Activation breaks layout permanently
✅ Once broken, stays broken until explicit reset

### I3. No Silent Changes

✅ All operations return explicit plans
✅ All changes are approved before execution
✅ No surprise mutations

### I4. Canvas Lock Enforced

✅ All write operations check lock
✅ Lock holder validated
✅ Expired locks rejected

### I5. Nodes Remain Meaningless

✅ Nodes are relationships only
✅ No semantic content in nodes
✅ Containers are the only semantic units

### I6. Events are Internal

✅ Events contain IDs and timestamps only
✅ No content in events
✅ No semantic meaning in events
✅ Events NOT persisted yet (in-memory only)

---

## Summary

The interaction logic layer is a **deterministic, explicit, permission-aware** domain controller that:

1. **Detects explicit user intent** - No inference or guessing
2. **Plans state transitions** - Never executes, only plans
3. **Enforces permissions** - Canvas lock checked everywhere
4. **Activates ghosts safely** - Always explicit, tracked
5. **Respects user control** - Breaks layout when appropriate
6. **Emits events internally** - For future Regulation
7. **Never renders** - Pure logic, no UI

**Core Philosophy:** Translate explicit user actions into explicit state changes, with clear permission enforcement and event emission.

---

**Status:** Interaction logic complete, ready for service integration
**Next Step:** Implement services that execute interaction plans
