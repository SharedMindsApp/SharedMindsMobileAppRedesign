import { supabase } from '../supabase';

// Suppressed deprecation warning - module still in use, will be migrated gradually
// Uncomment to see migration path when needed:
// console.warn('[DEPRECATED] src/lib/guardrails/offshoots.ts - See GUARDRAILS_UNIFIED_ARCHITECTURE.md for migration path');

export type OffshootType = 'node' | 'roadmap_item' | 'side_idea';

export interface UnifiedOffshoot {
  id: string;
  master_project_id: string;
  source_type: OffshootType;
  title: string;
  description: string | null;
  color: string | null;
  track_id: string | null;
  subtrack_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffshootStats {
  total_count: number;
  nodes_count: number;
  roadmap_count: number;
  side_ideas_count: number;
  recent_count_1h: number;
  drift_risk: 'low' | 'medium' | 'high';
}

export async function markAsOffshoot(itemId: string, type: OffshootType): Promise<void> {
  switch (type) {
    case 'node':
      const { error: nodeError } = await supabase
        .from('guardrails_nodes')
        .update({ is_offshoot: true, color: '#FF7F50' })
        .eq('id', itemId);
      if (nodeError) throw nodeError;
      break;

    case 'roadmap_item':
      const { error: roadmapError } = await supabase
        .from('roadmap_items')
        .update({ is_offshoot: true, color: '#FF7F50' })
        .eq('id', itemId);
      if (roadmapError) throw roadmapError;
      break;

    case 'side_idea':
      break;

    default:
      throw new Error(`Unknown offshoot type: ${type}`);
  }
}

export async function removeOffshoot(itemId: string, type: OffshootType): Promise<void> {
  switch (type) {
    case 'node':
      const { error: nodeError } = await supabase
        .from('guardrails_nodes')
        .update({ is_offshoot: false })
        .eq('id', itemId);
      if (nodeError) throw nodeError;
      break;

    case 'roadmap_item':
      const { error: roadmapError } = await supabase
        .from('roadmap_items')
        .update({ is_offshoot: false })
        .eq('id', itemId);
      if (roadmapError) throw roadmapError;
      break;

    case 'side_idea':
      break;

    default:
      throw new Error(`Unknown offshoot type: ${type}`);
  }
}

export async function convertOffshootToRoadmap(nodeId: string): Promise<{ roadmapItemId: string }> {
  const { data: node, error: nodeError } = await supabase
    .from('guardrails_nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (nodeError) throw nodeError;
  if (!node) throw new Error('Node not found');

  const { data: sections, error: sectionError } = await supabase
    .from('roadmap_sections')
    .select('id')
    .eq('master_project_id', node.master_project_id)
    .order('order_index', { ascending: true })
    .limit(1);

  if (sectionError) throw sectionError;
  if (!sections || sections.length === 0) {
    throw new Error('No roadmap section found. Please create a roadmap section first.');
  }

  const { data: roadmapItem, error: createError } = await supabase
    .from('roadmap_items')
    .insert({
      section_id: sections[0].id,
      title: node.title,
      description: node.content || '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'not_started',
      track_id: node.track_id,
      subtrack_id: node.subtrack_id,
      color: node.color,
      is_offshoot: node.is_offshoot,
    })
    .select()
    .single();

  if (createError) throw createError;

  const { error: deleteError } = await supabase
    .from('guardrails_nodes')
    .delete()
    .eq('id', nodeId);

  if (deleteError) throw deleteError;

  return { roadmapItemId: roadmapItem.id };
}

export async function convertOffshootToSideIdea(nodeId: string): Promise<{ sideIdeaId: string }> {
  const { data: node, error: nodeError } = await supabase
    .from('guardrails_nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (nodeError) throw nodeError;
  if (!node) throw new Error('Node not found');

  const { data: sideIdea, error: createError } = await supabase
    .from('side_ideas')
    .insert({
      master_project_id: node.master_project_id,
      title: node.title,
      description: node.content || '',
      track_id: node.track_id,
      subtrack_id: node.subtrack_id,
      is_promoted: false,
    })
    .select()
    .single();

  if (createError) throw createError;

  const { error: deleteError } = await supabase
    .from('guardrails_nodes')
    .delete()
    .eq('id', nodeId);

  if (deleteError) throw deleteError;

  return { sideIdeaId: sideIdea.id };
}

export async function convertRoadmapToNode(roadmapItemId: string): Promise<{ nodeId: string }> {
  const { data: item, error: itemError } = await supabase
    .from('roadmap_items')
    .select('*, roadmap_sections!inner(master_project_id)')
    .eq('id', roadmapItemId)
    .single();

  if (itemError) throw itemError;
  if (!item) throw new Error('Roadmap item not found');

  const masterProjectId = (item.roadmap_sections as any).master_project_id;

  const { data: node, error: createError } = await supabase
    .from('guardrails_nodes')
    .insert({
      master_project_id: masterProjectId,
      title: item.title,
      content: item.description || '',
      node_type: 'idea',
      track_id: item.track_id,
      subtrack_id: item.subtrack_id,
      color: item.color,
      is_offshoot: item.is_offshoot,
      x_position: Math.random() * 1000 + 500,
      y_position: Math.random() * 800 + 400,
    })
    .select()
    .single();

  if (createError) throw createError;

  const { error: deleteError } = await supabase
    .from('roadmap_items')
    .delete()
    .eq('id', roadmapItemId);

  if (deleteError) throw deleteError;

  return { nodeId: node.id };
}

export async function getAllOffshootsForProject(masterProjectId: string): Promise<UnifiedOffshoot[]> {
  const { data, error } = await supabase
    .from('guardrails_offshoots_unified')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOffshootStats(masterProjectId: string): Promise<OffshootStats> {
  const allOffshoots = await getAllOffshootsForProject(masterProjectId);

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentOffshoots = allOffshoots.filter(
    o => new Date(o.created_at) > oneHourAgo
  );

  const nodeCount = allOffshoots.filter(o => o.source_type === 'node').length;
  const roadmapCount = allOffshoots.filter(o => o.source_type === 'roadmap_item').length;
  const sideIdeasCount = allOffshoots.filter(o => o.source_type === 'side_idea').length;

  const { data: allItems, error: itemsError } = await supabase
    .from('guardrails_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('master_project_id', masterProjectId);

  if (itemsError) throw itemsError;

  const totalItems = (allItems as any)?.count || 0;
  const offshootPercentage = totalItems > 0 ? (allOffshoots.length / totalItems) * 100 : 0;

  let driftRisk: 'low' | 'medium' | 'high' = 'low';
  if (recentOffshoots.length >= 5 || offshootPercentage > 30) {
    driftRisk = 'high';
  } else if (recentOffshoots.length >= 3 || offshootPercentage > 20) {
    driftRisk = 'medium';
  }

  return {
    total_count: allOffshoots.length,
    nodes_count: nodeCount,
    roadmap_count: roadmapCount,
    side_ideas_count: sideIdeasCount,
    recent_count_1h: recentOffshoots.length,
    drift_risk: driftRisk,
  };
}

export async function archiveOffshoot(itemId: string, type: OffshootType): Promise<void> {
  switch (type) {
    case 'node':
      const { error: nodeError } = await supabase
        .from('guardrails_nodes')
        .delete()
        .eq('id', itemId);
      if (nodeError) throw nodeError;
      break;

    case 'roadmap_item':
      const { error: roadmapError } = await supabase
        .from('roadmap_items')
        .delete()
        .eq('id', itemId);
      if (roadmapError) throw roadmapError;
      break;

    case 'side_idea':
      const { error: sideIdeaError } = await supabase
        .from('side_ideas')
        .delete()
        .eq('id', itemId);
      if (sideIdeaError) throw sideIdeaError;
      break;

    default:
      throw new Error(`Unknown offshoot type: ${type}`);
  }
}

export async function bulkMarkAsOffshoot(itemIds: string[], type: OffshootType): Promise<void> {
  switch (type) {
    case 'node':
      const { error: nodeError } = await supabase
        .from('guardrails_nodes')
        .update({ is_offshoot: true, color: '#FF7F50' })
        .in('id', itemIds);
      if (nodeError) throw nodeError;
      break;

    case 'roadmap_item':
      const { error: roadmapError } = await supabase
        .from('roadmap_items')
        .update({ is_offshoot: true, color: '#FF7F50' })
        .in('id', itemIds);
      if (roadmapError) throw roadmapError;
      break;

    default:
      throw new Error(`Bulk operation not supported for type: ${type}`);
  }
}

export async function bulkArchiveOffshoots(itemIds: string[], type: OffshootType): Promise<void> {
  switch (type) {
    case 'node':
      const { error: nodeError } = await supabase
        .from('guardrails_nodes')
        .delete()
        .in('id', itemIds);
      if (nodeError) throw nodeError;
      break;

    case 'roadmap_item':
      const { error: roadmapError } = await supabase
        .from('roadmap_items')
        .delete()
        .in('id', itemIds);
      if (roadmapError) throw roadmapError;
      break;

    case 'side_idea':
      const { error: sideIdeaError } = await supabase
        .from('side_ideas')
        .delete()
        .in('id', itemIds);
      if (sideIdeaError) throw sideIdeaError;
      break;

    default:
      throw new Error(`Bulk archive not supported for type: ${type}`);
  }
}
