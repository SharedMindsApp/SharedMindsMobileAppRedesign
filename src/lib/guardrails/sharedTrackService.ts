import { supabase } from '../supabase';
import type {
  Track,
  TrackProjectInstance,
  TrackProjectInfo,
  TrackWithInstance,
  CreateTrackInstanceInput,
  UpdateTrackInstanceInput,
  LinkTrackToProjectInput,
  UnlinkTrackFromProjectInput,
  ConvertToSharedTrackInput,
  TrackAuthorityMode,
} from './tracksTypes';
import {
  validateTrackLinking,
  validateTrackUnlinking,
  validateConvertToShared,
  validatePrimaryOwnerTransfer,
  checkEditPermission,
  SHARED_TRACK_ERROR_MESSAGES,
  DEFAULT_AUTHORITY_MODE,
} from './sharedTrackValidation';

function transformTrackInstanceFromDb(row: any): TrackProjectInstance {
  return {
    id: row.id,
    trackId: row.track_id,
    masterProjectId: row.master_project_id,
    includeInRoadmap: row.include_in_roadmap,
    visibilityState: row.visibility_state,
    orderIndex: row.order_index,
    isPrimary: row.is_primary,
    instanceMetadata: row.instance_metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTrackProjects(
  trackId: string
): Promise<TrackProjectInfo[]> {
  const { data, error } = await supabase.rpc('get_track_projects', {
    input_track_id: trackId,
  });

  if (error) {
    console.error('Error fetching track projects:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    projectId: row.project_id,
    isPrimary: row.is_primary,
    includeInRoadmap: row.include_in_roadmap,
    visibilityState: row.visibility_state,
  }));
}

export async function getProjectTracks(
  projectId: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_project_tracks', {
    input_project_id: projectId,
  });

  if (error) {
    console.error('Error fetching project tracks:', error);
    return [];
  }

  return (data || []).map((row: any) => row.track_id);
}

export async function getTrackInstance(
  trackId: string,
  projectId: string
): Promise<TrackProjectInstance | null> {
  const { data, error } = await supabase
    .from('track_project_instances')
    .select('*')
    .eq('track_id', trackId)
    .eq('master_project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return transformTrackInstanceFromDb(data);
}

export async function createTrackInstance(
  input: CreateTrackInstanceInput
): Promise<{ success: boolean; error?: string; instance?: TrackProjectInstance }> {
  const {
    trackId,
    masterProjectId,
    includeInRoadmap = true,
    visibilityState = 'visible',
    orderIndex = 0,
    isPrimary = false,
    instanceMetadata = {},
  } = input;

  const existingProjects = await getTrackProjects(trackId);
  const existingProjectIds = existingProjects.map((p) => p.projectId);

  const validation = validateTrackLinking(
    trackId,
    masterProjectId,
    existingProjectIds
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
    };
  }

  const { data, error } = await supabase
    .from('track_project_instances')
    .insert({
      track_id: trackId,
      master_project_id: masterProjectId,
      include_in_roadmap: includeInRoadmap,
      visibility_state: visibilityState,
      order_index: orderIndex,
      is_primary: isPrimary,
      instance_metadata: instanceMetadata,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'Failed to create track instance',
    };
  }

  return {
    success: true,
    instance: transformTrackInstanceFromDb(data),
  };
}

export async function updateTrackInstance(
  trackId: string,
  projectId: string,
  input: UpdateTrackInstanceInput
): Promise<{ success: boolean; error?: string; instance?: TrackProjectInstance }> {
  const updateData: any = {};

  if (input.includeInRoadmap !== undefined) {
    updateData.include_in_roadmap = input.includeInRoadmap;
  }

  if (input.visibilityState !== undefined) {
    updateData.visibility_state = input.visibilityState;
  }

  if (input.orderIndex !== undefined) {
    updateData.order_index = input.orderIndex;
  }

  if (input.instanceMetadata !== undefined) {
    updateData.instance_metadata = input.instanceMetadata;
  }

  const { data, error } = await supabase
    .from('track_project_instances')
    .update(updateData)
    .eq('track_id', trackId)
    .eq('master_project_id', projectId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'Failed to update track instance',
    };
  }

  return {
    success: true,
    instance: transformTrackInstanceFromDb(data),
  };
}

