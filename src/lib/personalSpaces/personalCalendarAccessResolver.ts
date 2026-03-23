/**
 * Personal Calendar Access Resolver
 * 
 * Phase 8: Determines access permissions for viewing/editing Personal Calendar events.
 * 
 * This resolver is pure, deterministic, and used everywhere calendar reads/writes occur.
 * 
 * Uses the new calendar_shares table (Phase 8 Prompt 1) which provides full-calendar sharing.
 * 
 * Rules:
 * - Owner always has full access
 * - Active share grants access based on permission level
 * - Default = no access
 * 
 * Architecture:
 * - Personal Calendar Sharing is a permission overlay
 * - The calendar remains Personal
 * - Other users receive delegated access
 * - Sync logic remains unchanged
 */

import { supabase } from '../supabase';

export interface PersonalCalendarAccessResult {
  canRead: boolean;
  canWrite: boolean;
  source: 'owner' | 'global_share' | 'none';
  accessLevel?: 'read' | 'write';
  shareId?: string;
}

/**
 * Resolve personal calendar access for a viewer
 * 
 * Phase 8 Prompt 1: Uses calendar_shares table (full-calendar sharing only)
 * 
 * @param ownerUserId - User who owns the personal calendar
 * @param viewerUserId - User requesting access
 * @param projectId - Optional project ID (kept for compatibility, but not used with new model)
 * @returns Access result with canRead, canWrite, and source
 */
export async function resolvePersonalCalendarAccess(
  ownerUserId: string,
  viewerUserId: string,
  projectId?: string | null
): Promise<PersonalCalendarAccessResult> {
  // Owner always has full access
  if (ownerUserId === viewerUserId) {
    return {
      canRead: true,
      canWrite: true,
      source: 'owner',
    };
  }

  // Check for active calendar share using new calendar_shares table
  const { data: share, error } = await supabase
    .from('calendar_shares')
    .select('id, permission')
    .eq('owner_user_id', ownerUserId)
    .eq('viewer_user_id', viewerUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[personalCalendarAccessResolver] Error checking calendar share:', error);
    // On error, deny access (fail closed)
    return {
      canRead: false,
      canWrite: false,
      source: 'none',
    };
  }

  if (share) {
    return {
      canRead: true,
      canWrite: share.permission === 'write',
      source: 'global_share',
      accessLevel: share.permission,
      shareId: share.id,
    };
  }

  // No active share found - no access
  return {
    canRead: false,
    canWrite: false,
    source: 'none',
  };
}

/**
 * Check if user can read a specific calendar event
 * 
 * This is a convenience wrapper that:
 * 1. Extracts project_id from event metadata (if Guardrails-originated)
 * 2. Calls resolvePersonalCalendarAccess
 * 3. Returns canRead
 */
export async function canReadPersonalCalendarEvent(
  ownerUserId: string,
  viewerUserId: string,
  event: {
    source_project_id?: string | null;
    created_by?: string;
  }
): Promise<boolean> {
  const access = await resolvePersonalCalendarAccess(
    ownerUserId,
    viewerUserId,
    event.source_project_id || null
  );
  return access.canRead;
}

/**
 * Check if user can write to a specific calendar event
 * 
 * This is a convenience wrapper that:
 * 1. Extracts project_id from event metadata (if Guardrails-originated)
 * 2. Calls resolvePersonalCalendarAccess
 * 3. Returns canWrite
 */
export async function canWritePersonalCalendarEvent(
  ownerUserId: string,
  viewerUserId: string,
  event: {
    source_project_id?: string | null;
    created_by?: string;
  }
): Promise<boolean> {
  const access = await resolvePersonalCalendarAccess(
    ownerUserId,
    viewerUserId,
    event.source_project_id || null
  );
  return access.canWrite;
}
