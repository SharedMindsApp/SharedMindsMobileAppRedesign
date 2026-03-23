# Mind Mesh V2 Validation Usage Guide

## Overview

This guide demonstrates how to use the validation layer when implementing services for Mind Mesh V2. All validators are pure functions that return explicit errors - they never throw by default.

## Basic Pattern

```typescript
import {
  validateContainerInput,
  ValidationResult,
} from './validation';

async function createContainer(input: CreateMindMeshContainerInput) {
  // 1. Validate input
  const result = validateContainerInput(input);

  // 2. Check validity
  if (!result.valid) {
    // 3. Handle errors explicitly
    throw new ValidationError(result.errors);
  }

  // 4. Proceed with database write
  const container = await db.insert('mindmesh_containers', input);
  return container;
}
```

## Validation Result Structure

All validators return a `ValidationResult`:

```typescript
interface ValidationResult {
  valid: boolean;        // true if passed, false if errors
  errors: ValidationError[];  // array of errors (empty if valid)
}

interface ValidationError {
  field: string;    // which field failed
  message: string;  // human-readable error
  code: string;     // machine-readable error code
}
```

## Example Error Handling

```typescript
const result = validateContainerInput(input);

if (!result.valid) {
  // Log for debugging
  console.error('Validation failed:', result.errors);

  // Return to user
  return {
    success: false,
    errors: result.errors.map(e => ({
      field: e.field,
      message: e.message,
    })),
  };
}
```

## Container Validation Examples

### Creating a Container

```typescript
import {
  validateContainerInput,
  CreateMindMeshContainerInput,
} from './validation';

async function createContainer(input: CreateMindMeshContainerInput) {
  // Validate basic input
  const inputResult = validateContainerInput(input);
  if (!inputResult.valid) {
    throw new Error(inputResult.errors.map(e => e.message).join('; '));
  }

  // If setting parent, validate nesting
  if (input.parentContainerId) {
    const containers = await getAllContainers(input.workspaceId);
    const hierarchy = buildContainerHierarchy(containers);

    const nestingResult = validateContainerNesting(
      'NEW', // new container ID (use placeholder)
      input.parentContainerId,
      hierarchy
    );

    if (!nestingResult.valid) {
      throw new Error(nestingResult.errors.map(e => e.message).join('; '));
    }
  }

  // All valid - create
  return await db.insert('mindmesh_containers', input);
}
```

### Updating a Container

```typescript
import {
  validateContainerContentUpdate,
  validateGhostContainerImmutability,
  validateContainerNesting,
} from './validation';

async function updateContainer(
  containerId: string,
  update: UpdateMindMeshContainerInput
) {
  // 1. Fetch current container
  const current = await db.getContainer(containerId);

  // 2. Check if ghost (read-only)
  const ghostCheck = validateGhostContainerImmutability(current, 'update');
  if (!ghostCheck.valid) {
    throw new Error('Cannot update ghost container');
  }

  // 3. Check content requirement
  const contentCheck = validateContainerContentUpdate(current, update);
  if (!contentCheck.valid) {
    throw new Error(contentCheck.errors[0].message);
  }

  // 4. If changing parent, check nesting
  if (update.parentContainerId !== undefined) {
    const containers = await getAllContainers(current.workspaceId);
    const hierarchy = buildContainerHierarchy(containers);

    const nestingCheck = validateContainerNesting(
      containerId,
      update.parentContainerId,
      hierarchy
    );

    if (!nestingCheck.valid) {
      throw new Error(nestingCheck.errors[0].message);
    }
  }

  // 5. All valid - update
  return await db.update('mindmesh_containers', containerId, update);
}
```

### Deleting a Container

```typescript
import {
  validateGhostContainerImmutability,
  detectOrphanedChildren,
  detectCascadeDeletion,
} from './validation';

async function deleteContainer(containerId: string, options?: { force?: boolean }) {
  // 1. Fetch current container
  const container = await db.getContainer(containerId);

  // 2. Check if ghost
  const ghostCheck = validateGhostContainerImmutability(container, 'delete');
  if (!ghostCheck.valid) {
    throw new Error('Cannot delete ghost container');
  }

  // 3. Detect impact
  const children = await db.getChildContainers(containerId);
  const orphanInfo = detectOrphanedChildren(containerId, children);

  const ports = await db.getPorts(container.workspaceId);
  const references = await db.getReferences(containerId);
  const nodes = await db.getNodes(container.workspaceId);

  const cascadeInfo = detectCascadeDeletion(
    containerId,
    ports,
    references,
    nodes
  );

  // 4. Warn user if not forced
  if (!options?.force) {
    if (orphanInfo.willOrphan) {
      return {
        success: false,
        warning: `This will orphan ${orphanInfo.orphanedCount} child containers`,
        orphanedIds: orphanInfo.orphanedIds,
        needsConfirmation: true,
      };
    }

    if (cascadeInfo.nodesToDelete > 0) {
      return {
        success: false,
        warning: `This will delete ${cascadeInfo.portsToDelete} ports and ${cascadeInfo.nodesToDelete} nodes`,
        needsConfirmation: true,
      };
    }
  }

  // 5. All checks passed - delete
  await db.delete('mindmesh_containers', containerId);
  return { success: true };
}
```