export async function deleteTrackInstance(
  trackId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('track_project_instances')
    .delete()
    .eq('track_id', trackId)
    .eq('master_project_id', projectId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

export async function linkTrackToProject(
  input: LinkTrackToProjectInput
): Promise<{ success: boolean; error?: string; instance?: TrackProjectInstance }> {
  const {
    trackId,
    projectId,
    includeInRoadmap = true,
    visibilityState = 'visible',
  } = input;

  const { data: trackData, error: trackError } = await supabase
    .from('guardrails_tracks')
    .select('is_shared, master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  if (trackError || !trackData) {
    return {
      success: false,
      error: 'Track not found',
    };
  }

  if (!trackData.is_shared) {
    return {
      success: false,
      error: SHARED_TRACK_ERROR_MESSAGES.TRACK_NOT_SHARED,
    };
  }

  return createTrackInstance({
    trackId,
    masterProjectId: projectId,
    includeInRoadmap,
    visibilityState,
    isPrimary: false,
  });
}

export async function unlinkTrackFromProject(
  input: UnlinkTrackFromProjectInput
): Promise<{ success: boolean; error?: string }> {
  const { trackId, projectId } = input;

  const existingProjects = await getTrackProjects(trackId);
  const existingProjectIds = existingProjects.map((p) => p.projectId);
  const isPrimaryProject = existingProjects.find(
    (p) => p.projectId === projectId
  )?.isPrimary || false;

  const validation = validateTrackUnlinking(
    trackId,
    projectId,
    existingProjectIds,
    isPrimaryProject
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
    };
  }

  return deleteTrackInstance(trackId, projectId);
}

export async function convertTrackToShared(
  input: ConvertToSharedTrackInput
): Promise<{ success: boolean; error?: string; track?: Track }> {
  const { trackId, authorityMode = DEFAULT_AUTHORITY_MODE } = input;

  const { data: trackData, error: trackError } = await supabase
    .from('guardrails_tracks')
    .select('id, master_project_id, is_shared, parent_track_id')
    .eq('id', trackId)
    .maybeSingle();

  if (trackError || !trackData) {
    return {
      success: false,
      error: 'Track not found',
    };
  }

  if (trackData.is_shared) {
    return {
      success: false,
      error: 'Track is already shared',
    };
  }

  const { data: subtracksData } = await supabase
    .from('guardrails_tracks')
    .select('id')
    .eq('parent_track_id', trackId);

  const { data: itemsData } = await supabase
    .from('roadmap_items')
    .select('id')
    .eq('track_id', trackId);

  const validation = validateConvertToShared(
    (subtracksData || []).length > 0,
    (itemsData || []).length > 0,
    (subtracksData || []).length > 0
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
    };
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('guardrails_tracks')
    .update({
      is_shared: true,
      primary_owner_project_id: trackData.master_project_id,
      authority_mode: authorityMode,
    })
    .eq('id', trackId)
    .select()
    .maybeSingle();

  if (updateError || !updatedData) {
    return {
      success: false,
      error: updateError?.message || 'Failed to convert track to shared',
    };
  }

  const createInstanceResult = await createTrackInstance({
    trackId,
    masterProjectId: trackData.master_project_id,
    includeInRoadmap: true,
    visibilityState: 'visible',
    isPrimary: true,
  });

  if (!createInstanceResult.success) {
    return {
      success: false,
      error: `Track converted but failed to create primary instance: ${createInstanceResult.error}`,
    };
  }

  return {
    success: true,
  };
}

export async function transferPrimaryOwnership(
  trackId: string,
  newPrimaryProjectId: string
): Promise<{ success: boolean; error?: string }> {
  const existingProjects = await getTrackProjects(trackId);
  const existingProjectIds = existingProjects.map((p) => p.projectId);
  const currentPrimaryProject = existingProjects.find((p) => p.isPrimary);

  const validation = validatePrimaryOwnerTransfer(
    currentPrimaryProject?.projectId || null,
    newPrimaryProjectId,
    existingProjectIds
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
    };
  }

  const { error: trackError } = await supabase
    .from('guardrails_tracks')
    .update({
      primary_owner_project_id: newPrimaryProjectId,
    })
    .eq('id', trackId);

  if (trackError) {
    return {
      success: false,
      error: trackError.message,
    };
  }

  const { error: instanceError } = await supabase
    .from('track_project_instances')
    .update({ is_primary: true })
    .eq('track_id', trackId)
    .eq('master_project_id', newPrimaryProjectId);

  if (instanceError) {
    return {
      success: false,
      error: instanceError.message,
    };
  }

  return { success: true };
}

