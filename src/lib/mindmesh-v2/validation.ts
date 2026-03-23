/**
 * Mind Mesh V2 Validation & Invariants
 *
 * Domain-level validation helpers that enforce the architectural contract.
 * These are pure functions with no side effects - they return explicit errors.
 *
 * CRITICAL: These validators enforce correctness at the data layer.
 * Services MUST call these before writes to maintain system invariants.
 */

import type {
  CreateMindMeshContainerInput,
  UpdateMindMeshContainerInput,
  MindMeshContainer,
  MindMeshContainerReference,
  CreateMindMeshContainerReferenceInput,
  CreateMindMeshPortInput,
  MindMeshPort,
  CreateMindMeshNodeInput,
  MindMeshNode,
  MindMeshCanvasLock,
  GuardrailsEntityType,
  PortType,
} from './types';

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Helper to create validation results
 */
function createValidationResult(errors: ValidationError[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to create validation error
 */
function createError(
  field: string,
  message: string,
  code: string
): ValidationError {
  return { field, message, code };
}

// ============================================================================
// CONTAINER VALIDATION
// ============================================================================

/**
 * Validates container creation input.
 *
 * Invariants enforced:
 * - Must have title OR body (at least one)
 * - Ghost containers are immutable by design
 * - Visual properties must be valid numbers
 */
export function validateContainerInput(
  input: CreateMindMeshContainerInput | UpdateMindMeshContainerInput
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for create input (stricter)
  if ('workspaceId' in input) {
    const createInput = input as CreateMindMeshContainerInput;

    // Must have workspaceId
    if (!createInput.workspaceId) {
      errors.push(
        createError(
          'workspaceId',
          'Container must belong to a workspace',
          'MISSING_WORKSPACE'
        )
      );
    }

    // Must have title OR body
    const hasTitle = createInput.title && createInput.title.trim().length > 0;
    const hasBody = createInput.body && createInput.body.trim().length > 0;

    if (!hasTitle && !hasBody) {
      errors.push(
        createError(
          'content',
          'Container must have at least one of: title or body',
          'MISSING_CONTENT'
        )
      );
    }

    // Position must be valid
    if (typeof createInput.xPosition !== 'number' || isNaN(createInput.xPosition)) {
      errors.push(
        createError('xPosition', 'X position must be a valid number', 'INVALID_POSITION')
      );
    }

    if (typeof createInput.yPosition !== 'number' || isNaN(createInput.yPosition)) {
      errors.push(
        createError('yPosition', 'Y position must be a valid number', 'INVALID_POSITION')
      );
    }

    // Dimensions must be positive if provided
    if (createInput.width !== undefined && createInput.width <= 0) {
      errors.push(
        createError('width', 'Width must be positive', 'INVALID_DIMENSION')
      );
    }

    if (createInput.height !== undefined && createInput.height <= 0) {
      errors.push(
        createError('height', 'Height must be positive', 'INVALID_DIMENSION')
      );
    }
  } else {
    // Update input - at least check if we're clearing both title and body
    const updateInput = input as UpdateMindMeshContainerInput;

    // If both title and body are being explicitly set to null/empty, reject
    if (
      updateInput.title !== undefined &&
      updateInput.body !== undefined &&
      (!updateInput.title || updateInput.title.trim().length === 0) &&
      (!updateInput.body || updateInput.body.trim().length === 0)
    ) {
      errors.push(
        createError(
          'content',
          'Cannot remove both title and body - container must have content',
          'MISSING_CONTENT'
        )
      );
    }

    // Validate dimensions if provided
    if (updateInput.width !== undefined && updateInput.width <= 0) {
      errors.push(
        createError('width', 'Width must be positive', 'INVALID_DIMENSION')
      );
    }

    if (updateInput.height !== undefined && updateInput.height <= 0) {
      errors.push(
        createError('height', 'Height must be positive', 'INVALID_DIMENSION')
      );
    }
  }

  return createValidationResult(errors);
}

/**
 * Validates that updating a container would not leave it without content.
 * Services must pass the current container state to check this.
 *
 * Invariant: Container must ALWAYS have title OR body.
 */
export function validateContainerContentUpdate(
  currentContainer: MindMeshContainer,
  update: UpdateMindMeshContainerInput
): ValidationResult {
  const errors: ValidationError[] = [];

  // Compute final state
  const finalTitle = update.title !== undefined ? update.title : currentContainer.title;
  const finalBody = update.body !== undefined ? update.body : currentContainer.body;

  const hasTitle = finalTitle && finalTitle.trim().length > 0;
  const hasBody = finalBody && finalBody.trim().length > 0;

  if (!hasTitle && !hasBody) {
    errors.push(
      createError(
        'content',
        'Update would leave container without content (no title or body)',
        'MISSING_CONTENT'
      )
    );
  }

  return createValidationResult(errors);
}

/**
 * Validates that a container can be set as a parent.
 * Prevents cycles in the container hierarchy.
 *
 * Invariant: No cycles in parentContainerId relationships.
 *
 * @param containerId - The container being updated
 * @param newParentId - The proposed parent
 * @param getAllContainers - Function to fetch all containers (for cycle detection)
 */
export function validateContainerNesting(
  containerId: string,
  newParentId: string | null,
  containerHierarchy: Map<string, string | null>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Cannot set self as parent
  if (newParentId && containerId === newParentId) {
    errors.push(
      createError(
        'parentContainerId',
        'Container cannot be its own parent',
        'SELF_PARENT'
      )
    );
    return createValidationResult(errors);
  }

  // If no parent, no issue
  if (!newParentId) {
    return createValidationResult(errors);
  }

  // Check for cycles by walking up the parent chain
  const visited = new Set<string>();
  let currentId: string | null = newParentId;

  while (currentId) {
    // If we encounter the original container, we have a cycle
    if (currentId === containerId) {
      errors.push(
        createError(
          'parentContainerId',
          'Setting this parent would create a cycle in the container hierarchy',
          'NESTING_CYCLE'
        )
      );
      break;
    }

    // Prevent infinite loops if data is corrupt
    if (visited.has(currentId)) {
      errors.push(
        createError(
          'parentContainerId',
          'Cycle detected in existing container hierarchy',
          'EXISTING_CYCLE'
        )
      );
      break;
    }

    visited.add(currentId);
    currentId = containerHierarchy.get(currentId) ?? null;
  }

  return createValidationResult(errors);
}

/**
 * Validates that a ghost container is not being modified.
 *
 * Invariant: isGhost = true → container is read-only
 */
export function validateGhostContainerImmutability(
  container: MindMeshContainer,
  operation: 'update' | 'delete'
): ValidationResult {
  const errors: ValidationError[] = [];

  if (container.isGhost) {
    errors.push(
      createError(
        'isGhost',
        `Cannot ${operation} ghost container - ghost containers are read-only`,
        'GHOST_IMMUTABLE'
      )
    );
  }

  return createValidationResult(errors);
}

// ============================================================================
// REFERENCE VALIDATION
// ============================================================================

/**
 * Validates container reference creation.
 *
 * Invariants enforced:
 * - Cannot reference the same entity twice
 * - Only one primary reference allowed
 * - References are non-authoritative
 */
export function validateContainerReferences(
  input: CreateMindMeshContainerReferenceInput,
  existingReferences: MindMeshContainerReference[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for duplicate entity reference
  const duplicateRef = existingReferences.find(
    (ref) =>
      ref.entityType === input.entityType &&
      ref.entityId === input.entityId
  );

  if (duplicateRef) {
    errors.push(
      createError(
        'entityId',
        `Container already references ${input.entityType} with ID ${input.entityId}`,
        'DUPLICATE_REFERENCE'
      )
    );
  }

  // Check primary reference constraint
  if (input.isPrimary) {
    const existingPrimary = existingReferences.find((ref) => ref.isPrimary);
    if (existingPrimary) {
      errors.push(
        createError(
          'isPrimary',
          'Container already has a primary reference - only one primary allowed',
          'MULTIPLE_PRIMARY'
        )
      );
    }
  }

  // Validate entity ID is not empty
  if (!input.entityId || input.entityId.trim().length === 0) {
    errors.push(
      createError('entityId', 'Entity ID cannot be empty', 'EMPTY_ENTITY_ID')
    );
  }

  return createValidationResult(errors);
}

/**
 * Validates that a reference update maintains exactly-one-primary invariant.
 *
 * Invariant: If any references exist, exactly one must be primary.
 */
export function validatePrimaryReferenceUpdate(
  referenceId: string,
  newIsPrimary: boolean,
  existingReferences: MindMeshContainerReference[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // If setting to non-primary, check that another primary exists
  if (!newIsPrimary) {
    const otherPrimary = existingReferences.find(
      (ref) => ref.id !== referenceId && ref.isPrimary
    );

    if (!otherPrimary && existingReferences.length > 0) {
      errors.push(
        createError(
          'isPrimary',
          'Cannot unset primary reference - at least one reference must be primary',
          'NO_PRIMARY_REFERENCE'
        )
      );
    }
  }

  return createValidationResult(errors);
}

/**
 * Validates reference deletion.
 * If deleting the primary reference, ensure another reference exists to become primary.
 *
 * Invariant: If references exist, exactly one must be primary.
 */
export function validateReferenceDeletion(
  referenceToDelete: MindMeshContainerReference,
  remainingReferences: MindMeshContainerReference[]
): ValidationResult {
  const errors: ValidationError[] = [];

  // If deleting primary and others remain, must designate a new primary
  if (referenceToDelete.isPrimary && remainingReferences.length > 0) {
    const hasPrimary = remainingReferences.some((ref) => ref.isPrimary);
    if (!hasPrimary) {
      errors.push(
        createError(
          'isPrimary',
          'Cannot delete primary reference without designating a new primary',
          'NO_REMAINING_PRIMARY'
        )
      );
    }
  }

  return createValidationResult(errors);
}

// ============================================================================
// PORT VALIDATION
// ============================================================================

/**
 * Validates port creation.
 *
 * Invariants enforced:
 * - Port must belong to a container
 * - Port type must be valid
 * - Ports are owned by containers (no orphans)
 */
export function validatePortCreation(
  input: CreateMindMeshPortInput,
  containerExists: boolean,
  containerWorkspaceId: string
): ValidationResult {
  const errors: ValidationError[] = [];

  // Container must exist
  if (!containerExists) {
    errors.push(
      createError(
        'containerId',
        'Port must belong to an existing container',
        'CONTAINER_NOT_FOUND'
      )
    );
  }

  // Port type must be valid
  const validPortTypes: PortType[] = ['free', 'input', 'output'];
  if (!validPortTypes.includes(input.portType)) {
    errors.push(
      createError(
        'portType',
        `Invalid port type: ${input.portType}. Must be one of: ${validPortTypes.join(', ')}`,
        'INVALID_PORT_TYPE'
      )
    );
  }

  // Label validation (optional but if provided, must not be empty)
  if (input.label !== undefined && input.label !== null && input.label.trim().length === 0) {
    errors.push(
      createError('label', 'Port label cannot be empty string', 'EMPTY_LABEL')
    );
  }

  return createValidationResult(errors);
}

// ============================================================================
// NODE VALIDATION
// ============================================================================

/**
 * Validates node creation.
 *
 * Invariants enforced:
 * - Must connect two valid ports
 * - Ports must be in the same workspace
 * - Cannot connect a port to itself
 * - Nodes hold NO semantic meaning (enforced by schema)
 */
export function validateNodeCreation(
  input: CreateMindMeshNodeInput,
  sourcePort: MindMeshPort | null,
  targetPort: MindMeshPort | null,
  sourceContainer: MindMeshContainer | null,
  targetContainer: MindMeshContainer | null
): ValidationResult {
  const errors: ValidationError[] = [];

  // Ports must exist
  if (!sourcePort) {
    errors.push(
      createError(
        'sourcePortId',
        'Source port does not exist',
        'SOURCE_PORT_NOT_FOUND'
      )
    );
  }

  if (!targetPort) {
    errors.push(
      createError(
        'targetPortId',
        'Target port does not exist',
        'TARGET_PORT_NOT_FOUND'
      )
    );
  }

  // Cannot connect same port to itself
  if (input.sourcePortId === input.targetPortId) {
    errors.push(
      createError(
        'targetPortId',
        'Cannot connect a port to itself',
        'SELF_CONNECTION'
      )
    );
    return createValidationResult(errors);
  }

  // Containers must exist
  if (!sourceContainer) {
    errors.push(
      createError(
        'sourcePortId',
        'Source port container does not exist',
        'SOURCE_CONTAINER_NOT_FOUND'
      )
    );
  }

  if (!targetContainer) {
    errors.push(
      createError(
        'targetPortId',
        'Target port container does not exist',
        'TARGET_CONTAINER_NOT_FOUND'
      )
    );
  }

  // Both containers must be in the same workspace
  if (
    sourceContainer &&
    targetContainer &&
    sourceContainer.workspaceId !== targetContainer.workspaceId
  ) {
    errors.push(
      createError(
        'workspaceId',
        'Node ports must belong to containers in the same workspace',
        'WORKSPACE_MISMATCH'
      )
    );
  }

  // Node workspace must match container workspace
  if (
    sourceContainer &&
    input.workspaceId !== sourceContainer.workspaceId
  ) {
    errors.push(
      createError(
        'workspaceId',
        'Node workspace must match container workspace',
        'NODE_WORKSPACE_MISMATCH'
      )
    );
  }

  return createValidationResult(errors);
}

/**
 * Validates that a node does not store semantic content.
 * This is a defensive check - the schema prevents this, but we validate explicitly.
 *
 * Invariant: Nodes hold relationships only, never content.
 */
export function validateNodeHasNoContent(input: CreateMindMeshNodeInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Check metadata for forbidden keys that would indicate semantic storage
  if (input.metadata) {
    const forbiddenKeys = ['title', 'body', 'content', 'description', 'text'];
    const foundForbidden = forbiddenKeys.filter((key) => key in input.metadata);

    if (foundForbidden.length > 0) {
      errors.push(
        createError(
          'metadata',
          `Node metadata contains forbidden semantic keys: ${foundForbidden.join(', ')}. Nodes must not store content.`,
          'NODE_SEMANTIC_CONTENT'
        )
      );
    }
  }

  return createValidationResult(errors);
}

// ============================================================================
// WORKSPACE LOCK VALIDATION
// ============================================================================

/**
 * Validates workspace lock acquisition.
 *
 * Invariants enforced:
 * - Only one lock per workspace
 * - Lock must have valid expiry
 * - Only lock holder may perform writes
 */
export function validateLockAcquisition(
  workspaceId: string,
  userId: string,
  existingLock: MindMeshCanvasLock | null,
  durationSeconds: number = 300
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if lock already exists and is not expired
  if (existingLock) {
    const now = new Date();
    const expiresAt = new Date(existingLock.expiresAt);

    if (expiresAt > now) {
      // Lock is still valid
      if (existingLock.userId !== userId) {
        errors.push(
          createError(
            'workspaceId',
            `Workspace is locked by another user (expires at ${expiresAt.toISOString()})`,
            'WORKSPACE_LOCKED'
          )
        );
      }
      // If same user, this is a lock renewal - allowed
    }
  }

  // Validate duration
  if (durationSeconds <= 0) {
    errors.push(
      createError(
        'durationSeconds',
        'Lock duration must be positive',
        'INVALID_DURATION'
      )
    );
  }

  if (durationSeconds > 3600) {
    errors.push(
      createError(
        'durationSeconds',
        'Lock duration cannot exceed 1 hour',
        'DURATION_TOO_LONG'
      )
    );
  }

  return createValidationResult(errors);
}

/**
 * Validates that a user can perform a write operation.
 *
 * Invariant: Only lock holder may perform writes.
 */
export function validateWritePermission(
  workspaceId: string,
  userId: string,
  currentLock: MindMeshCanvasLock | null
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!currentLock) {
    errors.push(
      createError(
        'workspaceId',
        'Workspace has no active lock - acquire lock before writing',
        'NO_ACTIVE_LOCK'
      )
    );
    return createValidationResult(errors);
  }

  // Check if lock is expired
  const now = new Date();
  const expiresAt = new Date(currentLock.expiresAt);

  if (expiresAt <= now) {
    errors.push(
      createError(
        'workspaceId',
        'Workspace lock has expired - acquire new lock before writing',
        'LOCK_EXPIRED'
      )
    );
    return createValidationResult(errors);
  }

  // Check if user is lock holder
  if (currentLock.userId !== userId) {
    errors.push(
      createError(
        'workspaceId',
        'User does not hold workspace lock - only lock holder can write',
        'NOT_LOCK_HOLDER'
      )
    );
  }

  return createValidationResult(errors);
}

// ============================================================================
// ORPHAN DETECTION
// ============================================================================

/**
 * Validates that deleting a container will not orphan children unexpectedly.
 * This is informational - children will have parentContainerId set to null (SET NULL).
 *
 * This is NOT an error, but services may want to warn users.
 */
export function detectOrphanedChildren(
  containerId: string,
  childContainers: MindMeshContainer[]
): { willOrphan: boolean; orphanedCount: number; orphanedIds: string[] } {
  const orphaned = childContainers.filter(
    (child) => child.parentContainerId === containerId
  );

  return {
    willOrphan: orphaned.length > 0,
    orphanedCount: orphaned.length,
    orphanedIds: orphaned.map((c) => c.id),
  };
}

/**
 * Validates that deleting a container will not orphan ports/references.
 * This is guaranteed by CASCADE - but we provide explicit validation.
 *
 * CASCADE ensures no orphans, but services may want to warn users about
 * the extent of deletion.
 */
export function detectCascadeDeletion(
  containerId: string,
  ports: MindMeshPort[],
  references: MindMeshContainerReference[],
  nodes: MindMeshNode[]
): {
  portsToDelete: number;
  referencesToDelete: number;
  nodesToDelete: number;
} {
  const portIds = new Set(ports.filter((p) => p.containerId === containerId).map((p) => p.id));
  const affectedNodes = nodes.filter(
    (n) => portIds.has(n.sourcePortId) || portIds.has(n.targetPortId)
  );

  return {
    portsToDelete: portIds.size,
    referencesToDelete: references.filter((r) => r.containerId === containerId).length,
    nodesToDelete: affectedNodes.length,
  };
}

// ============================================================================
// GUARDRAILS AUTHORITY VALIDATION
// ============================================================================

/**
 * Validates that Mind Mesh operations do not claim authority over Guardrails.
 *
 * Invariant: References are non-authoritative. Mind Mesh never mutates Guardrails.
 *
 * This is a defensive check that services must respect:
 * - Deleting a reference MUST NOT delete the Guardrails entity
 * - Updating a container MUST NOT update the Guardrails entity
 * - Ghost containers mirror Guardrails but do not control it
 */
export function validateNoAuthorityLeakage(
  operation: 'delete_reference' | 'delete_container' | 'update_container'
): ValidationResult {
  // This is a reminder/assertion - not a runtime check
  // Services must implement this rule in their logic

  // If we ever detect code trying to mutate Guardrails from Mind Mesh,
  // this is where we'd catch it. For now, this is a no-op validator
  // that serves as documentation.

  return createValidationResult([]);
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validates multiple containers at once.
 * Useful for bulk operations.
 */
export function validateContainerBatch(
  inputs: CreateMindMeshContainerInput[]
): Map<number, ValidationResult> {
  const results = new Map<number, ValidationResult>();

  inputs.forEach((input, index) => {
    results.set(index, validateContainerInput(input));
  });

  return results;
}

/**
 * Aggregates validation results.
 * Returns overall validity and all errors.
 */
export function aggregateValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return createValidationResult(allErrors);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for container with content.
 * Ensures container has at least title or body.
 */
export function hasContent(
  container: MindMeshContainer | CreateMindMeshContainerInput
): boolean {
  const title = 'title' in container ? container.title : null;
  const body = 'body' in container ? container.body : null;

  const hasTitle = title && title.trim().length > 0;
  const hasBody = body && body.trim().length > 0;

  return hasTitle || hasBody;
}

/**
 * Type guard for ghost container.
 */
export function isGhostContainer(container: MindMeshContainer): boolean {
  return container.isGhost === true;
}

/**
 * Type guard for primary reference.
 */
export function isPrimaryReference(reference: MindMeshContainerReference): boolean {
  return reference.isPrimary === true;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Builds a parent-child hierarchy map for cycle detection.
 * Maps containerId -> parentContainerId
 */
export function buildContainerHierarchy(
  containers: MindMeshContainer[]
): Map<string, string | null> {
  const hierarchy = new Map<string, string | null>();

  for (const container of containers) {
    hierarchy.set(container.id, container.parentContainerId);
  }

  return hierarchy;
}

/**
 * Computes all ancestors of a container.
 * Returns array of ancestor IDs in order (immediate parent first).
 */
export function getContainerAncestors(
  containerId: string,
  hierarchy: Map<string, string | null>
): string[] {
  const ancestors: string[] = [];
  let currentId: string | null = hierarchy.get(containerId) ?? null;

  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // Cycle detected - break to avoid infinite loop
      break;
    }

    visited.add(currentId);
    ancestors.push(currentId);
    currentId = hierarchy.get(currentId) ?? null;
  }

  return ancestors;
}

/**
 * Computes all descendants of a container.
 * Returns array of descendant IDs (breadth-first order).
 */
export function getContainerDescendants(
  containerId: string,
  containers: MindMeshContainer[]
): string[] {
  const descendants: string[] = [];
  const queue: string[] = [containerId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    const children = containers.filter((c) => c.parentContainerId === currentId);

    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

/**
 * Checks if a lock is expired.
 */
export function isLockExpired(lock: MindMeshCanvasLock): boolean {
  const now = new Date();
  const expiresAt = new Date(lock.expiresAt);
  return expiresAt <= now;
}

/**
 * Checks if a user holds a specific lock.
 */
export function isLockHolder(
  lock: MindMeshCanvasLock | null,
  userId: string
): boolean {
  if (!lock) return false;
  if (isLockExpired(lock)) return false;
  return lock.userId === userId;
}
