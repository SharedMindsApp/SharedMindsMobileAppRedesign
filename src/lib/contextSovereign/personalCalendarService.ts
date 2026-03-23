/**
 * Personal Calendar Service - Read Model (Aggregation Layer)
 * 
 * This is a READ MODEL, not a table. It aggregates:
 * - Accepted projections from context events
 * - User's own context events
 * - (Future) Integrated with existing household calendar
 * 
 * Key principles:
 * - No table (computed on-demand)
 * - Only shows accepted projections
 * - Permission-safe (RLS enforced)
 * - Exists alongside household calendar (not replacement)
 * - Opt-in per user (feature flag controlled)
 * 
 * Safety guarantees:
 * - Does NOT touch calendar_events table
 * - Does NOT modify any existing calendar logic
 * - Read-only aggregation
 * - No side effects
 */

import { supabase } from '../supabase';
import type {
  PersonalCalendarItem,
  PersonalCalendarFilters,
  ServiceResponse,
  ContextEvent,
  Context,
  CalendarProjection,
} from './types';

// ============================================================================
// Personal Calendar (Read Model)
// ============================================================================

/**
 * Get personal calendar items (aggregated from accepted projections)
 * 
 * This is the main query for user's personal calendar view.
 * It returns only events that:
 * 1. User has accepted projection for, OR
 * 2. User created (always visible to creator)
 * 
 * Does NOT include household calendar events (separate system).
 */
