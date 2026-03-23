import { supabase } from '../supabase';
import type {
  CollaborationSurfaceType,
  EntityCollaborator,
  CollaborationFootprintEntry,
} from './collaborationTypes';
import { getEntityCollaborators, getUserCollaborationFootprint } from './collaborationService';

export interface PermissionCheckResult {
  canView: boolean;
  canRecord: boolean;
  reason?: string;
}

export async function canUserSeeCollaborationSurface(
  userId: string,
  entityType: string,
  entityId: string,
  projectId?: string
): Promise<PermissionCheckResult> {
  if (entityType === 'master_project') {
    return canUserSeeProjectCollaboration(userId, entityId);
  }

  if (entityType === 'track') {
    return canUserSeeTrackCollaboration(userId, entityId, projectId);
  }

  if (entityType === 'roadmap_item' || entityType === 'child_item') {
    return canUserSeeRoadmapItemCollaboration(userId, entityId, projectId);
  }

  if (entityType === 'mind_mesh_node') {
    return canUserSeeMindMeshCollaboration(userId, entityId, projectId);
  }

  if (entityType === 'taskflow_task') {
    return canUserSeeTaskFlowCollaboration(userId, entityId, projectId);
  }

  if (entityType === 'side_project' || entityType === 'offshoot_idea') {
    return canUserSeeSideProjectCollaboration(userId, entityId, projectId);
  }

  return {
    canView: false,
    canRecord: false,
    reason: 'Unknown entity type',
  };
}

async function canUserSeeProjectCollaboration(
  userId: string,
  projectId: string
): Promise<PermissionCheckResult> {
  const { data: projectData, error } = await supabase
    .from('master_projects')
    .select('user_id')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !projectData) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Project not found',
    };
  }

  if (projectData.user_id === userId) {
    return {
      canView: true,
      canRecord: true,
    };
  }

  const { data: userAccess } = await supabase
    .from('project_users')
    .select('role')
    .eq('master_project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (userAccess) {
    return {
      canView: true,
      canRecord: true,
    };
  }

  return {
    canView: false,
    canRecord: false,
    reason: 'No access to project',
  };
}

async function canUserSeeTrackCollaboration(
  userId: string,
  trackId: string,
  projectId?: string
): Promise<PermissionCheckResult> {
  const { data: trackData, error } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id, is_shared')
    .eq('id', trackId)
    .maybeSingle();

  if (error || !trackData) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Track not found',
    };
  }

  if (trackData.is_shared && projectId) {
    const { data: instanceData } = await supabase
      .from('track_project_instances')
      .select('id')
      .eq('track_id', trackId)
      .eq('master_project_id', projectId)
      .maybeSingle();

    if (instanceData) {
      return canUserSeeProjectCollaboration(userId, projectId);
    }
  }

  return canUserSeeProjectCollaboration(userId, trackData.master_project_id);
}

async function canUserSeeRoadmapItemCollaboration(
  userId: string,
  itemId: string,
  projectId?: string
): Promise<PermissionCheckResult> {
  const { data: itemData, error } = await supabase
    .from('roadmap_items')
    .select('master_project_id')
    .eq('id', itemId)
    .maybeSingle();

  if (error || !itemData) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Roadmap item not found',
    };
  }

  return canUserSeeProjectCollaboration(userId, itemData.master_project_id);
}

async function canUserSeeMindMeshCollaboration(
  userId: string,
  nodeId: string,
  projectId?: string
): Promise<PermissionCheckResult> {
  const { data: nodeData, error } = await supabase
    .from('mind_mesh_nodes')
    .select('master_project_id')
    .eq('id', nodeId)
    .maybeSingle();

  if (error || !nodeData) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Mind Mesh node not found',
    };
  }

  if (!nodeData.master_project_id) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Mind Mesh node has no project context',
    };
  }

  return canUserSeeProjectCollaboration(userId, nodeData.master_project_id);
}

async function canUserSeeTaskFlowCollaboration(
  userId: string,
  taskId: string,
  projectId?: string
): Promise<PermissionCheckResult> {
  const { data: taskData, error } = await supabase
    .from('taskflow_tasks')
    .select('master_project_id')
    .eq('id', taskId)
    .maybeSingle();

  if (error || !taskData) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Task Flow task not found',
    };
  }

  return canUserSeeProjectCollaboration(userId, taskData.master_project_id);
}

