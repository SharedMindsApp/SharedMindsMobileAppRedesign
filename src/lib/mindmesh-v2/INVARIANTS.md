# Mind Mesh V2 Invariants & Safety Guarantees

## Overview

This document defines the non-negotiable invariants of Mind Mesh V2. These rules ensure system correctness and maintain the separation between Mind Mesh (visual cognition) and Guardrails (authoritative project data).

**Status:** Invariants defined and enforced via validation.ts
**Last Updated:** December 2025

## Core Architectural Rules

### 1. Containers Hold Meaning, Nodes Hold Relationships

**Rule:** Containers store content (title/body). Nodes store only connections between ports.

**Enforcement:**
- Database: Container has `title` and `body` columns; Node has none
- Schema: `CHECK` constraint requires `title IS NOT NULL OR body IS NOT NULL`
- Validation: `validateContainerInput()` checks content requirement
- Validation: `validateNodeHasNoContent()` prevents semantic metadata in nodes

**Why:** This separation keeps the graph structure pure and prevents semantic confusion.

---

### 2. Guardrails is Authoritative, Mind Mesh is Not

**Rule:** References from containers to Guardrails entities are non-authoritative. Deleting a reference never deletes the Guardrails entity.

**Enforcement:**
- Database: Foreign keys are NOT set to Guardrails tables (references use UUID only)
- Validation: `validateNoAuthorityLeakage()` documents this rule
- Services: Must implement non-authoritative deletion logic

**Why:** Mind Mesh is a visualization/cognition layer. Authority lives in Guardrails.

---

## Container Invariants

### C1. Content Requirement

**Invariant:** Every container must have `title` OR `body` (at least one).

**Enforcement:**
- Database: `CHECK (title IS NOT NULL OR body IS NOT NULL)`
- Validation: `validateContainerInput()` for creates
- Validation: `validateContainerContentUpdate()` for updates
- Type Guard: `hasContent()` helper

**Violation Examples:**
```typescript
// INVALID - no content
{ workspaceId: 'abc', title: null, body: null }

// INVALID - empty strings don't count
{ workspaceId: 'abc', title: '', body: '  ' }

// VALID
{ workspaceId: 'abc', title: 'Planning', body: null }
```

---

### C2. No Nesting Cycles

**Invariant:** Container hierarchy via `parentContainerId` must not contain cycles.

**Enforcement:**
- Validation: `validateContainerNesting()` walks parent chain to detect cycles
- Helper: `buildContainerHierarchy()` creates hierarchy map
- Helper: `getContainerAncestors()` computes ancestor path

**Violation Examples:**
```typescript
// INVALID - self-parent
container.parentContainerId = container.id

// INVALID - cycle: A -> B -> C -> A
containerA.parentContainerId = containerC.id
containerB.parentContainerId = containerA.id
containerC.parentContainerId = containerB.id

// VALID - linear hierarchy
containerC.parentContainerId = containerB.id
containerB.parentContainerId = containerA.id
containerA.parentContainerId = null
```

**Note:** Unlimited depth is allowed, only cycles are forbidden.

---

### C3. Ghost Immutability

**Invariant:** Containers with `isGhost = true` are read-only.

**Enforcement:**
- Validation: `validateGhostContainerImmutability()` blocks updates/deletes
- Type Guard: `isGhostContainer()` helper

**Violation Examples:**
```typescript
// INVALID - cannot update ghost
if (container.isGhost) {
  updateContainer(container.id, { title: 'New' }); // REJECTED
}

// INVALID - cannot delete ghost
if (container.isGhost) {
  deleteContainer(container.id); // REJECTED
}

// VALID - read-only access
if (container.isGhost) {
  displayContainer(container); // OK
}
```

**Why:** Ghost containers are generated from Guardrails entities. User edits must not break this mirroring.

---

### C4. Orphan Handling

**Invariant:** Deleting a container sets children's `parentContainerId` to null (not an error).

**Enforcement:**
- Database: `ON DELETE SET NULL` for `parent_container_id` foreign key
- Detection: `detectOrphanedChildren()` warns about impacted children

**Behavior:**
```typescript
// Container A has children B, C
// Delete A
deleteContainer(A.id);

// Result:
// - A is deleted
// - B.parentContainerId = null
// - C.parentContainerId = null
// - B and C still exist (not deleted)
```

**Why:** Children may have independent meaning. SET NULL preserves them while breaking the hierarchy.

---

## Reference Invariants

### R1. No Duplicate References

