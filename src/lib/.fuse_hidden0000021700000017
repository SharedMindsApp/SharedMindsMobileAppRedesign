/**
 * Shared Spaces Management Service
 * 
 * Functions for managing Households and Teams (unified interface)
 */

import { supabase } from './supabase';
import type { SpaceContextType } from './spaceTypes';

export interface SpaceMember {
  id: string;
  userId: string; // profiles.id
  userName?: string;
  userEmail?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'left';
  joinedAt?: string;
  invitedBy?: string;
}

export interface SpaceDetails {
  id: string;
  name: string;
  description?: string;
  type: SpaceContextType;
  contextId: string | null; // household.id or team.id
  memberCount: number;
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  currentUserStatus: 'pending' | 'active' | 'left' | null;
  members: SpaceMember[];
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
}

export interface SpaceListItem {
  id: string;
  name: string;
  type: SpaceContextType;
  contextId: string | null;
  memberCount: number;
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  currentUserStatus: 'pending' | 'active' | 'left' | null;
  isArchived?: boolean;
}

/**
 * Get all spaces (households + teams) the user is a member of
 */
export async function getUserSpaces(): Promise<SpaceListItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return [];

  // Get all space memberships
  const { data: memberships, error } = await supabase
    .from('space_members')
    .select(`
      space_id,
      role,
      status,
      spaces!inner(
        id,
        name,
        context_type,
        context_id,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', profile.id)
    .in('status', ['pending', 'active']);

  if (error) {
    console.error('Error loading spaces:', error);
    return [];
  }

  if (!memberships || memberships.length === 0) return [];

  // Get member counts for each space
  const spaceIds = memberships.map(m => m.space_id);
  const { data: memberCounts } = await supabase
    .from('space_members')
    .select('space_id')
    .in('space_id', spaceIds)
    .eq('status', 'active');

  const countsBySpace = (memberCounts || []).reduce((acc, m) => {
    acc[m.space_id] = (acc[m.space_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return memberships
    .filter(m => m.spaces && (m.spaces as any).context_type !== 'personal')
    .map(m => ({
      id: (m.spaces as any).id,
      name: (m.spaces as any).name || 'Unnamed Space',
      type: (m.spaces as any).context_type as SpaceContextType,
      contextId: (m.spaces as any).context_id,
      memberCount: countsBySpace[(m.spaces as any).id] || 0,
      currentUserRole: m.role as 'owner' | 'admin' | 'member' | 'viewer',
      currentUserStatus: m.status as 'pending' | 'active' | 'left',
    }));
}

/**
 * Get detailed information about a specific space
 */
export async function getSpaceDetails(spaceId: string): Promise<SpaceDetails | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  // Get space info
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', spaceId)
    .maybeSingle();

  if (spaceError || !space) return null;

  // Get current user's membership
  const { data: currentMembership } = await supabase
    .from('space_members')
    .select('*')
    .eq('space_id', spaceId)
    .eq('user_id', profile.id)
    .maybeSingle();

  // Get all members with profile info
  const { data: allMembers } = await supabase
    .from('space_members')
    .select(`
      id,
      user_id,
      email,
      role,
      status,
      created_at,
      invited_by
    `)
    .eq('space_id', spaceId)
    .in('status', ['pending', 'active']);

  // Get profile info for all members
  const userIds = (allMembers || []).filter(m => m.user_id).map(m => m.user_id);
  const { data: profiles } = userIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds) : { data: [] };

  const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

  const members: SpaceMember[] = (allMembers || []).map(m => {
    const profile = m.user_id ? profilesMap.get(m.user_id) : null;
    
    return {
      id: m.id,
      userId: m.user_id || '',
      userName: profile?.full_name || profile?.email?.split('@')[0] || null,
      userEmail: profile?.email || m.email || null,
      role: m.role as 'owner' | 'admin' | 'member' | 'viewer',
      status: m.status as 'pending' | 'active' | 'left',
      joinedAt: m.created_at,
      invitedBy: m.invited_by,
    };
  });

  return {
    id: space.id,
    name: space.name,
    description: space.description || undefined,
    type: space.context_type as SpaceContextType,
    contextId: space.context_id,
    memberCount: members.length,
    currentUserRole: currentMembership?.role as 'owner' | 'admin' | 'member' | 'viewer' | null,
    currentUserStatus: currentMembership?.status as 'pending' | 'active' | 'left' | null,
    members,
    createdAt: space.created_at,
    updatedAt: space.updated_at,
    archivedAt: null, // TODO: Add archived_at to spaces table if needed
  };
}

/**
 * Leave a space (self-management)
 */
export async function leaveSpace(spaceId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) throw new Error('Profile not found');

  // Check if user is the last owner
  const { data: owners } = await supabase
    .from('space_members')
    .select('user_id')
    .eq('space_id', spaceId)
    .eq('role', 'owner')
    .eq('status', 'active');

  const currentMembership = owners?.find(
    o => o.user_id === profile.id
  );

  if (currentMembership && owners && owners.length === 1) {
    throw new Error('Cannot leave: You are the last owner. Transfer ownership first.');
  }

  // Update status to 'left'
  const { error } = await supabase
    .from('space_members')
    .update({ status: 'left' })
    .eq('space_id', spaceId)
    .eq('user_id', profile.id);

  if (error) throw error;
}

/**
 * Update member role (owner/admin only)
 */
export async function updateMemberRole(
  spaceId: string,
  memberId: string,
  newRole: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<void> {
  const { error } = await supabase
    .from('space_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('space_id', spaceId);

  if (error) throw error;
}

/**
 * Remove a member (owner/admin only)
 */
export async function removeMember(spaceId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('space_members')
    .update({ status: 'left' })
    .eq('id', memberId)
    .eq('space_id', spaceId);

  if (error) throw error;
}

/**
 * Transfer ownership (owner only)
 */
export async function transferOwnership(
  spaceId: string,
  newOwnerMemberId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) throw new Error('Profile not found');

  // Get current owner membership
  const { data: currentOwner } = await supabase
    .from('space_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', profile.id)
    .eq('role', 'owner')
    .eq('status', 'active')
    .maybeSingle();

  if (!currentOwner) {
    throw new Error('Only owners can transfer ownership');
  }

  // Update new owner to owner role
  const { error: updateError } = await supabase
    .from('space_members')
    .update({ role: 'owner' })
    .eq('id', newOwnerMemberId)
    .eq('space_id', spaceId);

  if (updateError) throw updateError;

  // Update current owner to admin role
  const { error: demoteError } = await supabase
    .from('space_members')
    .update({ role: 'admin' })
    .eq('id', currentOwner.id);

  if (demoteError) throw demoteError;
}

/**
 * Delete a space (owner only)
 */
export async function deleteSpace(spaceId: string): Promise<void> {
  // This will cascade delete space_members due to foreign key
  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', spaceId);

  if (error) throw error;
}
