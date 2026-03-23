/**
 * Team Groups Service
 * 
 * Service for managing team-scoped groups.
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

export interface TeamGroup {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
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
 * Create a new team group
 */
export async function createGroup(
  teamId: string,
  name: string,
  description?: string,
  createdBy?: string // profiles.id
): Promise<TeamGroup> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // Validate createdBy is team owner or admin
  if (createdBy) {
    const canManage = await canManageTeamGroups(teamId, createdBy);
    if (!canManage) {
      throw new Error('Only team owners or admins can create groups');
    }
  }

  // Validate team exists (will fail on FK constraint if not, but check explicitly for better error)
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .maybeSingle();

  if (teamError || !team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  // Check if group name already exists (case-insensitive, active groups only)
  const { data: existingGroup, error: existingError } = await supabase
    .from('team_groups')
    .select('id')
    .eq('team_id', teamId)
    .ilike('name', name)
    .is('archived_at', null)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking existing group: ${existingError.message}`);
  }

  if (existingGroup) {
    throw new Error(`Group name already exists in this team: ${name}`);
  }

  // Create group
  const { data: newGroup, error: insertError } = await supabase
    .from('team_groups')
    .insert({
      team_id: teamId,
      name: name.trim(),
      description: description?.trim() || null,
      created_by: createdBy || null,
      archived_at: null,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Error creating group: ${insertError.message}`);
  }

  return {
    id: newGroup.id,
    teamId: newGroup.team_id,
    name: newGroup.name,
    description: newGroup.description,
    createdBy: newGroup.created_by,
    createdAt: newGroup.created_at,
    updatedAt: newGroup.updated_at,
    archivedAt: newGroup.archived_at,
  };
}

/**
 * Rename a group
 */
export async function renameGroup(
  groupId: string,
  name: string,
  renamedBy: string // profiles.id
): Promise<void> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // Get group to find team_id
  const { data: group, error: groupError } = await supabase
    .from('team_groups')
    .select('team_id, archived_at')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Cannot rename archived groups
  if (group.archived_at) {
    throw new Error('Cannot rename archived groups');
  }

  // Validate renamedBy is team owner or admin
  const canManage = await canManageTeamGroups(group.team_id, renamedBy);
  if (!canManage) {
    throw new Error('Only team owners or admins can rename groups');
  }

  // Check if new name already exists (case-insensitive, active groups only, excluding current group)
  const { data: existingGroup, error: existingError } = await supabase
    .from('team_groups')
    .select('id')
    .eq('team_id', group.team_id)
    .ilike('name', name.trim())
    .is('archived_at', null)
    .neq('id', groupId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking existing group name: ${existingError.message}`);
  }

  if (existingGroup) {
    throw new Error(`Group name already exists in this team: ${name}`);
  }

  // Update group name
  const { error: updateError } = await supabase
    .from('team_groups')
    .update({
      name: name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId);

  if (updateError) {
    throw new Error(`Error renaming group: ${updateError.message}`);
  }
}

/**
 * Archive a group (soft delete)
 */
export async function archiveGroup(
  groupId: string,
  archivedBy: string // profiles.id
): Promise<void> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // Get group to find team_id
  const { data: group, error: groupError } = await supabase
    .from('team_groups')
    .select('team_id, archived_at')
    .eq('id', groupId)
    .maybeSingle();

  if (groupError || !group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Idempotent: if already archived, do nothing
  if (group.archived_at) {
    return;
  }

  // Validate archivedBy is team owner or admin
  const canManage = await canManageTeamGroups(group.team_id, archivedBy);
  if (!canManage) {
    throw new Error('Only team owners or admins can archive groups');
  }

  // Soft archive (set archived_at)
  const { error: updateError } = await supabase
    .from('team_groups')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId);

  if (updateError) {
    throw new Error(`Error archiving group: ${updateError.message}`);
  }
}

/**
 * List all groups for a team (active and archived)
 */
export async function listGroups(teamId: string): Promise<TeamGroup[]> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // RLS will enforce access - we just query
  const { data: groups, error } = await supabase
    .from('team_groups')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error listing groups: ${error.message}`);
  }

  return (groups || []).map((group) => ({
    id: group.id,
    teamId: group.team_id,
    name: group.name,
    description: group.description,
    createdBy: group.created_by,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    archivedAt: group.archived_at,
  }));
}

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string): Promise<TeamGroup | null> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }

  // RLS will enforce access - we just query
  const { data: group, error } = await supabase
    .from('team_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error getting group: ${error.message}`);
  }

  if (!group) {
    return null;
  }

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
}
