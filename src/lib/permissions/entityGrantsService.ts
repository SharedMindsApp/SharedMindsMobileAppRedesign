/**
 * Entity Permission Grants Service
 * 
 * Authoritative service for creating, revoking, and listing entity-level permission grants.
 * 
 * This service is authoring-only:
 * - Does not determine access (resolver handles that)
 * - Does not bypass the resolver
 * - Does not apply permissions directly
 * 
 * Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
 */

import { supabase } from '../supabase';
import { ENABLE_ENTITY_GRANTS } from '../featureFlags';
import { isProjectOwner } from '../guardrails/projectUserService';
import { getUserProjectRole } from '../guardrails/projectUserService';

export type EntityType = 'track' | 'subtrack';
export type SubjectType = 'user' | 'group';
export type PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface EntityPermissionGrant {
  id: string;
  entityType: EntityType;
  entityId: string;
  subjectType: SubjectType;
  subjectId: string;
  permissionRole: PermissionRole;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
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
      console.error('[EntityGrantsService] Error getting track project:', error);
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
      console.error('[EntityGrantsService] Error getting subtrack:', subtrackError);
      return null;
    }
    
    // Get track's master_project_id
    const { data: track, error: trackError } = await supabase
      .from('guardrails_tracks')
      .select('master_project_id')
      .eq('id', subtrack.track_id)
      .maybeSingle();
    
    if (trackError) {
      console.error('[EntityGrantsService] Error getting track project:', trackError);
      return null;
    }
    
    return track?.master_project_id || null;
  }
  
  return null;
}

/**
 * Grant entity permission to a user or group
 */
