/**
 * Mind Mesh V2 Hierarchy Visibility Controls
 *
 * Pure UI state for controlling visibility of Track/Subtrack hierarchies.
 *
 * CRITICAL INVARIANTS:
 * - Containers are NEVER deleted, only hidden
 * - Layout positions are NEVER recalculated on visibility change
 * - Guardrails authority is NEVER mutated
 * - Reconciliation guarantees are NEVER broken
 * - Ghost materialisation is NEVER affected
 *
 * Visibility is purely a rendering concern. Internally, the full hierarchy
 * exists at all times with correct positions, references, and sync state.
 */

import type { MindMeshContainer, MindMeshNode, MindMeshPort, ContainerId } from './types';
import { inferContainerType } from './containerCapabilities';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Session-based visibility state (not persisted).
 *
 * Controls which containers are rendered without affecting:
 * - Container existence
 * - Layout computation
 * - Sync behavior
 * - Reference integrity
 */
export interface HierarchyVisibilityState {
  /** When true, hide all Subtrack containers (Tracks-only view) */
  hideAllSubtracks: boolean;

  /** Set of Track container IDs whose children are collapsed */
  collapsedTracks: Set<ContainerId>;
}

/**
 * View mode enum for UI controls
 */
export type HierarchyViewMode = 'tracks_and_subtracks' | 'tracks_only';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates default visibility state (all expanded).
 */
export function createDefaultVisibilityState(): HierarchyVisibilityState {
  return {
    hideAllSubtracks: false,
    collapsedTracks: new Set(),
  };
}

/**
 * Converts view mode to visibility state.
 */
export function viewModeToState(mode: HierarchyViewMode): HierarchyVisibilityState {
  return {
    hideAllSubtracks: mode === 'tracks_only',
    collapsedTracks: new Set(),
  };
}

/**
 * Converts visibility state to view mode.
 */
export function stateToViewMode(state: HierarchyVisibilityState): HierarchyViewMode {
  return state.hideAllSubtracks ? 'tracks_only' : 'tracks_and_subtracks';
}

// ============================================================================
// VISIBILITY RESOLUTION
// ============================================================================

/**
 * Determines if a container should be visible given current state.
 *
 * Rules:
 * - Track containers: ALWAYS visible
 * - Subtrack containers: Hidden if:
 *   - hideAllSubtracks is true, OR
 *   - Any ancestor Track is collapsed
 * - Ghost and active containers: Treated identically
 *
 * @param container - Container to check
 * @param visibilityState - Current visibility state
 * @param allContainers - All containers (needed for ancestor lookup)
 * @returns true if container should be rendered
 */
export function isContainerVisible(
  container: MindMeshContainer,
  visibilityState: HierarchyVisibilityState,
  allContainers: MindMeshContainer[]
): boolean {
  const containerType = inferContainerType(container.entity_type, container.metadata);

  // Track containers are ALWAYS visible
  if (containerType === 'track') {
    return true;
  }

  // Subtrack containers follow visibility rules
  if (containerType === 'subtrack') {
    // Rule 1: Global subtracks hidden
    if (visibilityState.hideAllSubtracks) {
      return false;
    }

    // Rule 2: Check if any ancestor Track is collapsed
    const ancestorTrack = findAncestorTrack(container, allContainers);
    if (ancestorTrack && visibilityState.collapsedTracks.has(ancestorTrack.id)) {
      return false;
    }

    return true;
  }

  // Other container types (Task, Event, Note, Idea):
  // Follow parent visibility rules (if parent hidden, child hidden)
  if (container.parent_container_id) {
    const parent = allContainers.find((c) => c.id === container.parent_container_id);
    if (parent) {
      return isContainerVisible(parent, visibilityState, allContainers);
    }
  }

  // Default: visible
  return true;
}

/**
 * Determines if a node should be visible given current state.
 *
 * Rule: Node is visible ONLY if BOTH endpoint containers are visible.
 * Prevents dangling nodes and partial rendering.
 *
 * @param node - Node to check
 * @param visibilityState - Current visibility state
 * @param allContainers - All containers (for endpoint lookup)
 * @param allPorts - All ports (for container ID lookup)
 * @returns true if node should be rendered
 */
