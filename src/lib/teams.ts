/**
 * Teams Service
 * 
 * Functions to fetch and manage teams.
 */

import { supabase } from './supabase';
import type { Team } from './teamTypes';

/**
 * Get all teams the current user is a member of
 */
export async function getUserTeams(): Promise<Team[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return [];

  const { data: memberships, error } = await supabase
    .from('team_members')
    .select('team_id, teams!inner(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .is('teams.archived_at', null);

  if (error) {
    console.error('Error loading teams:', error);
    return [];
  }

  if (!memberships || memberships.length === 0) return [];

  return memberships
    .filter(m => m.teams)
    .map(m => ({
      id: m.teams.id,
      name: m.teams.name,
      description: m.teams.description || undefined,
      created_by: m.teams.created_by || undefined,
      created_at: m.teams.created_at,
      updated_at: m.teams.updated_at,
      is_archived: m.teams.archived_at !== null,
    }))
    .sort((a, b) => {
      // Sort by created_at descending (newest first)
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    }) as Team[];
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  // Check if user is a member
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, teams!inner(*)')
    .eq('user_id', profile.id)
    .eq('team_id', teamId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || !membership.teams) return null;

  return {
    id: membership.teams.id,
    name: membership.teams.name,
    description: membership.teams.description || undefined,
    created_by: membership.teams.created_by || undefined,
    created_at: membership.teams.created_at,
    updated_at: membership.teams.updated_at,
    is_archived: membership.teams.archived_at !== null,
  } as Team;
}
