/**
 * Context Events Service - CRUD operations for context-owned events
 * 
 * ⚠️ EXPERIMENTAL: These events are SEPARATE from calendar_events (household calendar).
 * 
 * Key differences:
 * - Owned by contexts (not households)
 * - Invisible by default (require projection)
 * - Context permission model
 * - Revocable visibility
 * 
 * Safety guarantees:
 * - Does NOT touch calendar_events table
 * - Does NOT auto-sync to existing calendars
 * - Does NOT auto-create projections
 * - RLS enforces context permissions
 */

import { supabase } from '../supabase';
import type {
  ContextEvent,
  ContextEventWithContext,
  ContextEventWithProjection,
  ContextEventWithChildren,
  ContainerEvent,
  NestedEvent,
  CreateContextEventInput,
  CreateContainerEventInput,
  CreateNestedEventInput,
  UpdateContextEventInput,
  ServiceResponse,
} from './types';

// ============================================================================
// Context Event CRUD
// ============================================================================

/**
 * Create a context event
 * 
 * Note: User must have editor+ role in context (enforced by RLS)
 * Event is invisible until projections are created and accepted
 */
export async function createContextEvent(
  input: CreateContextEventInput
): Promise<ServiceResponse<ContextEvent>> {
  try {
    // Validate: end_at must be >= start_at
    const startDate = new Date(input.start_at);
    const endDate = new Date(input.end_at);
    
    if (endDate < startDate) {
      return {
        success: false,
        error: 'Event end time must be after or equal to start time',
      };
    }
    
    // Create event
    const { data, error } = await supabase
      .from('context_events')
      .insert({
        context_id: input.context_id,
        created_by: input.created_by,
        event_type: input.event_type,
        time_scope: input.time_scope,
        event_scope: input.event_scope || 'item',  // Default to 'item' for backward compatibility
        parent_context_event_id: input.parent_context_event_id || null,
        title: input.title,
        description: input.description || '',
        location: input.location || '',
        start_at: input.start_at,
        end_at: input.end_at,
        timezone: input.timezone || 'UTC',
        metadata: input.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get context event by ID
 */
export async function getContextEvent(
  eventId: string,
  options?: { includeContext?: boolean }
): Promise<ServiceResponse<ContextEvent | ContextEventWithContext>> {
  try {
    let query = supabase
      .from('context_events')
      .select(options?.includeContext ? '*, context:contexts(*)' : '*')
      .eq('id', eventId);
    
    const { data, error } = await query.single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as any };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get events for a context
 */
export async function getContextEvents(
  contextId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
    event_types?: string[];
  }
): Promise<ServiceResponse<ContextEvent[]>> {
  try {
    let query = supabase
      .from('context_events')
      .select('*')
      .eq('context_id', contextId)
      .order('start_at', { ascending: true });
    
    // Apply filters
    if (filters?.start_date) {
      query = query.gte('start_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('start_at', filters.end_date);
    }
    if (filters?.event_types && filters.event_types.length > 0) {
      query = query.in('event_type', filters.event_types);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get events created by user
 */
export async function getUserCreatedEvents(
  userId: string,
  filters?: {
    context_id?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ServiceResponse<ContextEventWithContext[]>> {
  try {
    let query = supabase
      .from('context_events')
      .select('*, context:contexts(*)')
      .eq('created_by', userId)
      .order('start_at', { ascending: true });
    
    if (filters?.context_id) {
      query = query.eq('context_id', filters.context_id);
    }
    if (filters?.start_date) {
      query = query.gte('start_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('start_at', filters.end_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as any };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Update context event
 * 
 * Note: Only event creator, context owner, or context admin can update (enforced by RLS)
 */
export async function updateContextEvent(
  eventId: string,
  input: UpdateContextEventInput
): Promise<ServiceResponse<ContextEvent>> {
  try {
    // Build updates object
    const updates: any = {};
    
    if (input.event_type !== undefined) updates.event_type = input.event_type;
    if (input.time_scope !== undefined) updates.time_scope = input.time_scope;
    if (input.event_scope !== undefined) updates.event_scope = input.event_scope;
    if (input.parent_context_event_id !== undefined) updates.parent_context_event_id = input.parent_context_event_id;
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.location !== undefined) updates.location = input.location;
    if (input.start_at !== undefined) updates.start_at = input.start_at;
    if (input.end_at !== undefined) updates.end_at = input.end_at;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.metadata !== undefined) updates.metadata = input.metadata;
    
    // Validate: end_at must be >= start_at (if both provided)
    if (input.start_at && input.end_at) {
      const startDate = new Date(input.start_at);
      const endDate = new Date(input.end_at);
      
      if (endDate < startDate) {
        return {
          success: false,
          error: 'Event end time must be after or equal to start time',
        };
      }
    }
    
    // Update event
    const { data, error } = await supabase
      .from('context_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Delete context event
 * 
 * Note: Only event creator, context owner, or context admin can delete (enforced by RLS)
 * Cascade deletes: calendar_projections
 */
export async function deleteContextEvent(eventId: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('context_events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Create multiple events at once (for bulk import)
 */
export async function createContextEventsBulk(
  inputs: CreateContextEventInput[]
): Promise<ServiceResponse<ContextEvent[]>> {
  try {
    // Validate all inputs
    for (const input of inputs) {
      const startDate = new Date(input.start_at);
      const endDate = new Date(input.end_at);
      
      if (endDate < startDate) {
        return {
          success: false,
          error: `Invalid event "${input.title}": end time must be after start time`,
        };
      }
    }
    
    // Insert all events
    const { data, error } = await supabase
      .from('context_events')
      .insert(
        inputs.map((input) => ({
          context_id: input.context_id,
          created_by: input.created_by,
          event_type: input.event_type,
          time_scope: input.time_scope,
          title: input.title,
          description: input.description || '',
          location: input.location || '',
          start_at: input.start_at,
          end_at: input.end_at,
          timezone: input.timezone || 'UTC',
          metadata: input.metadata || {},
        }))
      )
      .select();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Delete all events for a context (admin operation)
 */
export async function deleteAllContextEvents(
  contextId: string
): Promise<ServiceResponse<{ count: number }>> {
  try {
    // Get count first
    const { count } = await supabase
      .from('context_events')
      .select('*', { count: 'exact', head: true })
      .eq('context_id', contextId);
    
    // Delete all
    const { error } = await supabase
      .from('context_events')
      .delete()
      .eq('context_id', contextId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: { count: count || 0 } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get events for a date range across all user's contexts
 */
export async function getUserEvents(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ServiceResponse<ContextEventWithContext[]>> {
  try {
    // Get all contexts user has access to
    const { data: contexts } = await supabase
      .from('contexts')
      .select('id')
      .or(`owner_user_id.eq.${userId},id.in.(select context_id from context_members where user_id=${userId} and status=accepted)`);
    
    if (!contexts || contexts.length === 0) {
      return { success: true, data: [] };
    }
    
    const contextIds = contexts.map((c) => c.id);
    
    // Get events for these contexts
    const { data, error } = await supabase
      .from('context_events')
      .select('*, context:contexts(*)')
      .in('context_id', contextIds)
      .gte('start_at', startDate)
      .lte('start_at', endDate)
      .order('start_at', { ascending: true });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as any };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get upcoming events for a context (next N events)
 */
export async function getUpcomingContextEvents(
  contextId: string,
  limit: number = 10
): Promise<ServiceResponse<ContextEvent[]>> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('context_events')
      .select('*')
      .eq('context_id', contextId)
      .gte('start_at', now)
      .order('start_at', { ascending: true })
      .limit(limit);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Count events for a context
 */
export async function getContextEventCount(
  contextId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<ServiceResponse<number>> {
  try {
    let query = supabase
      .from('context_events')
      .select('*', { count: 'exact', head: true })
      .eq('context_id', contextId);
    
    if (filters?.start_date) {
      query = query.gte('start_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('start_at', filters.end_date);
    }
    
    const { count, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: count || 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Container Event Operations
// ============================================================================

/**
 * Create a container event (macro time block)
 * 
 * Container events represent bounded periods of time (e.g., trip, project phase).
 * They can be projected to calendars as a single block.
 * They carry NO internal detail by default.
 */
export async function createContainerEvent(
  input: CreateContainerEventInput
): Promise<ServiceResponse<ContainerEvent>> {
  try {
    // Validate: end_at must be >= start_at
    const startDate = new Date(input.start_at);
    const endDate = new Date(input.end_at);
    
    if (endDate < startDate) {
      return {
        success: false,
        error: 'Event end time must be after or equal to start time',
      };
    }
    
    // Create container event (event_scope = 'container', no parent)
    const { data, error } = await supabase
      .from('context_events')
      .insert({
        context_id: input.context_id,
        created_by: input.created_by,
        event_type: input.event_type,
        time_scope: input.time_scope,
        event_scope: 'container',
        parent_context_event_id: null,
        title: input.title,
        description: input.description || '',
        location: input.location || '',
        start_at: input.start_at,
        end_at: input.end_at,
        timezone: input.timezone || 'UTC',
        metadata: input.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as ContainerEvent };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get container event with nested children
 */
export async function getContainerEventWithChildren(
  containerEventId: string
): Promise<ServiceResponse<ContextEventWithChildren>> {
  try {
    // Get container event
    const { data: container, error: containerError } = await supabase
      .from('context_events')
      .select('*')
      .eq('id', containerEventId)
      .eq('event_scope', 'container')
      .single();
    
    if (containerError) {
      return { success: false, error: containerError.message };
    }
    
    // Get nested events
    const { data: nested, error: nestedError } = await supabase
      .from('context_events')
      .select('*')
      .eq('parent_context_event_id', containerEventId)
      .eq('event_scope', 'item')
      .order('start_at', { ascending: true });
    
    if (nestedError) {
      return { success: false, error: nestedError.message };
    }
    
    return {
      success: true,
      data: {
        ...container,
        nested_events: nested || [],
      } as ContextEventWithChildren,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get all container events for a context
 */
export async function getContainerEvents(
  contextId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<ServiceResponse<ContainerEvent[]>> {
  try {
    let query = supabase
      .from('context_events')
      .select('*')
      .eq('context_id', contextId)
      .eq('event_scope', 'container')
      .is('parent_context_event_id', null)
      .order('start_at', { ascending: true });
    
    if (filters?.start_date) {
      query = query.gte('start_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('start_at', filters.end_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as ContainerEvent[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Nested Event Operations
// ============================================================================

/**
 * Create a nested event (micro detail inside container)
 * 
 * Nested events are owned by a container event.
 * Examples: Flight, Hotel check-in, Meeting, Deadline.
 * Can be selectively projected.
 * Never auto-leaks when container is shared.
 */
export async function createNestedEvent(
  input: CreateNestedEventInput
): Promise<ServiceResponse<NestedEvent>> {
  try {
    // Validate: end_at must be >= start_at
    const startDate = new Date(input.start_at);
    const endDate = new Date(input.end_at);
    
    if (endDate < startDate) {
      return {
        success: false,
        error: 'Event end time must be after or equal to start time',
      };
    }
    
    // Verify parent is a container
    const { data: parent, error: parentError } = await supabase
      .from('context_events')
      .select('id, event_scope, context_id')
      .eq('id', input.parent_context_event_id)
      .single();
    
    if (parentError || !parent) {
      return {
        success: false,
        error: 'Parent container event not found',
      };
    }
    
    if (parent.event_scope !== 'container') {
      return {
        success: false,
        error: 'Parent event must be a container event',
      };
    }
    
    // Ensure nested event belongs to same context as parent
    if (parent.context_id !== input.context_id) {
      return {
        success: false,
        error: 'Nested event must belong to the same context as its parent',
      };
    }
    
    // Create nested event
    const { data, error } = await supabase
      .from('context_events')
      .insert({
        context_id: input.context_id,
        created_by: input.created_by,
        event_type: input.event_type,
        time_scope: input.time_scope,
        event_scope: 'item',
        parent_context_event_id: input.parent_context_event_id,
        title: input.title,
        description: input.description || '',
        location: input.location || '',
        start_at: input.start_at,
        end_at: input.end_at,
        timezone: input.timezone || 'UTC',
        metadata: input.metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as NestedEvent };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get nested events for a container
 */
export async function getNestedEvents(
  containerEventId: string
): Promise<ServiceResponse<NestedEvent[]>> {
  try {
    const { data, error } = await supabase
      .from('context_events')
      .select('*')
      .eq('parent_context_event_id', containerEventId)
      .eq('event_scope', 'item')
      .order('start_at', { ascending: true });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as NestedEvent[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

