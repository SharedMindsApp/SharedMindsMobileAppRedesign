import {
  getTrackChildren,
  getTrack,
  createTrack,
  updateTrack,
  deleteTrack,
  getTracksByProject,
} from './trackService';
import type {
  SubTrack,
  CreateSubTrackInput,
  UpdateSubTrackInput,
  SubTrackStats,
} from './subtracksTypes';
import type { Track } from './coreTypes';
import { supabase } from '../supabase';

function trackToSubTrack(track: Track): SubTrack {
  return {
    id: track.id,
    track_id: track.parentTrackId!,
    name: track.name,
    description: track.description,
    ordering_index: track.orderingIndex,
    is_default: track.metadata?.is_default ?? false,
    start_date: track.metadata?.start_date || null,
    end_date: track.metadata?.end_date || null,
    created_at: track.createdAt,
    updated_at: track.updatedAt,
  };
}

export async function getSubTracksForTrack(trackId: string): Promise<SubTrack[]> {
  console.warn('DEPRECATED: getSubTracksForTrack() uses legacy interface. Use getTrackChildren() from unified trackService instead.');
  const tracks = await getTrackChildren(trackId);
  return tracks.map(trackToSubTrack);
}

export async function getSubTrackById(id: string): Promise<SubTrack | null> {
  console.warn('DEPRECATED: getSubTrackById() uses legacy interface. Use getTrack() from unified trackService instead.');
  const track = await getTrack(id);
  if (!track || !track.parentTrackId) return null;
  return trackToSubTrack(track);
}

export async function createSubTrack(input: CreateSubTrackInput): Promise<SubTrack> {
  console.warn('DEPRECATED: createSubTrack() uses legacy interface. Use createTrack() from unified trackService instead.');

  const parentTrack = await getTrack(input.track_id);
  if (!parentTrack) throw new Error('Parent track not found');

  const track = await createTrack({
    masterProjectId: parentTrack.masterProjectId,
    parentTrackId: input.track_id,
    name: input.name,
    description: input.description || null,
    orderingIndex: 0,
    category: parentTrack.category,
    metadata: {
      is_default: false,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    },
  });

  return trackToSubTrack(track);
}

export async function updateSubTrack(
  id: string,
  input: UpdateSubTrackInput
): Promise<SubTrack> {
  console.warn('DEPRECATED: updateSubTrack() uses legacy interface. Use updateTrack() from unified trackService instead.');

  const existingTrack = await getTrack(id);
  if (!existingTrack || !existingTrack.parentTrackId) {
    throw new Error('Sub-track not found');
  }

  const updates: any = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.ordering_index !== undefined) updates.orderingIndex = input.ordering_index;

  if (input.start_date !== undefined || input.end_date !== undefined) {
    updates.metadata = {
      ...existingTrack.metadata,
      start_date: input.start_date !== undefined ? input.start_date : existingTrack.metadata?.start_date,
      end_date: input.end_date !== undefined ? input.end_date : existingTrack.metadata?.end_date,
    };
  }

  const track = await updateTrack(id, updates);
  return trackToSubTrack(track);
}

export async function deleteSubTrack(id: string): Promise<void> {
  console.warn('DEPRECATED: deleteSubTrack() uses legacy interface. Use deleteTrack() from unified trackService instead.');
  await deleteTrack(id);
}

export async function reorderSubTracks(
  trackId: string,
  orderedSubTrackIds: string[]
): Promise<void> {
  console.warn('DEPRECATED: reorderSubTracks() - use bulk updateTrack() calls with orderingIndex instead.');

  for (let i = 0; i < orderedSubTrackIds.length; i++) {
    await updateTrack(orderedSubTrackIds[i], { orderingIndex: i });
  }
}

