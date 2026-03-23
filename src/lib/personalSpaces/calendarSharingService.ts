/**
 * Calendar Sharing Service
 * 
 * Handles personal calendar sharing operations:
 * - Creating shares (inviting users)
 * - Accepting/declining shares
 * - Revoking shares
 * - Listing shares (owned and received)
 * - Updating permissions
 */

import { supabase } from '../supabase';

export interface CalendarShare {
  id: string;
  owner_user_id: string;
  viewer_user_id: string;
  permission: 'read' | 'write';
  status: 'pending' | 'active' | 'revoked';
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Populated when fetching with user details
  owner_name?: string;
  owner_email?: string;
  viewer_name?: string;
  viewer_email?: string;
}

export interface CreateCalendarShareInput {
  viewer_user_id: string;
  permission?: 'read' | 'write';
  viewer_email?: string; // Optional for search/invite
}

/**
 * Create a calendar share (invite a user to view your calendar)
 */
export async function createCalendarShare(
  ownerUserId: string,
  input: CreateCalendarShareInput
): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .insert({
      owner_user_id: ownerUserId,
      viewer_user_id: input.viewer_user_id,
      permission: input.permission || 'read',
      status: 'pending',
      created_by: ownerUserId,
    })
    .select()
    .single();

  if (error) {
    console.error('[calendarSharingService] Error creating share:', error);
    throw new Error(error.message || 'Failed to create calendar share');
  }

  return data;
}

/**
 * Get all shares owned by a user (shares they created)
 */
export async function getOwnedCalendarShares(
  ownerUserId: string
): Promise<CalendarShare[]> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[calendarSharingService] Error fetching owned shares:', error);
    throw new Error(error.message || 'Failed to fetch calendar shares');
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch viewer profiles separately (calendar_shares references auth.users, not profiles directly)
  const viewerUserIds = [...new Set(data.map(share => share.viewer_user_id))];
  let profileMap = new Map();
  
  if (viewerUserIds.length > 0) {
    const { data: viewerProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', viewerUserIds);

    if (profileError) {
      console.warn('[calendarSharingService] Error fetching viewer profiles (non-fatal):', profileError);
      // Continue without profile data - shares will still be returned but without names
    } else {
      // Create a map of id -> profile
      profileMap = new Map(
        (viewerProfiles || []).map(profile => [profile.id, profile])
      );
    }
  }

  return data.map(share => {
    const viewerProfile = profileMap.get(share.viewer_user_id);
    return {
      ...share,
      viewer_name: viewerProfile?.full_name || viewerProfile?.email?.split('@')[0] || null,
      viewer_email: viewerProfile?.email || null,
    };
  });
}

/**
 * Get all shares received by a user (calendars shared with them)
 */
export async function getReceivedCalendarShares(
  viewerUserId: string
): Promise<CalendarShare[]> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .select('*')
    .eq('viewer_user_id', viewerUserId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[calendarSharingService] Error fetching received shares:', error);
    throw new Error(error.message || 'Failed to fetch received calendar shares');
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch owner profiles separately (calendar_shares references auth.users, not profiles directly)
  const ownerUserIds = [...new Set(data.map(share => share.owner_user_id))];
  let profileMap = new Map();
  
  if (ownerUserIds.length > 0) {
    const { data: ownerProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ownerUserIds);

    if (profileError) {
      console.warn('[calendarSharingService] Error fetching owner profiles (non-fatal):', profileError);
      // Continue without profile data - shares will still be returned but without names
    } else {
      // Create a map of id -> profile
      profileMap = new Map(
        (ownerProfiles || []).map(profile => [profile.id, profile])
      );
    }
  }

  return data.map(share => {
    const ownerProfile = profileMap.get(share.owner_user_id);
    return {
      ...share,
      owner_name: ownerProfile?.full_name || ownerProfile?.email?.split('@')[0] || null,
      owner_email: ownerProfile?.email || null,
    };
  });
}

/**
 * Accept a calendar share (change status from pending to active)
 */
export async function acceptCalendarShare(shareId: string): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .update({ status: 'active' })
    .eq('id', shareId)
    .select()
    .single();

  if (error) {
    console.error('[calendarSharingService] Error accepting share:', error);
    throw new Error(error.message || 'Failed to accept calendar share');
  }

  return data;
}

/**
 * Decline/revoke a calendar share (change status to revoked)
 */
export async function revokeCalendarShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_shares')
    .update({ status: 'revoked' })
    .eq('id', shareId);

  if (error) {
    console.error('[calendarSharingService] Error revoking share:', error);
    throw new Error(error.message || 'Failed to revoke calendar share');
  }
}

/**
 * Update share permission (owner only)
 */
export async function updateCalendarSharePermission(
  shareId: string,
  permission: 'read' | 'write'
): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .update({ permission })
    .eq('id', shareId)
    .select()
    .single();

  if (error) {
    console.error('[calendarSharingService] Error updating share permission:', error);
    throw new Error(error.message || 'Failed to update calendar share permission');
  }

  return data;
}

/**
 * Delete a calendar share (owner only - fully removes the share)
 */
export async function deleteCalendarShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_shares')
    .delete()
    .eq('id', shareId);

  if (error) {
    console.error('[calendarSharingService] Error deleting share:', error);
    throw new Error(error.message || 'Failed to delete calendar share');
  }
}

/**
 * Find user by email for inviting
 */
export async function findUserByEmail(email: string): Promise<{ id: string; full_name: string | null; email: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error('[calendarSharingService] Error finding user:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
  };
}

/**
 * Get active calendar shares for a user (both owned and received, active only)
 */
export async function getActiveCalendarShares(userId: string): Promise<{
  owned: CalendarShare[];
  received: CalendarShare[];
}> {
  const [owned, received] = await Promise.all([
    getOwnedCalendarShares(userId),
    getReceivedCalendarShares(userId),
  ]);

  return {
    owned: owned.filter(share => share.status === 'active'),
    received: received.filter(share => share.status === 'active'),
  };
}
