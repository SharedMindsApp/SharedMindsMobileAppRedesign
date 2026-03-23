/**
 * Team Group Members Service
 * 
 * Service for managing membership in team-scoped groups.
 * 
 * This service is team-level only:
 * - Does not resolve permissions
 * - Does not grant permissions
 * - Does not interact with projects
 * - Operates strictly at the Team level
 * 
 * Based on: GROUPS_PERMISSIONS_PHASE0_LOCKIN.md
 */

import { supabase } from '../supabase';
import { ENABLE_GROUPS } from '../featureFlags';
import type { TeamGroup } from './teamGroupsService';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  addedBy: string | null;
  createdAt: string;
}

/**
 * Check if user is team owner or admin
 */
async function canManageTeamGroups(
  teamId: string,
  userId: string // profiles.id
): Promise<boolean> {
  const { data: membership, error } = await supabase
    .from('team_members')
    .select('role, status')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !membership) {
    return false;
  }

  // Must be active and owner or admin
  return (
    membership.status === 'active' &&
    (membership.role === 'owner' || membership.role === 'admin')
  );
}

/**
 * Check if user is team member
 */
async function isTeamMember(
  teamId: string,
  userId: string // profiles.id
): Promise<boolean> {
  const { data: membership, error } = await supabase
    .from('team_members')
    .select('status')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !membership) {
    return false;
  }

  return membership.status === 'active';
}

/**
 * Add a member to a group
 */
export async function addMember(
  groupId: string,
  userId: string, // profiles.id
  addedBy: string // profiles.id
): Promise<void> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // Get group to find team_id and check if archived
  const { data: group, error: groupError } = await supabase
    .from('team_groups')
    .select('team_id, archived_at')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Group must not be archived
  if (group.archived_at) {
    throw new Error('Cannot add members to archived groups');
  }

  // Validate addedBy is team owner or admin
  const canManage = await canManageTeamGroups(group.team_id, addedBy);
  if (!canManage) {
    throw new Error('Only team owners or admins can add group members');
  }

  // Validate userId is team member
  const isMember = await isTeamMember(group.team_id, userId);
  if (!isMember) {
    throw new Error('Cannot add users who are not team members to groups');
  }

  // Check if member already exists (idempotent)
  const { data: existingMember, error: existingError } = await supabase
    .from('team_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking existing membership: ${existingError.message}`);
  }

  if (existingMember) {
    // Already a member - idempotent, do nothing
    return;
  }

  // Add member
  const { error: insertError } = await supabase
    .from('team_group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      added_by: addedBy,
    });

  if (insertError) {
    throw new Error(`Error adding member: ${insertError.message}`);
  }
}

/**
 * Remove a member from a group
 */
export async function removeMember(
  groupId: string,
  userId: string, // profiles.id
  removedBy: string // profiles.id
): Promise<void> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // Get group to find team_id
  const { data: group, error: groupError } = await supabase
    .from('team_groups')
    .select('team_id')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Validate removedBy is team owner or admin
  const canManage = await canManageTeamGroups(group.team_id, removedBy);
  if (!canManage) {
    throw new Error('Only team owners or admins can remove group members');
  }

  // Check if member exists (idempotent)
  const { data: existingMember, error: existingError } = await supabase
    .from('team_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking existing membership: ${existingError.message}`);
  }

  if (!existingMember) {
    // Not a member - idempotent, do nothing
    return;
  }

  // Remove member (hard delete - this is membership, not a revocation)
  const { error: deleteError } = await supabase
    .from('team_group_members')
    .delete()
    .eq('id', existingMember.id);

  if (deleteError) {
    throw new Error(`Error removing member: ${deleteError.message}`);
  }
}

/**
 * Get member count for a group
 */
export async function getMemberCount(groupId: string): Promise<number> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  const { count, error } = await supabase
    .from('team_group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (error) {
    throw new Error(`Error getting member count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get member counts for multiple groups
 */
export async function getMemberCounts(groupIds: string[]): Promise<Record<string, number>> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  if (groupIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('team_group_members')
    .select('group_id')
    .in('group_id', groupIds);

  if (error) {
    throw new Error(`Error getting member counts: ${error.message}`);
  }

  // Count members per group
  const counts: Record<string, number> = {};
  groupIds.forEach(id => counts[id] = 0);
  
  (data || []).forEach((row) => {
    counts[row.group_id] = (counts[row.group_id] || 0) + 1;
  });

  return counts;
}

/**
 * List all members of a group
 */
export async function listMembers(groupId: string): Promise<GroupMember[]> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // RLS will enforce access - we just query
  const { data: members, error } = await supabase
    .from('team_group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Error listing members: ${error.message}`);
  }

  return (members || []).map((member) => ({
    id: member.id,
    groupId: member.group_id,
    userId: member.user_id,
    addedBy: member.added_by,
    createdAt: member.created_at,
  }));
}

/**
 * List all groups a user belongs to in a team (active groups only)
 */
export async function listUserGroups(
  teamId: string,
  userId: string // profiles.id
): Promise<TeamGroup[]> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // RLS will enforce access - we just query
  // Join through team_group_members to get groups user belongs to
  const { data: memberships, error } = await supabase
    .from('team_group_members')
    .select(`
      group_id,
      team_groups!inner(
        id,
        team_id,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        archived_at
      )
    `)
    .eq('user_id', userId)
    .eq('team_groups.team_id', teamId)
    .is('team_groups.archived_at', null); // Only active groups

  if (error) {
    throw new Error(`Error listing user groups: ${error.message}`);
  }

  if (!memberships) {
    return [];
  }

  // Extract groups from join result
  return memberships
    .filter((m) => m.team_groups) // Filter out nulls (shouldn't happen with inner join)
    .map((m) => {
      const group = m.team_groups as any;
      return {
        id: group.id,
        teamId: group.team_id,
        name: group.name,
        description: group.description,
        createdBy: group.created_by,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        archivedAt: group.archived_at,
      };
    });
}
