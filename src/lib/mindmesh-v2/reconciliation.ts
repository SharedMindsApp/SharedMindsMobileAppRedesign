/**
 * Mind Mesh V2 Guardrails Reconciliation Service
 *
 * Provides idempotent reconciliation between Guardrails entities and Mind Mesh containers.
 *
 * CRITICAL INVARIANTS:
 * - One Guardrails entity = exactly one Mind Mesh container
 * - Mapping defined by mindmesh_container_references table (source of truth)
 * - Duplicate containers = critical error (fail loudly, never hide)
 * - Reconciliation is idempotent (safe to run multiple times)
 *
 * WHY THIS EXISTS:
 * - Ghost materialization must never create duplicates
 * - Refreshing the page must never create new containers
 * - References table is authoritative, NOT container.metadata
 * - System must detect and report violations explicitly
 *
 * USAGE:
 * ```typescript
 * const reconciler = await buildReconciliationMap(workspaceId, references);
 * const result = reconciler.checkEntity('track', trackId);
 * if (result.exists) {
 *   // Container already exists, skip creation
 * } else {
 *   // Safe to create ghost container
 * }
 * ```
 */

import type {
  MindMeshContainerReference,
  GuardrailsEntityType,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entity key for lookup (entityType:entityId)
 */
type EntityKey = string;

/**
 * Reconciliation result for a single entity
 */
export interface ReconciliationCheckResult {
  exists: boolean;
  containerId?: string;
  isDuplicate: boolean;
  duplicateContainerIds?: string[];
}

/**
 * Diagnostic information about duplicates
 */
export interface DuplicateDiagnostic {
  entityType: GuardrailsEntityType;
  entityId: string;
  containerIds: string[];
  workspaceId: string;
  detectedAt: string;
}

/**
 * Reconciliation map for efficient lookups
 */
export interface ReconciliationMap {
  /**
   * Checks if a Guardrails entity already has a Mind Mesh container
   */
  checkEntity: (
    entityType: GuardrailsEntityType,
    entityId: string
  ) => ReconciliationCheckResult;

  /**
   * Gets all containers mapped to Guardrails entities
   */
  getAllMappedContainers: () => string[];

  /**
   * Gets all detected duplicates
   */
  getDuplicates: () => DuplicateDiagnostic[];

  /**
   * Total number of mapped entities
   */
  size: number;

  /**
   * Whether any duplicates were detected
   */
  hasDuplicates: boolean;
}

// ============================================================================
// RECONCILIATION MAP BUILDER
// ============================================================================

/**
 * Builds an in-memory reconciliation map from container references.
 *
 * This map provides O(1) lookups to check if a Guardrails entity
 * already has a Mind Mesh container.
 *
 * INVARIANT ENFORCEMENT:
 * - Detects duplicate containers (multiple containers per entity)
 * - Returns diagnostic information for debugging
 * - Never silently ignores duplicates
 *
 * @param workspaceId - Workspace ID for diagnostics
 * @param references - All container references in workspace
 * @returns Reconciliation map with duplicate detection
 */
export function buildReconciliationMap(
  workspaceId: string,
  references: MindMeshContainerReference[]
): ReconciliationMap {
  // Map: entityKey → containerId[]
  // Using array to detect duplicates
  const entityMap = new Map<EntityKey, string[]>();

  // Build the map
  for (const ref of references) {
    const key = makeEntityKey(ref.entity_type, ref.entity_id);
    const existing = entityMap.get(key) || [];
    existing.push(ref.container_id);
    entityMap.set(key, existing);
  }

  // Detect duplicates
  const duplicates: DuplicateDiagnostic[] = [];
  const timestamp = new Date().toISOString();

  for (const [key, containerIds] of entityMap.entries()) {
    if (containerIds.length > 1) {
      const [entityType, entityId] = key.split(':') as [GuardrailsEntityType, string];
      duplicates.push({
        entityType,
        entityId,
        containerIds,
        workspaceId,
        detectedAt: timestamp,
      });
    }
  }

  // Return reconciliation map with lookup methods
  return {
    checkEntity: (entityType: GuardrailsEntityType, entityId: string): ReconciliationCheckResult => {
      const key = makeEntityKey(entityType, entityId);
      const containerIds = entityMap.get(key);

      if (!containerIds || containerIds.length === 0) {
        return {
          exists: false,
          isDuplicate: false,
        };
      }

      if (containerIds.length === 1) {
        return {
          exists: true,
          containerId: containerIds[0],
          isDuplicate: false,
        };
      }

      // Duplicate detected
      return {
        exists: true,
        containerId: containerIds[0], // Return first for recovery, but flag as duplicate
        isDuplicate: true,
        duplicateContainerIds: containerIds,
      };
    },

    getAllMappedContainers: (): string[] => {
      const containerIds = new Set<string>();
      for (const ids of entityMap.values()) {
        for (const id of ids) {
          containerIds.add(id);
        }
      }
      return Array.from(containerIds);
    },

    getDuplicates: (): DuplicateDiagnostic[] => {
      return [...duplicates];
    },

    size: entityMap.size,
    hasDuplicates: duplicates.length > 0,
  };
}

/**
 * Creates a canonical entity key for lookups
 */
function makeEntityKey(entityType: GuardrailsEntityType, entityId: string): EntityKey {
  return `${entityType}:${entityId}`;
}

// ============================================================================
// DUPLICATE DETECTION & DIAGNOSTICS
// ============================================================================

/**
 * Checks for duplicate containers and returns diagnostic report.
 *
 * USE THIS BEFORE GHOST MATERIALIZATION.
 * If duplicates exist, the system is in an inconsistent state.
 *
 * POLICY:
 * - Duplicates = CRITICAL ERROR (fail loudly)
 * - Never auto-merge or auto-delete
 * - Log diagnostics for manual resolution
 * - System must be corrected before proceeding
 *
 * @param reconciliationMap - Built reconciliation map
 * @returns Duplicate check result with diagnostics
 */
export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: DuplicateDiagnostic[];
  errorMessage: string | null;
}

