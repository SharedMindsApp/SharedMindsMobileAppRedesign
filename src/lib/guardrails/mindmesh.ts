import { supabase } from '../supabase';
import type {
  MindMeshNode,
  MindMeshNodeLink,
  CreateNodeInput,
  UpdateNodeInput,
  CreateLinkInput,
  MindMeshGraph,
  OffshootAlert,
  GraphExportData,
} from './mindmeshTypes';

export async function createNode(input: CreateNodeInput): Promise<MindMeshNode> {
  const { data, error } = await supabase
    .from('guardrails_nodes')
    .insert({
      master_project_id: input.master_project_id,
      track_id: input.track_id || null,
      subtrack_id: input.subtrack_id || null,
      title: input.title || '',
      content: input.content || '',
      node_type: input.node_type,
      x_position: input.x_position || 0,
      y_position: input.y_position || 0,
      width: input.width || 200,
      height: input.height || 100,
      color: input.color || '#ffffff',
      is_offshoot: input.is_offshoot || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNode(nodeId: string, updates: UpdateNodeInput): Promise<MindMeshNode> {
  const { data, error } = await supabase
    .from('guardrails_nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNode(nodeId: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_nodes')
    .delete()
    .eq('id', nodeId);

  if (error) throw error;
}

export async function moveNode(nodeId: string, x: number, y: number): Promise<MindMeshNode> {
  return updateNode(nodeId, { x_position: x, y_position: y });
}

export async function resizeNode(nodeId: string, width: number, height: number): Promise<MindMeshNode> {
  return updateNode(nodeId, { width, height });
}

export async function createLink(input: CreateLinkInput): Promise<MindMeshNodeLink> {
  const { data, error } = await supabase
    .from('guardrails_node_links')
    .insert({
      from_node_id: input.from_node_id,
      to_node_id: input.to_node_id,
      link_type: input.link_type,
      source_port_id: input.source_port_id || null,
      target_port_id: input.target_port_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('guardrails_node_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}

export async function getLinksForProject(masterProjectId: string): Promise<MindMeshNodeLink[]> {
  const { data, error } = await supabase
    .from('guardrails_node_links')
    .select(`
      *,
      from_node:guardrails_nodes!from_node_id(master_project_id)
    `)
    .eq('from_node.master_project_id', masterProjectId);

  if (error) throw error;
  return data || [];
}

export async function duplicateNode(nodeId: string): Promise<MindMeshNode> {
  const { data: originalNode, error: fetchError } = await supabase
    .from('guardrails_nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (fetchError) throw fetchError;

  const duplicated = await createNode({
    master_project_id: originalNode.master_project_id,
    track_id: originalNode.track_id,
    subtrack_id: originalNode.subtrack_id,
    title: `${originalNode.title} (Copy)`,
    content: originalNode.content,
    node_type: originalNode.node_type,
    x_position: originalNode.x_position + 50,
    y_position: originalNode.y_position + 50,
    width: originalNode.width,
    height: originalNode.height,
    color: originalNode.color,
    is_offshoot: originalNode.is_offshoot,
  });

  return duplicated;
}

export async function bulkDeleteNodes(nodeIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('guardrails_nodes')
    .delete()
    .in('id', nodeIds);

  if (error) throw error;
}

export async function bulkReassignTrack(nodeIds: string[], trackId: string | null): Promise<void> {
  const { error } = await supabase
    .from('guardrails_nodes')
    .update({ track_id: trackId })
    .in('id', nodeIds);

  if (error) throw error;
}

export async function getFullGraph(masterProjectId: string): Promise<MindMeshGraph> {
  const [nodesResult, linksResult] = await Promise.all([
    supabase
      .from('guardrails_nodes')
      .select('*')
      .eq('master_project_id', masterProjectId)
      .order('created_at', { ascending: true }),

    supabase
      .from('guardrails_node_links')
      .select(`
        *,
        from_node:guardrails_nodes!from_node_id(master_project_id)
      `)
      .eq('from_node.master_project_id', masterProjectId),
  ]);

  if (nodesResult.error) throw nodesResult.error;
  if (linksResult.error) throw linksResult.error;

  return {
    nodes: nodesResult.data || [],
    links: linksResult.data || [],
  };
}

export async function getNodeById(nodeId: string): Promise<MindMeshNode | null> {
  const { data, error } = await supabase
    .from('guardrails_nodes')
    .select('*')
    .eq('id', nodeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getConnectedNodes(nodeId: string): Promise<{
  incoming: MindMeshNode[];
  outgoing: MindMeshNode[];
}> {
  const [incomingResult, outgoingResult] = await Promise.all([
    supabase
      .from('guardrails_node_links')
      .select('from_node_id, guardrails_nodes!from_node_id(*)')
      .eq('to_node_id', nodeId),

    supabase
      .from('guardrails_node_links')
      .select('to_node_id, guardrails_nodes!to_node_id(*)')
      .eq('from_node_id', nodeId),
  ]);

  if (incomingResult.error) throw incomingResult.error;
  if (outgoingResult.error) throw outgoingResult.error;

  return {
    incoming: incomingResult.data?.map(d => d.guardrails_nodes as unknown as MindMeshNode) || [],
    outgoing: outgoingResult.data?.map(d => d.guardrails_nodes as unknown as MindMeshNode) || [],
  };
}

export async function detectOffshootOverload(masterProjectId: string, timeWindowHours: number = 1): Promise<OffshootAlert | null> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - timeWindowHours);

  const { data, error } = await supabase
    .from('guardrails_nodes')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .eq('is_offshoot', true)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  const offshootNodes = data || [];
  const threshold = 5;

  if (offshootNodes.length >= threshold) {
    return {
      count: offshootNodes.length,
      recentNodes: offshootNodes.slice(0, 5),
      suggestedAction: 'reconnect',
      message: `You've created ${offshootNodes.length} offshoot ideas in the past hour. Consider reconnecting to your main goal or converting some into tracks.`,
    };
  }

  return null;
}

export async function exportGraph(masterProjectId: string): Promise<GraphExportData> {
  const graph = await getFullGraph(masterProjectId);

  return {
    nodes: graph.nodes,
    links: graph.links,
    metadata: {
      exported_at: new Date().toISOString(),
      project_id: masterProjectId,
      node_count: graph.nodes.length,
      link_count: graph.links.length,
    },
  };
}

export async function importGraph(
  masterProjectId: string,
  graphData: GraphExportData,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<MindMeshGraph> {
  const nodeIdMap = new Map<string, string>();

  const createdNodes = await Promise.all(
    graphData.nodes.map(async (node) => {
      const newNode = await createNode({
        master_project_id: masterProjectId,
        track_id: node.track_id,
        subtrack_id: node.subtrack_id,
        title: node.title,
        content: node.content,
        node_type: node.node_type,
        x_position: node.x_position + offsetX,
        y_position: node.y_position + offsetY,
        width: node.width,
        height: node.height,
        color: node.color,
        is_offshoot: node.is_offshoot,
      });

      nodeIdMap.set(node.id, newNode.id);
      return newNode;
    })
  );

  const createdLinks = await Promise.all(
    graphData.links.map(async (link) => {
      const newFromId = nodeIdMap.get(link.from_node_id);
      const newToId = nodeIdMap.get(link.to_node_id);

      if (newFromId && newToId) {
        return await createLink({
          from_node_id: newFromId,
          to_node_id: newToId,
          link_type: link.link_type,
        });
      }
      return null;
    })
  );

  return {
    nodes: createdNodes,
    links: createdLinks.filter(Boolean) as MindMeshNodeLink[],
  };
}

export async function convertNodeToRoadmapItem(nodeId: string): Promise<{ roadmapItemId: string }> {
  const node = await getNodeById(nodeId);
  if (!node) throw new Error('Node not found');

  const { data: sections, error: sectionError } = await supabase
    .from('roadmap_sections')
    .select('id')
    .eq('master_project_id', node.master_project_id)
    .order('order_index', { ascending: true })
    .limit(1);

  if (sectionError) throw sectionError;
  if (!sections || sections.length === 0) {
    throw new Error('No roadmap section found for this project. Please create a roadmap section first.');
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
    })
    .select()
    .single();

  if (createError) throw createError;

  await deleteNode(nodeId);

  return { roadmapItemId: roadmapItem.id };
}