export function isNodeVisible(
  node: MindMeshNode,
  visibilityState: HierarchyVisibilityState,
  allContainers: MindMeshContainer[],
  allPorts: MindMeshPort[]
): boolean {
  // Find the ports to get container IDs
  const sourcePort = allPorts.find((p) => p.id === node.source_port_id);
  const targetPort = allPorts.find((p) => p.id === node.target_port_id);

  if (!sourcePort || !targetPort) {
    // Ports not found - node cannot be visible
    // This is expected when ports haven't been fetched from the database yet
    return false;
  }

  // Now find the containers using the container IDs from the ports
  const sourceContainer = allContainers.find((c) => c.id === sourcePort.container_id);
  const targetContainer = allContainers.find((c) => c.id === targetPort.container_id);

  if (!sourceContainer || !targetContainer) {
    // Containers not found - node cannot be visible
    return false;
  }

  const sourceVisible = isContainerVisible(sourceContainer, visibilityState, allContainers);
  const targetVisible = isContainerVisible(targetContainer, visibilityState, allContainers);

  return sourceVisible && targetVisible;
}

/**
 * Filters containers to only visible ones.
 *
 * @param containers - All containers
 * @param visibilityState - Current visibility state
 * @returns Filtered list of visible containers
 */
export function filterVisibleContainers(
  containers: MindMeshContainer[],
  visibilityState: HierarchyVisibilityState
): MindMeshContainer[] {
  return containers.filter((container) =>
    isContainerVisible(container, visibilityState, containers)
  );
}

/**
 * Filters nodes to only visible ones.
 *
 * @param nodes - All nodes
 * @param visibilityState - Current visibility state
 * @param allContainers - All containers (for endpoint lookup)
 * @param allPorts - All ports (for container ID lookup)
 * @returns Filtered list of visible nodes
 */
export function filterVisibleNodes(
  nodes: MindMeshNode[],
  visibilityState: HierarchyVisibilityState,
  allContainers: MindMeshContainer[],
  allPorts: MindMeshPort[]
): MindMeshNode[] {
  return nodes.filter((node) =>
    isNodeVisible(node, visibilityState, allContainers, allPorts)
  );
}

// ============================================================================
// STATE MUTATIONS (Pure Functions)
// ============================================================================

/**
 * Toggles collapse state for a Track container.
 *
 * @param state - Current visibility state
 * @param trackContainerId - Track container ID to toggle
 * @returns New visibility state
 */
export function toggleTrackCollapse(
  state: HierarchyVisibilityState,
  trackContainerId: ContainerId
): HierarchyVisibilityState {
  const newCollapsedTracks = new Set(state.collapsedTracks);

  if (newCollapsedTracks.has(trackContainerId)) {
    newCollapsedTracks.delete(trackContainerId);
  } else {
    newCollapsedTracks.add(trackContainerId);
  }

  return {
    ...state,
    collapsedTracks: newCollapsedTracks,
  };
}

/**
 * Sets global subtracks visibility.
 *
 * @param state - Current visibility state
 * @param hide - Whether to hide all subtracks
 * @returns New visibility state
 */
export function setGlobalSubtracksVisibility(
  state: HierarchyVisibilityState,
  hide: boolean
): HierarchyVisibilityState {
  return {
    ...state,
    hideAllSubtracks: hide,
  };
}

/**
 * Resets visibility state to default (all expanded).
 *
 * @returns Fresh default state
 */
export function resetVisibilityState(): HierarchyVisibilityState {
  return createDefaultVisibilityState();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Finds the ancestor Track container for a given container.
 *
 * Walks up parent chain until a Track is found.
 * Returns null if no Track ancestor exists.
 *
 * @param container - Container to find ancestor for
 * @param allContainers - All containers
 * @returns Ancestor Track container or null
 */
function findAncestorTrack(
  container: MindMeshContainer,
  allContainers: MindMeshContainer[]
): MindMeshContainer | null {
  let current = container;

  // Walk up parent chain
  while (current.parent_container_id) {
    const parent = allContainers.find((c) => c.id === current.parent_container_id);
    if (!parent) break;

    const parentType = inferContainerType(parent.entity_type, parent.metadata);
    if (parentType === 'track') {
      return parent;
    }

    current = parent;
  }

  return null;
}

/**
 * Checks if a Track container is collapsed.
 *
 * @param trackContainerId - Track container ID
 * @param state - Current visibility state
 * @returns true if collapsed
 */
export function isTrackCollapsed(
  trackContainerId: ContainerId,
  state: HierarchyVisibilityState
): boolean {
  return state.collapsedTracks.has(trackContainerId);
}

/**
 * Counts how many containers are hidden by current visibility state.
 *
 * Useful for UI feedback.
 *
 * @param containers - All containers
 * @param visibilityState - Current visibility state
 * @returns Count of hidden containers
 */
export function countHiddenContainers(
  containers: MindMeshContainer[],
  visibilityState: HierarchyVisibilityState
): number {
  return containers.filter(
    (container) => !isContainerVisible(container, visibilityState, containers)
  ).length;
}
