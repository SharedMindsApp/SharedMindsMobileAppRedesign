/**
 * Tracker Interpretation Note Service
 * 
 * CRUD operations for user-authored interpretations (personal meaning layer).
 * These are user-written reflections that never affect analytics or system behavior.
 */

import { supabase } from '../supabase';
import type {
  TrackerInterpretation,
  CreateInterpretationInput,
  UpdateInterpretationInput,
  ListInterpretationsOptions,
} from './trackerInterpretationNoteTypes';

/**
 * Create a user interpretation
 */
export async function createInterpretation(
  input: CreateInterpretationInput
): Promise<TrackerInterpretation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate body
  if (!input.body || input.body.trim() === '') {
    throw new Error('Body is required');
  }

  // Validate dates
  if (input.end_date && input.end_date < input.start_date) {
    throw new Error('End date cannot be before start date');
  }

  // Validate that at least one anchor exists
  const hasTrackerIds = input.tracker_ids && input.tracker_ids.length > 0;
  const hasContextEvent = input.context_event_id !== null && input.context_event_id !== undefined;
  const hasDateRange = input.start_date && input.end_date;

  if (!hasTrackerIds && !hasContextEvent && !hasDateRange) {
    throw new Error('Interpretation must be anchored to at least one tracker, context event, or date range');
  }

  const { data, error } = await supabase.rpc('create_tracker_interpretation', {
    p_start_date: input.start_date,
    p_body: input.body.trim(),
    p_end_date: input.end_date || null,
    p_tracker_ids: input.tracker_ids || null,
    p_context_event_id: input.context_event_id || null,
    p_title: input.title?.trim() || null,
  });

  if (error) {
    throw new Error(`Failed to create interpretation: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create interpretation: No data returned');
  }

  return data[0];
}

/**
 * Update a user interpretation
 */
export async function updateInterpretation(
  interpretationId: string,
  input: UpdateInterpretationInput
): Promise<TrackerInterpretation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get existing interpretation to validate
  const existing = await getInterpretation(interpretationId);
  if (!existing) {
    throw new Error('Interpretation not found');
  }

  if (existing.owner_id !== user.id) {
    throw new Error('Not authorized to update this interpretation');
  }

  // Validate body if provided
  if (input.body !== undefined && (!input.body || input.body.trim() === '')) {
    throw new Error('Body cannot be empty');
  }

  // Validate dates if provided
  const startDate = input.start_date || existing.start_date;
  const endDate = input.end_date !== undefined ? input.end_date : existing.end_date;

  if (endDate && endDate < startDate) {
    throw new Error('End date cannot be before start date');
  }

  // Validate anchors if updating
  if (input.tracker_ids !== undefined || input.context_event_id !== undefined || input.start_date !== undefined || input.end_date !== undefined) {
    const trackerIds = input.tracker_ids !== undefined ? input.tracker_ids : existing.tracker_ids;
    const contextEventId = input.context_event_id !== undefined ? input.context_event_id : existing.context_event_id;
    const hasDateRange = startDate && endDate;

    const hasTrackerIds = trackerIds && trackerIds.length > 0;
    const hasContextEvent = contextEventId !== null && contextEventId !== undefined;

    if (!hasTrackerIds && !hasContextEvent && !hasDateRange) {
      throw new Error('Interpretation must be anchored to at least one tracker, context event, or date range');
    }
  }

  const updates: Partial<TrackerInterpretation> = {
    updated_at: new Date().toISOString(),
  };

  if (input.start_date !== undefined) {
    updates.start_date = input.start_date;
  }

  if (input.end_date !== undefined) {
    updates.end_date = input.end_date;
  }

  if (input.tracker_ids !== undefined) {
    updates.tracker_ids = input.tracker_ids;
  }

  if (input.context_event_id !== undefined) {
    updates.context_event_id = input.context_event_id;
  }

  if (input.title !== undefined) {
    updates.title = input.title?.trim() || null;
  }

  if (input.body !== undefined) {
    updates.body = input.body.trim();
  }

  // Build RPC parameters (only include fields that are being updated)
  const rpcParams: any = { p_id: interpretationId };
  if (input.start_date !== undefined) rpcParams.p_start_date = input.start_date;
  if (input.end_date !== undefined) rpcParams.p_end_date = input.end_date;
  if (input.tracker_ids !== undefined) rpcParams.p_tracker_ids = input.tracker_ids;
  if (input.context_event_id !== undefined) rpcParams.p_context_event_id = input.context_event_id;
  if (input.title !== undefined) rpcParams.p_title = input.title?.trim() || null;
  if (input.body !== undefined) rpcParams.p_body = input.body.trim();

  const { data, error } = await supabase.rpc('update_tracker_interpretation', rpcParams);

  if (error) {
    throw new Error(`Failed to update interpretation: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to update interpretation: No data returned');
  }

  return data[0];
}

/**
 * Archive a user interpretation (soft delete)
 */
export async function archiveInterpretation(interpretationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify interpretation exists and user owns it
  const existing = await getInterpretation(interpretationId);
  if (!existing) {
    throw new Error('Interpretation not found');
  }

  if (existing.owner_id !== user.id) {
    throw new Error('Not authorized to archive this interpretation');
  }

  const { error } = await supabase.rpc('archive_tracker_interpretation', {
    p_id: interpretationId,
  });

  if (error) {
    throw new Error(`Failed to archive interpretation: ${error.message}`);
  }
}

/**
 * Get a single interpretation by ID
 */
export async function getInterpretation(interpretationId: string): Promise<TrackerInterpretation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_tracker_interpretation', {
    p_id: interpretationId,
  });

  if (error) {
    throw new Error(`Failed to get interpretation: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * List interpretations with optional filters
 */
export async function listInterpretations(
  options: ListInterpretationsOptions = {}
): Promise<TrackerInterpretation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_tracker_interpretations', {
    p_start_date: options.start_date || null,
    p_end_date: options.end_date || null,
    p_tracker_id: options.tracker_id || null,
    p_context_event_id: options.context_event_id || null,
    p_include_archived: options.include_archived || false,
  });

  if (error) {
    throw new Error(`Failed to list interpretations: ${error.message}`);
  }

  return data || [];
}

/**
 * List interpretations by date range
 */
export async function listInterpretationsByDateRange(
  startDate: string,
  endDate: string
): Promise<TrackerInterpretation[]> {
  return listInterpretations({
    start_date: startDate,
    end_date: endDate,
    include_archived: false,
  });
}

/**
 * List interpretations for a specific tracker
 */
export async function listInterpretationsForTracker(
  trackerId: string
): Promise<TrackerInterpretation[]> {
  return listInterpretations({
    tracker_id: trackerId,
    include_archived: false,
  });
}

/**
 * List interpretations for a specific context event
 */
export async function listInterpretationsForContext(
  contextEventId: string
): Promise<TrackerInterpretation[]> {
  return listInterpretations({
    context_event_id: contextEventId,
    include_archived: false,
  });
}
