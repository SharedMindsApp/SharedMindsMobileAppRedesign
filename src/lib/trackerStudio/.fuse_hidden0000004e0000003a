/**
 * Tracker Permission Resolver
 * 
 * Resolves permissions for tracker instances.
 * 
 * Resolution order:
 * 1. Owner check (tracker.owner_id) → full access
 * 2. Active grants → viewer or editor
 * 3. Observation link (if context provided) → read-only observer
 * 4. No access
 * 
 * Unlike Guardrails permissions, trackers are NOT tied to projects.
 */

import { supabase } from '../supabase';
import type { ObservationContext } from './trackerObservationTypes';

export interface TrackerPermissions {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean; // Only owner can manage
  isOwner: boolean;
  role: 'owner' | 'editor' | 'viewer' | 'observer' | null;
  accessSource?: 'ownership' | 'grant' | 'observation'; // For debugging/audit
}

/**
 * Resolve tracker permissions for current user
 * 
 * @param trackerId - The tracker ID
 * @param userId - Optional: auth.users.id (defaults to current user)
 * @param context - Optional: Observation context (e.g., Guardrails project)
 */
export async function resolveTrackerPermissions(
  trackerId: string,
  userId?: string, // auth.users.id (defaults to current user)
  context?: ObservationContext // Optional: for observation link checks
): Promise<TrackerPermissions> {
  // Get current user
  let currentUserId: string;
  if (userId) {
    currentUserId = userId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        canView: false,
        canEdit: false,
        canManage: false,
        isOwner: false,
        role: null,
      };
    }
    currentUserId = user.id;
  }

  // Get tracker owner
  const { data: tracker, error: trackerError } = await supabase
    .from('trackers')
    .select('owner_id, archived_at')
    .eq('id', trackerId)
    .maybeSingle();

  if (trackerError || !tracker) {
    return {
      canView: false,
      canEdit: false,
      canManage: false,
      isOwner: false,
      role: null,
    };
  }

  // Check if archived
  if (tracker.archived_at) {
    // Only owner can view archived trackers
    if (tracker.owner_id === currentUserId) {
      return {
        canView: true,
        canEdit: false, // Cannot edit archived
        canManage: true,
        isOwner: true,
        role: 'owner',
      };
    }
    return {
      canView: false,
      canEdit: false,
      canManage: false,
      isOwner: false,
      role: null,
    };
  }

  // Check if owner
  if (tracker.owner_id === currentUserId) {
    return {
      canView: true,
      canEdit: true,
      canManage: true,
      isOwner: true,
      role: 'owner',
      accessSource: 'ownership',
    };
  }

  // Get user's profile ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      canView: false,
      canEdit: false,
      canManage: false,
      isOwner: false,
      role: null,
    };
  }

  // Check for active grants
  const { data: grant, error: grantError } = await supabase
    .from('entity_permission_grants')
    .select('permission_role')
    .eq('entity_type', 'tracker')
    .eq('entity_id', trackerId)
    .eq('subject_type', 'user')
    .eq('subject_id', profile.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (!grantError && grant) {
    // Grant found
    const role = grant.permission_role as 'viewer' | 'editor';
    return {
      canView: true,
      canEdit: role === 'editor',
      canManage: false, // Only owner can manage
      isOwner: false,
      role,
      accessSource: 'grant',
    };
  }

  // No grant found - check for observation link (if context provided)
  if (context) {
    const { data: observationLink, error: observationError } = await supabase
      .from('tracker_observation_links')
      .select('id')
      .eq('tracker_id', trackerId)
      .eq('observer_user_id', currentUserId)
      .eq('context_type', context.type)
      .eq('context_id', context.id)
      .is('revoked_at', null)
      .maybeSingle();

    if (observationError && observationError.code !== 'PGRST116') {
      // Log error but don't fail - fall through to no access
      console.error('Error checking observation link:', observationError);
    } else if (observationLink) {
      // Observation link found - read-only access
      return {
        canView: true,
        canEdit: false, // Observers cannot edit
        canManage: false, // Observers cannot manage
        isOwner: false,
        role: 'observer',
        accessSource: 'observation',
      };
    }
  }

  // No access
  return {
    canView: false,
    canEdit: false,
    canManage: false,
    isOwner: false,
    role: null,
  };
}