**Invariant:** A container cannot reference the same Guardrails entity twice.

**Enforcement:**
- Database: `UNIQUE (container_id, entity_type, entity_id)`
- Validation: `validateContainerReferences()` checks for duplicates

**Violation Example:**
```typescript
// INVALID - duplicate reference
createReference({ containerId: 'A', entityType: 'track', entityId: 'T1' });
createReference({ containerId: 'A', entityType: 'track', entityId: 'T1' }); // REJECTED

// VALID - different entities
createReference({ containerId: 'A', entityType: 'track', entityId: 'T1' });
createReference({ containerId: 'A', entityType: 'track', entityId: 'T2' }); // OK
```

---

### R2. Exactly One Primary Reference

**Invariant:** If a container has any references, exactly one must be `isPrimary = true`.

**Enforcement:**
- Database: Trigger `ensure_single_primary_reference()` unsets other primaries
- Validation: `validateContainerReferences()` blocks multiple primaries
- Validation: `validatePrimaryReferenceUpdate()` prevents removing last primary
- Validation: `validateReferenceDeletion()` requires designating new primary

**Behavior:**
```typescript
// Container has no references -> OK (no primary needed)

// Container has 1 reference -> must be primary
createReference({ containerId: 'A', entityId: 'E1', isPrimary: true }); // OK

// Adding second reference -> choose which is primary
createReference({ containerId: 'A', entityId: 'E2', isPrimary: true });
// Result: E1.isPrimary = false, E2.isPrimary = true (trigger unsets E1)

// Cannot remove primary without designating new one
deleteReference('E2'); // REJECTED if E1 exists
// Must first set E1.isPrimary = true, then delete E2
```

**Why:** Primary reference indicates the main Guardrails entity this container represents.

---

### R3. Non-Authoritative Deletion

**Invariant:** Deleting a reference never deletes the Guardrails entity.

**Enforcement:**
- No foreign keys to Guardrails tables
- Services must implement this rule
- Validation: `validateNoAuthorityLeakage()` documents intent

**Behavior:**
```typescript
// Container references Track T1
createReference({ containerId: 'A', entityType: 'track', entityId: 'T1' });

// Delete reference
deleteReference(ref.id);

// Result:
// - Reference is deleted
// - Track T1 is UNCHANGED (still exists in Guardrails)
// - Container A is UNCHANGED (still exists, just has no reference)
```

**Why:** Mind Mesh is a view layer. Guardrails owns the data.

---

## Port Invariants

### P1. Port Ownership

**Invariant:** Ports must belong to a container. No orphaned ports.

**Enforcement:**
- Database: `NOT NULL` constraint on `container_id`
- Database: `ON DELETE CASCADE` for container foreign key
- Validation: `validatePortCreation()` checks container exists

**Behavior:**
```typescript
// Delete container -> all ports deleted (CASCADE)
deleteContainer(A.id);
// Result: All ports of container A are automatically deleted
```

---

### P2. Port Workspace Consistency

**Invariant:** Ports belong to containers, which belong to workspaces. Ports indirectly belong to the container's workspace.

**Enforcement:**
- Validation: `validatePortCreation()` checks container's workspace
- Validation: `validateNodeCreation()` ensures ports are in same workspace

**Why:** Workspace is the boundary of a Mind Mesh graph. Cross-workspace connections are forbidden.

---

## Node Invariants

### N1. Valid Port Connection

**Invariant:** Nodes must connect two valid ports. Ports must exist and be accessible.

**Enforcement:**
- Database: Foreign keys to `mindmesh_ports` with `ON DELETE CASCADE`
- Validation: `validateNodeCreation()` checks ports exist

**Behavior:**
```typescript
// Delete port -> all nodes using that port are deleted (CASCADE)
deletePort(port.id);
// Result: All nodes connected to this port are automatically deleted
```

**Why:** Orphaned nodes are meaningless. CASCADE ensures cleanup.

---

### N2. No Self-Connections

**Invariant:** A node cannot connect a port to itself.

**Enforcement:**
- Database: `CHECK (source_port_id != target_port_id)`
- Validation: `validateNodeCreation()` checks source != target

**Violation Example:**
```typescript
// INVALID - same port
createNode({ sourcePortId: 'P1', targetPortId: 'P1' }); // REJECTED

// VALID - different ports
createNode({ sourcePortId: 'P1', targetPortId: 'P2' }); // OK
```

---

### N3. Workspace Consistency