## Reference Validation Examples

### Creating a Reference

```typescript
import { validateContainerReferences } from './validation';

async function createReference(input: CreateMindMeshContainerReferenceInput) {
  // 1. Fetch existing references
  const existing = await db.getReferences(input.containerId);

  // 2. Validate
  const result = validateContainerReferences(input, existing);
  if (!result.valid) {
    throw new Error(result.errors[0].message);
  }

  // 3. Create
  return await db.insert('mindmesh_container_references', input);
}
```

### Updating Primary Reference

```typescript
import { validatePrimaryReferenceUpdate } from './validation';

async function updateReference(
  referenceId: string,
  update: { isPrimary: boolean }
) {
  // 1. Fetch reference and siblings
  const reference = await db.getReference(referenceId);
  const allRefs = await db.getReferences(reference.containerId);

  // 2. Validate primary constraint
  const result = validatePrimaryReferenceUpdate(
    referenceId,
    update.isPrimary,
    allRefs
  );

  if (!result.valid) {
    throw new Error(result.errors[0].message);
  }

  // 3. Update
  return await db.update('mindmesh_container_references', referenceId, update);
}
```

### Deleting a Reference

```typescript
import { validateReferenceDeletion } from './validation';

async function deleteReference(referenceId: string) {
  // 1. Fetch reference and siblings
  const reference = await db.getReference(referenceId);
  const allRefs = await db.getReferences(reference.containerId);
  const remaining = allRefs.filter(r => r.id !== referenceId);

  // 2. Validate deletion
  const result = validateReferenceDeletion(reference, remaining);
  if (!result.valid) {
    // Suggest promoting another reference to primary
    const suggestion = remaining[0];
    throw new Error(
      `${result.errors[0].message}. ` +
      `Consider setting reference ${suggestion.id} as primary first.`
    );
  }

  // 3. Delete (Guardrails entity is untouched - non-authoritative)
  await db.delete('mindmesh_container_references', referenceId);
}
```

## Node Validation Examples

### Creating a Node

```typescript
import {
  validateNodeCreation,
  validateNodeHasNoContent,
} from './validation';

async function createNode(input: CreateMindMeshNodeInput) {
  // 1. Validate no semantic content
  const contentCheck = validateNodeHasNoContent(input);
  if (!contentCheck.valid) {
    throw new Error('Nodes must not store semantic content');
  }

  // 2. Fetch ports and containers
  const sourcePort = await db.getPort(input.sourcePortId);
  const targetPort = await db.getPort(input.targetPortId);

  const sourceContainer = sourcePort
    ? await db.getContainer(sourcePort.containerId)
    : null;
  const targetContainer = targetPort
    ? await db.getContainer(targetPort.containerId)
    : null;

  // 3. Validate node creation
  const result = validateNodeCreation(
    input,
    sourcePort,
    targetPort,
    sourceContainer,
    targetContainer
  );

  if (!result.valid) {
    throw new Error(result.errors.map(e => e.message).join('; '));
  }

  // 4. Create
  return await db.insert('mindmesh_nodes', input);
}
```

## Lock Validation Examples

### Acquiring a Lock

```typescript
import {
  validateLockAcquisition,
  validateWritePermission,
} from './validation';

async function acquireLock(
  workspaceId: string,
  userId: string,
  durationSeconds: number = 300
) {
  // 1. Check existing lock
  const existingLock = await db.getLock(workspaceId);

  // 2. Validate acquisition
  const result = validateLockAcquisition(
    workspaceId,
    userId,
    existingLock,
    durationSeconds
  );

  if (!result.valid) {
    throw new Error(result.errors[0].message);
  }

  // 3. Acquire or renew
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);

  if (existingLock && existingLock.userId === userId) {
    // Renewal
    return await db.update('mindmesh_canvas_locks', existingLock.id, {
      expiresAt: expiresAt.toISOString(),
    });
  } else {
    // New lock (unique constraint prevents duplicates)
    return await db.insert('mindmesh_canvas_locks', {
      workspaceId,
      userId,
      expiresAt: expiresAt.toISOString(),
    });
  }
}
```

### Writing with Lock Guard

```typescript
import { validateWritePermission, isLockHolder } from './validation';

async function updateContainerWithLock(
  containerId: string,
  userId: string,
  update: UpdateMindMeshContainerInput
) {
  // 1. Fetch container and workspace
  const container = await db.getContainer(containerId);
  const workspace = await db.getWorkspace(container.workspaceId);

  // 2. Check lock
  const currentLock = await db.getLock(workspace.id);

  const writeCheck = validateWritePermission(
    workspace.id,
    userId,
    currentLock
  );

  if (!writeCheck.valid) {
    throw new Error(writeCheck.errors[0].message);
  }

  // 3. Perform update (all other validations apply)
  return await updateContainer(containerId, update);
}
```

