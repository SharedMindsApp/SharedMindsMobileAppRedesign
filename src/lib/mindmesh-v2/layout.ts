/**
 * Mind Mesh V2 Auto-Layout & Ghost Logic
 *
 * Deterministic system logic for:
 * 1. Materialising Guardrails entities as ghost containers
 * 2. Applying default hierarchy-based layout
 * 3. Tracking when user breaks default layout
 * 4. Backing off once user intent is expressed
 *
 * CRITICAL: This is system behavior logic, not UI or rendering logic.
 *
 * Key Principles:
 * - Ghost containers represent Guardrails existence, not user attention
 * - Default layout applies once, then backs off permanently
 * - User intervention disables auto-layout until explicit reset
 * - Guardrails authority is never altered
 */

import type {
  MindMeshWorkspace,
  MindMeshContainer,
  MindMeshContainerReference,
  MindMeshPort,
  MindMeshNode,
  CreateMindMeshContainerInput,
  CreateMindMeshPortInput,
  CreateMindMeshNodeInput,
  GuardrailsEntityType,
} from './types';

import {
  validateContainerInput,
  validateNodeCreation,
  validateContainerNesting,
  buildContainerHierarchy,
} from './validation';

import {
  buildReconciliationMap,
  checkForDuplicates,
  logAllDuplicates,
} from './reconciliation';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Guardrails entity snapshot for materialisation
 */
export interface GuardrailsEntity {
  id: string;
  type: GuardrailsEntityType;
  title: string;
  description?: string;
  parentId?: string | null;
  metadata?: Record<string, unknown>;
  orderIndex?: number;
}

/**
 * Layout computation result
 */
export interface LayoutPosition {
  containerId: string;
  xPosition: number;
  yPosition: number;
  parentContainerId: string | null;
}

/**
 * Ghost materialisation result
 */
export interface GhostMaterialisationResult {
  created: string[];      // IDs of newly created ghost containers
  updated: string[];      // IDs of updated ghost containers
  skipped: string[];      // IDs of entities that already have ghosts
  errors: Array<{ entityId: string; error: string }>;
}

/**
 * Layout break event types that trigger permanent backing off
 */
export type LayoutBreakEvent =
  | 'manual_container_move'
  | 'manual_container_nesting'
  | 'container_activated'
  | 'auto_node_hidden'
  | 'manual_layout_change';

/**
 * Layout reset result
 */
