import { supabase } from '../supabase';

// Suppressed deprecation warning - module still in use, will be migrated gradually
// Uncomment to see migration path when needed:
// console.warn('[DEPRECATED] src/lib/guardrails/sideProjects.ts - See GUARDRAILS_UNIFIED_ARCHITECTURE.md for migration path');

export interface SideProject {
  id: string;
  master_project_id: string;
  title: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface SideProjectWithStats extends SideProject {
  roadmap_items_count: number;
  nodes_count: number;
  total_items_count: number;
}

export interface CreateSideProjectInput {
  title: string;
  description?: string;
  color?: string;
}

export interface UpdateSideProjectInput {
  title?: string;
  description?: string;
  color?: string;
}

export interface SideProjectDriftStats {
  total_side_projects: number;
  active_items_count: number;
  recent_side_projects_1h: number;
  time_spent_today_minutes: number;
  drift_level: 'low' | 'medium' | 'high';
  most_active_side_project: SideProjectWithStats | null;
}

export type ItemType = 'roadmap_item' | 'node';

export async function createSideProject(
  masterProjectId: string,
  input: CreateSideProjectInput
): Promise<SideProject> {
  const { data, error } = await supabase
    .from('side_projects')
    .insert({
      master_project_id: masterProjectId,
      title: input.title,
      description: input.description || null,
      color: input.color || '#A855F7',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSideProject(
  id: string,
  updates: UpdateSideProjectInput
): Promise<SideProject> {
  const { data, error } = await supabase
    .from('side_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSideProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('side_projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function archiveSideProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('side_projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function unarchiveSideProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('side_projects')
    .update({ archived_at: null })
    .eq('id', id);

  if (error) throw error;
}

export async function getSideProjects(masterProjectId: string): Promise<SideProject[]> {
  const { data, error } = await supabase
    .from('side_projects')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSideProjectsWithStats(
  masterProjectId: string
): Promise<SideProjectWithStats[]> {
  const { data, error } = await supabase
    .from('side_projects_stats')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .is('archived_at', null)
    .order('total_items_count', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSideProject(id: string): Promise<SideProject> {
  const { data, error } = await supabase
    .from('side_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function assignItemToSideProject(
  itemId: string,
  itemType: ItemType,
  sideProjectId: string
): Promise<void> {
  const tableName = itemType === 'roadmap_item' ? 'roadmap_items' : 'guardrails_nodes';

  const { error } = await supabase
    .from(tableName)
    .update({
      side_project_id: sideProjectId,
      track_id: null,
      subtrack_id: null,
      is_offshoot: false,
    })
    .eq('id', itemId);

  if (error) throw error;
}

export async function removeItemFromSideProject(
  itemId: string,
  itemType: ItemType
): Promise<void> {
  const tableName = itemType === 'roadmap_item' ? 'roadmap_items' : 'guardrails_nodes';

  const { error } = await supabase
    .from(tableName)
    .update({ side_project_id: null })
    .eq('id', itemId);

  if (error) throw error;
}

export async function convertSideProjectToMasterProject(
  sideProjectId: string
): Promise<{ masterProjectId: string }> {
  const sideProject = await getSideProject(sideProjectId);

  const { data: originalMasterProject, error: mpError } = await supabase
    .from('master_projects')
    .select('user_id, domain_id')
    .eq('id', sideProject.master_project_id)
    .single();

  if (mpError) throw mpError;

  const { data: newMasterProject, error: createError } = await supabase
    .from('master_projects')
    .insert({
      user_id: originalMasterProject.user_id,
      domain_id: originalMasterProject.domain_id,
      title: sideProject.title,
      description: sideProject.description || '',
      status: 'active',
    })
    .select()
    .single();

  if (createError) throw createError;

  const { error: roadmapError } = await supabase
    .from('roadmap_items')
    .update({ side_project_id: null })
    .eq('side_project_id', sideProjectId);

  if (roadmapError) throw roadmapError;

  const { error: nodesError } = await supabase
    .from('guardrails_nodes')
    .update({
      master_project_id: newMasterProject.id,
      side_project_id: null,
    })
    .eq('side_project_id', sideProjectId);

  if (nodesError) throw nodesError;

  await archiveSideProject(sideProjectId);

  return { masterProjectId: newMasterProject.id };
}

export async function convertRoadmapItemToSideProject(
  roadmapItemId: string,
  masterProjectId: string
): Promise<{ sideProjectId: string }> {
  const { data: item, error: itemError } = await supabase
    .from('roadmap_items')
    .select('title, description')
    .eq('id', roadmapItemId)
    .single();

  if (itemError) throw itemError;

  const sideProject = await createSideProject(masterProjectId, {
    title: item.title,
    description: item.description || '',
  });

  await assignItemToSideProject(roadmapItemId, 'roadmap_item', sideProject.id);

  return { sideProjectId: sideProject.id };
}

export async function convertNodeToSideProject(
  nodeId: string,
  masterProjectId: string
): Promise<{ sideProjectId: string }> {
  const { data: node, error: nodeError } = await supabase
    .from('guardrails_nodes')
    .select('title, content')
    .eq('id', nodeId)
    .single();

  if (nodeError) throw nodeError;

  const sideProject = await createSideProject(masterProjectId, {
    title: node.title,
    description: node.content || '',
  });

  await assignItemToSideProject(nodeId, 'node', sideProject.id);

  return { sideProjectId: sideProject.id };
}

export async function getSideProjectItems(sideProjectId: string) {
  const [roadmapItems, nodes] = await Promise.all([
    supabase
      .from('roadmap_items')
      .select('*')
      .eq('side_project_id', sideProjectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('guardrails_nodes')
      .select('*')
      .eq('side_project_id', sideProjectId)
      .order('created_at', { ascending: false }),
  ]);

  if (roadmapItems.error) throw roadmapItems.error;
  if (nodes.error) throw nodes.error;

  return {
    roadmapItems: roadmapItems.data || [],
    nodes: nodes.data || [],
  };
}

export async function getSideProjectDriftStats(
  masterProjectId: string
): Promise<SideProjectDriftStats> {
  const sideProjects = await getSideProjectsWithStats(masterProjectId);

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentSideProjects = sideProjects.filter(
    sp => new Date(sp.created_at) > oneHourAgo
  );

  const totalItems = sideProjects.reduce((sum, sp) => sum + sp.total_items_count, 0);

  const { data: allProjectItems, error } = await supabase
    .from('guardrails_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('master_project_id', masterProjectId);

  if (error) throw error;

  const totalProjectItems = (allProjectItems as any)?.count || 0;
  const sideProjectPercentage = totalProjectItems > 0
    ? (totalItems / totalProjectItems) * 100
    : 0;

  let driftLevel: 'low' | 'medium' | 'high' = 'low';
  if (recentSideProjects.length >= 3 || sideProjectPercentage > 40) {
    driftLevel = 'high';
  } else if (recentSideProjects.length >= 2 || sideProjectPercentage > 25) {
    driftLevel = 'medium';
  }

  const mostActive = sideProjects.length > 0 ? sideProjects[0] : null;

  return {
    total_side_projects: sideProjects.length,
    active_items_count: totalItems,
    recent_side_projects_1h: recentSideProjects.length,
    time_spent_today_minutes: 0,
    drift_level: driftLevel,
    most_active_side_project: mostActive,
  };
}

export async function bulkArchiveSideProjects(sideProjectIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('side_projects')
    .update({ archived_at: new Date().toISOString() })
    .in('id', sideProjectIds);

  if (error) throw error;
}

export async function bulkDeleteSideProjects(sideProjectIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('side_projects')
    .delete()
    .in('id', sideProjectIds);

  if (error) throw error;
}
