import { supabase } from '../supabase';
import type {
  CollaborationActivity,
  RecordActivityInput,
  EntityCollaborator,
  CollaborationFootprintEntry,
  CollaborationHeatmapEntry,
  ActiveUser,
  DormantEntity,
  CrossProjectActivity,
  CollaboratedTrack,
  ParticipationIntensity,
  GetCollaboratorsOptions,
  GetCollaborationFootprintOptions,
  GetProjectHeatmapOptions,
  GetActiveUsersOptions,
  GetDormantEntitiesOptions,
  GetCrossProjectActivityOptions,
  GetMostCollaboratedTracksOptions,
  GetParticipationIntensityOptions,
} from './collaborationTypes';

function transformActivityFromDb(row: any): CollaborationActivity {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    surfaceType: row.surface_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    activityType: row.activity_type,
    contextMetadata: row.context_metadata || {},
    createdAt: row.created_at,
  };
}

export async function recordActivity(
  input: RecordActivityInput
): Promise<{ success: boolean; error?: string; activity?: CollaborationActivity }> {
  const {
    userId,
    projectId = null,
    surfaceType,
    entityType,
    entityId,
    activityType,
    contextMetadata = {},
  } = input;

  const { data, error } = await supabase
    .from('collaboration_activity')
    .insert({
      user_id: userId,
      project_id: projectId,
      surface_type: surfaceType,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: activityType,
      context_metadata: contextMetadata,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || 'Failed to record collaboration activity',
    };
  }

  return {
    success: true,
    activity: transformActivityFromDb(data),
  };
}

export async function getEntityCollaborators(
  options: GetCollaboratorsOptions
): Promise<EntityCollaborator[]> {
  const { entityType, entityId, limit = 10 } = options;

  const { data, error } = await supabase.rpc('get_entity_collaborators', {
    input_entity_type: entityType,
    input_entity_id: entityId,
    limit_count: limit,
  });

  if (error || !data) {
    console.error('Error fetching entity collaborators:', error);
    return [];
  }

  return data.map((row: any) => ({
    userId: row.user_id,
    activityCount: parseInt(row.activity_count),
    lastActivityAt: row.last_activity_at,
    activityTypes: row.activity_types,
  }));
}

export async function getUserCollaborationFootprint(
  options: GetCollaborationFootprintOptions
): Promise<CollaborationFootprintEntry[]> {
  const { userId, projectId, daysBack = 30 } = options;

  const { data, error } = await supabase.rpc('get_user_collaboration_footprint', {
    input_user_id: userId,
    input_project_id: projectId || null,
    days_back: daysBack,
  });

  if (error || !data) {
    console.error('Error fetching user collaboration footprint:', error);
    return [];
  }

  return data.map((row: any) => ({
    surfaceType: row.surface_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    activityCount: parseInt(row.activity_count),
    lastActivityAt: row.last_activity_at,
  }));
}

export async function getProjectCollaborationHeatmap(
  options: GetProjectHeatmapOptions
): Promise<CollaborationHeatmapEntry[]> {
  const { projectId, daysBack = 30 } = options;

  const { data, error } = await supabase.rpc('get_project_collaboration_heatmap', {
    input_project_id: projectId,
    days_back: daysBack,
  });

  if (error || !data) {
    console.error('Error fetching project collaboration heatmap:', error);
    return [];
  }

  return data.map((row: any) => ({
    surfaceType: row.surface_type,
    activityCount: parseInt(row.activity_count),
    uniqueUsers: parseInt(row.unique_users),
    mostRecentActivity: row.most_recent_activity,
  }));
}

export async function getActiveUsersForSurface(
  options: GetActiveUsersOptions
): Promise<ActiveUser[]> {
  const { surfaceType, entityId, daysBack = 7 } = options;

  const { data, error } = await supabase.rpc('get_active_users_for_surface', {
    input_surface_type: surfaceType,
    input_entity_id: entityId || null,
    days_back: daysBack,
  });

  if (error || !data) {
    console.error('Error fetching active users for surface:', error);
    return [];
  }

  return data.map((row: any) => ({
    userId: row.user_id,
    activityCount: parseInt(row.activity_count),
    lastActivityAt: row.last_activity_at,
  }));
}

export async function getDormantEntitiesWithCollaborators(
  options: GetDormantEntitiesOptions
): Promise<DormantEntity[]> {
  const { projectId, dormantDays = 30, minCollaborators = 2 } = options;

  const { data, error } = await supabase.rpc(
    'get_dormant_entities_with_collaborators',
    {
      input_project_id: projectId,
      dormant_days: dormantDays,
      min_collaborators: minCollaborators,
    }
  );

  if (error || !data) {
    console.error('Error fetching dormant entities:', error);
    return [];
  }

  return data.map((row: any) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    lastActivityAt: row.last_activity_at,
    collaboratorCount: parseInt(row.collaborator_count),
  }));
}

export async function getCrossProjectEntityActivity(
  options: GetCrossProjectActivityOptions
): Promise<CrossProjectActivity[]> {
  const { entityType, entityId } = options;

  const { data, error } = await supabase.rpc('get_cross_project_entity_activity', {
    input_entity_type: entityType,
    input_entity_id: entityId,
  });

  if (error || !data) {
    console.error('Error fetching cross-project activity:', error);
    return [];
  }

  return data.map((row: any) => ({
    projectId: row.project_id,
    userCount: parseInt(row.user_count),
    activityCount: parseInt(row.activity_count),
    lastActivityAt: row.last_activity_at,
  }));
}

