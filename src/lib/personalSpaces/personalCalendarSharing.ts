/**
 * Personal Calendar Sharing Service
 * 
 * Phase 8: Manages explicit sharing of Personal Calendars with read/write permissions.
 * 
 * This is a permission overlay, not a calendar type:
 * - The calendar remains Personal
 * - Other users receive delegated access
 * - Sync logic remains unchanged
 * - Shared projections are NOT used here
 * 
 * Two scopes:
 * 1. Global - applies to all personal calendar events
 * 2. Project-scoped - applies only to events from a specific Guardrails project
 * 
 * Permission levels:
 * - 'read' - view events only
 * - 'write' - create/edit/delete events
 */

import { supabase } from '../supabase';

export type PersonalCalendarAccessLevel = 'read' | 'write';
export type PersonalCalendarScopeType = 'global' | 'project';

export interface PersonalCalendarShare {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  access_level: PersonalCalendarAccessLevel;
  scope_type: PersonalCalendarScopeType;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonalCalendarShareInput {
  owner_user_id: string;
  shared_with_user_id: string;
  access_level: PersonalCalendarAccessLevel;
  scope_type: PersonalCalendarScopeType;
  project_id?: string | null;
}

export interface UpdatePersonalCalendarShareInput {
  access_level?: PersonalCalendarAccessLevel;
}

/**
 * Get all shares for a user's personal calendar (as owner)
 */
export async function getPersonalCalendarSharesForOwner(
  ownerUserId: string
): Promise<PersonalCalendarShare[]> {
  const { data, error } = await supabase
    .from('personal_calendar_shares')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PersonalCalendarSharing] Error fetching shares for owner:', error);
    throw error;
  }

  return (data || []) as PersonalCalendarShare[];
}

/**
 * Get all shares where user is a recipient
 */
export async function getPersonalCalendarSharesForRecipient(
  recipientUserId: string
): Promise<PersonalCalendarShare[]> {
  const { data, error } = await supabase
    .from('personal_calendar_shares')
    .select('*')
    .eq('shared_with_user_id', recipientUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PersonalCalendarSharing] Error fetching shares for recipient:', error);
    throw error;
  }

  return (data || []) as PersonalCalendarShare[];
}

/**
 * Get a specific share by ID
 */
export async function getPersonalCalendarShare(
  shareId: string
): Promise<PersonalCalendarShare | null> {
  const { data, error } = await supabase
    .from('personal_calendar_shares')
    .select('*')
    .eq('id', shareId)
    .maybeSingle();

  if (error) {
    console.error('[PersonalCalendarSharing] Error fetching share:', error);
    throw error;
  }

  return data as PersonalCalendarShare | null;
}

/**
 * Create a new personal calendar share
 */
export async function createPersonalCalendarShare(
  input: CreatePersonalCalendarShareInput
): Promise<PersonalCalendarShare> {
  // Validate: project_id must be null for global scope
  if (input.scope_type === 'global' && input.project_id !== null && input.project_id !== undefined) {
    throw new Error('project_id must be null for global scope');
  }

  // Validate: project_id must be provided for project scope
  if (input.scope_type === 'project' && !input.project_id) {
    throw new Error('project_id is required for project scope');
  }

  const { data, error } = await supabase
    .from('personal_calendar_shares')
    .insert({
      owner_user_id: input.owner_user_id,
      shared_with_user_id: input.shared_with_user_id,
      access_level: input.access_level,
      scope_type: input.scope_type,
      project_id: input.scope_type === 'project' ? input.project_id : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[PersonalCalendarSharing] Error creating share:', error);
    throw error;
  }

  console.log(`[PersonalCalendarSharing] Created share: ${data.id} (${input.scope_type}, ${input.access_level})`, {
    owner_user_id: input.owner_user_id,
    shared_with_user_id: input.shared_with_user_id,
    scope_type: input.scope_type,
    project_id: input.project_id,
    access_level: input.access_level,
  });
  return data as PersonalCalendarShare;
}

/**
 * Update a personal calendar share
 */
export async function updatePersonalCalendarShare(
  shareId: string,
  input: UpdatePersonalCalendarShareInput
): Promise<PersonalCalendarShare> {
  const updateData: any = {};
  
  if (input.access_level !== undefined) {
    updateData.access_level = input.access_level;
  }

  const { data, error } = await supabase
    .from('personal_calendar_shares')
    .update(updateData)
    .eq('id', shareId)
    .select()
    .single();

  if (error) {
    console.error('[PersonalCalendarSharing] Error updating share:', error);
    throw error;
  }

  console.log(`[PersonalCalendarSharing] Updated share: ${shareId}`, {
    share_id: shareId,
    updates: updateData,
  });
  return data as PersonalCalendarShare;
}

/**
 * Delete a personal calendar share (revoke access)
 */
export async function deletePersonalCalendarShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('personal_calendar_shares')
    .delete()
    .eq('id', shareId);

  if (error) {
    console.error('[PersonalCalendarSharing] Error deleting share:', error);
    throw error;
  }

  console.log(`[PersonalCalendarSharing] Deleted share: ${shareId}`, {
    share_id: shareId,
    action: 'revoked',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if a specific share exists
 */
export async function getPersonalCalendarShareByKey(
  ownerUserId: string,
  sharedWithUserId: string,
  scopeType: PersonalCalendarScopeType,
  projectId?: string | null
): Promise<PersonalCalendarShare | null> {
  let query = supabase
    .from('personal_calendar_shares')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .eq('shared_with_user_id', sharedWithUserId)
    .eq('scope_type', scopeType);

  if (scopeType === 'project') {
    query = query.eq('project_id', projectId);
  } else {
    query = query.is('project_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[PersonalCalendarSharing] Error fetching share by key:', error);
    throw error;
  }

  return data as PersonalCalendarShare | null;
}
