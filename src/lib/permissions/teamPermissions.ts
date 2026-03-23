/**
 * Team Permission Helpers
 * 
 * Permission helpers for team-level access control.
 * Used by permission hooks and route guards.
 */

import { supabase } from '../supabase';

/**
 * Check if user is an active team member
 */
export async function canUserAccessTeam(
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
 * Check if user can manage team groups (team owner or admin)
 */
export async function canUserManageTeamGroups(
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

  return (
    membership.status === 'active' &&
    (membership.role === 'owner' || membership.role === 'admin')
  );
}
