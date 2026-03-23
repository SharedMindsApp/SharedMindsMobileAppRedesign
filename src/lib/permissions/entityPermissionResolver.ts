/**
 * Entity Permission Resolver
 * 
 * Resolves entity-level permissions for tracks and subtracks based on:
 * - Project membership (gate)
 * - Project role (ceiling)
 * - Creator default rights (if enabled)
 * - Entity-level grants (if enabled)
 * 
 * Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
 */

import { supabase } from '../supabase';
import { ENABLE_ENTITY_GRANTS, ENABLE_CREATOR_RIGHTS } from '../featureFlags';
import { getUserProjectRole } from '../guardrails/projectUserService';
import type { PermissionRole } from './types';

export type EntityType = 'track' | 'subtrack';

// Extended PermissionRole (includes commenter for entity grants)
export type EntityPermissionRole = PermissionRole;

export interface PermissionResolutionContext {
  userId: string;       // profiles.id
  entityType: EntityType;
  entityId: string;
}

export interface ResolvedPermissions {
  role: EntityPermissionRole | null;
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canManage: boolean;
  source: {
    projectId?: string;
    projectRole?: EntityPermissionRole;
    ceilingApplied?: boolean;
    creator?: {
      isCreator: boolean;
      revoked: boolean;
      wouldGrantRole: EntityPermissionRole | null;
    };
    grants?: {
      directUserRole: EntityPermissionRole | null;
      groupRoles: Array<{ groupId: string; role: EntityPermissionRole }>;
      highestGrantRole: EntityPermissionRole | null;
    };
  };
}

/**
 * Get project ID for an entity
 */
async function getProjectIdForEntity(
  entityType: EntityType,
  entityId: string
): Promise<string | null> {
  if (entityType === 'track') {
    const { data, error } = await supabase
      .from('guardrails_tracks')
      .select('master_project_id')
      .eq('id', entityId)
      .maybeSingle();
    
    if (error) {
      console.error('[EntityPermissionResolver] Error getting track project:', error);
      return null;
    }
    
    return data?.master_project_id || null;
  } else if (entityType === 'subtrack') {
    // Get subtrack's track_id first
    const { data: subtrack, error: subtrackError } = await supabase
      .from('guardrails_subtracks')
      .select('track_id')
      .eq('id', entityId)
      .maybeSingle();
    
    if (subtrackError || !subtrack) {
      console.error('[EntityPermissionResolver] Error getting subtrack:', subtrackError);
      return null;
    }
    
    // Get track's master_project_id
    const { data: track, error: trackError } = await supabase
      .from('guardrails_tracks')
      .select('master_project_id')
      .eq('id', subtrack.track_id)
      .maybeSingle();
    
    if (trackError) {
      console.error('[EntityPermissionResolver] Error getting track project:', trackError);
      return null;
    }
    
    return track?.master_project_id || null;
  }
  
  return null;
}

/**
 * Role hierarchy comparison
 * Returns: -1 if role1 < role2, 0 if equal, 1 if role1 > role2
 */
function compareRoles(role1: EntityPermissionRole, role2: EntityPermissionRole): number {
  const hierarchy: Record<EntityPermissionRole, number> = {
    owner: 4,
    editor: 3,
    commenter: 2,
    viewer: 1,
  };
  
  return hierarchy[role1] - hierarchy[role2];
}

/**
 * Get maximum role (highest in hierarchy)
 */
function maxRole(
  roles: Array<EntityPermissionRole | null>
): EntityPermissionRole | null {
  const validRoles = roles.filter((r): r is EntityPermissionRole => r !== null);
  if (validRoles.length === 0) return null;
  
  return validRoles.reduce((max, role) => {
    return compareRoles(role, max) > 0 ? role : max;
  });
}

/**
 * Cap role at ceiling (project role)
 */
function capRoleAtCeiling(
  role: EntityPermissionRole | null,
  ceiling: EntityPermissionRole | null
): EntityPermissionRole | null {
  if (!role || !ceiling) return role;
  
  return compareRoles(role, ceiling) > 0 ? ceiling : role;
}

/**
 * Convert role to permission flags
 */
function roleToFlags(role: EntityPermissionRole | null): {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canManage: boolean;
} {
  if (!role) {
    return {
      canView: false,
      canEdit: false,
      canComment: false,
      canManage: false,
    };
  }
  
  switch (role) {
    case 'owner':
      return {
        canView: true,
        canEdit: true,
        canComment: true,
        canManage: true,
      };
    case 'editor':
      return {
        canView: true,
        canEdit: true,
        canComment: true,
        canManage: false,
      };
    case 'commenter':
      return {
        canView: true,
        canEdit: false,
        canComment: true,
        canManage: false,
      };
    case 'viewer':
      return {
        canView: true,
        canEdit: false,
        canComment: false,
        canManage: false,
      };
  }
}

/**
 * Map project user role to entity permission role
 * Project roles don't have 'commenter', so map directly
 */
function mapProjectRoleToEntityRole(
  projectRole: 'owner' | 'editor' | 'viewer' | null
): EntityPermissionRole | null {
  if (!projectRole) return null;
  return projectRole as EntityPermissionRole;
}

/**
 * Resolve entity permissions
 * 
 * Resolution order (from Phase 0):
 * 1. Project membership (gate)
 * 2. Project role (ceiling)
 * 3. Creator rights (if enabled, capped at ceiling)
 * 4. Entity grants (if enabled, capped at ceiling)
 * 5. Final role = max(project, creator, grant) capped at project
 */
