import { supabase } from '../supabase';
import type {
  MindMeshVisibilityPreference,
  MindMeshVisibilityState,
  MindMeshNodeExtended,
  MindMeshEdge,
} from './mindMeshGraphTypes';

const VISIBILITY_TABLE = 'mind_mesh_user_visibility';

function transformVisibilityFromDb(row: any): MindMeshVisibilityPreference {
  return {
    id: row.id,
    userId: row.user_id,
    masterProjectId: row.master_project_id,
    nodeId: row.node_id,
    edgeId: row.edge_id,
    visibilityState: row.visibility_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function setNodeVisibility(
  userId: string,
  masterProjectId: string,
  nodeId: string,
  visibilityState: MindMeshVisibilityState
): Promise<MindMeshVisibilityPreference | null> {
  const existing = await getNodeVisibility(userId, nodeId);

  if (existing) {
    const { data, error } = await supabase
      .from(VISIBILITY_TABLE)
      .update({ visibility_state: visibilityState })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating node visibility:', error);
      return null;
    }

    return data ? transformVisibilityFromDb(data) : null;
  }

  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .insert({
      user_id: userId,
      master_project_id: masterProjectId,
      node_id: nodeId,
      visibility_state: visibilityState,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating node visibility:', error);
    return null;
  }

  return data ? transformVisibilityFromDb(data) : null;
}

export async function setEdgeVisibility(
  userId: string,
  masterProjectId: string,
  edgeId: string,
  visibilityState: MindMeshVisibilityState
): Promise<MindMeshVisibilityPreference | null> {
  const existing = await getEdgeVisibility(userId, edgeId);

  if (existing) {
    const { data, error } = await supabase
      .from(VISIBILITY_TABLE)
      .update({ visibility_state: visibilityState })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating edge visibility:', error);
      return null;
    }

    return data ? transformVisibilityFromDb(data) : null;
  }

  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .insert({
      user_id: userId,
      master_project_id: masterProjectId,
      edge_id: edgeId,
      visibility_state: visibilityState,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating edge visibility:', error);
    return null;
  }

  return data ? transformVisibilityFromDb(data) : null;
}

export async function hideNode(
  userId: string,
  masterProjectId: string,
  nodeId: string
): Promise<void> {
  await setNodeVisibility(userId, masterProjectId, nodeId, 'hidden');
}

export async function showNode(
  userId: string,
  masterProjectId: string,
  nodeId: string
): Promise<void> {
  await setNodeVisibility(userId, masterProjectId, nodeId, 'visible');
}

export async function collapseNode(
  userId: string,
  masterProjectId: string,
  nodeId: string
): Promise<void> {
  await setNodeVisibility(userId, masterProjectId, nodeId, 'collapsed');
}

export async function hideEdge(
  userId: string,
  masterProjectId: string,
  edgeId: string
): Promise<void> {
  await setEdgeVisibility(userId, masterProjectId, edgeId, 'hidden');
}

export async function showEdge(
  userId: string,
  masterProjectId: string,
  edgeId: string
): Promise<void> {
  await setEdgeVisibility(userId, masterProjectId, edgeId, 'visible');
}

export async function getNodeVisibility(
  userId: string,
  nodeId: string
): Promise<MindMeshVisibilityPreference | null> {
  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('node_id', nodeId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ? transformVisibilityFromDb(data) : null;
}

export async function getEdgeVisibility(
  userId: string,
  edgeId: string
): Promise<MindMeshVisibilityPreference | null> {
  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('edge_id', edgeId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ? transformVisibilityFromDb(data) : null;
}

export async function getAllVisibilityPreferences(
  userId: string,
  masterProjectId: string
): Promise<MindMeshVisibilityPreference[]> {
  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId);

  if (error) {
    console.error('Error fetching visibility preferences:', error);
    return [];
  }

  return (data || []).map(transformVisibilityFromDb);
}

export async function getHiddenNodes(
  userId: string,
  masterProjectId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .select('node_id')
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .eq('visibility_state', 'hidden')
    .not('node_id', 'is', null);

  if (error) {
    console.error('Error fetching hidden nodes:', error);
    return [];
  }

  return (data || []).map((row) => row.node_id).filter(Boolean) as string[];
}

export async function getHiddenEdges(
  userId: string,
  masterProjectId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .select('edge_id')
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .eq('visibility_state', 'hidden')
    .not('edge_id', 'is', null);

  if (error) {
    console.error('Error fetching hidden edges:', error);
    return [];
  }

  return (data || []).map((row) => row.edge_id).filter(Boolean) as string[];
}

export async function getCollapsedNodes(
  userId: string,
  masterProjectId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from(VISIBILITY_TABLE)
    .select('node_id')
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .eq('visibility_state', 'collapsed')
    .not('node_id', 'is', null);

  if (error) {
    console.error('Error fetching collapsed nodes:', error);
    return [];
  }

  return (data || []).map((row) => row.node_id).filter(Boolean) as string[];
}

export async function clearNodeVisibility(userId: string, nodeId: string): Promise<void> {
  await supabase
    .from(VISIBILITY_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('node_id', nodeId);
}

export async function clearEdgeVisibility(userId: string, edgeId: string): Promise<void> {
  await supabase
    .from(VISIBILITY_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('edge_id', edgeId);
}

export async function clearAllVisibilityPreferences(
  userId: string,
  masterProjectId: string
): Promise<void> {
  await supabase
    .from(VISIBILITY_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId);
}

export function filterVisibleNodes(
  nodes: MindMeshNodeExtended[],
  hiddenNodeIds: string[],
  collapsedNodeIds: string[]
): MindMeshNodeExtended[] {
  return nodes.filter((node) => {
    if (hiddenNodeIds.includes(node.id)) return false;
    return true;
  });
}

export function filterVisibleEdges(
  edges: MindMeshEdge[],
  hiddenEdgeIds: string[],
  hiddenNodeIds: string[]
): MindMeshEdge[] {
  return edges.filter((edge) => {
    if (hiddenEdgeIds.includes(edge.id)) return false;
    if (hiddenNodeIds.includes(edge.fromNodeId)) return false;
    if (hiddenNodeIds.includes(edge.toNodeId)) return false;
    return true;
  });
}

export async function bulkHideNodes(
  userId: string,
  masterProjectId: string,
  nodeIds: string[]
): Promise<void> {
  const inserts = nodeIds.map((nodeId) => ({
    user_id: userId,
    master_project_id: masterProjectId,
    node_id: nodeId,
    visibility_state: 'hidden',
  }));

  await supabase.from(VISIBILITY_TABLE).upsert(inserts);
}

export async function bulkShowNodes(
  userId: string,
  masterProjectId: string,
  nodeIds: string[]
): Promise<void> {
  await supabase
    .from(VISIBILITY_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('master_project_id', masterProjectId)
    .in('node_id', nodeIds);
}

export async function hideAllAutoGeneratedNodes(
  userId: string,
  masterProjectId: string
): Promise<void> {
  const { data: nodes } = await supabase
    .from('guardrails_nodes')
    .select('id')
    .eq('master_project_id', masterProjectId)
    .eq('auto_generated', true);

  if (nodes && nodes.length > 0) {
    const nodeIds = nodes.map((n) => n.id);
    await bulkHideNodes(userId, masterProjectId, nodeIds);
  }
}

export async function showAllAutoGeneratedNodes(
  userId: string,
  masterProjectId: string
): Promise<void> {
  const { data: nodes } = await supabase
    .from('guardrails_nodes')
    .select('id')
    .eq('master_project_id', masterProjectId)
    .eq('auto_generated', true);

  if (nodes && nodes.length > 0) {
    const nodeIds = nodes.map((n) => n.id);
    await bulkShowNodes(userId, masterProjectId, nodeIds);
  }
}

export function isNodeVisible(
  nodeId: string,
  hiddenNodeIds: string[]
): boolean {
  return !hiddenNodeIds.includes(nodeId);
}

export function isEdgeVisible(
  edgeId: string,
  hiddenEdgeIds: string[],
  hiddenNodeIds: string[],
  edge: MindMeshEdge
): boolean {
  if (hiddenEdgeIds.includes(edgeId)) return false;
  if (hiddenNodeIds.includes(edge.fromNodeId)) return false;
  if (hiddenNodeIds.includes(edge.toNodeId)) return false;
  return true;
}
