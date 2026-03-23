/**
 * Event Distribution Service
 * 
 * Service for distributing calendar events (context_events) to groups via the projection pattern.
 * 
 * Distribution semantics (Option A):
 * - Snapshot at distribution time (NOT dynamic membership)
 * - Removing someone from a group does NOT auto-revoke existing projections
 * - One projection per target user per event (per target_space_id)
 * 
 * Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
 */

import { supabase } from '../supabase';
import { ENABLE_GROUP_DISTRIBUTION } from '../featureFlags';

export type ProjectionScope = 'date_only' | 'title' | 'full';
export type ProjectionStatus = 'suggested' | 'pending' | 'accepted' | 'declined' | 'revoked';

export interface CalendarProjection {
  id: string;
  eventId: string;
  targetUserId: string;
  targetSpaceId: string | null;
  sourceGroupId: string | null;
  scope: ProjectionScope;
  status: ProjectionStatus;
  canEdit: boolean | null;
  createdBy: string;
  createdAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
}

/**
 * Check if user can distribute an event
 * Event owner is context_events.created_by (references auth.users.id)
 */
async function canDistributeEvent(
  eventId: string,
  distributedByUserId: string // auth.users.id
): Promise<boolean> {
  const { data: event, error: eventError } = await supabase
    .from('context_events')
    .select('created_by')
    .eq('id', eventId)
    .maybeSingle();
  
  if (eventError || !event) {
    return false;
  }
  
  return event.created_by === distributedByUserId;
}

/**
 * Distribute a calendar event to a group
 */
