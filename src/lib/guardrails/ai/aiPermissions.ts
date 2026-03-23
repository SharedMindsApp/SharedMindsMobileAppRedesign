import { supabase } from '../../supabase';
import { ENABLE_ENTITY_GRANTS, ENABLE_CREATOR_RIGHTS } from '../../featureFlags';
import { resolveEntityPermissions } from '../../permissions/entityPermissionResolver';

const USE_ENTITY_PERMISSION_RESOLVER = ENABLE_ENTITY_GRANTS || ENABLE_CREATOR_RIGHTS;

export async function canUserAccessProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data: project } = await supabase
    .from('master_projects')
    .select('user_id')
    .eq('id', projectId)
    .maybeSingle();

  if (project?.user_id === userId) {
    return true;
  }

  const { data: userAccess } = await supabase
    .from('project_users')
    .select('id')
    .eq('master_project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!userAccess;
}

export async function canUserAccessTrack(
  userId: string,
  trackId: string
): Promise<boolean> {
  if (USE_ENTITY_PERMISSION_RESOLVER) {
    const resolved = await resolveEntityPermissions({
      userId,
      entityType: 'track',
      entityId: trackId,
    });
    return resolved.canView;
  }

  // Legacy behavior when flags are OFF
  const { data: track } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return false;
  }

  return canUserAccessProject(userId, track.master_project_id);
}

export async function canUserEditTrack(
  userId: string,
  trackId: string
): Promise<boolean> {
  if (USE_ENTITY_PERMISSION_RESOLVER) {
    const resolved = await resolveEntityPermissions({
      userId,
      entityType: 'track',
      entityId: trackId,
    });
    return resolved.canEdit;
  }

  // Legacy behavior when flags are OFF: use project-level edit permission
  const { data: track } = await supabase
    .from('guardrails_tracks')
    .select('master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return false;
  }

  // Check if user has edit permission at project level
  const { data: projectUser } = await supabase
    .from('project_users')
    .select('role')
    .eq('master_project_id', track.master_project_id)
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle();

  if (!projectUser) {
    return false;
  }

  // Editor and owner can edit
  return projectUser.role === 'editor' || projectUser.role === 'owner';
}

export async function canUserAccessSubtrack(
  userId: string,
  subtrackId: string
): Promise<boolean> {
  if (USE_ENTITY_PERMISSION_RESOLVER) {
    const resolved = await resolveEntityPermissions({
      userId,
      entityType: 'subtrack',
      entityId: subtrackId,
    });
    return resolved.canView;
  }

  // Legacy behavior when flags are OFF: inherit from parent track
  const { data: subtrack } = await supabase
    .from('guardrails_subtracks')
    .select('track_id')
    .eq('id', subtrackId)
    .maybeSingle();

  if (!subtrack) {
    return false;
  }

  // Check access via parent track
  return canUserAccessTrack(userId, subtrack.track_id);
}

export async function canUserAccessRoadmapItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  const { data: item } = await supabase
    .from('roadmap_items')
    .select('master_project_id')
    .eq('id', itemId)
    .maybeSingle();

  if (!item) {
    return false;
  }

  return canUserAccessProject(userId, item.master_project_id);
}

export async function canUserUseDraft(
  userId: string,
  draftId: string
): Promise<boolean> {
  const { data: draft } = await supabase
    .from('ai_drafts')
    .select('user_id, project_id')
    .eq('id', draftId)
    .maybeSingle();

  if (!draft) {
    return false;
  }

  if (draft.user_id === userId) {
    return true;
  }

  if (draft.project_id) {
    return canUserAccessProject(userId, draft.project_id);
  }

  return false;
}

export async function validateAIContextAccess(
  userId: string,
  projectId?: string,
  trackIds?: string[],
  roadmapItemIds?: string[]
): Promise<{ canAccess: boolean; reason?: string }> {
  if (projectId) {
    const hasProjectAccess = await canUserAccessProject(userId, projectId);
    if (!hasProjectAccess) {
      return {
        canAccess: false,
        reason: 'No access to project',
      };
    }
  }

  if (trackIds && trackIds.length > 0) {
    for (const trackId of trackIds) {
      const hasTrackAccess = await canUserAccessTrack(userId, trackId);
      if (!hasTrackAccess) {
        return {
          canAccess: false,
          reason: `No access to track: ${trackId}`,
        };
      }
    }
  }

  if (roadmapItemIds && roadmapItemIds.length > 0) {
    for (const itemId of roadmapItemIds) {
      const hasItemAccess = await canUserAccessRoadmapItem(userId, itemId);
      if (!hasItemAccess) {
        return {
          canAccess: false,
          reason: `No access to roadmap item: ${itemId}`,
        };
      }
    }
  }

  return { canAccess: true };
}

export const AI_PERMISSION_RULES = {
  READS_ONLY: 'AI can only read data user has access to',
  NO_WRITES: 'AI NEVER writes directly to authoritative tables',
  USER_OWNED_DRAFTS: 'AI drafts belong to the requesting user',
  PROJECT_SCOPED: 'AI context respects project permissions',
  NO_PERSONAL_SPACES: 'AI cannot access Personal Spaces',
  AUDIT_ALL: 'All AI interactions are logged',
};

export async function debugResolveTrackPermissions(
  userId: string,
  trackId: string
) {
  if (!USE_ENTITY_PERMISSION_RESOLVER) return null;
  return resolveEntityPermissions({
    userId,
    entityType: 'track',
    entityId: trackId,
  });
}

export const AI_DATA_ACCESS_BOUNDARIES = {
  CAN_READ: [
    'master_projects (if user has access)',
    'guardrails_tracks (if user has access)',
    'roadmap_items (if user has access)',
    'collaboration_activity (permission-safe)',
    'mind_mesh_nodes (if user has access)',
    'taskflow_tasks (if user has access)',
    'project_people (names and roles only)',
  ],
  CANNOT_READ: [
    'Personal Spaces data',
    'Other users\' private data',
    'Projects user has no access to',
    'Authentication credentials',
    'Sensitive user metadata',
  ],
  CANNOT_WRITE: [
    'master_projects',
    'guardrails_tracks',
    'roadmap_items',
    'taskflow_tasks',
    'mind_mesh_nodes',
    'mind_mesh_edges',
    'project_people',
    'project_users',
    'permissions tables',
    'Personal Spaces tables',
  ],
  CAN_WRITE: [
    'ai_drafts (user-owned only)',
    'ai_interaction_audit (system-owned)',
  ],
};
