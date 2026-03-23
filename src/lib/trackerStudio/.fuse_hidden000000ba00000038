/**
 * Tracker Service
 * 
 * CRUD operations for tracker instances.
 * Trackers store a snapshot of their schema at creation.
 */

import { supabase } from '../supabase';
import type {
  Tracker,
  CreateTrackerFromTemplateInput,
  CreateTrackerFromSchemaInput,
  UpdateTrackerInput,
} from './types';
import {
  validateCreateTrackerFromSchemaInput,
  TrackerValidationError,
} from './validation';
import { getTemplate } from './trackerTemplateService';
import { resolveTrackerPermissions } from './trackerPermissionResolver';
import type { ObservationContext } from './trackerObservationTypes';

/**
 * Create a tracker from a template
 */
export async function createTrackerFromTemplate(
  input: CreateTrackerFromTemplateInput
): Promise<Tracker> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate input
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    throw new TrackerValidationError('Tracker name is required and must be non-empty');
  }

  // Get template
  const template = await getTemplate(input.template_id);
  if (!template) {
    throw new Error('Template not found');
  }

  // Get max display_order for user's trackers to place new tracker at end
  const { data: maxOrderData } = await supabase
    .from('trackers')
    .select('display_order')
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const maxDisplayOrder = maxOrderData?.display_order ?? -1;
  const newDisplayOrder = maxDisplayOrder + 1;

  // Create tracker with schema snapshot
  const { data, error } = await supabase
    .from('trackers')
    .insert({
      owner_id: user.id,
      template_id: input.template_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      field_schema_snapshot: template.field_schema, // Snapshot at creation
      entry_granularity: template.entry_granularity,
      display_order: newDisplayOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tracker: ${error.message}`);
  }

  return data;
}

/**
 * Create a tracker from schema (no template)
 */
export async function createTrackerFromSchema(
  input: CreateTrackerFromSchemaInput
): Promise<Tracker> {
  // Validate input
  validateCreateTrackerFromSchemaInput(input);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get max display_order for user's trackers to place new tracker at end
  const { data: maxOrderData } = await supabase
    .from('trackers')
    .select('display_order')
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const maxDisplayOrder = maxOrderData?.display_order ?? -1;
  const newDisplayOrder = maxDisplayOrder + 1;

  // Create tracker with schema snapshot
  const { data, error } = await supabase
    .from('trackers')
    .insert({
      owner_id: user.id,
      template_id: null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      field_schema_snapshot: input.field_schema, // Snapshot at creation
      entry_granularity: input.entry_granularity || 'daily',
      chart_config: input.chart_config || null,
      display_order: newDisplayOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tracker: ${error.message}`);
  }

  return data;
}

/**
 * List user's trackers (owned + shared + observable)
 * 
 * @param includeArchived - Whether to include archived trackers
 * @param context - Optional: If provided, includes trackers observable in this context
 */