export function checkForDuplicates(
  reconciliationMap: ReconciliationMap
): DuplicateCheckResult {
  const duplicates = reconciliationMap.getDuplicates();

  if (duplicates.length === 0) {
    return {
      hasDuplicates: false,
      duplicates: [],
      errorMessage: null,
    };
  }

  // Build error message
  const lines = ['CRITICAL: Duplicate containers detected (one-to-one mapping violated)'];
  lines.push('');
  lines.push('Guardrails Entity → Container IDs:');
  for (const dup of duplicates) {
    lines.push(`  ${dup.entityType}:${dup.entityId} → ${dup.containerIds.join(', ')}`);
  }
  lines.push('');
  lines.push('Action required: Manual cleanup needed before ghost materialization');
  lines.push('Workspace ID: ' + duplicates[0].workspaceId);

  const errorMessage = lines.join('\n');

  return {
    hasDuplicates: true,
    duplicates,
    errorMessage,
  };
}

/**
 * Logs duplicate diagnostic to console for debugging.
 * Called in development to surface issues immediately.
 */
export function logDuplicateDiagnostic(diagnostic: DuplicateDiagnostic): void {
  console.error('[Mind Mesh Reconciliation] DUPLICATE DETECTED', {
    entityType: diagnostic.entityType,
    entityId: diagnostic.entityId,
    containerCount: diagnostic.containerIds.length,
    containerIds: diagnostic.containerIds,
    workspaceId: diagnostic.workspaceId,
    detectedAt: diagnostic.detectedAt,
  });
}

/**
 * Logs all duplicates from reconciliation map.
 */
export function logAllDuplicates(reconciliationMap: ReconciliationMap): void {
  const duplicates = reconciliationMap.getDuplicates();
  if (duplicates.length === 0) return;

  console.error(`[Mind Mesh Reconciliation] Found ${duplicates.length} duplicate(s)`);
  for (const dup of duplicates) {
    logDuplicateDiagnostic(dup);
  }
}

// ============================================================================
// RECONCILIATION-BASED PLANNING
// ============================================================================

/**
 * Plans ghost container creation using reconciliation-based logic.
 *
 * IDEMPOTENT: Running multiple times produces same result.
 * SAFE: Never creates duplicates.
 * EXPLICIT: Skips if container already exists.
 *
 * Process:
 * 1. Build reconciliation map from existing references
 * 2. Check for duplicates → fail if found
 * 3. For each Guardrails entity:
 *    - If container exists → skip
 *    - If container missing → plan creation
 * 4. Return plan (never execute here)
 *
 * @param entities - Guardrails entities to materialize
 * @param references - Existing container references
 * @param workspaceId - Target workspace
 * @returns Result with containers to create
 */
export interface ReconciliationPlanResult {
  toCreate: Array<{
    entityType: GuardrailsEntityType;
    entityId: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }>;
  skipped: Array<{
    entityType: GuardrailsEntityType;
    entityId: string;
    reason: string;
    existingContainerId: string;
  }>;
  errors: string[];
  hasDuplicates: boolean;
  duplicates: DuplicateDiagnostic[];
}

export function planReconciliation(
  entities: Array<{
    type: GuardrailsEntityType;
    id: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }>,
  references: MindMeshContainerReference[],
  workspaceId: string
): ReconciliationPlanResult {
  const errors: string[] = [];
  const toCreate: ReconciliationPlanResult['toCreate'] = [];
  const skipped: ReconciliationPlanResult['skipped'] = [];

  // Build reconciliation map
  const reconciliationMap = buildReconciliationMap(workspaceId, references);

  // Check for duplicates FIRST
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    errors.push(duplicateCheck.errorMessage!);
    logAllDuplicates(reconciliationMap);

    return {
      toCreate: [],
      skipped: [],
      errors,
      hasDuplicates: true,
      duplicates: duplicateCheck.duplicates,
    };
  }

  // Process each entity
  for (const entity of entities) {
    const checkResult = reconciliationMap.checkEntity(entity.type, entity.id);

    if (checkResult.exists) {
      // Container already exists, skip
      skipped.push({
        entityType: entity.type,
        entityId: entity.id,
        reason: 'Container already exists',
        existingContainerId: checkResult.containerId!,
      });
    } else {
      // No container exists, safe to create
      toCreate.push({
        entityType: entity.type,
        entityId: entity.id,
        title: entity.title,
        description: entity.description,
        metadata: entity.metadata,
      });
    }
  }

  return {
    toCreate,
    skipped,
    errors: [],
    hasDuplicates: false,
    duplicates: [],
  };
}
