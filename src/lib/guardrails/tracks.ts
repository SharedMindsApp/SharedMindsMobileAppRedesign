import { supabase } from '../supabase';
import type { Track, CreateTrackInput, UpdateTrackInput } from './tracksTypes';

export async function getTracksForProject(masterProjectId: string): Promise<Track[]> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .is('deleted_at', null)
    .order('ordering_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tracks: ${error.message}`);
  }

  // Filter to only main tracks (parent_track_id is null)
  // Handle gracefully if column doesn't exist (filter returns all, which is acceptable)
  const mainTracks = (data || []).filter((dbTrack: any) => {
    // If parent_track_id column exists, filter by it
    if ('parent_track_id' in dbTrack) {
      return dbTrack.parent_track_id === null;
    }
    // If column doesn't exist, assume all tracks are main tracks (backward compatibility)
    return true;
  });

  return mainTracks.map((dbTrack: any) => ({
    id: dbTrack.id,
    masterProjectId: dbTrack.master_project_id,
    name: dbTrack.name,
    description: dbTrack.description,
    color: dbTrack.color,
    orderingIndex: dbTrack.ordering_index,
    isDefault: dbTrack.metadata?.is_default ?? false,
    start_date: dbTrack.start_date,
    end_date: dbTrack.end_date,
    createdAt: dbTrack.created_at,
    updatedAt: dbTrack.updated_at,
  }));
}

export async function getTrackById(trackId: string): Promise<Track | null> {
  const { data, error } = await supabase
    .from('guardrails_tracks')
    .select('*')
    .eq('id', trackId)
    .is('parent_track_id', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch track: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    masterProjectId: data.master_project_id,
    name: data.name,
    description: data.description,
    color: data.color,
    orderingIndex: data.ordering_index,
    isDefault: data.metadata?.is_default ?? false,
    start_date: data.start_date,
    end_date: data.end_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createTrack(params: CreateTrackInput): Promise<Track> {
  const {
    masterProjectId,
    name,
    description,
    color,
    orderingIndex,
    isDefault = false,
  } = params;

  let finalOrderingIndex = orderingIndex;

  if (finalOrderingIndex === undefined) {
    const existingTracks = await getTracksForProject(masterProjectId);
    finalOrderingIndex = existingTracks.length > 0
      ? Math.max(...existingTracks.map(t => t.orderingIndex)) + 1
      : 0;
  }

  const { data, error } = await supabase
    .from('guardrails_tracks')
    .insert({
      master_project_id: masterProjectId,
      parent_track_id: null,
      name,
      description: description || null,
      color: color || null,
      ordering_index: finalOrderingIndex,
      metadata: { is_default: isDefault },
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create track: ${error.message}`);
  }

  return {
    id: data.id,
    masterProjectId: data.master_project_id,
    name: data.name,
    description: data.description,
    color: data.color,
    orderingIndex: data.ordering_index,
    isDefault: data.metadata?.is_default ?? false,
    start_date: data.start_date,
    end_date: data.end_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateTrack(
  trackId: string,
  updates: UpdateTrackInput
): Promise<Track> {
  const updateData: Record<string, any> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.orderingIndex !== undefined) updateData.ordering_index = updates.orderingIndex;
  if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date;

  const { data, error } = await supabase
    .from('guardrails_tracks')
    .update(updateData)
    .eq('id', trackId)
    .is('parent_track_id', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update track: ${error.message}`);
  }

  return {
    id: data.id,
    masterProjectId: data.master_project_id,
    name: data.name,
    description: data.description,
    color: data.color,
    orderingIndex: data.ordering_index,
    isDefault: data.metadata?.is_default ?? false,
    start_date: data.start_date,
    end_date: data.end_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * @deprecated Use softDeleteTrack from trackSoftDeleteService instead
 * This function now performs a soft delete for backward compatibility
 */
export async function deleteTrack(trackId: string): Promise<void> {
  const { softDeleteTrack } = await import('./trackSoftDeleteService');
  await softDeleteTrack(trackId);
}

export async function reorderTracks(
  masterProjectId: string,
  orderedTrackIds: string[]
): Promise<Track[]> {
  const updates = orderedTrackIds.map((trackId, index) => ({
    id: trackId,
    ordering_index: index,
  }));

  const updatePromises = updates.map(update =>
    supabase
      .from('guardrails_tracks')
      .update({ ordering_index: update.ordering_index })
      .eq('id', update.id)
      .eq('master_project_id', masterProjectId)
      .is('parent_track_id', null)
  );

  const results = await Promise.all(updatePromises);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to reorder tracks: ${errors[0].error?.message}`);
  }

  return getTracksForProject(masterProjectId);
}

export async function getTrackStats(trackId: string): Promise<{
  roadmapItemCount: number;
  sideIdeaCount: number;
  focusSessionCount: number;
}> {
  const [roadmapResult, sideIdeasResult, focusResult] = await Promise.all([
    supabase
      .from('roadmap_items')
      .select('id', { count: 'exact', head: true })
      .eq('track_id', trackId),
    supabase
      .from('side_ideas')
      .select('id', { count: 'exact', head: true })
      .eq('track_id', trackId),
    supabase
      .from('focus_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('track_id', trackId),
  ]);

  return {
    roadmapItemCount: roadmapResult.count || 0,
    sideIdeaCount: sideIdeasResult.count || 0,
    focusSessionCount: focusResult.count || 0,
  };
}

export async function assignItemsToTrack(
  trackId: string,
  itemType: 'roadmap' | 'side_ideas' | 'focus_sessions',
  itemIds: string[]
): Promise<void> {
  const tableName = itemType === 'roadmap' ? 'roadmap_items' : itemType;

  const updatePromises = itemIds.map(itemId =>
    supabase
      .from(tableName)
      .update({ track_id: trackId })
      .eq('id', itemId)
  );

  const results = await Promise.all(updatePromises);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to assign items to track: ${errors[0].error?.message}`);
  }
}

export async function unassignItemsFromTrack(
  itemType: 'roadmap' | 'side_ideas' | 'focus_sessions',
  itemIds: string[]
): Promise<void> {
  const tableName = itemType === 'roadmap' ? 'roadmap_items' : itemType;

  const updatePromises = itemIds.map(itemId =>
    supabase
      .from(tableName)
      .update({ track_id: null })
      .eq('id', itemId)
  );

  const results = await Promise.all(updatePromises);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to unassign items from track: ${errors[0].error?.message}`);
  }
}