export async function resolveEntityPermissions(
  context: PermissionResolutionContext
): Promise<ResolvedPermissions> {
  const { userId, entityType, entityId } = context;
  
  // Step 1: Get project ID from entity
  const projectId = await getProjectIdForEntity(entityType, entityId);
  
  if (!projectId) {
    // Entity not found or invalid
    return {
      role: null,
      canView: false,
      canEdit: false,
      canComment: false,
      canManage: false,
      source: {},
    };
  }
  
  // Step 2: Get project role (gate and ceiling)
  const projectUserRole = await getUserProjectRole(userId, projectId);
  const projectRole = mapProjectRoleToEntityRole(projectUserRole);
  
  if (!projectRole) {
    // No project access = no entity access
    return {
      role: null,
      canView: false,
      canEdit: false,
      canComment: false,
      canManage: false,
      source: {
        projectId,
      },
    };
  }
  
  // Initialize result with project role as baseline
  let finalRole: EntityPermissionRole | null = projectRole;
  let ceilingApplied = false;
  const source: ResolvedPermissions['source'] = {
    projectId,
    projectRole,
  };
  
  // Step 3: Creator rights (if enabled)
  let creatorWouldGrantRole: EntityPermissionRole | null = null;
  let creatorRevoked = false;
  let isCreator = false;
  
  if (ENABLE_CREATOR_RIGHTS) {
    // Get entity's created_by
    let entityCreatedBy: string | null = null;
    
    if (entityType === 'track') {
      const { data } = await supabase
        .from('guardrails_tracks')
        .select('created_by')
        .eq('id', entityId)
        .maybeSingle();
      
      entityCreatedBy = data?.created_by || null;
    } else if (entityType === 'subtrack') {
      const { data } = await supabase
        .from('guardrails_subtracks')
        .select('created_by')
        .eq('id', entityId)
        .maybeSingle();
      
      entityCreatedBy = data?.created_by || null;
    }
    
    isCreator = entityCreatedBy === userId;
    
    if (isCreator) {
      // Check if creator rights were revoked
      // If a row exists, creator rights are revoked (deleting the row restores rights)
      const { data: revocation } = await supabase
        .from('creator_rights_revocations')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('creator_user_id', userId)
        .maybeSingle();
      
      creatorRevoked = !!revocation;
      
      if (!creatorRevoked) {
        // Creator would grant editor (before ceiling cap)
        creatorWouldGrantRole = 'editor';
      }
    }
    
    source.creator = {
      isCreator,
      revoked: creatorRevoked,
      wouldGrantRole: creatorWouldGrantRole,
    };
  }
  
  // Step 4: Entity grants (if enabled)
  let directUserRole: EntityPermissionRole | null = null;
  const groupRoles: Array<{ groupId: string; role: EntityPermissionRole }> = [];
  let highestGrantRole: EntityPermissionRole | null = null;
  
  if (ENABLE_ENTITY_GRANTS) {
    // Get direct user grant
    const { data: userGrant } = await supabase
      .from('entity_permission_grants')
      .select('permission_role')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('subject_type', 'user')
      .eq('subject_id', userId)
      .is('revoked_at', null)
      .maybeSingle();
    
    if (userGrant?.permission_role) {
      directUserRole = userGrant.permission_role as EntityPermissionRole;
    }
    
    // Get user's group memberships (all groups user belongs to - broad query)
    const { data: userGroups, error: groupsError } = await supabase
      .from('team_group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    // Only query group grants if we have group memberships
    if (!groupsError && userGroups && userGroups.length > 0) {
      const groupIds = userGroups.map((g) => g.group_id);
      
      // Get group grants for this entity
      const { data: groupGrants } = await supabase
        .from('entity_permission_grants')
        .select('subject_id, permission_role')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('subject_type', 'group')
        .in('subject_id', groupIds)
        .is('revoked_at', null);
      
      if (groupGrants) {
        for (const grant of groupGrants) {
          groupRoles.push({
            groupId: grant.subject_id,
            role: grant.permission_role as EntityPermissionRole,
          });
        }
      }
    }
    
    // Calculate highest grant role (before ceiling cap)
    const allGrantRoles = [
      directUserRole,
      ...groupRoles.map((g) => g.role),
    ].filter((r): r is EntityPermissionRole => r !== null);
    
    highestGrantRole = allGrantRoles.length > 0
      ? maxRole(allGrantRoles)
      : null;
    
    source.grants = {
      directUserRole,
      groupRoles,
      highestGrantRole,
    };
  }
  
  // Step 5: Calculate final role (max of all, capped at project role)
  const candidateRoles = [
    projectRole,
    creatorWouldGrantRole,
    highestGrantRole,
  ].filter((r): r is EntityPermissionRole => r !== null);
  
  const uncappedFinalRole = maxRole(candidateRoles);
  finalRole = capRoleAtCeiling(uncappedFinalRole, projectRole);
  
  if (uncappedFinalRole && compareRoles(uncappedFinalRole, projectRole) > 0) {
    ceilingApplied = true;
  }
  
  source.ceilingApplied = ceilingApplied;
  
  // Convert final role to flags
  const flags = roleToFlags(finalRole);
  
  return {
    role: finalRole,
    ...flags,
    source,
  };
}