export async function bulkAssignItemsToSubTrack(
  itemIds: string[],
  subTrackId: string,
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<void> {
  console.warn('DEPRECATED: bulkAssignItemsToSubTrack() - Items should be assigned to tracks, not subtracks. Subtracks are just tracks with parents.');

  const tableName =
    itemType === 'roadmap'
      ? 'roadmap_items'
      : itemType === 'idea'
      ? 'side_ideas'
      : 'focus_sessions';

  const { error } = await supabase
    .from(tableName)
    .update({ track_id: subTrackId })
    .in('id', itemIds);

  if (error) throw error;
}

export async function bulkUnassignItemsFromSubTrack(
  itemIds: string[],
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<void> {
  console.warn('DEPRECATED: bulkUnassignItemsFromSubTrack() - use track_id=null instead.');

  const tableName =
    itemType === 'roadmap'
      ? 'roadmap_items'
      : itemType === 'idea'
      ? 'side_ideas'
      : 'focus_sessions';

  const { error } = await supabase
    .from(tableName)
    .update({ track_id: null })
    .in('id', itemIds);

  if (error) throw error;
}

export async function getSubTrackStats(subTrackId: string): Promise<SubTrackStats> {
  const [roadmapItemsResult, sideIdeasResult, focusSessionsResult] = await Promise.all([
    supabase
      .from('roadmap_items')
      .select('id, status')
      .eq('track_id', subTrackId),
    supabase
      .from('side_ideas')
      .select('id')
      .eq('track_id', subTrackId),
    supabase
      .from('focus_sessions')
      .select('id')
      .eq('track_id', subTrackId),
  ]);

  const roadmapItems = roadmapItemsResult.data || [];
  const sideIdeas = sideIdeasResult.data || [];
  const focusSessions = focusSessionsResult.data || [];

  const completedItemsCount = roadmapItems.filter(
    (item) => item.status === 'completed'
  ).length;
  const inProgressItemsCount = roadmapItems.filter(
    (item) => item.status === 'in_progress'
  ).length;
  const notStartedItemsCount = roadmapItems.filter(
    (item) => item.status === 'not_started'
  ).length;
  const blockedItemsCount = roadmapItems.filter(
    (item) => item.status === 'blocked'
  ).length;

  return {
    roadmapItemCount: roadmapItems.length,
    sideIdeaCount: sideIdeas.length,
    focusSessionCount: focusSessions.length,
    completedItemsCount,
    inProgressItemsCount,
    notStartedItemsCount,
    blockedItemsCount,
  };
}

export async function getAllSubTracksForProject(
  masterProjectId: string
): Promise<Map<string, SubTrack[]>> {
  console.warn('DEPRECATED: getAllSubTracksForProject() - use getTrackTree() for full hierarchy instead.');

  const allTracks = await getTracksByProject(masterProjectId);
  const parentTracks = allTracks.filter(t => !t.parentTrackId);
  const subtracksByTrack = new Map<string, SubTrack[]>();

  for (const parentTrack of parentTracks) {
    const children = allTracks.filter(t => t.parentTrackId === parentTrack.id);
    subtracksByTrack.set(parentTrack.id, children.map(trackToSubTrack));
  }

  return subtracksByTrack;
}

export async function getItemsBySubTrack(
  subTrackId: string,
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<any[]> {
  const tableName =
    itemType === 'roadmap'
      ? 'roadmap_items'
      : itemType === 'idea'
      ? 'side_ideas'
      : 'focus_sessions';

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('track_id', subTrackId);

  if (error) throw error;
  return data || [];
}

export async function moveItemToSubTrack(
  itemId: string,
  subTrackId: string | null,
  itemType: 'roadmap' | 'idea' | 'session'
): Promise<void> {
  const tableName =
    itemType === 'roadmap'
      ? 'roadmap_items'
      : itemType === 'idea'
      ? 'side_ideas'
      : 'focus_sessions';

  const { error } = await supabase
    .from(tableName)
    .update({ track_id: subTrackId })
    .eq('id', itemId);

  if (error) throw error;
}

export async function duplicateSubTrack(
  subTrackId: string,
  newName?: string
): Promise<SubTrack> {
  console.warn('DEPRECATED: duplicateSubTrack() - use createTrack() with same parentTrackId instead.');

  const original = await getSubTrackById(subTrackId);
  if (!original) throw new Error('Sub-track not found');

  const newSubTrack = await createSubTrack({
    track_id: original.track_id,
    name: newName || `${original.name} (Copy)`,
    description: original.description || undefined,
  });

  return newSubTrack;
}

export async function getSubTrackProgress(subTrackId: string): Promise<{
  total: number;
  completed: number;
  percentage: number;
}> {
  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select('status')
    .eq('track_id', subTrackId);

  if (error) throw error;

  const total = items?.length || 0;
  const completed = items?.filter((item) => item.status === 'completed').length || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    percentage,
  };
}