export async function distributeCalendarEventToGroup(
  eventId: string,
  groupId: string,
  distributedBy: string, // profiles.id (will be converted to auth.users.id)
  options?: {
    scope?: ProjectionScope;
    canEdit?: boolean;
    status?: ProjectionStatus;
  }
): Promise<{ created: number; skipped: number }> {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    throw new Error('Group distribution feature is disabled');
  }

  // Convert distributedBy (profiles.id) to auth.users.id for ownership check
  const { data: distributedByProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', distributedBy)
    .maybeSingle();
  
  if (profileError || !distributedByProfile) {
    throw new Error(`Profile not found: ${distributedBy}`);
  }
  
  const distributedByUserId = distributedByProfile.user_id;

  // Validate group exists and not archived
  const { data: group, error: groupError } = await supabase
    .from('team_groups')
    .select('id, archived_at')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  if (group.archived_at) {
    throw new Error('Cannot distribute to archived groups');
  }

  // Validate distributedBy can distribute this event
  const canDistribute = await canDistributeEvent(eventId, distributedByUserId);
  if (!canDistribute) {
    throw new Error('Not authorized to distribute this event');
  }

  // Get group to find team_id
  const { data: groupWithTeam, error: groupTeamError } = await supabase
    .from('team_groups')
    .select('team_id')
    .eq('id', groupId)
    .maybeSingle();

  if (groupTeamError || !groupWithTeam) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Get group members (user_id is profiles.id)
  const { data: groupMembers, error: membersError } = await supabase
    .from('team_group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (membersError) {
    throw new Error(`Error fetching group members: ${membersError.message}`);
  }

  if (!groupMembers || groupMembers.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const memberProfileIds = groupMembers.map(m => m.user_id);

  // Validate each group member is an active team member
  const { data: teamMemberships, error: teamMembersError } = await supabase
    .from('team_members')
    .select('user_id, status')
    .eq('team_id', groupWithTeam.team_id)
    .in('user_id', memberProfileIds)
    .eq('status', 'active');

  if (teamMembersError) {
    throw new Error(`Error validating team memberships: ${teamMembersError.message}`);
  }

  if (!teamMemberships || teamMemberships.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const activeMemberProfileIds = new Set(teamMemberships.map(tm => tm.user_id));

  // Convert profile IDs to auth.users.id
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .in('id', Array.from(activeMemberProfileIds));

  if (profilesError) {
    throw new Error(`Error fetching user IDs: ${profilesError.message}`);
  }

  if (!profiles || profiles.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const activeMemberUserIds = profiles.map(p => p.id).filter((id): id is string => !!id);

  // Get existing projections to avoid duplicates (idempotent)
  // For personal calendar: target_space_id IS NULL
  const { data: existingProjections, error: existingError } = await supabase
    .from('calendar_projections')
    .select('target_user_id, target_space_id')
    .eq('event_id', eventId)
    .in('target_user_id', activeMemberUserIds)
    .is('target_space_id', null); // Personal calendar only

  if (existingError) {
    throw new Error(`Error checking existing projections: ${existingError.message}`);
  }

  const existingProjectionKeys = new Set(
    (existingProjections || []).map(p => `${p.target_user_id}:${p.target_space_id || 'null'}`)
  );
  const skipped = existingProjectionKeys.size;

  // Filter out users who already have projections (for personal calendar)
  const usersToCreateProjectionsFor = activeMemberUserIds.filter(userId => {
    const key = `${userId}:null`;
    return !existingProjectionKeys.has(key);
  });

  if (usersToCreateProjectionsFor.length === 0) {
    return { created: 0, skipped };
  }

  // Prepare bulk insert
  const projectionsToInsert = usersToCreateProjectionsFor.map(targetUserId => ({
    event_id: eventId,
    target_user_id: targetUserId,
    target_space_id: null, // Personal calendar (not shared space)
    source_group_id: groupId,
    scope: (options?.scope ?? 'full') as ProjectionScope,
    status: (options?.status ?? 'pending') as ProjectionStatus,
    can_edit: options?.canEdit ?? false,
    created_by: distributedByUserId, // auth.users.id
  }));

  // Bulk insert
  const { error: insertError } = await supabase
    .from('calendar_projections')
    .insert(projectionsToInsert);

  if (insertError) {
    throw new Error(`Error creating projections: ${insertError.message}`);
  }

  return {
    created: usersToCreateProjectionsFor.length,
    skipped,
  };
}

/**
 * Revoke a calendar projection
 */
export async function revokeCalendarProjection(
  eventId: string,
  targetUserId: string, // auth.users.id
  revokedBy: string, // profiles.id
  targetSpaceId?: string | null // Optional: if not provided, revokes personal calendar projection
): Promise<void> {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    throw new Error('Group distribution feature is disabled');
  }

  // Convert revokedBy (profiles.id) to auth.users.id for ownership check
  const { data: revokedByProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', revokedBy)
    .maybeSingle();
  
  if (profileError || !revokedByProfile) {
    throw new Error(`Profile not found: ${revokedBy}`);
  }
  
  const revokedByUserId = revokedByProfile.user_id;

  // Validate revokedBy can revoke this event projection
  const canDistribute = await canDistributeEvent(eventId, revokedByUserId);
  if (!canDistribute) {
    throw new Error('Not authorized to revoke this event projection');
  }

  // Build query for projection
  let query = supabase
    .from('calendar_projections')
    .select('id, status, revoked_at')
    .eq('event_id', eventId)
    .eq('target_user_id', targetUserId);

  // Filter by target_space_id if provided
  if (targetSpaceId === null || targetSpaceId === undefined) {
    query = query.is('target_space_id', null);
  } else {
    query = query.eq('target_space_id', targetSpaceId);
  }

  const { data: projection, error: projectionError } = await query.maybeSingle();

  if (projectionError && projectionError.code !== 'PGRST116') {
    throw new Error(`Error checking projection: ${projectionError.message}`);
  }

  if (!projection) {
    // No projection exists - idempotent, do nothing
    return;
  }

  if (projection.status === 'revoked' && projection.revoked_at) {
    // Already revoked - idempotent, do nothing
    return;
  }

  // Soft revoke
  const { error: updateError } = await supabase
    .from('calendar_projections')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', projection.id);

  if (updateError) {
    throw new Error(`Error revoking projection: ${updateError.message}`);
  }
}

/**
 * List all calendar projections for an event
 */
export async function listCalendarProjectionsForEvent(eventId: string): Promise<CalendarProjection[]> {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    throw new Error('Group distribution feature is disabled');
  }

  // RLS handles access - we just query
  const { data: projections, error } = await supabase
    .from('calendar_projections')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error listing projections: ${error.message}`);
  }

  return (projections || []).map((p) => ({
    id: p.id,
    eventId: p.event_id,
    targetUserId: p.target_user_id,
    targetSpaceId: p.target_space_id,
    sourceGroupId: p.source_group_id,
    scope: p.scope as ProjectionScope,
    status: p.status as ProjectionStatus,
    canEdit: p.can_edit,
    createdBy: p.created_by,
    createdAt: p.created_at,
    acceptedAt: p.accepted_at,
    declinedAt: p.declined_at,
    revokedAt: p.revoked_at,
  }));
}