export async function getPersonalCalendarItems(
  userId: string,
  filters?: PersonalCalendarFilters
): Promise<ServiceResponse<PersonalCalendarItem[]>> {
  try {
    // Build query for accepted projections
    let projectionsQuery = supabase
      .from('calendar_projections')
      .select(`
        id,
        scope,
        event:context_events(
          id,
          title,
          description,
          location,
          start_at,
          end_at,
          timezone,
          event_type,
          time_scope,
          created_by,
          context_id,
          context:contexts(
            id,
            name,
            type
          )
        )
      `)
      .eq('target_user_id', userId)
      .eq('status', 'accepted');
    
    // Apply date filters
    if (filters?.start_date) {
      projectionsQuery = projectionsQuery.gte('event.start_at', filters.start_date);
    }
    if (filters?.end_date) {
      projectionsQuery = projectionsQuery.lte('event.start_at', filters.end_date);
    }
    
    const { data: projections, error: projectionsError } = await projectionsQuery;
    
    if (projectionsError) {
      return { success: false, error: projectionsError.message };
    }
    
    // Build query for user's own events (always visible)
    let ownEventsQuery = supabase
      .from('context_events')
      .select(`
        id,
        title,
        description,
        location,
        start_at,
        end_at,
        timezone,
        event_type,
        time_scope,
        created_by,
        context_id,
        context:contexts(
          id,
          name,
          type
        )
      `)
      .eq('created_by', userId);
    
    // Apply date filters
    if (filters?.start_date) {
      ownEventsQuery = ownEventsQuery.gte('start_at', filters.start_date);
    }
    if (filters?.end_date) {
      ownEventsQuery = ownEventsQuery.lte('start_at', filters.end_date);
    }
    
    const { data: ownEvents, error: ownEventsError } = await ownEventsQuery;
    
    if (ownEventsError) {
      return { success: false, error: ownEventsError.message };
    }
    
    // Merge and deduplicate
    const eventMap = new Map<string, PersonalCalendarItem>();
    
    // Add projected events
    if (projections) {
      for (const projection of projections) {
        if (!projection.event) continue;
        
        const event = projection.event as any;
        const context = event.context as any;
        
        // Apply context filters
        if (filters?.context_types && !filters.context_types.includes(context.type)) {
          continue;
        }
        if (filters?.context_ids && !filters.context_ids.includes(context.id)) {
          continue;
        }
        if (filters?.event_types && !filters.event_types.includes(event.event_type)) {
          continue;
        }
        
        const item: PersonalCalendarItem = {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          start_at: event.start_at,
          end_at: event.end_at,
          timezone: event.timezone,
          event_type: event.event_type,
          time_scope: event.time_scope,
          context_id: context.id,
          context_name: context.name,
          context_type: context.type,
          projection_id: projection.id,
          projection_scope: projection.scope,
          is_own_event: event.created_by === userId,
          color: getEventColor(event.event_type, context.type),
          can_edit: event.created_by === userId,  // Simplified for now
        };
        
        eventMap.set(event.id, item);
      }
    }
    
    // Add own events (override if already in map)
    if (ownEvents && !filters?.only_own_events) {
      for (const event of ownEvents) {
        const context = event.context as any;
        
        // Apply context filters
        if (filters?.context_types && !filters.context_types.includes(context.type)) {
          continue;
        }
        if (filters?.context_ids && !filters.context_ids.includes(context.id)) {
          continue;
        }
        if (filters?.event_types && !filters.event_types.includes(event.event_type)) {
          continue;
        }
        
        // If already have projection for this event, mark as own
        if (eventMap.has(event.id)) {
          const existing = eventMap.get(event.id)!;
          existing.is_own_event = true;
          existing.can_edit = true;
        } else {
          // Add as new item
          const item: PersonalCalendarItem = {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location,
            start_at: event.start_at,
            end_at: event.end_at,
            timezone: event.timezone,
            event_type: event.event_type,
            time_scope: event.time_scope,
            context_id: context.id,
            context_name: context.name,
            context_type: context.type,
            projection_id: '',  // No projection (own event)
            projection_scope: 'full',  // Own events always full access
            is_own_event: true,
            color: getEventColor(event.event_type, context.type),
            can_edit: true,
          };
          
          eventMap.set(event.id, item);
        }
      }
    } else if (ownEvents && filters?.only_own_events) {
      // Only show own events
      eventMap.clear();
      
      for (const event of ownEvents) {
        const context = event.context as any;
        
        // Apply context filters
        if (filters?.context_types && !filters.context_types.includes(context.type)) {
          continue;
        }
        if (filters?.context_ids && !filters.context_ids.includes(context.id)) {
          continue;
        }
        if (filters?.event_types && !filters.event_types.includes(event.event_type)) {
          continue;
        }
        
        const item: PersonalCalendarItem = {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          start_at: event.start_at,
          end_at: event.end_at,
          timezone: event.timezone,
          event_type: event.event_type,
          time_scope: event.time_scope,
          context_id: context.id,
          context_name: context.name,
          context_type: context.type,
          projection_id: '',
          projection_scope: 'full',
          is_own_event: true,
          color: getEventColor(event.event_type, context.type),
          can_edit: true,
        };
        
        eventMap.set(event.id, item);
      }
    }
    
    // Convert to array and sort by start time
    const items = Array.from(eventMap.values()).sort((a, b) => {
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
    
    return { success: true, data: items };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get upcoming personal calendar items (next N items)
 */
export async function getUpcomingPersonalItems(
  userId: string,
  limit: number = 10
): Promise<ServiceResponse<PersonalCalendarItem[]>> {
  const now = new Date().toISOString();
  
  return getPersonalCalendarItems(userId, {
    start_date: now,
  });
}

/**
 * Get personal calendar items for today
 */
export async function getTodayPersonalItems(
  userId: string
): Promise<ServiceResponse<PersonalCalendarItem[]>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfDay = tomorrow.toISOString();
  
  return getPersonalCalendarItems(userId, {
    start_date: startOfDay,
    end_date: endOfDay,
  });
}

/**
 * Get personal calendar items for a specific week
 */
export async function getWeekPersonalItems(
  userId: string,
  weekStartDate: Date
): Promise<ServiceResponse<PersonalCalendarItem[]>> {
  const startOfWeek = new Date(weekStartDate);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  
  return getPersonalCalendarItems(userId, {
    start_date: startOfWeek.toISOString(),
    end_date: endOfWeek.toISOString(),
  });
}

/**
 * Get personal calendar items for a specific month
 */
export async function getMonthPersonalItems(
  userId: string,
  year: number,
  month: number  // 1-12
): Promise<ServiceResponse<PersonalCalendarItem[]>> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  
  return getPersonalCalendarItems(userId, {
    start_date: startOfMonth.toISOString(),
    end_date: endOfMonth.toISOString(),
  });
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Count personal calendar items
 */
export async function countPersonalCalendarItems(
  userId: string,
  filters?: PersonalCalendarFilters
): Promise<ServiceResponse<number>> {
  const result = await getPersonalCalendarItems(userId, filters);
  
  if (!result.success) {
    return result;
  }
  
  return { success: true, data: result.data?.length || 0 };
}

/**
 * Check if user has any calendar items
 */
export async function hasPersonalCalendarItems(userId: string): Promise<boolean> {
  try {
    // Check for accepted projections
    const { count: projectionCount } = await supabase
      .from('calendar_projections')
      .select('*', { count: 'exact', head: true })
      .eq('target_user_id', userId)
      .eq('status', 'accepted')
      .limit(1);
    
    if (projectionCount && projectionCount > 0) {
      return true;
    }
    
    // Check for own events
    const { count: eventCount } = await supabase
      .from('context_events')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .limit(1);
    
    return !!(eventCount && eventCount > 0);
  } catch (err) {
    console.error('Error checking personal calendar items:', err);
    return false;
  }
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Get event color based on event type and context type
 */
function getEventColor(
  eventType: string,
  contextType: string
): string {
  // Event type colors (primary)
  const eventColors: Record<string, string> = {
    meeting: '#3B82F6',      // Blue
    travel: '#10B981',       // Green
    milestone: '#8B5CF6',    // Purple
    deadline: '#EF4444',     // Red
    reminder: '#F59E0B',     // Amber
    block: '#6B7280',        // Gray
    social: '#EC4899',       // Pink
    personal: '#14B8A6',     // Teal
  };
  
  // Context type colors (fallback)
  const contextColors: Record<string, string> = {
    personal: '#14B8A6',     // Teal
    project: '#3B82F6',      // Blue
    trip: '#10B981',         // Green
    shared_space: '#8B5CF6', // Purple
  };
  
  return eventColors[eventType] || contextColors[contextType] || '#6B7280';
}

/**
 * Get color class name for UI
 */
export function getEventColorClass(
  eventType: string,
  contextType: string
): string {
  const colorMap: Record<string, string> = {
    '#3B82F6': 'blue',
    '#10B981': 'green',
    '#8B5CF6': 'purple',
    '#EF4444': 'red',
    '#F59E0B': 'amber',
    '#6B7280': 'gray',
    '#EC4899': 'pink',
    '#14B8A6': 'teal',
  };
  
  const hexColor = getEventColor(eventType, contextType);
  return colorMap[hexColor] || 'gray';
}

