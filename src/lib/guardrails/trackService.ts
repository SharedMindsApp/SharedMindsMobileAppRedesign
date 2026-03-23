import { supabase } from '../supabase';
import type {
  Track,
  CreateTrackInput,
  UpdateTrackInput,
  TrackCategory,
  TrackWithChildren,
  TrackValidationResult,
  ValidationError,
} from './coreTypes';
import { CATEGORY_RULES } from './coreTypes';

const TABLE_NAME = 'guardrails_tracks';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

function transformKeysFromDb(row: any): Track {
  // Default includeInRoadmap to true if not set (tracks should be visible by default)
  // The database column has DEFAULT true, but existing tracks might have NULL values
  const includeInRoadmap = row.include_in_roadmap !== undefined && row.include_in_roadmap !== null 
    ? row.include_in_roadmap 
    : true;
  
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    parentTrackId: row.parent_track_id,
    name: row.name,
    description: row.description,
    color: row.color,
    orderingIndex: row.ordering_index,
    category: row.category,
    includeInRoadmap: includeInRoadmap,
    status: row.status,
    templateId: row.template_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function validateTrack(
  input: CreateTrackInput | UpdateTrackInput,
  existingTrack?: Track
): Promise<TrackValidationResult> {
  const errors: ValidationError[] = [];

  const category = ('category' in input && input.category)
    ? input.category
    : existingTrack?.category || 'main';

  const parentTrackId = ('parentTrackId' in input && input.parentTrackId !== undefined)
    ? input.parentTrackId
    : existingTrack?.parentTrackId || null;

  const rules = CATEGORY_RULES[category];

  if (parentTrackId && !rules.canHaveSubtracks) {
    errors.push({
      field: 'parentTrackId',
      message: `Tracks with category '${category}' cannot be nested (no subtracks allowed)`,
    });
  }

  if ('includeInRoadmap' in input && input.includeInRoadmap && !rules.canAppearInRoadmap) {
    errors.push({
      field: 'includeInRoadmap',
      message: `Tracks with category '${category}' cannot appear in roadmap`,
    });
  }

  if (parentTrackId && rules.maxDepth !== null) {
    const depth = await calculateTrackDepth(parentTrackId);
    if (depth >= rules.maxDepth) {
      errors.push({
        field: 'parentTrackId',
        message: `Maximum depth of ${rules.maxDepth} exceeded for category '${category}'`,
      });
    }
  }

  if ('name' in input && (!input.name || input.name.trim().length === 0)) {
    errors.push({
      field: 'name',
      message: 'Track name is required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function calculateTrackDepth(trackId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = trackId;

  while (currentId && depth < 100) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('parent_track_id')
      .eq('id', currentId)
      .maybeSingle();

    if (error || !data) break;

    currentId = data.parent_track_id;
    if (currentId) depth++;
  }

  return depth;
}

export async function createTrack(input: CreateTrackInput): Promise<Track> {
  const validation = await validateTrack(input);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;
  return transformKeysFromDb(data);
}

export async function updateTrack(id: string, input: UpdateTrackInput): Promise<Track> {
  const { data: existing, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const existingTrack = transformKeysFromDb(existing);
  const validation = await validateTrack(input, existingTrack);

  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transformKeysFromDb(data);
}

/**
 * @deprecated Use softDeleteTrack from trackSoftDeleteService instead
 * This function now performs a soft delete for backward compatibility
 */
export async function deleteTrack(id: string): Promise<void> {
  const { softDeleteTrack } = await import('./trackSoftDeleteService');
  await softDeleteTrack(id);
}

export async function getTrack(id: string): Promise<Track | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return transformKeysFromDb(data);
}

export async function getTracksByProject(masterProjectId: string): Promise<Track[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .is('deleted_at', null)
    .order('ordering_index', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getTracksByCategory(
  masterProjectId: string,
  category: TrackCategory
): Promise<Track[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .eq('category', category)
    .is('deleted_at', null)
    .order('ordering_index', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getTrackChildren(trackId: string): Promise<Track[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('parent_track_id', trackId)
    .is('deleted_at', null)
    .order('ordering_index', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getTrackTree(masterProjectId: string): Promise<TrackWithChildren[]> {
  const tracks = await getTracksByProject(masterProjectId);

  const trackMap = new Map<string, TrackWithChildren>();
  tracks.forEach(track => {
    trackMap.set(track.id, { ...track, children: [], depth: 0 });
  });

  const roots: TrackWithChildren[] = [];

  tracks.forEach(track => {
    const trackWithChildren = trackMap.get(track.id)!;

    if (track.parentTrackId) {
      const parent = trackMap.get(track.parentTrackId);
      if (parent) {
        trackWithChildren.depth = parent.depth + 1;
        parent.children.push(trackWithChildren);
      } else {
        roots.push(trackWithChildren);
      }
    } else {
      roots.push(trackWithChildren);
    }
  });

  return roots;
}

export async function convertTrackToSideProject(trackId: string): Promise<void> {
  const { error } = await supabase.rpc('convert_track_to_side_project', {
    track_id: trackId,
  });

  if (error) throw error;
}

export async function convertTrackToOffshoot(trackId: string): Promise<void> {
  const { error } = await supabase.rpc('convert_track_to_offshoot', {
    track_id: trackId,
  });

  if (error) throw error;
}

export async function promoteSideProjectToMaster(
  trackId: string,
  domainId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('promote_side_project_to_master', {
    track_id: trackId,
    domain_id: domainId,
  });

  if (error) throw error;
  return data as string;
}

export async function toggleTrackRoadmapVisibility(
  trackId: string,
  includeInRoadmap: boolean
): Promise<Track> {
  const track = await getTrack(trackId);
  if (!track) throw new Error('Track not found');

  const rules = CATEGORY_RULES[track.category];
  if (includeInRoadmap && !rules.canAppearInRoadmap) {
    throw new Error(`Tracks with category '${track.category}' cannot appear in roadmap`);
  }

  return updateTrack(trackId, { includeInRoadmap });
}

export async function propagateCategoryToDescendants(
  trackId: string,
  category: TrackCategory
): Promise<void> {
  const children = await getTrackChildren(trackId);

  for (const child of children) {
    await updateTrack(child.id, { category });
    await propagateCategoryToDescendants(child.id, category);
  }
}

export interface TrackWithStats extends Track {
  roadmapItemsCount: number;
  nodesCount: number;
  totalItemsCount: number;
}

export async function getTracksByCategoryWithStats(
  masterProjectId: string,
  category: TrackCategory
): Promise<TrackWithStats[]> {
  const tracks = await getTracksByCategory(masterProjectId, category);

  const tracksWithStats: TrackWithStats[] = [];

  for (const track of tracks) {
    const [roadmapResult, nodesResult] = await Promise.all([
      supabase
        .from('roadmap_items')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', track.id),
      supabase
        .from('guardrails_nodes')
        .select('id', { count: 'exact', head: true })
        .eq('track_id', track.id),
    ]);

    const roadmapCount = (roadmapResult as any).count || 0;
    const nodesCount = (nodesResult as any).count || 0;

    tracksWithStats.push({
      ...track,
      roadmapItemsCount: roadmapCount,
      nodesCount,
      totalItemsCount: roadmapCount + nodesCount,
    });
  }

  return tracksWithStats;
}

export async function archiveTrack(id: string): Promise<void> {
  await updateTrack(id, { status: 'archived' });
}
