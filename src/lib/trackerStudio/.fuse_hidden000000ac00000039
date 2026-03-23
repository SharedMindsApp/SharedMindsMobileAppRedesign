/**
 * Tracker Permission Service
 * 
 * Manages permission grants for tracker instances.
 * Reuses entity_permission_grants table but with tracker-specific validation.
 * 
 * Key differences from Guardrails permissions:
 * - Trackers are NOT tied to projects
 * - Owner is determined by tracker.owner_id (not project ownership)
 * - Grants are owner-only (only tracker owner can grant/revoke)
 * - Cannot grant 'owner' role (ownership is immutable)
 */

import { supabase } from '../supabase';
import type { PermissionRole } from '../permissions/types';

export type TrackerPermissionRole = 'viewer' | 'editor'; // 'owner' is implicit via tracker.owner_id

export interface TrackerPermissionGrant {
  id: string;
  trackerId: string;
  subjectType: 'user';
  subjectId: string; // profiles.id
  permissionRole: TrackerPermissionRole;
  grantedBy: string | null; // profiles.id
  grantedAt: string;
  revokedAt: string | null;
}

/**
 * Get tracker owner ID
 */
async function getTrackerOwner(trackerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('trackers')
    .select('owner_id')
    .eq('id', trackerId)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    console.error('[TrackerPermissionService] Error getting tracker owner:', error);
    return null;
  }

  return data?.owner_id || null;
}

/**
 * Get current user's profile ID
 */
async function getCurrentUserProfileId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !profile) {
    throw new Error('Profile not found');
  }

  return profile.id;
}

/**
 * Grant tracker permission to a user
 */
export async function grantTrackerPermission(
  trackerId: string,
  subjectUserId: string, // profiles.id
  role: TrackerPermissionRole,
  grantedBy?: string // profiles.id (defaults to current user)
): Promise<TrackerPermissionGrant> {
  // Get current user profile
  const currentUserProfileId = grantedBy || await getCurrentUserProfileId();

  // Verify tracker exists and get owner
  const ownerId = await getTrackerOwner(trackerId);
  if (!ownerId) {
    throw new Error('Tracker not found');
  }

  // Verify grantedBy is tracker owner
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', ownerId)
    .maybeSingle();

  if (!ownerProfile || ownerProfile.id !== currentUserProfileId) {
    throw new Error('Only tracker owner can grant permissions');
  }

  // Validate subject user exists
  const { data: subjectProfile, error: subjectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', subjectUserId)
    .maybeSingle();

  if (subjectError || !subjectProfile) {
    throw new Error('Subject user not found');
  }

  // Cannot grant to self (owner already has full access)
  if (subjectUserId === currentUserProfileId) {
    throw new Error('Cannot grant permissions to yourself');
  }

  // Check if grant already exists
  const { data: existingGrant, error: existingError } = await supabase
    .from('entity_permission_grants')
    .select('*')
    .eq('entity_type', 'tracker')
    .eq('entity_id', trackerId)
    .eq('subject_type', 'user')
    .eq('subject_id', subjectUserId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking existing grant: ${existingError.message}`);
  }

  if (existingGrant) {
    if (existingGrant.revoked_at === null) {
      // Active grant exists - return it (idempotent)
      return {
        id: existingGrant.id,
        trackerId: existingGrant.entity_id,
        subjectType: 'user',
        subjectId: existingGrant.subject_id,
        permissionRole: existingGrant.permission_role as TrackerPermissionRole,
        grantedBy: existingGrant.granted_by,
        grantedAt: existingGrant.granted_at,
        revokedAt: existingGrant.revoked_at,
      };
    } else {
      // Revoked grant exists - restore it
      const { data: restoredGrant, error: restoreError } = await supabase
        .from('entity_permission_grants')
        .update({
          revoked_at: null,
          granted_by: currentUserProfileId,
          granted_at: new Date().toISOString(),
          permission_role: role,
        })
        .eq('id', existingGrant.id)
        .select()
        .single();

      if (restoreError) {
        throw new Error(`Error restoring grant: ${restoreError.message}`);
      }

      return {
        id: restoredGrant.id,
        trackerId: restoredGrant.entity_id,
        subjectType: 'user',
        subjectId: restoredGrant.subject_id,
        permissionRole: restoredGrant.permission_role as TrackerPermissionRole,
        grantedBy: restoredGrant.granted_by,
        grantedAt: restoredGrant.granted_at,
        revokedAt: restoredGrant.revoked_at,
      };
    }
  }

  // Create new grant
  const { data: newGrant, error: insertError } = await supabase
    .from('entity_permission_grants')
    .insert({
      entity_type: 'tracker',
      entity_id: trackerId,
      subject_type: 'user',
      subject_id: subjectUserId,
      permission_role: role,
      granted_by: currentUserProfileId,
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
    trackerId: newGrant.entity_id,
    subjectType: 'user',
    subjectId: newGrant.subject_id,
    permissionRole: newGrant.permission_role as TrackerPermissionRole,
    grantedBy: newGrant.granted_by,
    grantedAt: newGrant.granted_at,
    revokedAt: newGrant.revoked_at,
  };
}

/**
 * Revoke tracker permission grant
 */
export async function revokeTrackerPermission(
  grantId: string,
  revokedBy?: string // profiles.id (defaults to current user)
): Promise<void> {
  const currentUserProfileId = revokedBy || await getCurrentUserProfileId();

  // Get the grant to find the tracker
  const { data: grant, error: grantError } = await supabase
    .from('entity_permission_grants')
    .select('entity_id')
    .eq('id', grantId)
    .eq('entity_type', 'tracker')
    .maybeSingle();

  if (grantError || !grant) {
    throw new Error(`Grant not found: ${grantId}`);
  }

  // Verify revokedBy is tracker owner
  const ownerId = await getTrackerOwner(grant.entity_id);
  if (!ownerId) {
    throw new Error('Tracker not found');
  }

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', ownerId)
    .maybeSingle();

  if (!ownerProfile || ownerProfile.id !== currentUserProfileId) {
    throw new Error('Only tracker owner can revoke permissions');
  }

  // Soft delete: set revoked_at
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
 * List tracker permission grants (active only)
 */
export async function listTrackerPermissions(
  trackerId: string
): Promise<TrackerPermissionGrant[]> {
  const { data: grants, error } = await supabase
    .from('entity_permission_grants')
    .select('*')
    .eq('entity_type', 'tracker')
    .eq('entity_id', trackerId)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });

  if (error) {
    throw new Error(`Error listing grants: ${error.message}`);
  }

  return (grants || []).map((grant) => ({
    id: grant.id,
    trackerId: grant.entity_id,
    subjectType: 'user' as const,
    subjectId: grant.subject_id,
    permissionRole: grant.permission_role as TrackerPermissionRole,
    grantedBy: grant.granted_by,
    grantedAt: grant.granted_at,
    revokedAt: grant.revoked_at,
  }));
}