**Invariant:** A node's workspace must match the workspace of its connected containers.

**Enforcement:**
- Validation: `validateNodeCreation()` checks workspace IDs match

**Violation Example:**
```typescript
// Container A in workspace W1
// Container B in workspace W2
// INVALID - cross-workspace connection
createNode({
  workspaceId: 'W1',
  sourcePortId: portA.id, // container A in W1
  targetPortId: portB.id, // container B in W2 - REJECTED
});
```

**Why:** Workspaces are isolated graphs. Cross-workspace connections break this isolation.

---

### N4. No Semantic Content in Nodes

**Invariant:** Nodes must not store semantic content. Only relationship metadata allowed.

**Enforcement:**
- Schema: No `title`, `body`, or content fields on nodes
- Validation: `validateNodeHasNoContent()` blocks semantic keys in metadata

**Violation Example:**
```typescript
// INVALID - semantic content in metadata
createNode({
  sourcePortId: 'P1',
  targetPortId: 'P2',
  metadata: {
    title: 'Dependency', // REJECTED - semantic key
    body: 'This is a description', // REJECTED - semantic key
  },
});

// VALID - relationship metadata only
createNode({
  sourcePortId: 'P1',
  targetPortId: 'P2',
  relationshipType: 'depends_on',
  metadata: {
    weight: 5, // OK - relationship property
    color: 'blue', // OK - visual property
  },
});
```

**Why:** Containers hold meaning. Nodes hold relationships. Mixing these violates the architecture.

---

### N5. Multiple Nodes Allowed

**Invariant:** Multiple nodes between the same containers are allowed.

**Enforcement:**
- No uniqueness constraint on (source_port_id, target_port_id)
- This is explicitly permitted

**Example:**
```typescript
// VALID - multiple relationships between same containers
createNode({
  sourcePortId: portA1.id, // container A
  targetPortId: portB1.id, // container B
  relationshipType: 'depends_on',
});

createNode({
  sourcePortId: portA2.id, // container A (different port)
  targetPortId: portB2.id, // container B (different port)
  relationshipType: 'inspires',
}); // OK - different relationship type and ports
```

**Why:** Complex relationships may exist. Users can model nuanced connections.

---

## Workspace Lock Invariants

### L1. Single Lock Per Workspace

**Invariant:** Only one active lock per workspace at a time.

**Enforcement:**
- Database: `UNIQUE (workspace_id)` constraint
- Validation: `validateLockAcquisition()` checks for existing lock

**Behavior:**
```typescript
// User A acquires lock
acquireLock({ workspaceId: 'W1', userId: 'A' });

// User B tries to acquire lock
acquireLock({ workspaceId: 'W1', userId: 'B' }); // REJECTED - locked by A

// User A can renew lock
acquireLock({ workspaceId: 'W1', userId: 'A' }); // OK - same user, renewal
```

---

### L2. Lock Expiry

**Invariant:** Locks must have valid expiry times and auto-expire.

**Enforcement:**
- Database: `expires_at` field required
- Validation: `validateLockAcquisition()` checks duration is valid (0 < d <= 3600s)
- Helper: `isLockExpired()` checks if lock is expired

**Behavior:**
```typescript
// Lock expires after 5 minutes
acquireLock({ workspaceId: 'W1', userId: 'A', durationSeconds: 300 });

// After 5 minutes, lock is expired
// Another user can acquire lock
acquireLock({ workspaceId: 'W1', userId: 'B' }); // OK - A's lock expired
```

**Why:** Prevents indefinite locks if user crashes or forgets to release.

---

### L3. Write Permission

**Invariant:** Only the lock holder can perform write operations.

**Enforcement:**
- Validation: `validateWritePermission()` checks lock holder before writes
- Helper: `isLockHolder()` checks if user holds lock

**Behavior:**
```typescript
// User A holds lock
acquireLock({ workspaceId: 'W1', userId: 'A' });

// User A can write
updateContainer({ ...data }); // OK - A holds lock

// User B cannot write
updateContainer({ ...data }); // REJECTED - B does not hold lock
```

**Why:** Prevents concurrent editing conflicts and data corruption.

---

## Cascade Behaviors (Database-Enforced)

### Workspace Deletion
```
DELETE workspace
  ↓ CASCADE
  - All containers
  - All nodes
  - All locks
  ↓ CASCADE (from containers)
  - All ports
  - All references
  - All visibility settings
  ↓ CASCADE (from ports)
  - All nodes connected to those ports
```