export async function changeTrackAuthorityMode(
  trackId: string,
  newAuthorityMode: TrackAuthorityMode
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('guardrails_tracks')
    .update({
      authority_mode: newAuthorityMode,
    })
    .eq('id', trackId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

export async function checkTrackEditPermission(
  trackId: string,
  projectId: string
): Promise<{ canEdit: boolean; reason?: string }> {
  const { data: trackData, error: trackError } = await supabase
    .from('guardrails_tracks')
    .select('is_shared, master_project_id, primary_owner_project_id, authority_mode')
    .eq('id', trackId)
    .maybeSingle();

  if (trackError || !trackData) {
    return {
      canEdit: false,
      reason: 'Track not found',
    };
  }

  let isLinkedProject = false;

  if (trackData.is_shared) {
    const instance = await getTrackInstance(trackId, projectId);
    isLinkedProject = instance !== null;
  } else {
    isLinkedProject = trackData.master_project_id === projectId;
  }

  return checkEditPermission(
    trackData.is_shared,
    trackData.authority_mode,
    trackData.master_project_id,
    trackData.primary_owner_project_id,
    projectId,
    isLinkedProject
  );
}

export async function getTracksForProject(
  projectId: string,
  includeInstances = false
): Promise<TrackWithInstance[]> {
  const trackIds = await getProjectTracks(projectId);

  if (trackIds.length === 0) return [];

  const { data: tracksData, error: tracksError } = await supabase
    .from('guardrails_tracks')
    .select('*')
    .in('id', trackIds);

  if (tracksError || !tracksData) {
    return [];
  }

  const tracks: TrackWithInstance[] = [];

  for (const trackData of tracksData) {
    const track: TrackWithInstance = {
      id: trackData.id,
      masterProjectId: trackData.master_project_id,
      name: trackData.name,
      description: trackData.description,
      color: trackData.color,
      orderingIndex: trackData.ordering_index,
      isDefault: trackData.is_default,
      isShared: trackData.is_shared,
      primaryOwnerProjectId: trackData.primary_owner_project_id,
      authorityMode: trackData.authority_mode,
      start_date: trackData.start_date,
      end_date: trackData.end_date,
      createdAt: trackData.created_at,
      updatedAt: trackData.updated_at,
    };

    if (includeInstances && trackData.is_shared) {
      const instance = await getTrackInstance(trackData.id, projectId);
      if (instance) {
        track.instance = instance;
      }
    }

    tracks.push(track);
  }

  return tracks;
}

export async function isTrackLinkedToProject(
  trackId: string,
  projectId: string
): Promise<boolean> {
  const { data: trackData } = await supabase
    .from('guardrails_tracks')
    .select('is_shared, master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  if (!trackData) return false;

  if (!trackData.is_shared) {
    return trackData.master_project_id === projectId;
  }

  const instance = await getTrackInstance(trackId, projectId);
  return instance !== null;
}
