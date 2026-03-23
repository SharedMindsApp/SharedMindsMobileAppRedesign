/**
 * Context Event Service
 * 
 * CRUD operations for context events (life states).
 * Context events annotate time periods to explain tracker deviations.
 * They never modify tracker data or enforce behavior.
 */

import { supabase } from '../supabase';
import type {
  ContextEvent,
  CreateContextEventInput,
  UpdateContextEventInput,
  ListContextEventsOptions,
} from './contextEventTypes';

/**
 * Create a context event
 */
export async function createContextEvent(
  input: CreateContextEventInput
): Promise<ContextEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate dates
  if (input.end_date && input.end_date < input.start_date) {
    throw new Error('End date cannot be before start date');
  }

  // Validate label
  if (!input.label || input.label.trim() === '') {
    throw new Error('Label is required');
  }

  const { data, error } = await supabase
    .from('context_events')
    .insert({
      owner_id: user.id,
      type: input.type,
      label: input.label.trim(),
      start_date: input.start_date,
      end_date: input.end_date || null,
      severity: input.severity || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create context event: ${error.message}`);
  }

  return data;
}

/**
 * Update a context event
 */
export async function updateContextEvent(
  eventId: string,
  input: UpdateContextEventInput
): Promise<ContextEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get existing event to validate
  const existing = await getContextEvent(eventId);
  if (!existing) {
    throw new Error('Context event not found');
  }

  if (existing.owner_id !== user.id) {
    throw new Error('Not authorized to update this context event');
  }

  // Validate dates if provided
  const startDate = input.start_date || existing.start_date;
  const endDate = input.end_date !== undefined ? input.end_date : existing.end_date;

  if (endDate && endDate < startDate) {
    throw new Error('End date cannot be before start date');
  }

  // Validate label if provided
  if (input.label !== undefined && (!input.label || input.label.trim() === '')) {
    throw new Error('Label cannot be empty');
  }

  const updates: Partial<ContextEvent> = {
    updated_at: new Date().toISOString(),
  };

  if (input.type !== undefined) {
    updates.type = input.type;
  }

  if (input.label !== undefined) {
    updates.label = input.label.trim();
  }

  if (input.start_date !== undefined) {
    updates.start_date = input.start_date;
  }

  if (input.end_date !== undefined) {
    updates.end_date = input.end_date;
  }

  if (input.severity !== undefined) {
    updates.severity = input.severity;
  }

  if (input.notes !== undefined) {
    updates.notes = input.notes?.trim() || null;
  }

  const { data, error } = await supabase
    .from('context_events')
    .update(updates)
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update context event: ${error.message}`);
  }

  return data;
}

/**
 * Archive a context event (soft delete)
 */
export async function archiveContextEvent(eventId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify event exists and user owns it
  const existing = await getContextEvent(eventId);
  if (!existing) {
    throw new Error('Context event not found');
  }

  if (existing.owner_id !== user.id) {
    throw new Error('Not authorized to archive this context event');
  }

  const { error } = await supabase
    .from('context_events')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('owner_id', user.id);

  if (error) {
    throw new Error(`Failed to archive context event: ${error.message}`);
  }
}

/**
 * Get a context event by ID
 */
export async function getContextEvent(eventId: string): Promise<ContextEvent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('context_events')
    .select('*')
    .eq('id', eventId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get context event: ${error.message}`);
  }

  return data;
}

/**
 * List context events for the current user
 */
export async function listContextEvents(
  options: ListContextEventsOptions = {}
): Promise<ContextEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  let query = supabase
    .from('context_events')
    .select('*')
    .eq('owner_id', user.id);

  if (!options.include_archived) {
    query = query.is('archived_at', null);
  }

  // Filter by date range if provided
  if (options.start_date && options.end_date) {
    // Use the helper function for date range queries
    const { data, error } = await supabase.rpc('get_contexts_in_date_range', {
      p_user_id: user.id,
      p_start_date: options.start_date,
      p_end_date: options.end_date,
    });

    if (error) {
      throw new Error(`Failed to list context events: ${error.message}`);
    }

    return (data || []) as ContextEvent[];
  }

  const { data, error } = await query.order('start_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to list context events: ${error.message}`);
  }

  return data || [];
}

/**
 * Get active context events for a specific date
 */
export async function getActiveContextsForDate(
  date: string // ISO date string
): Promise<ContextEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_active_contexts_for_date', {
    p_user_id: user.id,
    p_date: date,
  });

  if (error) {
    throw new Error(`Failed to get active contexts: ${error.message}`);
  }

  return (data || []) as ContextEvent[];
}

/**
 * List context events by date range
 */
export async function listContextEventsByDateRange(
  startDate: string, // ISO date string
  endDate: string // ISO date string
): Promise<ContextEvent[]> {
  return listContextEvents({
    start_date: startDate,
    end_date: endDate,
    include_archived: false,
  });
}