export async function getMostCollaboratedTracks(
  options: GetMostCollaboratedTracksOptions
): Promise<CollaboratedTrack[]> {
  const { projectId, limit = 10, daysBack = 30 } = options;

  const { data, error } = await supabase.rpc('get_most_collaborated_tracks', {
    input_project_id: projectId || null,
    limit_count: limit,
    days_back: daysBack,
  });

  if (error || !data) {
    console.error('Error fetching most collaborated tracks:', error);
    return [];
  }

  return data.map((row: any) => ({
    trackId: row.track_id,
    collaboratorCount: parseInt(row.collaborator_count),
    activityCount: parseInt(row.activity_count),
    lastActivityAt: row.last_activity_at,
  }));
}

export async function getParticipationIntensity(
  options: GetParticipationIntensityOptions
): Promise<ParticipationIntensity | null> {
  const { entityType, entityId, userId } = options;

  const { data, error } = await supabase.rpc('get_participation_intensity', {
    input_entity_type: entityType,
    input_entity_id: entityId,
    input_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    totalActivities: parseInt(row.total_activities),
    firstActivityAt: row.first_activity_at,
    lastActivityAt: row.last_activity_at,
    daysActive: parseInt(row.days_active),
    activityTypes: row.activity_types,
  };
}

export async function getActivityHistory(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<CollaborationActivity[]> {
  const { data, error } = await supabase
    .from('collaboration_activity')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching activity history:', error);
    return [];
  }

  return data.map(transformActivityFromDb);
}

export async function getUserRecentActivity(
  userId: string,
  limit: number = 50
): Promise<CollaborationActivity[]> {
  const { data, error } = await supabase
    .from('collaboration_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching user recent activity:', error);
    return [];
  }

  return data.map(transformActivityFromDb);
}

export async function getProjectRecentActivity(
  projectId: string,
  limit: number = 50
): Promise<CollaborationActivity[]> {
  const { data, error } = await supabase
    .from('collaboration_activity')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching project recent activity:', error);
    return [];
  }

  return data.map(transformActivityFromDb);
}

export function inferSurfaceTypeFromEntity(entityType: string): string {
  const surfaceMap: Record<string, string> = {
    master_project: 'project',
    track: 'track',
    roadmap_item: 'roadmap_item',
    child_item: 'execution_unit',
    taskflow_task: 'taskflow',
    mind_mesh_node: 'mind_mesh',
    personal_bridge_link: 'personal_bridge',
    side_project: 'side_project',
    offshoot_idea: 'offshoot_idea',
  };

  return surfaceMap[entityType] || 'project';
}

export const COLLABORATION_ENTITY_TYPES = {
  PROJECT: 'master_project',
  TRACK: 'track',
  ROADMAP_ITEM: 'roadmap_item',
  CHILD_ITEM: 'child_item',
  TASKFLOW_TASK: 'taskflow_task',
  MIND_MESH_NODE: 'mind_mesh_node',
  MIND_MESH_EDGE: 'mind_mesh_edge',
  PERSONAL_BRIDGE_LINK: 'personal_bridge_link',
  SIDE_PROJECT: 'side_project',
  OFFSHOOT_IDEA: 'offshoot_idea',
  TRACK_INSTANCE: 'track_instance',
  PEOPLE: 'people',
  ASSIGNMENT: 'assignment',
} as const;

export async function recordTrackActivity(
  userId: string,
  trackId: string,
  projectId: string | null,
  activityType: 'created' | 'updated' | 'linked' | 'unlinked' | 'shared',
  metadata?: Record<string, any>
): Promise<void> {
  await recordActivity({
    userId,
    projectId,
    surfaceType: 'track',
    entityType: COLLABORATION_ENTITY_TYPES.TRACK,
    entityId: trackId,
    activityType,
    contextMetadata: metadata,
  });
}

export async function recordRoadmapItemActivity(
  userId: string,
  itemId: string,
  projectId: string,
  activityType: 'created' | 'updated' | 'status_changed' | 'deadline_changed',
  metadata?: Record<string, any>
): Promise<void> {
  await recordActivity({
    userId,
    projectId,
    surfaceType: 'roadmap_item',
    entityType: COLLABORATION_ENTITY_TYPES.ROADMAP_ITEM,
    entityId: itemId,
    activityType,
    contextMetadata: metadata,
  });
}

export async function recordMindMeshActivity(
  userId: string,
  nodeId: string,
  projectId: string | null,
  activityType: 'created' | 'updated' | 'linked',
  metadata?: Record<string, any>
): Promise<void> {
  await recordActivity({
    userId,
    projectId,
    surfaceType: 'mind_mesh',
    entityType: COLLABORATION_ENTITY_TYPES.MIND_MESH_NODE,
    entityId: nodeId,
    activityType,
    contextMetadata: metadata,
  });
}

export async function recordTaskFlowActivity(
  userId: string,
  taskId: string,
  projectId: string,
  activityType: 'created' | 'updated' | 'status_changed' | 'synced',
  metadata?: Record<string, any>
): Promise<void> {
  await recordActivity({
    userId,
    projectId,
    surfaceType: 'taskflow',
    entityType: COLLABORATION_ENTITY_TYPES.TASKFLOW_TASK,
    entityId: taskId,
    activityType,
    contextMetadata: metadata,
  });
}
