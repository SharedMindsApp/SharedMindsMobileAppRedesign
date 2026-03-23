/**
 * Creator Rights Service
 * 
 * Authoritative service for revoking and restoring creator default rights.
 * 
 * This service is minimal and authoring-only:
 * - Does not resolve permissions (resolver handles that)
 * - Does not grant permissions to others
 * - Only manages revocation state
 * 
 * Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
 */

import { supabase } from '../supabase';
import { ENABLE_CREATOR_RIGHTS } from '../featureFlags';
import { isProjectOwner } from '../guardrails/projectUserService';

export type EntityType = 'track' | 'subtrack';

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
      console.error('[CreatorRightsService] Error getting track project:', error);
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
      console.error('[CreatorRightsService] Error getting subtrack:', subtrackError);
      return null;
    }
    
    // Get track's master_project_id
    const { data: track, error: trackError } = await supabase
      .from('guardrails_tracks')
      .select('master_project_id')
      .eq('id', subtrack.track_id)
      .maybeSingle();
    
    if (trackError) {
      console.error('[CreatorRightsService] Error getting track project:', trackError);
      return null;
    }
    
    return track?.master_project_id || null;
  }
  
  return null;
}

/**
 * Get entity's created_by field
 */
async function getEntityCreator(
  entityType: EntityType,
  entityId: string
): Promise<string | null> {
  if (entityType === 'track') {
    const { data, error } = await supabase
      .from('guardrails_tracks')
      .select('created_by')
      .eq('id', entityId)
      .maybeSingle();
    
    if (error) {
      console.error('[CreatorRightsService] Error getting track creator:', error);
      return null;
    }
    
    return data?.created_by || null;
  } else if (entityType === 'subtrack') {
    const { data, error } = await supabase
      .from('guardrails_subtracks')
      .select('created_by')
      .eq('id', entityId)
      .maybeSingle();
    
    if (error) {
      console.error('[CreatorRightsService] Error getting subtrack creator:', error);
      return null;
    }
    
    return data?.created_by || null;
  }
  
  return null;
}

/**
 * Revoke creator default rights
 */
export async function revokeCreatorRights(
  entityType: EntityType,
  entityId: string,
  creatorUserId: string, // profiles.id
  revokedBy: string      // profiles.id
): Promise<void> {
  if (!ENABLE_CREATOR_RIGHTS) {
    throw new Error('Creator rights feature is disabled');
  }

  // Step 1: Resolve entity → projectId
  const projectId = await getProjectIdForEntity(entityType, entityId);
  if (!projectId) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`);
  }

  // Step 2: Validate revokedBy is project owner
  const isOwner = await isProjectOwner(revokedBy, projectId);
  if (!isOwner) {
    throw new Error('Only project owners can revoke creator rights');
  }

  // Step 3: Validate creatorUserId is the entity creator
  const entityCreator = await getEntityCreator(entityType, entityId);
  if (!entityCreator) {
    throw new Error(`Entity has no creator (created_by is null): ${entityType} ${entityId}`);
  }

  if (entityCreator !== creatorUserId) {
    throw new Error(`User is not the entity creator. Entity creator: ${entityCreator}, provided: ${creatorUserId}`);
  }

  // Step 4: Check if revocation already exists
  const { data: existingRevocation, error: existingError } = await supabase
    .from('creator_rights_revocations')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('creator_user_id', creatorUserId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error checking existing revocation: ${existingError.message}`);
  }

  if (existingRevocation) {
    // Revocation already exists - idempotent, do nothing
    return;
  }

  // Step 5: Create revocation record
  const { error: insertError } = await supabase
    .from('creator_rights_revocations')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      creator_user_id: creatorUserId,
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(`Error creating revocation: ${insertError.message}`);
  }
}

/**
 * Restore creator default rights (remove revocation)
 */
export async function restoreCreatorRights(
  entityType: EntityType,
  entityId: string,
  creatorUserId: string, // profiles.id
  restoredBy: string     // profiles.id
): Promise<void> {
  if (!ENABLE_CREATOR_RIGHTS) {
    throw new Error('Creator rights feature is disabled');
  }

  // Step 1: Resolve entity → projectId
  const projectId = await getProjectIdForEntity(entityType, entityId);
  if (!projectId) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`);
  }

  // Step 2: Validate restoredBy is project owner
  const isOwner = await isProjectOwner(restoredBy, projectId);
  if (!isOwner) {
    throw new Error('Only project owners can restore creator rights');
  }

  // Step 3: Check if revocation exists
  const { data: revocation, error: revocationError } = await supabase
    .from('creator_rights_revocations')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('creator_user_id', creatorUserId)
    .maybeSingle();

  if (revocationError && revocationError.code !== 'PGRST116') {
    throw new Error(`Error checking revocation: ${revocationError.message}`);
  }

  if (!revocation) {
    // No revocation exists - idempotent, do nothing
    return;
  }

  // Step 4: Restore by deleting the revocation row
  // Note: Per Phase 0 Lock-In, revocation restoration is done by DELETE (not UPDATE).
  // This is consistent with the RLS policy "Project owners can restore creator rights" which uses DELETE.
  // The unique constraint is on (entity_type, entity_id, creator_user_id) with no WHERE clause,
  // so deleting the row is the correct way to restore.
  const { error: deleteError } = await supabase
    .from('creator_rights_revocations')
    .delete()
    .eq('id', revocation.id);

  if (updateError) {
    throw new Error(`Error restoring creator rights: ${updateError.message}`);
  }
}

/**
 * Check if creator rights are revoked (read-only helper)
 */
export async function isCreatorRightsRevoked(
  entityType: EntityType,
  entityId: string,
  creatorUserId: string
): Promise<boolean> {
  if (!ENABLE_CREATOR_RIGHTS) {
    throw new Error('Creator rights feature is disabled');
  }

  // RLS will enforce access - we just query
  const { data: revocation, error } = await supabase
    .from('creator_rights_revocations')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('creator_user_id', creatorUserId)
    .is('revoked_at', null) // Only check for active revocations
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error checking revocation status: ${error.message}`);
  }

  return !!revocation;
}