export async function listTrackers(
  includeArchived: boolean = false,
  context?: ObservationContext
): Promise<Tracker[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get user's profile ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  // Get owned trackers
  let ownedQuery = supabase
    .from('trackers')
    .select('*')
    .eq('owner_id', user.id);

  if (!includeArchived) {
    ownedQuery = ownedQuery.is('archived_at', null);
  }

  const { data: ownedTrackers, error: ownedError } = await ownedQuery.order('display_order', { ascending: true }).order('created_at', { ascending: false });

  if (ownedError) {
    throw new Error(`Failed to list owned trackers: ${ownedError.message}`);
  }

  // Get shared trackers (via grants)
  const { data: grants, error: grantsError } = await supabase
    .from('entity_permission_grants')
    .select('entity_id')
    .eq('entity_type', 'tracker')
    .eq('subject_type', 'user')
    .eq('subject_id', profile.id)
    .is('revoked_at', null);

  if (grantsError) {
    throw new Error(`Failed to list shared trackers: ${grantsError.message}`);
  }

  const sharedTrackerIds = (grants || []).map(g => g.entity_id);

  let sharedTrackers: Tracker[] = [];
  if (sharedTrackerIds.length > 0) {
    let sharedQuery = supabase
      .from('trackers')
      .select('*')
      .in('id', sharedTrackerIds);

    if (!includeArchived) {
      sharedQuery = sharedQuery.is('archived_at', null);
    }

    const { data: shared, error: sharedError } = await sharedQuery.order('display_order', { ascending: true }).order('created_at', { ascending: false });

    if (sharedError) {
      throw new Error(`Failed to load shared trackers: ${sharedError.message}`);
    }

    sharedTrackers = shared || [];
  }

  // Get observable trackers (if context provided)
  let observableTrackers: Tracker[] = [];
  if (context) {
    const { listObservableTrackersForContext } = await import('./trackerObservationService');
    const observableTrackerIds = await listObservableTrackersForContext(
      context.type,
      context.id,
      user.id
    );

    if (observableTrackerIds.length > 0) {
      let observableQuery = supabase
        .from('trackers')
        .select('*')
        .in('id', observableTrackerIds);

      if (!includeArchived) {
        observableQuery = observableQuery.is('archived_at', null);
      }

      const { data: observable, error: observableError } = await observableQuery.order('display_order', { ascending: true }).order('created_at', { ascending: false });

      if (observableError) {
        throw new Error(`Failed to load observable trackers: ${observableError.message}`);
      }

      observableTrackers = observable || [];
    }
  }

  // Combine and deduplicate (shouldn't happen, but safe)
  const allTrackers = [...(ownedTrackers || []), ...sharedTrackers, ...observableTrackers];
  const uniqueTrackers = Array.from(
    new Map(allTrackers.map(t => [t.id, t])).values()
  );

  // Sort by display_order (owned trackers only, shared/observable keep their original order)
  // For owned trackers, they're already sorted by display_order from the query
  // For shared/observable, we'll sort them by created_at as fallback
  uniqueTrackers.sort((a, b) => {
    const aOwned = (ownedTrackers || []).some(t => t.id === a.id);
    const bOwned = (ownedTrackers || []).some(t => t.id === b.id);
    
    // Owned trackers come first, sorted by display_order
    if (aOwned && bOwned) {
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    }
    if (aOwned) return -1;
    if (bOwned) return 1;
    
    // Non-owned trackers sorted by created_at
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return uniqueTrackers;
}

/**
 * Get a tracker by ID (with permission check)
 * 
 * @param trackerId - The tracker ID
 * @param context - Optional: Observation context (e.g., Guardrails project)
 */
export async function getTracker(
  trackerId: string,
  context?: ObservationContext
): Promise<Tracker | null> {
  // Check permissions first (includes observation link check if context provided)
  const permissions = await resolveTrackerPermissions(trackerId, undefined, context);
  if (!permissions.canView) {
    return null; // No access
  }

  // Get tracker (RLS will enforce access)
  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('id', trackerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get tracker: ${error.message}`);
  }

  return data;
}

/**
 * Update a tracker
 * 
 * Note: field_schema_snapshot is immutable and cannot be updated.
 */
export async function updateTracker(
  trackerId: string,
  input: UpdateTrackerInput
): Promise<Tracker> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify tracker exists and user has access
  const tracker = await getTracker(trackerId);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Check permissions - only owner can update
  const permissions = await resolveTrackerPermissions(trackerId);
  if (!permissions.isOwner) {
    throw new Error('Only tracker owner can update tracker');
  }

  // Build update object
  const updates: Partial<Tracker> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    if (!input.name || input.name.trim() === '') {
      throw new TrackerValidationError('Tracker name cannot be empty');
    }
    updates.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.chart_config !== undefined) {
    updates.chart_config = input.chart_config;
  }

  // Update tracker
  const { data, error } = await supabase
    .from('trackers')
    .update(updates)
    .eq('id', trackerId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update tracker: ${error.message}`);
  }

  return data;
}

/**
 * Archive a tracker
 */
export async function archiveTracker(trackerId: string): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify tracker exists and user has access
  const tracker = await getTracker(trackerId);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Check permissions - only owner can archive
  const permissions = await resolveTrackerPermissions(trackerId);
  if (!permissions.isOwner) {
    throw new Error('Only tracker owner can archive tracker');
  }

  // Archive tracker
  const { error } = await supabase
    .from('trackers')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', trackerId)
    .eq('owner_id', user.id);

  if (error) {
    throw new Error(`Failed to archive tracker: ${error.message}`);
  }
}

/**
 * Reorder trackers
 * Updates the display_order for multiple trackers at once
 * 
 * @param trackerOrders - Array of {trackerId, display_order} pairs
 */
export async function reorderTrackers(
  trackerOrders: Array<{ trackerId: string; displayOrder: number }>
): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify all trackers belong to the user
  const trackerIds = trackerOrders.map(to => to.trackerId);
  const { data: trackers, error: fetchError } = await supabase
    .from('trackers')
    .select('id, owner_id')
    .in('id', trackerIds)
    .eq('owner_id', user.id)
    .is('archived_at', null);

  if (fetchError) {
    throw new Error(`Failed to verify trackers: ${fetchError.message}`);
  }

  const foundTrackerIds = new Set(trackers?.map(t => t.id) || []);
  const missingTrackers = trackerIds.filter(id => !foundTrackerIds.has(id));
  if (missingTrackers.length > 0) {
    throw new Error(`Some trackers not found or not owned by you: ${missingTrackers.join(', ')}`);
  }

  // Update all trackers in a transaction-like manner
  // Note: Supabase doesn't support true transactions in JS client, so we'll do sequential updates
  // In production, you might want to use an RPC function for atomic updates
  const updates = trackerOrders.map(({ trackerId, displayOrder }) =>
    supabase
      .from('trackers')
      .update({ display_order: displayOrder, updated_at: new Date().toISOString() })
      .eq('id', trackerId)
      .eq('owner_id', user.id)
  );

  const results = await Promise.all(updates);
  
  for (const result of results) {
    if (result.error) {
      throw new Error(`Failed to update tracker order: ${result.error.message}`);
    }
  }
}