async function canUserSeeSideProjectCollaboration(
  userId: string,
  sideProjectId: string,
  projectId?: string
): Promise<PermissionCheckResult> {
  const { data: sideProjectData, error } = await supabase
    .from('side_projects')
    .select('master_project_id')
    .eq('id', sideProjectId)
    .maybeSingle();

  if (error || !sideProjectData) {
    return {
      canView: false,
      canRecord: false,
      reason: 'Side project not found',
    };
  }

  return canUserSeeProjectCollaboration(userId, sideProjectData.master_project_id);
}

export async function getPermissionSafeCollaborators(
  userId: string,
  entityType: string,
  entityId: string,
  projectId?: string,
  limit?: number
): Promise<EntityCollaborator[]> {
  const permission = await canUserSeeCollaborationSurface(
    userId,
    entityType,
    entityId,
    projectId
  );

  if (!permission.canView) {
    return [];
  }

  return getEntityCollaborators({
    entityType,
    entityId,
    limit,
  });
}

export async function getPermissionSafeFootprint(
  requestingUserId: string,
  targetUserId: string,
  projectId?: string,
  daysBack?: number
): Promise<CollaborationFootprintEntry[]> {
  if (requestingUserId === targetUserId) {
    return getUserCollaborationFootprint({
      userId: targetUserId,
      projectId,
      daysBack,
    });
  }

  if (projectId) {
    const permission = await canUserSeeProjectCollaboration(requestingUserId, projectId);
    if (!permission.canView) {
      return [];
    }

    return getUserCollaborationFootprint({
      userId: targetUserId,
      projectId,
      daysBack,
    });
  }

  return [];
}

export function isPersonalSpaceEntity(entityType: string): boolean {
  const personalSpaceTypes = [
    'personal_space',
    'personal_item',
    'personal_goal',
    'personal_note',
  ];
  return personalSpaceTypes.includes(entityType);
}

export async function canRecordActivityForEntity(
  userId: string,
  entityType: string,
  entityId: string,
  projectId?: string
): Promise<boolean> {
  if (isPersonalSpaceEntity(entityType)) {
    return false;
  }

  const permission = await canUserSeeCollaborationSurface(
    userId,
    entityType,
    entityId,
    projectId
  );

  return permission.canRecord;
}

export interface CrossProjectAwarenessScope {
  canSeeActivity: boolean;
  reason?: string;
  limitedToProjects: string[];
}

export async function getCrossProjectAwarenessScope(
  userId: string,
  entityType: string,
  entityId: string
): Promise<CrossProjectAwarenessScope> {
  if (entityType !== 'track') {
    return {
      canSeeActivity: false,
      reason: 'Cross-project awareness only applies to shared tracks',
      limitedToProjects: [],
    };
  }

  const { data: trackData, error } = await supabase
    .from('guardrails_tracks')
    .select('is_shared, master_project_id')
    .eq('id', entityId)
    .maybeSingle();

  if (error || !trackData || !trackData.is_shared) {
    return {
      canSeeActivity: false,
      reason: 'Track is not shared or not found',
      limitedToProjects: [],
    };
  }

  const { data: instances } = await supabase
    .from('track_project_instances')
    .select('master_project_id')
    .eq('track_id', entityId);

  const linkedProjectIds = (instances || []).map((i: any) => i.master_project_id);

  const accessibleProjects: string[] = [];

  for (const projectId of linkedProjectIds) {
    const permission = await canUserSeeProjectCollaboration(userId, projectId);
    if (permission.canView) {
      accessibleProjects.push(projectId);
    }
  }

  return {
    canSeeActivity: accessibleProjects.length > 0,
    limitedToProjects: accessibleProjects,
  };
}

export const PERMISSION_SAFE_RULES = {
  PERSONAL_SPACES_ISOLATED: 'Personal spaces never expose collaborators',
  PROJECT_SCOPED: 'Collaboration visibility respects project permissions',
  NO_LEAKAGE: 'Shared track activity isolated per project context',
  USER_DATA_PRIVATE: 'Users can only see their own full footprint',
  CROSS_PROJECT_LIMITED: 'Cross-project awareness limited to accessible projects',
};