## Batch Validation

```typescript
import {
  validateContainerBatch,
  aggregateValidationResults,
} from './validation';

async function createContainerBatch(inputs: CreateMindMeshContainerInput[]) {
  // 1. Validate all inputs
  const results = validateContainerBatch(inputs);

  // 2. Check for any failures
  const failures = [...results.entries()].filter(([_, r]) => !r.valid);

  if (failures.length > 0) {
    const errors = failures.map(([index, result]) => ({
      index,
      errors: result.errors,
    }));

    throw new Error(
      `Batch validation failed for ${failures.length} containers:\n` +
      errors.map(e => `  [${e.index}]: ${e.errors[0].message}`).join('\n')
    );
  }

  // 3. All valid - create batch
  const created = await Promise.all(
    inputs.map(input => db.insert('mindmesh_containers', input))
  );

  return created;
}
```

## Helper Utilities

### Cycle Detection

```typescript
import {
  buildContainerHierarchy,
  getContainerAncestors,
  getContainerDescendants,
} from './validation';

async function analyzeContainerHierarchy(workspaceId: string) {
  // Get all containers
  const containers = await db.getContainers(workspaceId);

  // Build hierarchy map
  const hierarchy = buildContainerHierarchy(containers);

  // Analyze a specific container
  const containerId = 'some-id';

  const ancestors = getContainerAncestors(containerId, hierarchy);
  const descendants = getContainerDescendants(containerId, containers);

  return {
    depth: ancestors.length,
    ancestors,
    descendants,
    isRoot: ancestors.length === 0,
    isLeaf: descendants.length === 0,
  };
}
```

### Lock Management

```typescript
import { isLockExpired, isLockHolder } from './validation';

async function cleanupExpiredLocks() {
  const locks = await db.getAllLocks();

  const expired = locks.filter(lock => isLockExpired(lock));

  for (const lock of expired) {
    await db.delete('mindmesh_canvas_locks', lock.id);
  }

  return { cleaned: expired.length };
}

function canUserWrite(lock: MindMeshCanvasLock | null, userId: string): boolean {
  return isLockHolder(lock, userId);
}
```

## Type Guards

```typescript
import {
  hasContent,
  isGhostContainer,
  isPrimaryReference,
} from './validation';

function filterEditableContainers(containers: MindMeshContainer[]) {
  return containers.filter(c => !isGhostContainer(c));
}

function ensureContainerHasContent(container: MindMeshContainer) {
  if (!hasContent(container)) {
    throw new Error('Container must have content');
  }
}

function findPrimaryReference(references: MindMeshContainerReference[]) {
  return references.find(r => isPrimaryReference(r));
}
```

## Error Handling Patterns

### Return Result Pattern

```typescript
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

async function createContainerSafe(
  input: CreateMindMeshContainerInput
): Promise<ServiceResult<MindMeshContainer>> {
  const result = validateContainerInput(input);

  if (!result.valid) {
    return { success: false, errors: result.errors };
  }

  try {
    const container = await db.insert('mindmesh_containers', input);
    return { success: true, data: container };
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'database',
        message: error.message,
        code: 'DB_ERROR',
      }],
    };
  }
}
```

### Throw Pattern

```typescript
class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super(errors.map(e => e.message).join('; '));
    this.name = 'ValidationException';
  }
}

async function createContainerStrict(input: CreateMindMeshContainerInput) {
  const result = validateContainerInput(input);

  if (!result.valid) {
    throw new ValidationException(result.errors);
  }

  return await db.insert('mindmesh_containers', input);
}
```

## Testing Validation

```typescript
import { validateContainerInput } from './validation';

describe('Container Validation', () => {
  it('should reject container without content', () => {
    const input = {
      workspaceId: 'test',
      title: null,
      body: null,
      xPosition: 0,
      yPosition: 0,
    };

    const result = validateContainerInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('MISSING_CONTENT');
  });

  it('should accept container with title only', () => {
    const input = {
      workspaceId: 'test',
      title: 'Test Container',
      body: null,
      xPosition: 0,
      yPosition: 0,
    };

    const result = validateContainerInput(input);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

## Summary

Key principles when using validation:

1. **Validate Before Write** - Always validate before database operations
2. **Handle Errors Explicitly** - Check `result.valid` and handle `result.errors`
3. **Provide Context** - Include meaningful error messages for users
4. **Use Type Guards** - Leverage helper functions for common checks
5. **Detect Impact** - Use detection utilities to warn users about consequences
6. **Respect Invariants** - Never bypass validation to "help" the user

All validators are pure functions - they have no side effects and are safe to call multiple times.