### Container Deletion
```
DELETE container
  ↓ CASCADE
  - All ports
  - All references
  - All visibility settings
  ↓ SET NULL
  - Children have parentContainerId set to null
  ↓ CASCADE (from ports)
  - All nodes connected to those ports
```

### Port Deletion
```
DELETE port
  ↓ CASCADE
  - All nodes using this port (source or target)
```

**Detection Utilities:**
- `detectOrphanedChildren()` - Warns about children that will be orphaned
- `detectCascadeDeletion()` - Warns about cascade deletion scope

---

## Validation Usage Patterns

### Services Must Validate Before Writes

```typescript
// CORRECT - validate first
const result = validateContainerInput(input);
if (!result.valid) {
  throw new ValidationError(result.errors);
}
await createContainer(input);

// INCORRECT - write without validation
await createContainer(input); // May violate invariants
```

### Batch Operations

```typescript
// Validate all inputs first
const results = validateContainerBatch(inputs);
const failures = [...results.entries()].filter(([_, r]) => !r.valid);

if (failures.length > 0) {
  return { success: false, failures };
}

// All valid, proceed with batch
await createContainerBatch(inputs);
```

### Lock-Guarded Writes

```typescript
// Acquire lock
await acquireLock({ workspaceId, userId });

// Validate write permission
const writeCheck = validateWritePermission(workspaceId, userId, currentLock);
if (!writeCheck.valid) {
  throw new Error('No write permission');
}

// Perform write
await updateContainer({ ...data });

// Release lock
await releaseLock(workspaceId, userId);
```

---

## Forbidden Behaviors

### ❌ DO NOT: Add semantic meaning to nodes

```typescript
// WRONG
createNode({
  sourcePortId: 'P1',
  targetPortId: 'P2',
  metadata: { description: 'This expands that' }, // NO - semantic content
});

// CORRECT
createNode({
  sourcePortId: 'P1',
  targetPortId: 'P2',
  relationshipType: 'expands', // YES - relationship type only
});
```

---

### ❌ DO NOT: Mutate Guardrails from Mind Mesh

```typescript
// WRONG
deleteReference(ref.id, { cascadeToGuardrails: true }); // NO - breaks authority

// CORRECT
deleteReference(ref.id); // YES - reference deleted, Guardrails untouched
```

---

### ❌ DO NOT: Create silent auto-fixes

```typescript
// WRONG
function updateContainer(id, data) {
  if (!data.title && !data.body) {
    data.title = 'Untitled'; // NO - silent auto-fix
  }
  await db.update(id, data);
}

// CORRECT
function updateContainer(id, data) {
  const result = validateContainerContentUpdate(current, data);
  if (!result.valid) {
    throw new ValidationError(result.errors); // YES - explicit rejection
  }
  await db.update(id, data);
}
```

---

### ❌ DO NOT: Assume UI or canvas behavior

```typescript
// WRONG
function validateNodeCreation(input) {
  if (visualDistance(sourcePort, targetPort) > 1000) {
    return { valid: false, errors: [{ message: 'Too far apart' }] }; // NO - UI assumption
  }
}

// CORRECT
function validateNodeCreation(input) {
  // Only validate data integrity, not visual properties
  if (!sourcePort || !targetPort) {
    return { valid: false, errors: [{ message: 'Invalid ports' }] }; // YES
  }
}
```

---

## Sanity Check Results

✅ **No authority leakage** - References are non-authoritative
✅ **No semantic nodes** - Nodes hold relationships only
✅ **No hierarchy inference** - Only explicit `parentContainerId` creates hierarchy
✅ **No UI assumptions** - Validation is pure data logic
✅ **All invariants explicit** - Database + validation enforce rules
✅ **Forbidden behaviors documented** - Clear anti-patterns listed

---

## Summary

Mind Mesh V2 invariants ensure:

1. **Data Integrity** - No orphans, no cycles, no invalid states
2. **Authority Separation** - Guardrails owns data, Mind Mesh visualizes
3. **Architectural Purity** - Containers have meaning, nodes have relationships
4. **Concurrent Safety** - Locks prevent conflicts
5. **Explicit Validation** - Services must validate, no silent auto-fixes

All invariants are enforced through:
- Database constraints (CHECK, UNIQUE, CASCADE)
- Database triggers (primary reference uniqueness)
- Validation helpers (validation.ts)
- Type guards (hasContent, isGhostContainer, etc.)

**Status:** Complete and ready for service implementation
**Next Step:** Implement services that use these validators
