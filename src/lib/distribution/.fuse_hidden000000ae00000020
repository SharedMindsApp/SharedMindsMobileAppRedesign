/**
 * Task Distribution Service
 * 
 * Service for distributing tasks to groups via the projection pattern.
 * 
 * Distribution semantics (Option A):
 * - Snapshot at distribution time (NOT dynamic membership)
 * - Removing someone from a group does NOT auto-revoke existing projections
 * - One projection per target user per task
 * 
 * Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
 */

import { supabase } from '../supabase';
import { ENABLE_GROUP_DISTRIBUTION } from '../featureFlags';

export interface TaskProjection {
  id: string;
  taskId: string;
  targetUserId: string;
  sourceGroupId: string | null;
  canEdit: boolean;
  canComplete: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdBy: string | null;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

/**
 * Convert auth.users.id to profiles.id
 */
async function getProfileIdFromUserId(userId: string): Promise<string | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !profile) {
    return null;
  }
  
  return profile.id;
}

/**
 * Check if user can distribute a task
 * For now: task owner only (event_tasks.user_id or event_tasks.event_id → calendar_events.user_id)
 * Simplified: if task has user_id, check that; otherwise check via event
 */
async function canDistributeTask(
  taskId: string,
  distributedByUserId: string // auth.users.id
): Promise<boolean> {
  // Get task (event_tasks only has event_id, no user_id)
  const { data: task, error: taskError } = await supabase
    .from('event_tasks')
    .select('event_id')
    .eq('id', taskId)
    .maybeSingle();
  
  if (taskError || !task || !task.event_id) {
    return false;
  }
  
  // Check event ownership (tasks are owned via their parent event)
  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .select('user_id')
    .eq('id', task.event_id)
    .maybeSingle();
  
  if (eventError || !event) {
    return false;
  }
  
  return event.user_id === distributedByUserId;
}

/**
 * Distribute a task to a group
 */
export async function distributeTaskToGroup(
  taskId: string,
  groupId: string,
  distributedBy: string, // profiles.id (will be converted to auth.users.id for created_by)
  options?: {
    canEdit?: boolean;
    canComplete?: boolean;
    status?: 'pending' | 'accepted' | 'declined' | 'revoked';
  }
): Promise<{ created: number; skipped: number }> {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    throw new Error('Group distribution feature is disabled');
  }

  // Convert distributedBy (profiles.id) to auth.users.id for ownership check
  const { data: distributedByProfile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
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

  // Validate distributedBy can distribute this task
  const canDistribute = await canDistributeTask(taskId, distributedByUserId);
  if (!canDistribute) {
    throw new Error('Not authorized to distribute this task');
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
    .select('id, user_id')
    .in('id', Array.from(activeMemberProfileIds));

  if (profilesError) {
    throw new Error(`Error fetching user IDs: ${profilesError.message}`);
  }

  if (!profiles || profiles.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const activeMemberUserIds = profiles.map(p => p.user_id).filter((id): id is string => !!id);

  // Get existing projections to avoid duplicates (idempotent)
  const { data: existingProjections, error: existingError } = await supabase
    .from('task_projections')
    .select('target_user_id')
    .eq('task_id', taskId)
    .in('target_user_id', activeMemberUserIds);

  if (existingError) {
    throw new Error(`Error checking existing projections: ${existingError.message}`);
  }

  const existingUserIds = new Set((existingProjections || []).map(p => p.target_user_id));
  const skipped = existingUserIds.size;

  // Filter out users who already have projections
  const usersToCreateProjectionsFor = activeMemberUserIds.filter(
    userId => !existingUserIds.has(userId)
  );

  if (usersToCreateProjectionsFor.length === 0) {
    return { created: 0, skipped };
  }

  // Prepare bulk insert
  const projectionsToInsert = usersToCreateProjectionsFor.map(targetUserId => ({
    task_id: taskId,
    target_user_id: targetUserId,
    source_group_id: groupId,
    can_edit: options?.canEdit ?? false,
    can_complete: options?.canComplete !== false, // Default true unless explicitly false
    status: options?.status ?? 'pending',
    created_by: distributedByUserId, // auth.users.id
  }));

  // Bulk insert
  const { error: insertError } = await supabase
    .from('task_projections')
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
 * Revoke a task projection
 */
export async function revokeTaskProjection(
  taskId: string,
  targetUserId: string, // auth.users.id
  revokedBy: string // profiles.id
): Promise<void> {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    throw new Error('Group distribution feature is disabled');
  }

  // Convert revokedBy (profiles.id) to auth.users.id for ownership check
  const { data: revokedByProfile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', revokedBy)
    .maybeSingle();
  
  if (profileError || !revokedByProfile) {
    throw new Error(`Profile not found: ${revokedBy}`);
  }
  
  const revokedByUserId = revokedByProfile.user_id;

  // Validate revokedBy can revoke this task projection
  const canDistribute = await canDistributeTask(taskId, revokedByUserId);
  if (!canDistribute) {
    throw new Error('Not authorized to revoke this task projection');
  }

  // Get existing projection (idempotent)
  const { data: projection, error: projectionError } = await supabase
    .from('task_projections')
    .select('id, status, revoked_at')
    .eq('task_id', taskId)
    .eq('target_user_id', targetUserId)
    .maybeSingle();

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
    .from('task_projections')
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
 * List all task projections for a task
 */
export async function listTaskProjections(taskId: string): Promise<TaskProjection[]> {
  if (!ENABLE_GROUP_DISTRIBUTION) {
    throw new Error('Group distribution feature is disabled');
  }

  // RLS handles access - we just query
  const { data: projections, error } = await supabase
    .from('task_projections')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error listing projections: ${error.message}`);
  }

  return (projections || []).map((p) => ({
    id: p.id,
    taskId: p.task_id,
    targetUserId: p.target_user_id,
    sourceGroupId: p.source_group_id,
    canEdit: p.can_edit,
    canComplete: p.can_complete,
    status: p.status,
    createdBy: p.created_by,
    createdAt: p.created_at,
    acceptedAt: p.accepted_at,
    revokedAt: p.revoked_at,
  }));
}
