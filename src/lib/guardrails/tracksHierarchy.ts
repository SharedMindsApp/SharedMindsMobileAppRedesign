import { supabase } from '../supabase';

export interface TrackV2 {
  id: string;
  masterProjectId: string;
  parentTrackId: string | null;
  name: string;
  description: string | null;
  color: string | null;
  orderingIndex: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TrackTreeNode extends TrackV2 {
  depth: number;
  path: string[];
  children: TrackTreeNode[];
}

export interface FlatTrackWithPath extends TrackV2 {
  ancestryPath: string;
  depth: number;
}

export interface CreateTrackInput {
  masterProjectId: string;
  parentTrackId?: string | null;
  name: string;
  description?: string | null;
  color?: string | null;
  orderingIndex?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTrackInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  orderingIndex?: number;
  parentTrackId?: string | null;
  metadata?: Record<string, any>;
}

export interface MoveTrackInput {
  trackId: string;
  newParentId: string | null;
  newOrderingIndex: number;
}

export interface DeleteTrackOptions {
  reassignChildren?: boolean;
  newParentId?: string | null;
}

function mapDbTrackToTrackV2(dbTrack: any): TrackV2 {
  return {
    id: dbTrack.id,
    masterProjectId: dbTrack.master_project_id,
    parentTrackId: dbTrack.parent_track_id,
    name: dbTrack.name,
    description: dbTrack.description,
    color: dbTrack.color,
    orderingIndex: dbTrack.ordering_index,
    metadata: dbTrack.metadata || {},
    createdAt: dbTrack.created_at,
    updatedAt: dbTrack.updated_at,
  };
}

/**
 * Get the complete track tree for a project
 * Uses recursive CTE for optimal performance
 */
export async function getTracksTree(masterProjectId: string): Promise<TrackTreeNode[]> {
  const { data, error } = await supabase.rpc('get_tracks_tree', {
    project_id: masterProjectId,
  });

  if (error) {
    console.error('Error fetching tracks tree:', error);
    throw new Error(`Failed to fetch tracks tree: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const trackMap = new Map<string, TrackTreeNode>();
  const rootTracks: TrackTreeNode[] = [];

  for (const row of data) {
    const track: TrackTreeNode = {
      id: row.id,
      masterProjectId: row.master_project_id,
      parentTrackId: row.parent_track_id,
      name: row.name,
      description: row.description,
      color: row.color,
      orderingIndex: row.ordering_index,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      depth: row.depth,
      path: row.path,
      children: [],
    };

    trackMap.set(track.id, track);
  }

  for (const track of trackMap.values()) {
    if (track.parentTrackId === null) {
      rootTracks.push(track);
    } else {
      const parent = trackMap.get(track.parentTrackId);
      if (parent) {
        parent.children.push(track);
      }
    }
  }

  return rootTracks;
}

/**
 * Get flattened tracks list with ancestry paths
 * Useful for module UIs like Roadmap, TaskFlow, Focus Mode
 */
export async function flattenTracksForModules(
  masterProjectId: string
): Promise<FlatTrackWithPath[]> {
  const { data, error } = await supabase.rpc('get_tracks_tree', {
    project_id: masterProjectId,
  });

  if (error) {
    console.error('Error fetching flat tracks:', error);
    throw new Error(`Failed to fetch flat tracks: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    masterProjectId: row.master_project_id,
    parentTrackId: row.parent_track_id,
    name: row.name,
    description: row.description,
    color: row.color,
    orderingIndex: row.ordering_index,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ancestryPath: row.path.join(' > '),
    depth: row.depth,
  }));
}

/**
 * Create a new track at any level
 * Can be top-level (parentTrackId=null) or nested under any parent
 */
export async function createTrack(input: CreateTrackInput): Promise<TrackV2> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .insert({
      master_project_id: input.masterProjectId,
      parent_track_id: input.parentTrackId || null,
      name: input.name,
      description: input.description || null,
      color: input.color || null,
      ordering_index: input.orderingIndex ?? 0,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating track:', error);
    throw new Error(`Failed to create track: ${error.message}`);
  }

  return mapDbTrackToTrackV2(data);
}

/**
 * Update a track's properties
 * Can change name, description, color, ordering, parent, metadata
 */
export async function updateTrack(
  trackId: string,
  updates: UpdateTrackInput
): Promise<TrackV2> {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.orderingIndex !== undefined) updateData.ordering_index = updates.orderingIndex;
  if (updates.parentTrackId !== undefined) updateData.parent_track_id = updates.parentTrackId;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { data, error } = await supabase
    .from('guardrails_tracks')
    .update(updateData)
    .eq('id', trackId)
    .select()
    .single();

  if (error) {
    console.error('Error updating track:', error);
    throw new Error(`Failed to update track: ${error.message}`);
  }

  return mapDbTrackToTrackV2(data);
}

