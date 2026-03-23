/**
 * Tracker Entry Service
 * 
 * CRUD operations for tracker entries.
 * Entries are append-only (no deletes, only updates).
 */

import { supabase } from '../supabase';
import type {
  TrackerEntry,
  CreateTrackerEntryInput,
  UpdateTrackerEntryInput,
  ListTrackerEntriesOptions,
} from './types';
import {
  validateEntryDate,
  validateEntryValues,
  TrackerValidationError,
} from './validation';
import { getTracker } from './trackerService';
import { resolveTrackerPermissions } from './trackerPermissionResolver';
import type { ObservationContext } from './trackerObservationTypes';

/**
 * Create a tracker entry
 * Observers cannot create entries (read-only access).
 */
export async function createEntry(input: CreateTrackerEntryInput): Promise<TrackerEntry> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate entry date
  validateEntryDate(input.entry_date);

  // Get tracker and validate entry values
  const tracker = await getTracker(input.tracker_id);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Check permissions - need write access (owner or editor, not observer)
  const permissions = await resolveTrackerPermissions(input.tracker_id);
  if (!permissions.canEdit) {
    throw new Error('You do not have permission to create entries for this tracker');
  }

  // Validate entry values against tracker schema
  try {
    validateEntryValues(tracker, input.field_values);
  } catch (err) {
    if (err instanceof TrackerValidationError) {
      console.error('[trackerEntryService] Validation failed:', {
        trackerId: input.tracker_id,
        trackerName: tracker.name,
        entryDate: input.entry_date,
        fieldValues: input.field_values,
        error: err.message,
        fieldSchema: tracker.field_schema_snapshot.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.validation?.required,
          validation: f.validation,
        })),
      });
    }
    throw err;
  }

  // Create entry
  const { data, error } = await supabase
    .from('tracker_entries')
    .insert({
      tracker_id: input.tracker_id,
      user_id: user.id,
      entry_date: input.entry_date,
      field_values: input.field_values,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      const err = new Error('Entry already exists for this date. Use updateEntry to modify it.');
      console.error('[trackerEntryService] Duplicate entry:', {
        trackerId: input.tracker_id,
        entryDate: input.entry_date,
        userId: user.id,
      });
      throw err;
    }
    const err = new Error(`Failed to create entry: ${error.message}`);
    console.error('[trackerEntryService] Create entry failed:', {
      trackerId: input.tracker_id,
      entryDate: input.entry_date,
      userId: user.id,
      fieldValues: input.field_values,
      error: error.message,
      errorCode: error.code,
      errorDetails: error.details,
    });
    throw err;
  }

  return data;
}

/**
 * Update a tracker entry
 */
export async function updateEntry(
  entryId: string,
  input: UpdateTrackerEntryInput
): Promise<TrackerEntry> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get existing entry
  const { data: existingEntry, error: fetchError } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to get entry: ${fetchError.message}`);
  }

  if (!existingEntry) {
    throw new Error('Entry not found');
  }

  // Get tracker for validation
  const tracker = await getTracker(existingEntry.tracker_id);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Check permissions - need write access (owner or editor, not observer)
  const permissions = await resolveTrackerPermissions(existingEntry.tracker_id);
  if (!permissions.canEdit) {
    throw new Error('You do not have permission to edit entries for this tracker');
  }

  // Build update object
  const updates: Partial<TrackerEntry> = {
    updated_at: new Date().toISOString(),
  };

  if (input.field_values !== undefined) {
    // Merge with existing values
    const mergedValues = {
      ...existingEntry.field_values,
      ...input.field_values,
    };
    
    // Validate merged values
    try {
      validateEntryValues(tracker, mergedValues);
    } catch (err) {
      if (err instanceof TrackerValidationError) {
        console.error('[trackerEntryService] Update validation failed:', {
          entryId,
          trackerId: existingEntry.tracker_id,
          trackerName: tracker.name,
          existingValues: existingEntry.field_values,
          newValues: input.field_values,
          mergedValues,
          error: err.message,
          fieldSchema: tracker.field_schema_snapshot.map(f => ({
            id: f.id,
            label: f.label,
            type: f.type,
            required: f.validation?.required,
            validation: f.validation,
          })),
        });
      }
      throw err;
    }
    updates.field_values = mergedValues;
  }

  if (input.notes !== undefined) {
    updates.notes = input.notes?.trim() || null;
  }

  // Update entry
  const { data, error } = await supabase
    .from('tracker_entries')
    .update(updates)
    .eq('id', entryId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    const err = new Error(`Failed to update entry: ${error.message}`);
    console.error('[trackerEntryService] Update entry failed:', {
      entryId,
      trackerId: existingEntry.tracker_id,
      userId: user.id,
      updates,
      error: error.message,
      errorCode: error.code,
      errorDetails: error.details,
    });
    throw err;
  }

  return data;
}

/**
 * Get an entry by ID
 * Observers can read entries if they have observation access to the tracker.
 */
export async function getEntry(
  entryId: string,
  context?: ObservationContext
): Promise<TrackerEntry | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get entry to find tracker_id
  const { data: entry, error: entryError } = await supabase
    .from('tracker_entries')
    .select('tracker_id')
    .eq('id', entryId)
    .maybeSingle();

  if (entryError || !entry) {
    throw new Error(`Entry not found: ${entryId}`);
  }

  // Check permissions via tracker
  const permissions = await resolveTrackerPermissions(entry.tracker_id, user.id, context);
  if (!permissions.canView) {
    return null; // No access
  }

  // Get entry (RLS will enforce access)
  const { data, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('id', entryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get entry: ${error.message}`);
  }

  return data;
}

/**
 * List entries by date range
 * Observers can read entries if they have observation access to the tracker.
 */
export async function listEntriesByDateRange(
  options: ListTrackerEntriesOptions,
  context?: ObservationContext
): Promise<TrackerEntry[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify tracker exists and user has access
  const tracker = await getTracker(options.tracker_id, context);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Check permissions - need read access (owner, editor, or observer)
  const permissions = await resolveTrackerPermissions(options.tracker_id, user.id, context);
  if (!permissions.canView) {
    throw new Error('You do not have permission to view entries for this tracker');
  }

  // Build query
  let query = supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', options.tracker_id)
    .eq('user_id', options.user_id || user.id);

  if (options.start_date) {
    validateEntryDate(options.start_date);
    query = query.gte('entry_date', options.start_date);
  }

  if (options.end_date) {
    validateEntryDate(options.end_date);
    query = query.lte('entry_date', options.end_date);
  }

  query = query.order('entry_date', { ascending: false });

  if (options.limit !== undefined) {
    const start = Math.max(0, options.offset ?? 0);
    const end = start + Math.max(0, options.limit - 1);
    query = query.range(start, end);
  } else if (options.offset !== undefined) {
    const start = Math.max(0, options.offset);
    query = query.range(start, start + 99);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Get entry for a specific date
 * Observers can read entries if they have observation access to the tracker.
 */
export async function getEntryByDate(
  trackerId: string,
  entryDate: string,
  context?: ObservationContext
): Promise<TrackerEntry | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate date
  validateEntryDate(entryDate);

  // Verify tracker exists and user has access
  const tracker = await getTracker(trackerId, context);
  if (!tracker) {
    throw new Error('Tracker not found');
  }

  // Check permissions - need read access (owner, editor, or observer)
  const permissions = await resolveTrackerPermissions(trackerId, user.id, context);
  if (!permissions.canView) {
    return null; // No access
  }

  const { data, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('user_id', user.id)
    .eq('entry_date', entryDate)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get entry: ${error.message}`);
  }

  return data;
}
