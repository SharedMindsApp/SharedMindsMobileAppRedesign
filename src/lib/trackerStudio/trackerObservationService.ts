/**
 * Tracker Observation Service
 * 
 * Service for managing contextual, read-only observation links.
 * Observation is relationship-scoped and consent-based.
 * Observers can read tracker data but cannot modify it.
 */

import { supabase } from '../supabase';
import { getTracker } from './trackerService';
import type {
  TrackerObservationLink,
  CreateObservationLinkInput,
  ObservationContext,
} from './trackerObservationTypes';

/**
 * Create an observation link
 * Only the tracker owner can create observation links.
 */
export async function createObservationLink(
  input: CreateObservationLinkInput
): Promise<TrackerObservationLink> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate tracker exists and user owns it
  const tracker = await getTracker(input.tracker_id);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  if (tracker.owner_id !== user.id) {
    throw new Error('Only the tracker owner can create observation links');
  }

  if (tracker.archived_at) {
    throw new Error('Cannot create observation links for archived trackers');
  }

  // Validate observer is not the owner (cannot observe own tracker)
  if (input.observer_user_id === user.id) {
    throw new Error('Cannot create observation link for yourself');
  }

  // Basic validation: observer_user_id must be a valid UUID
  // RLS will enforce that the user exists when they try to access
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input.observer_user_id)) {
    throw new Error('Invalid observer user ID');
  }

  // Check if active link already exists
  const { data: existingLink, error: existingError } = await supabase
    .from('tracker_observation_links')
    .select('id, revoked_at')
    .eq('tracker_id', input.tracker_id)
    .eq('observer_user_id', input.observer_user_id)
    .eq('context_type', input.context_type)
    .eq('context_id', input.context_id)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`Error checking existing link: ${existingError.message}`);
  }

  let resultLink: TrackerObservationLink;

  if (existingLink) {
    if (existingLink.revoked_at === null) {
      // Active link exists, return it (idempotent)
      const { data: link, error: fetchError } = await supabase
        .from('tracker_observation_links')
        .select('*')
        .eq('id', existingLink.id)
        .single();

      if (fetchError) {
        throw new Error(`Error fetching existing link: ${fetchError.message}`);
      }

      resultLink = link;
    } else {
      // Restore revoked link
      const { data: restoredLink, error: restoreError } = await supabase
        .from('tracker_observation_links')
        .update({
          revoked_at: null,
          granted_by: user.id,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingLink.id)
        .select()
        .single();

      if (restoreError) {
        throw new Error(`Error restoring link: ${restoreError.message}`);
      }

      resultLink = restoredLink;
    }
  } else {
    // Create new link
    const { data: newLink, error: insertError } = await supabase
      .from('tracker_observation_links')
      .insert({
        tracker_id: input.tracker_id,
        observer_user_id: input.observer_user_id,
        context_type: input.context_type,
        context_id: input.context_id,
        granted_by: user.id,
        revoked_at: null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create observation link: ${insertError.message}`);
    }

    resultLink = newLink;
  }

  return resultLink;
}

/**
 * Revoke an observation link
 * Only the tracker owner can revoke observation links.
 */
export async function revokeObservationLink(linkId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the link to verify ownership
  const { data: link, error: linkError } = await supabase
    .from('tracker_observation_links')
    .select('tracker_id')
    .eq('id', linkId)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error(`Observation link not found: ${linkId}`);
  }

  // Verify user owns the tracker
  const tracker = await getTracker(link.tracker_id);
  if (!tracker) {
    throw new Error('Tracker not found for observation link');
  }

  if (tracker.owner_id !== user.id) {
    throw new Error('Only the tracker owner can revoke observation links');
  }

  // Soft delete: set revoked_at
  const { error: updateError } = await supabase
    .from('tracker_observation_links')
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq('id', linkId);

  if (updateError) {
    throw new Error(`Error revoking observation link: ${updateError.message}`);
  }
}

/**
 * List all observation links for a tracker
 * Only the tracker owner can list observation links.
 */
export async function listObservationsForTracker(
  trackerId: string
): Promise<TrackerObservationLink[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify user owns the tracker
  const tracker = await getTracker(trackerId);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  if (tracker.owner_id !== user.id) {
    throw new Error('Only the tracker owner can list observation links');
  }

  const { data: links, error } = await supabase
    .from('tracker_observation_links')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list observation links: ${error.message}`);
  }

  return (links || []) as TrackerObservationLink[];
}

/**
 * List observable trackers for a context
 * Used by Guardrails to find trackers observable in a project.
 * Returns tracker IDs only.
 */
export async function listObservableTrackersForContext(
  contextType: ObservationContextType,
  contextId: string,
  observerUserId: string
): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify the observer is the current user (or admin check could be added)
  if (observerUserId !== user.id) {
    throw new Error('Cannot list observations for another user');
  }

  const { data: trackerIds, error } = await supabase.rpc(
    'list_observable_trackers_for_context',
    {
      p_context_type: contextType,
      p_context_id: contextId,
      p_observer_user_id: observerUserId,
    }
  );

  if (error) {
    throw new Error(`Failed to list observable trackers: ${error.message}`);
  }

  return (trackerIds || []).map((row: { tracker_id: string }) => row.tracker_id);
}

/**
 * Check if a user has observation access to a tracker in a context
 */
export async function hasObservationAccess(
  trackerId: string,
  userId: string,
  context: ObservationContext
): Promise<boolean> {
  const { data: link, error } = await supabase
    .from('tracker_observation_links')
    .select('id')
    .eq('tracker_id', trackerId)
    .eq('observer_user_id', userId)
    .eq('context_type', context.type)
    .eq('context_id', context.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error checking observation access: ${error.message}`);
  }

  return !!link;
}