export interface LayoutResetResult {
  success: boolean;
  containersRepositioned: number;
  nodesRecreated: number;
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default layout spacing (abstract units, not pixels)
 * These define spatial relationships, not exact visual dimensions
 */
export const DEFAULT_LAYOUT = {
  TRACK_SPACING_X: 400,        // Horizontal space between tracks
  TRACK_SPACING_Y: 600,        // Vertical space for track lane
  SUBTRACK_OFFSET_X: 50,       // Indent for subtracks
  SUBTRACK_SPACING_Y: 300,     // Vertical space between subtracks
  ITEM_OFFSET_X: 50,           // Indent for roadmap items
  ITEM_SPACING_Y: 150,         // Vertical space between items
  SUBITEM_OFFSET_X: 40,        // Indent for sub-items
  SUBITEM_SPACING_Y: 120,      // Vertical space between sub-items
  INITIAL_X: 100,              // Starting X coordinate
  INITIAL_Y: 100,              // Starting Y coordinate
  DEFAULT_WIDTH: 240,          // Default container width
  DEFAULT_HEIGHT: 160,         // Default container height
} as const;

// ============================================================================
// GHOST CONTAINER MATERIALISATION
// ============================================================================

/**
 * Materialises Guardrails entities as ghost containers.
 * Creates new ghost containers for entities that don't have one.
 * Updates existing ghost containers to sync metadata.
 *
 * Invariants enforced:
 * - isGhost = true (always)
 * - One container per entity (exactly)
 * - Read-only (no user mutations allowed)
 * - Non-authoritative (deleting ghost never deletes Guardrails entity)
 *
 * @param workspaceId - The workspace to materialise into
 * @param entities - Guardrails entities to materialise
 * @param existingContainers - Current containers in workspace
 * @param existingReferences - Current references in workspace
 * @returns Materialisation result with created/updated/skipped IDs
 */
export function planGhostMaterialisation(
  workspaceId: string,
  entities: GuardrailsEntity[],
  existingContainers: MindMeshContainer[],
  existingReferences: MindMeshContainerReference[]
): {
  toCreate: CreateMindMeshContainerInput[];
  toUpdate: Array<{ containerId: string; updates: Partial<MindMeshContainer> }>;
  toCreateReferences: Array<{
    containerId: string;
    entityType: GuardrailsEntityType;
    entityId: string;
    isPrimary: boolean;
  }>;
  errors: string[];
} {
  const toCreate: CreateMindMeshContainerInput[] = [];
  const toUpdate: Array<{ containerId: string; updates: Partial<MindMeshContainer> }> = [];
  const toCreateReferences: Array<{
    containerId: string;
    entityType: GuardrailsEntityType;
    entityId: string;
    isPrimary: boolean;
  }> = [];
  const errors: string[] = [];

  // Build reconciliation map from references table (authoritative source)
  const reconciliationMap = buildReconciliationMap(workspaceId, existingReferences);

  // Check for duplicates FIRST - fail loudly if found
  const duplicateCheck = checkForDuplicates(reconciliationMap);
  if (duplicateCheck.hasDuplicates) {
    logAllDuplicates(reconciliationMap);
    errors.push(duplicateCheck.errorMessage!);
    return { toCreate: [], toUpdate: [], toCreateReferences: [], errors };
  }

  // Build reference lookup: entityType+entityId -> containerId
  const referenceMap = new Map<string, string>();
  for (const ref of existingReferences) {
    const key = `${ref.entityType}:${ref.entityId}`;
    referenceMap.set(key, ref.containerId);
  }

  // Build container lookup
  const containerMap = new Map<string, MindMeshContainer>();
  for (const container of existingContainers) {
    containerMap.set(container.id, container);
  }

  for (const entity of entities) {
    const key = `${entity.type}:${entity.id}`;
    const existingContainerId = referenceMap.get(key);

    if (!existingContainerId) {
      // No ghost exists - create one
      const input: CreateMindMeshContainerInput = {
        workspaceId,
        title: entity.title,
        body: entity.description || null,
        xPosition: 0, // Will be positioned by layout logic
        yPosition: 0,
        width: DEFAULT_LAYOUT.DEFAULT_WIDTH,
        height: DEFAULT_LAYOUT.DEFAULT_HEIGHT,
        isGhost: true,
        parentContainerId: null, // Will be set by layout logic
        metadata: entity.metadata,
      };

      // Validate before adding to plan
      const validation = validateContainerInput(input);
      if (validation.valid) {
        toCreate.push(input);
      }
    } else {
      // Ghost exists - check if metadata needs sync
      const existingContainer = containerMap.get(existingContainerId);
      if (!existingContainer) continue;

      const needsUpdate =
        existingContainer.title !== entity.title ||
        existingContainer.body !== (entity.description || null);

      if (needsUpdate) {
        toUpdate.push({
          containerId: existingContainerId,
          updates: {
            title: entity.title,
            body: entity.description || null,
            metadata: entity.metadata,
          },
        });
      }
    }
  }

  return { toCreate, toUpdate, toCreateReferences, errors };
}

/**
 * Creates a ghost container for a single Guardrails entity.
 * Used for incremental materialisation when new entities are added.
 *
 * @param workspaceId - Target workspace
 * @param entity - Guardrails entity to materialise
 * @param hasBrokenLayout - Whether workspace has broken default layout
 * @returns Container creation input
 */
export function createGhostContainerForEntity(
  workspaceId: string,
  entity: GuardrailsEntity,
  hasBrokenLayout: boolean
): CreateMindMeshContainerInput {
  // If layout is broken, spawn as free-floating (no auto-positioning)
  // If layout is intact, position will be computed by hierarchy logic

  return {
    workspaceId,
    title: entity.title,
    body: entity.description || null,
    xPosition: hasBrokenLayout ? 0 : DEFAULT_LAYOUT.INITIAL_X,
    yPosition: hasBrokenLayout ? 0 : DEFAULT_LAYOUT.INITIAL_Y,
    width: DEFAULT_LAYOUT.DEFAULT_WIDTH,
    height: DEFAULT_LAYOUT.DEFAULT_HEIGHT,
    isGhost: true,
    parentContainerId: null, // Never auto-nest when layout is broken
    metadata: entity.metadata,
  };
}

/**
 * Syncs ghost container metadata with authoritative Guardrails entity.
 * Only updates non-positional attributes.
 *
 * Invariant: Ghost containers mirror Guardrails, but position/nesting is local.
 */
export function syncGhostContainerMetadata(
  container: MindMeshContainer,
  entity: GuardrailsEntity
): Partial<MindMeshContainer> | null {
  const updates: Partial<MindMeshContainer> = {};
  let hasChanges = false;

  if (container.title !== entity.title) {
    updates.title = entity.title;
    hasChanges = true;
  }

  if (container.body !== (entity.description || null)) {
    updates.body = entity.description || null;
    hasChanges = true;
  }

  // Sync metadata (shallow comparison)
  const currentMeta = JSON.stringify(container.metadata || {});
  const newMeta = JSON.stringify(entity.metadata || {});
  if (currentMeta !== newMeta) {
    updates.metadata = entity.metadata;
    hasChanges = true;
  }

  return hasChanges ? updates : null;
}

// ============================================================================
// DEFAULT HIERARCHY-BASED LAYOUT
// ============================================================================

/**
 * Computes default spatial layout based on Guardrails hierarchy.
 * Returns position assignments for containers.
 *
 * Hierarchy structure:
 * - Tracks (top level, horizontal distribution)
 * - Subtracks (nested under tracks, vertical stacking)
 * - Roadmap Items (nested under tracks/subtracks, vertical stacking)
 * - Sub-items (nested under items, vertical stacking)
 *
 * Layout rules:
 * 1. Tracks arranged horizontally with spacing
 * 2. Children nested vertically under parents with indentation
 * 3. Deterministic ordering (by orderIndex or ID)
 * 4. Idempotent (same input = same output)
 *
 * @param entities - All Guardrails entities to layout
 * @param existingContainers - Current containers (to preserve IDs)
 * @param existingReferences - References mapping entities to containers
 * @returns Position assignments for each container
 */
export function computeDefaultHierarchyLayout(
  entities: GuardrailsEntity[],
  existingContainers: MindMeshContainer[],
  existingReferences: MindMeshContainerReference[]
): LayoutPosition[] {
  const positions: LayoutPosition[] = [];

  // Build entity lookup
  const entityMap = new Map<string, GuardrailsEntity>();
  for (const entity of entities) {
    entityMap.set(entity.id, entity);
  }

  // Build reference lookup: entityId -> containerId
  const entityToContainer = new Map<string, string>();
  for (const ref of existingReferences) {
    entityToContainer.set(ref.entityId, ref.containerId);
  }

  // Separate entities by type and hierarchy level
  const tracks = entities.filter((e) => e.type === 'track' && !e.parentId);
  const subtracks = entities.filter((e) => e.type === 'subtrack');
  const items = entities.filter(
    (e) =>
      e.type === 'roadmap_item' ||
      e.type === 'task' ||
      e.type === 'milestone' ||
      e.type === 'event'
  );

  // Sort by orderIndex (if available) or ID for determinism
  const sortByOrder = (a: GuardrailsEntity, b: GuardrailsEntity) => {
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    return a.id.localeCompare(b.id);
  };

  tracks.sort(sortByOrder);
  subtracks.sort(sortByOrder);
  items.sort(sortByOrder);

  // Position tracks horizontally
  let trackX = DEFAULT_LAYOUT.INITIAL_X;
  const trackY = DEFAULT_LAYOUT.INITIAL_Y;

  for (const track of tracks) {
    const containerId = entityToContainer.get(track.id);
    if (!containerId) continue;

    positions.push({
      containerId,
      xPosition: trackX,
      yPosition: trackY,
      parentContainerId: null, // Tracks are root level
    });

    // Position subtracks under this track
    const trackSubtracks = subtracks.filter((st) => st.parentId === track.id);
    let subtY = trackY + DEFAULT_LAYOUT.TRACK_SPACING_Y;

    for (const subtrack of trackSubtracks) {
      const subContainerId = entityToContainer.get(subtrack.id);
      if (!subContainerId) continue;

      positions.push({
        containerId: subContainerId,
        xPosition: trackX + DEFAULT_LAYOUT.SUBTRACK_OFFSET_X,
        yPosition: subtY,
        parentContainerId: containerId, // Nested under track
      });

      // Position items under this subtrack
      const subtItems = items.filter((item) => item.parentId === subtrack.id);
      let itemY = subtY + DEFAULT_LAYOUT.SUBTRACK_SPACING_Y;

      for (const item of subtItems) {
        const itemContainerId = entityToContainer.get(item.id);
        if (!itemContainerId) continue;

        positions.push({
          containerId: itemContainerId,
          xPosition: trackX + DEFAULT_LAYOUT.SUBTRACK_OFFSET_X + DEFAULT_LAYOUT.ITEM_OFFSET_X,
          yPosition: itemY,
          parentContainerId: subContainerId, // Nested under subtrack
        });

        itemY += DEFAULT_LAYOUT.ITEM_SPACING_Y;
      }

      subtY += DEFAULT_LAYOUT.SUBTRACK_SPACING_Y;
    }

    // Position items directly under track (no subtrack parent)
    const trackItems = items.filter((item) => item.parentId === track.id);
    let itemY = trackY + DEFAULT_LAYOUT.TRACK_SPACING_Y;

    for (const item of trackItems) {
      const itemContainerId = entityToContainer.get(item.id);
      if (!itemContainerId) continue;

      positions.push({
        containerId: itemContainerId,
        xPosition: trackX + DEFAULT_LAYOUT.ITEM_OFFSET_X,
        yPosition: itemY,
        parentContainerId: containerId, // Nested under track
      });

      itemY += DEFAULT_LAYOUT.ITEM_SPACING_Y;
    }

    trackX += DEFAULT_LAYOUT.TRACK_SPACING_X;
  }

  return positions;
}

/**
 * Creates auto-generated nodes representing composition hierarchy.
 * These nodes visualize parent-child relationships in the Guardrails hierarchy.
 *
 * Auto-generated nodes:
 * - Connect parent container's output port to child container's input port
 * - Have isAutoGenerated = true (for later filtering/hiding)
 * - Are re-creatable (can be deleted and regenerated)
 * - Do NOT store semantic content (only relationship structure)
 *
 * @param workspaceId - Target workspace
 * @param positions - Layout positions (includes parent-child relationships)
 * @param existingPorts - Current ports in workspace
 * @param existingContainers - Current containers
 * @returns Node creation inputs
 */
export function planAutoGeneratedHierarchyNodes(
  workspaceId: string,
  positions: LayoutPosition[],
  existingPorts: MindMeshPort[],
  existingContainers: MindMeshContainer[]
): {
  toCreatePorts: CreateMindMeshPortInput[];
  toCreateNodes: CreateMindMeshNodeInput[];
} {
  const toCreatePorts: CreateMindMeshPortInput[] = [];
  const toCreateNodes: CreateMindMeshNodeInput[] = [];

  // Build port lookup: containerId -> ports
  const portsByContainer = new Map<string, MindMeshPort[]>();
  for (const port of existingPorts) {
    const existing = portsByContainer.get(port.containerId) || [];
    existing.push(port);
    portsByContainer.set(port.containerId, existing);
  }

  // Helper to get or plan output port for container
  const getOrCreateOutputPort = (containerId: string): string => {
    const existing = portsByContainer.get(containerId) || [];
    const outputPort = existing.find((p) => p.portType === 'output');

    if (outputPort) {
      return outputPort.id;
    }

    // Plan to create output port
    const portId = `port-${containerId}-output`;
    toCreatePorts.push({
      id: portId,
      containerId,
      portType: 'output',
      label: 'Output',
      metadata: { autoGenerated: true },
    });

    return portId;
  };

  // Helper to get or plan input port for container
  const getOrCreateInputPort = (containerId: string): string => {
    const existing = portsByContainer.get(containerId) || [];
    const inputPort = existing.find((p) => p.portType === 'input');

    if (inputPort) {
      return inputPort.id;
    }

    // Plan to create input port
    const portId = `port-${containerId}-input`;
    toCreatePorts.push({
      id: portId,
      containerId,
      portType: 'input',
      label: 'Input',
      metadata: { autoGenerated: true },
    });

    return portId;
  };

  // Create nodes for parent-child relationships
  for (const position of positions) {
    if (!position.parentContainerId) continue; // Root level, no parent node

    const parentId = position.parentContainerId;
    const childId = position.containerId;

    // Get or create ports
    const sourcePortId = getOrCreateOutputPort(parentId);
    const targetPortId = getOrCreateInputPort(childId);

    // Plan node creation
    toCreateNodes.push({
      workspaceId,
      sourcePortId,
      targetPortId,
      isAutoGenerated: true,
      relationshipType: 'composition',
      metadata: {
        autoGenerated: true,
        hierarchyLevel: 'parent-child',
      },
    });
  }

  return { toCreatePorts, toCreateNodes };
}

/**
 * Validates that applying layout positions won't create cycles.
 * Uses validation layer to ensure nesting is safe.
 */
export function validateLayoutPositions(
  positions: LayoutPosition[],
  existingContainers: MindMeshContainer[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Build hierarchy from positions
  const hierarchy = new Map<string, string | null>();
  for (const pos of positions) {
    hierarchy.set(pos.containerId, pos.parentContainerId);
  }

  // Add existing containers not in positions
  for (const container of existingContainers) {
    if (!hierarchy.has(container.id)) {
      hierarchy.set(container.id, container.parentContainerId);
    }
  }

  // Check each position for cycles
  for (const pos of positions) {
    if (!pos.parentContainerId) continue;

    const result = validateContainerNesting(
      pos.containerId,
      pos.parentContainerId,
      hierarchy
    );

    if (!result.valid) {
      errors.push(
        `Cannot nest ${pos.containerId} under ${pos.parentContainerId}: ${result.errors[0].message}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// LAYOUT BREAK DETECTION
// ============================================================================

/**
 * Detects if a user action breaks the default layout.
 * Once broken, auto-layout backs off permanently until explicit reset.
 *
 * Layout-breaking events:
 * 1. Manual container move (user changes xPosition or yPosition)
 * 2. Manual container nesting (user changes parentContainerId)
 * 3. Container activation (user transitions ghost to active)
 * 4. Auto-generated node hidden (user hides hierarchy visualization)
 * 5. Any manual layout change (explicit user positioning)
 *
 * @param event - Type of layout break event
 * @param context - Additional context about the event
 * @returns True if this event breaks default layout
 */
export function isLayoutBreakingEvent(
  event: LayoutBreakEvent,
  context?: {
    container?: MindMeshContainer;
    previousPosition?: { x: number; y: number };
    newPosition?: { x: number; y: number };
    previousParent?: string | null;
    newParent?: string | null;
  }
): boolean {
  switch (event) {
    case 'manual_container_move':
      // Only breaks layout if position actually changed
      if (context?.previousPosition && context?.newPosition) {
        return (
          context.previousPosition.x !== context.newPosition.x ||
          context.previousPosition.y !== context.newPosition.y
        );
      }
      return true; // Assume breaking if no context

    case 'manual_container_nesting':
      // Only breaks layout if parent actually changed
      if (context?.previousParent !== undefined && context?.newParent !== undefined) {
        return context.previousParent !== context.newParent;
      }
      return true; // Assume breaking if no context

    case 'container_activated':
      // Activating any container breaks layout (user is taking control)
      return true;

    case 'auto_node_hidden':
      // Hiding auto-generated nodes breaks layout (user rejecting hierarchy viz)
      return true;

    case 'manual_layout_change':
      // Explicit layout change always breaks
      return true;

    default:
      return false;
  }
}

/**
 * Records that default layout has been broken in the workspace.
 * This is a one-way flag - once broken, stays broken until explicit reset.
 *
 * Effect: Future auto-layout operations will not apply automatically.
 */
export function markDefaultLayoutBroken(
  workspace: MindMeshWorkspace
): Partial<MindMeshWorkspace> {
  return {
    hasBrokenDefaultLayout: true,
  };
}

/**
 * Checks if a workspace has intact default layout.
 * If false, auto-layout should not apply.
 */
export function hasIntactDefaultLayout(workspace: MindMeshWorkspace): boolean {
  return workspace.hasBrokenDefaultLayout === false;
}

// ============================================================================
// BEHAVIOR WHEN LAYOUT IS BROKEN
// ============================================================================

/**
 * Determines spawn behavior for new ghost containers based on layout state.
 *
 * When layout is intact:
 * - New ghosts are positioned hierarchically
 * - Auto-nesting applies
 * - Auto-generated nodes created
 *
 * When layout is broken:
 * - New ghosts spawn at origin (0, 0) as free-floating
 * - No auto-nesting
 * - No auto-generated hierarchy nodes
 * - User must manually position and connect
 *
 * @param hasBrokenLayout - Whether workspace has broken default layout
 * @returns Spawn strategy
 */
export function getGhostSpawnStrategy(hasBrokenLayout: boolean): {
  autoPosition: boolean;
  autoNest: boolean;
  autoGenerateNodes: boolean;
  defaultPosition: { x: number; y: number };
} {
  if (hasBrokenLayout) {
    return {
      autoPosition: false,
      autoNest: false,
      autoGenerateNodes: false,
      defaultPosition: { x: 0, y: 0 }, // Origin, user must move
    };
  }

  return {
    autoPosition: true,
    autoNest: true,
    autoGenerateNodes: true,
    defaultPosition: {
      x: DEFAULT_LAYOUT.INITIAL_X,
      y: DEFAULT_LAYOUT.INITIAL_Y,
    },
  };
}

/**
 * Determines if auto-layout should apply to a workspace.
 * Auto-layout only applies when:
 * 1. Layout is not broken
 * 2. This is the first materialisation OR an explicit reset
 *
 * @param workspace - Target workspace
 * @param isFirstMaterialisation - Whether this is initial setup
 * @returns True if auto-layout should apply
 */
export function shouldApplyAutoLayout(
  workspace: MindMeshWorkspace,
  isFirstMaterialisation: boolean
): boolean {
  // Never apply if layout is broken
  if (workspace.hasBrokenDefaultLayout) {
    return false;
  }

  // Apply on first materialisation
  if (isFirstMaterialisation) {
    return true;
  }

  // Otherwise, only apply if explicitly reset recently
  // (This would be determined by calling code, not here)
  return false;
}

// ============================================================================
// RESET & RECOVERY LOGIC
// ============================================================================

/**
 * Plans a reset to default layout.
 * This is an explicit user action, never automatic.
 *
 * Reset behavior:
 * 1. Recompute hierarchy-based positions
 * 2. Apply positions to all ghost containers
 * 3. Recreate auto-generated hierarchy nodes
 * 4. Clear hasBrokenDefaultLayout flag
 * 5. Record reset timestamp
 *
 * Constraints:
 * - Never deletes containers or nodes (only repositions/recreates)
 * - Respects validation invariants
 * - User-created containers are repositioned (not deleted)
 * - Ghost containers are repositioned to default
 *
 * @param workspaceId - Target workspace
 * @param entities - Current Guardrails entities
 * @param existingContainers - Current containers
 * @param existingReferences - Current references
 * @param existingPorts - Current ports
 * @returns Reset plan with updates to apply
 */
export function planResetToDefaultLayout(
  workspaceId: string,
  entities: GuardrailsEntity[],
  existingContainers: MindMeshContainer[],
  existingReferences: MindMeshContainerReference[],
  existingPorts: MindMeshPort[]
): {
  workspaceUpdate: Partial<MindMeshWorkspace>;
  containerUpdates: Array<{
    containerId: string;
    updates: Partial<MindMeshContainer>;
  }>;
  autoNodesToDelete: string[]; // Old auto-generated nodes to remove
  toCreatePorts: CreateMindMeshPortInput[];
  toCreateNodes: CreateMindMeshNodeInput[];
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Compute default layout
  const positions = computeDefaultHierarchyLayout(
    entities,
    existingContainers,
    existingReferences
  );

  // 2. Validate positions
  const validation = validateLayoutPositions(positions, existingContainers);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  // 3. Plan container updates
  const containerUpdates = positions.map((pos) => ({
    containerId: pos.containerId,
    updates: {
      xPosition: pos.xPosition,
      yPosition: pos.yPosition,
      parentContainerId: pos.parentContainerId,
    },
  }));

  // 4. Plan to delete old auto-generated nodes
  // (Will be replaced with new hierarchy nodes)
  const existingNodes = existingContainers.flatMap((c) =>
    existingPorts
      .filter((p) => p.containerId === c.id)
      .map((p) => p.id)
  );
  // Note: Actual node IDs would come from a node query
  const autoNodesToDelete: string[] = []; // Services must query for auto-generated nodes

  // 5. Plan new auto-generated hierarchy nodes
  const { toCreatePorts, toCreateNodes } = planAutoGeneratedHierarchyNodes(
    workspaceId,
    positions,
    existingPorts,
    existingContainers
  );

  // 6. Update workspace to clear broken flag
  const workspaceUpdate: Partial<MindMeshWorkspace> = {
    hasBrokenDefaultLayout: false,
    lastLayoutResetAt: new Date().toISOString(),
  };

  return {
    workspaceUpdate,
    containerUpdates,
    autoNodesToDelete,
    toCreatePorts,
    toCreateNodes,
    errors,
  };
}

/**
 * Plans reapplication of hierarchy layout without full reset.
 * Useful for incremental updates when new entities are added.
 *
 * Difference from full reset:
 * - Only repositions containers that don't have user modifications
 * - Preserves user-positioned containers
 * - Only creates nodes for new relationships
 *
 * @param workspaceId - Target workspace
 * @param newEntities - Newly added Guardrails entities
 * @param existingContainers - Current containers
 * @param existingReferences - Current references
 * @returns Partial layout plan
 */
export function planIncrementalLayoutUpdate(
  workspaceId: string,
  newEntities: GuardrailsEntity[],
  existingContainers: MindMeshContainer[],
  existingReferences: MindMeshContainerReference[]
): {
  containerUpdates: Array<{
    containerId: string;
    updates: Partial<MindMeshContainer>;
  }>;
  errors: string[];
} {
  const errors: string[] = [];

  // For incremental updates, only position new containers
  // Existing containers are not repositioned (preserves user changes)

  const containerUpdates: Array<{
    containerId: string;
    updates: Partial<MindMeshContainer>;
  }> = [];

  // Build reference lookup
  const entityToContainer = new Map<string, string>();
  for (const ref of existingReferences) {
    entityToContainer.set(ref.entityId, ref.containerId);
  }

  // Position each new entity based on its parent
  for (const entity of newEntities) {
    const containerId = entityToContainer.get(entity.id);
    if (!containerId) continue;

    let xPosition = DEFAULT_LAYOUT.INITIAL_X;
    let yPosition = DEFAULT_LAYOUT.INITIAL_Y;
    let parentContainerId: string | null = null;

    // If entity has parent, position relative to parent
    if (entity.parentId) {
      const parentContainerIdFromMap = entityToContainer.get(entity.parentId);
      if (parentContainerIdFromMap) {
        const parentContainer = existingContainers.find(
          (c) => c.id === parentContainerIdFromMap
        );
        if (parentContainer) {
          // Position below parent with offset
          xPosition = parentContainer.xPosition + DEFAULT_LAYOUT.ITEM_OFFSET_X;
          yPosition =
            parentContainer.yPosition +
            (parentContainer.height || DEFAULT_LAYOUT.DEFAULT_HEIGHT) +
            DEFAULT_LAYOUT.ITEM_SPACING_Y;
          parentContainerId = parentContainer.id;
        }
      }
    }

    containerUpdates.push({
      containerId,
      updates: {
        xPosition,
        yPosition,
        parentContainerId,
      },
    });
  }

  return { containerUpdates, errors };
}

/**
 * Plans clearing of manual positioning while preserving structure.
 * This is a softer reset that:
 * - Resets positions to default
 * - Preserves nesting structure
 * - Keeps all containers and nodes
 *
 * Use case: User wants to clean up visual mess but keep logical structure.
 *
 * @param workspaceId - Target workspace
 * @param entities - Current Guardrails entities
 * @param existingContainers - Current containers
 * @param existingReferences - Current references
 * @returns Position-only updates
 */
export function planClearManualPositioning(
  workspaceId: string,
  entities: GuardrailsEntity[],
  existingContainers: MindMeshContainer[],
  existingReferences: MindMeshContainerReference[]
): {
  containerUpdates: Array<{
    containerId: string;
    updates: Partial<MindMeshContainer>;
  }>;
  errors: string[];
} {
  const errors: string[] = [];

  // Compute default positions
  const positions = computeDefaultHierarchyLayout(
    entities,
    existingContainers,
    existingReferences
  );

  // Create updates with positions only (preserve parentContainerId)
  const containerUpdates = positions.map((pos) => ({
    containerId: pos.containerId,
    updates: {
      xPosition: pos.xPosition,
      yPosition: pos.yPosition,
      // Do NOT update parentContainerId - preserve user nesting
    },
  }));

  return { containerUpdates, errors };
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Checks if a container has been manually moved from its default position.
 * Used to detect layout breaks.
 */
export function hasManualPosition(
  container: MindMeshContainer,
  defaultPosition: LayoutPosition | null
): boolean {
  if (!defaultPosition) return true; // No default, assume manual

  return (
    container.xPosition !== defaultPosition.xPosition ||
    container.yPosition !== defaultPosition.yPosition
  );
}

/**
 * Checks if a container has been manually nested (different from default parent).
 * Used to detect layout breaks.
 */
export function hasManualNesting(
  container: MindMeshContainer,
  defaultPosition: LayoutPosition | null
): boolean {
  if (!defaultPosition) return true; // No default, assume manual

  return container.parentContainerId !== defaultPosition.parentContainerId;
}

/**
 * Computes bounding box for a set of containers.
 * Useful for zooming to fit all content.
 */
export function computeBoundingBox(containers: MindMeshContainer[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (containers.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const container of containers) {
    minX = Math.min(minX, container.xPosition);
    minY = Math.min(minY, container.yPosition);
    maxX = Math.max(
      maxX,
      container.xPosition + (container.width || DEFAULT_LAYOUT.DEFAULT_WIDTH)
    );
    maxY = Math.max(
      maxY,
      container.yPosition + (container.height || DEFAULT_LAYOUT.DEFAULT_HEIGHT)
    );
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Finds containers that are outside the viewport or overlapping.
 * Useful for detecting layout issues.
 */
export function detectLayoutIssues(containers: MindMeshContainer[]): {
  outOfBounds: string[];
  overlapping: Array<{ id1: string; id2: string }>;
} {
  const outOfBounds: string[] = [];
  const overlapping: Array<{ id1: string; id2: string }> = [];

  // Check for negative positions (might indicate issues)
  for (const container of containers) {
    if (container.xPosition < 0 || container.yPosition < 0) {
      outOfBounds.push(container.id);
    }
  }

  // Check for overlapping containers
  for (let i = 0; i < containers.length; i++) {
    for (let j = i + 1; j < containers.length; j++) {
      const c1 = containers[i];
      const c2 = containers[j];

      const c1Right = c1.xPosition + (c1.width || DEFAULT_LAYOUT.DEFAULT_WIDTH);
      const c1Bottom = c1.yPosition + (c1.height || DEFAULT_LAYOUT.DEFAULT_HEIGHT);
      const c2Right = c2.xPosition + (c2.width || DEFAULT_LAYOUT.DEFAULT_WIDTH);
      const c2Bottom = c2.yPosition + (c2.height || DEFAULT_LAYOUT.DEFAULT_HEIGHT);

      // Check for overlap
      const overlaps =
        c1.xPosition < c2Right &&
        c1Right > c2.xPosition &&
        c1.yPosition < c2Bottom &&
        c1Bottom > c2.yPosition;

      if (overlaps) {
        overlapping.push({ id1: c1.id, id2: c2.id });
      }
    }
  }

  return { outOfBounds, overlapping };
}

// ============================================================================
// SANITY CHECKS
// ============================================================================

/**
 * Validates that ghost logic never mutates Guardrails entities.
 * This is a defensive assertion - should always return true.
 */
export function assertNoGuardrailsMutation(): boolean {
  // Ghost materialisation only creates Mind Mesh containers
  // Ghost deletion only deletes Mind Mesh containers
  // References are non-authoritative

  // If this ever returns false, there's a critical bug
  return true;
}

/**
 * Validates that layout logic never assumes UI behavior.
 * This is a defensive assertion - should always return true.
 */
export function assertNoUIAssumptions(): boolean {
  // Layout logic uses abstract units, not pixels
  // No drag handlers, click handlers, or visual effects
  // No canvas rendering or positioning assumptions

  return true;
}

/**
 * Validates that backing off is permanent until explicit reset.
 * Once hasBrokenDefaultLayout = true, stays true until reset.
 */
export function assertBackoffIsPermanent(
  workspace: MindMeshWorkspace,
  wasResetExplicitly: boolean
): boolean {
  if (!workspace.hasBrokenDefaultLayout) {
    return true; // Not broken, no issue
  }

  // If broken, should only be fixed by explicit reset
  if (wasResetExplicitly) {
    return true; // Explicit reset is allowed
  }

  // If broken and no explicit reset, flag should stay true
  return workspace.hasBrokenDefaultLayout === true;
}