export async function grantEntityPermission(
  entityType: EntityType,
  entityId: string,
  subjectType: SubjectType,
  subjectId: string,
  role: PermissionRole,
  grantedBy: string // profiles.id
): Promise<EntityPermissionGrant> {
  if (!ENABLE_ENTITY_GRANTS) {
    throw new Error('Entity grants feature is disabled');
  }

  // Validation: Cannot grant ownership via entity grants
  if (role === 'owner') {
    throw new Error('Cannot grant ownership via entity grants. Ownership is project-level only.');
  }

  // Step 1: Resolve entity → projectId
  const projectId = await getProjectIdForEntity(entityType, entityId);
  if (!projectId) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`);
  }

  // Step 2: Validate grantedBy is project owner
  const isOwner = await isProjectOwner(grantedBy, projectId);
  if (!isOwner) {
    throw new Error('Only project owners can grant entity permissions');
  }

  // Step 3: Validate subject
  if (subjectType === 'user') {
    // User must be project member
    const userRole = await getUserProjectRole(subjectId, projectId);
    if (!userRole) {
      throw new Error('Cannot grant permissions to users who are not project members');
    }
  } else if (subjectType === 'group') {
    // Group must exist and not be archived
    const { data: group, error: groupError } = await supabase
      .from('team_groups')
      .select('id, team_id, archived_at')
      .eq('id', subjectId)
      .maybeSingle();
    
    if (groupError || !group) {
      throw new Error(`Group not found: ${subjectId}`);
    }
    
    if (group.archived_at) {
      throw new Error('Cannot grant permissions to archived groups');
    }
    
    // Note: Teams and projects are independent entities in the current architecture.
    // The resolver enforces the permission ceiling, so even if the group's team
    // is not directly "associated" with the project, the project permission ceiling
    // will prevent escalation. We validate that the group exists and is active.
  }

  // Step 4: Check if grant already exists (active or revoked)
  const { data: existingGrant, error: existingError } = await supabase
    .from('entity_permission_grants')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error checking existing grant: ${existingError.message}`);
  }

  if (existingGrant) {
    // Grant exists
    if (existingGrant.revoked_at === null) {
      // Active grant exists - return it (idempotent)
      return {
        id: existingGrant.id,
        entityType: existingGrant.entity_type as EntityType,
        entityId: existingGrant.entity_id,
        subjectType: existingGrant.subject_type as SubjectType,
        subjectId: existingGrant.subject_id,
        permissionRole: existingGrant.permission_role as PermissionRole,
        grantedBy: existingGrant.granted_by,
        grantedAt: existingGrant.granted_at,
        revokedAt: existingGrant.revoked_at,
      };
    } else {
      // Revoked grant exists - restore it (set revoked_at = NULL)
      const { data: restoredGrant, error: restoreError } = await supabase
        .from('entity_permission_grants')
        .update({
          revoked_at: null,
          granted_by: grantedBy,
          granted_at: new Date().toISOString(),
        })
        .eq('id', existingGrant.id)
        .select()
        .single();

      if (restoreError) {
        throw new Error(`Error restoring grant: ${restoreError.message}`);
      }

      return {
        id: restoredGrant.id,
        entityType: restoredGrant.entity_type as EntityType,
        entityId: restoredGrant.entity_id,
        subjectType: restoredGrant.subject_type as SubjectType,
        subjectId: restoredGrant.subject_id,
        permissionRole: restoredGrant.permission_role as PermissionRole,
        grantedBy: restoredGrant.granted_by,
        grantedAt: restoredGrant.granted_at,
        revokedAt: restoredGrant.revoked_at,
      };
    }
  }

  // Step 5: Create new grant
  const { data: newGrant, error: insertError } = await supabase
    .from('entity_permission_grants')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      subject_type: subjectType,
      subject_id: subjectId,
      permission_role: role,
      granted_by: grantedBy,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Error creating grant: ${insertError.message}`);
  }

  return {
    id: newGrant.id,
    entityType: newGrant.entity_type as EntityType,
    entityId: newGrant.entity_id,
    subjectType: newGrant.subject_type as SubjectType,
    subjectId: newGrant.subject_id,
    permissionRole: newGrant.permission_role as PermissionRole,
    grantedBy: newGrant.granted_by,
    grantedAt: newGrant.granted_at,
    revokedAt: newGrant.revoked_at,
  };
}

/**
 * Revoke entity permission grant (soft delete)
 */
export async function revokeEntityPermission(
  grantId: string,
  revokedBy: string // profiles.id
): Promise<void> {
  if (!ENABLE_ENTITY_GRANTS) {
    throw new Error('Entity grants feature is disabled');
  }

  // Get the grant to find the entity and validate ownership
  const { data: grant, error: grantError } = await supabase
    .from('entity_permission_grants')
    .select('entity_type, entity_id')
    .eq('id', grantId)
    .maybeSingle();

  if (grantError || !grant) {
    throw new Error(`Grant not found: ${grantId}`);
  }

  // Resolve entity → projectId
  const projectId = await getProjectIdForEntity(
    grant.entity_type as EntityType,
    grant.entity_id
  );

  if (!projectId) {
    throw new Error('Entity not found for grant');
  }

  // Validate revokedBy is project owner
  const isOwner = await isProjectOwner(revokedBy, projectId);
  if (!isOwner) {
    throw new Error('Only project owners can revoke entity permissions');
  }

  // Soft delete: set revoked_at (idempotent - revoking twice is allowed)
  const { error: updateError } = await supabase
    .from('entity_permission_grants')
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq('id', grantId);

  if (updateError) {
    throw new Error(`Error revoking grant: ${updateError.message}`);
  }
}

/**
 * List entity permission grants (active and revoked)
 */
export async function listEntityPermissions(
  entityType: EntityType,
  entityId: string
): Promise<EntityPermissionGrant[]> {
  if (!ENABLE_ENTITY_GRANTS) {
    throw new Error('Entity grants feature is disabled');
  }

  // RLS will enforce access - we just query
  const { data: grants, error } = await supabase
    .from('entity_permission_grants')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('granted_at', { ascending: false });

  if (error) {
    throw new Error(`Error listing grants: ${error.message}`);
  }

  return (grants || []).map((grant) => ({
    id: grant.id,
    entityType: grant.entity_type as EntityType,
    entityId: grant.entity_id,
    subjectType: grant.subject_type as SubjectType,
    subjectId: grant.subject_id,
    permissionRole: grant.permission_role as PermissionRole,
    grantedBy: grant.granted_by,
    grantedAt: grant.granted_at,
    revokedAt: grant.revoked_at,
  }));
}