/**
 * Move a track to a new parent and/or reorder it
 * Handles both reparenting and reordering in one operation
 */
export async function moveTrack(input: MoveTrackInput): Promise<TrackV2> {
  return await updateTrack(input.trackId, {
    parentTrackId: input.newParentId,
    orderingIndex: input.newOrderingIndex,
  });
}

/**
 * @deprecated Use softDeleteTrack from trackSoftDeleteService instead
 * This function now performs a soft delete for backward compatibility
 * Note: reassignChildren option is ignored - soft delete preserves hierarchy
 */
export async function deleteTrack(
  trackId: string,
  options: DeleteTrackOptions = {}
): Promise<void> {
  const { softDeleteTrack } = await import('./trackSoftDeleteService');
  await softDeleteTrack(trackId);
  // Note: Children remain linked but will also be hidden since parent is deleted
  // If reassignment is needed, it should be done before soft delete
}

/**
 * Get a single track by ID
 */
export async function getTrackById(trackId: string): Promise<TrackV2 | null> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('*')
    .eq('id', trackId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching track:', error);
    throw new Error(`Failed to fetch track: ${error.message}`);
  }

  return mapDbTrackToTrackV2(data);
}

/**
 * Get immediate children of a track
 */
export async function getTrackChildren(trackId: string): Promise<TrackV2[]> {
  const { data, error } = await supabase.rpc('get_track_children', {
    track_id: trackId,
  });

  if (error) {
    console.error('Error fetching track children:', error);
    throw new Error(`Failed to fetch track children: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(mapDbTrackToTrackV2);
}

/**
 * Get the full ancestry path for a track
 */
export async function getTrackAncestryPath(trackId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_track_ancestry_path', {
    track_id: trackId,
  });

  if (error) {
    console.error('Error fetching track ancestry:', error);
    throw new Error(`Failed to fetch track ancestry: ${error.message}`);
  }

  return data || '';
}

/**
 * Get all top-level tracks for a project
 */
export async function getTopLevelTracks(masterProjectId: string): Promise<TrackV2[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .is('parent_track_id', null)
    .order('ordering_index', { ascending: true });

  if (error) {
    console.error('Error fetching top-level tracks:', error);
    throw new Error(`Failed to fetch top-level tracks: ${error.message}`);
  }

  return (data || []).map(mapDbTrackToTrackV2);
}

/**
 * Check if a track has children
 */
export async function trackHasChildren(trackId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('guardrails_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('parent_track_id', trackId);

  if (error) {
    console.error('Error checking track children:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Get the depth of a track in the hierarchy
 */
export async function getTrackDepth(trackId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = trackId;
  const maxDepth = 100;

  while (currentId && depth < maxDepth) {
    const { data } = await supabase
      .from('guardrails_tracks')
      .select('parent_track_id')
      .eq('id', currentId)
      .single();

    if (!data || !data.parent_track_id) {
      break;
    }

    currentId = data.parent_track_id;
    depth++;
  }

  return depth;
}

/**
 * Get all tracks for a project (flat list, no hierarchy)
 */
export async function getAllTracks(masterProjectId: string): Promise<TrackV2[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .is('deleted_at', null)
    .order('ordering_index', { ascending: true });

  if (error) {
    console.error('Error fetching all tracks:', error);
    throw new Error(`Failed to fetch all tracks: ${error.message}`);
  }

  return (data || []).map(mapDbTrackToTrackV2);
}

/**
 * Reorder tracks within the same parent
 */
export async function reorderTracks(
  trackIds: string[],
  parentTrackId: string | null
): Promise<void> {
  const updates = trackIds.map((id, index) => ({
    id,
    ordering_index: index,
  }));

  for (const update of updates) {
    await supabase
      .from('guardrails_tracks')
      .update({ ordering_index: update.ordering_index })
      .eq('id', update.id);
  }
}

/**
 * Batch create multiple tracks
 */
export async function batchCreateTracks(
  tracks: CreateTrackInput[]
): Promise<TrackV2[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .insert(
      tracks.map((track) => ({
        master_project_id: track.masterProjectId,
        parent_track_id: track.parentTrackId || null,
        name: track.name,
        description: track.description || null,
        color: track.color || null,
        ordering_index: track.orderingIndex ?? 0,
        metadata: track.metadata || {},
      }))
    )
    .select();

  if (error) {
    console.error('Error batch creating tracks:', error);
    throw new Error(`Failed to batch create tracks: ${error.message}`);
  }

  return (data || []).map(mapDbTrackToTrackV2);
}
