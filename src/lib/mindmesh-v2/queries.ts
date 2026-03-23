/**
 * Mind Mesh V2 State Queries
 *
 * Fetches Mind Mesh graph state from database.
 *
 * CRITICAL RULES:
 * - This module contains NO logic
 * - Only database reads
 * - No mutations
 * - No filtering beyond visibility
 * - No aggregation
 * - Returns raw data for orchestration context
 *
 * Why queries are separate:
 * - Transport layer needs to fetch state
 * - Orchestrator needs current state snapshot
 * - Queries are pure reads with no side effects
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MindMeshWorkspace,
  MindMeshContainer,
  MindMeshNode,
  MindMeshPort,
  MindMeshCanvasLock,
  MindMeshContainerReference,
} from './types';

// ============================================================================
// QUERY RESULTS
// ============================================================================

/**
 * Complete workspace state for orchestration.
 * Contains all entities needed to build OrchestrationContext.
 */
export interface WorkspaceState {
  workspace: MindMeshWorkspace;
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  ports: MindMeshPort[];
  references: MindMeshContainerReference[];
  currentLock: MindMeshCanvasLock | null;
}

/**
 * Graph state for UI rendering.
 * Contains only visible entities for current user.
 */
export interface GraphState {
  containers: MindMeshContainer[];
  nodes: MindMeshNode[];
  visibility: Record<string, boolean>; // containerId → visible
}

// ============================================================================
// WORKSPACE STATE QUERIES
// ============================================================================

/**
 * Fetches complete workspace state for orchestration.
 *
 * Used by transport layer to build OrchestrationContext.
 *
 * CRITICAL: This is a read-only query. No mutations.
 *
 * @param supabase - Supabase client
 * @param workspaceId - Workspace ID
 * @returns Complete workspace state or null if not found
 */
export async function fetchWorkspaceState(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceState | null> {
  // Fetch workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from('mindmesh_workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`Failed to fetch workspace: ${workspaceError.message}`);
  }

  if (!workspace) {
    return null;
  }

  // Fetch containers
  const { data: containers, error: containersError } = await supabase
    .from('mindmesh_containers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (containersError) {
    throw new Error(`Failed to fetch containers: ${containersError.message}`);
  }

  // Fetch nodes
  const { data: nodes, error: nodesError } = await supabase
    .from('mindmesh_nodes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (nodesError) {
    throw new Error(`Failed to fetch nodes: ${nodesError.message}`);
  }

  // Fetch ports
  const { data: ports, error: portsError } = await supabase
    .from('mindmesh_ports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (portsError) {
    throw new Error(`Failed to fetch ports: ${portsError.message}`);
  }

  // Fetch references
  const { data: references, error: referencesError } = await supabase
    .from('mindmesh_container_references')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (referencesError) {
    throw new Error(`Failed to fetch references: ${referencesError.message}`);
  }

  // Fetch current lock
  const { data: lock, error: lockError } = await supabase
    .from('mindmesh_canvas_locks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .maybeSingle();

  if (lockError) {
    throw new Error(`Failed to fetch lock: ${lockError.message}`);
  }

  return {
    workspace: workspace as MindMeshWorkspace,
    containers: (containers || []) as MindMeshContainer[],
    nodes: (nodes || []) as MindMeshNode[],
    ports: (ports || []) as MindMeshPort[],
    references: (references || []) as MindMeshContainerReference[],
    currentLock: lock as MindMeshCanvasLock | null,
  };
}

// ============================================================================
// GRAPH STATE QUERIES
// ============================================================================

/**
 * Fetches graph state for UI rendering.
 *
 * Returns only visible entities for current user.
 * Visibility is determined by container visibility flags.
 *
 * CRITICAL: This is a read-only query. No mutations.
 *
 * @param supabase - Supabase client
 * @param workspaceId - Workspace ID
 * @param userId - Current user ID
 * @returns Graph state for rendering
 */
export async function fetchGraphState(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<GraphState> {
  // Fetch containers
  const { data: containers, error: containersError } = await supabase
    .from('mindmesh_containers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (containersError) {
    throw new Error(`Failed to fetch containers: ${containersError.message}`);
  }

  // Fetch nodes
  const { data: nodes, error: nodesError } = await supabase
    .from('mindmesh_nodes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (nodesError) {
    throw new Error(`Failed to fetch nodes: ${nodesError.message}`);
  }

  // Build visibility map
  // For now, all containers are visible
  // TODO: Implement per-user visibility based on container.visibility_mode
  const visibility: Record<string, boolean> = {};
  for (const container of containers || []) {
    visibility[container.id] = true;
  }

  return {
    containers: (containers || []) as MindMeshContainer[],
    nodes: (nodes || []) as MindMeshNode[],
    visibility,
  };
}

// ============================================================================
// LOCK QUERIES
// ============================================================================

/**
 * Checks if user has active canvas lock.
 *
 * Used to verify user can perform write operations.
 *
 * @param supabase - Supabase client
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @returns True if user has active lock
 */
export async function hasActiveLock(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data: lock, error } = await supabase
    .from('mindmesh_canvas_locks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check lock: ${error.message}`);
  }

  return lock !== null;
}

// ============================================================================
// ROLLBACK QUERIES
// ============================================================================

/**
 * Fetches last executed plan for workspace.
 *
 * Used for rollback operations.
 *
 * @param supabase - Supabase client
 * @param workspaceId - Workspace ID
 * @returns Last plan or null
 */
export async function fetchLastPlan(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<any | null> {
  const { data: plan, error } = await supabase
    .from('mindmesh_plan_history')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch last plan: ${error.message}`);
  }

  return plan;
}
