/**
 * Container Calendar Service
 * 
 * Handles projection and calendar view logic for container + nested events.
 * 
 * ⚠️ PERMISSION SOVEREIGNTY:
 * - Permissions come ONLY from projection metadata
 * - Calendar views do NOT define permissions
 * - Shared calendars are NOT inherently read-only
 * - Personal calendars can be read-only for others
 * 
 * Rules:
 * - Container and nested events have independent projections
 * - Default: nothing is visible unless explicitly projected
 * - Service layer enforces permissions (not UI)
 * - Filter events strictly based on projections
 * - Strip nested events if scope does not allow them
 * - Strip detail fields if detail_level === 'overview'
 */

import { supabase } from '../supabase';
import type {
  ContainerCalendarBlock,
  NestedCalendarItem,
  CalendarViewMode,
  ProjectionPermissionState,
  ProjectionScope,
  ProjectionStatus,
  ServiceResponse,
} from './types';
import type { PermissionFlags, ShareScope } from '../permissions/types';
import { createProjection } from './projectionsService';

// ============================================================================
// Container Projection
// ============================================================================

/**
 * Project a container event to a calendar
 * 
 * This creates a projection for the container block only.
 * Nested events are NOT automatically projected.
 * 
 * ⚠️ Permissions are explicitly set via options.
 * Default: read-only (can_edit: false), overview detail.
 */
export async function projectContainerToCalendar(
  containerEventId: string,
  targetUserId: string,
  targetSpaceId: string | null,
  scope: ProjectionScope,
  createdBy: string,
  options?: {
    can_edit?: boolean;
    detail_level?: 'overview' | 'detailed';
    nested_scope?: 'container' | 'container+items';
  }
): Promise<ServiceResponse<void>> {
  try {
    // Verify event is a container
    const { data: event, error: eventError } = await supabase
      .from('context_events')
      .select('id, event_scope')
      .eq('id', containerEventId)
      .single();
    
    if (eventError || !event) {
      return { success: false, error: 'Container event not found' };
    }
    
    if (event.event_scope !== 'container') {
      return { success: false, error: 'Event is not a container event' };
    }
    
    // Create projection with explicit permissions
    const result = await createProjection({
      event_id: containerEventId,
      target_user_id: targetUserId,
      target_space_id: targetSpaceId,
      scope,
      status: 'pending',
      created_by: createdBy,
      can_edit: options?.can_edit ?? false,  // Default: read-only
      detail_level: options?.detail_level,
      nested_scope: options?.nested_scope || 'container',  // Default: container only
    });
    
    if (!result.success) {
      return result;
    }
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Project a nested event to a calendar
 * 
 * ⚠️ Note: Nested events can be projected to shared calendars IF permission allows.
 * Visibility is determined by projection scope, not calendar type.
 * 
 * However, by default, nested events are typically projected to personal calendars
 * for privacy reasons. This is a convention, not a hard rule.
 */
export async function projectNestedEventToCalendar(
  nestedEventId: string,
  targetUserId: string,
  targetSpaceId: string | null,
  scope: ProjectionScope,
  createdBy: string,
  options?: {
    can_edit?: boolean;
    detail_level?: 'overview' | 'detailed';
  }
): Promise<ServiceResponse<void>> {
  try {
    // Verify event is nested
    const { data: event, error: eventError } = await supabase
      .from('context_events')
      .select('id, event_scope')
      .eq('id', nestedEventId)
      .single();
    
    if (eventError || !event) {
      return { success: false, error: 'Nested event not found' };
    }
    
    if (event.event_scope !== 'item') {
      return { success: false, error: 'Event is not a nested event' };
    }
    
    // Create projection with explicit permissions
    const result = await createProjection({
      event_id: nestedEventId,
      target_user_id: targetUserId,
      target_space_id: targetSpaceId,  // Can be null (personal) or space_id (shared)
      scope,
      status: 'pending',
      created_by: createdBy,
      can_edit: options?.can_edit ?? false,
      detail_level: options?.detail_level,
    });
    
    if (!result.success) {
      return result;
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
// Calendar View Functions
// ============================================================================

/**
 * Compute permissions from projection metadata
 * 
 * ⚠️ CRITICAL: Permissions come ONLY from projection metadata.
 * Calendar views do NOT define permissions.
 */
function computePermissions(
  projection: any,
  event: any,
  userId: string
): PermissionFlags {
  // If projection is not accepted, user cannot view
  if (projection.status !== 'accepted') {
    return {
      can_view: false,
      can_comment: false,
      can_edit: false,
      can_manage: false,
      detail_level: 'overview',
      scope: 'this_only',
    };
  }
  
  // Owner always has full permissions
  const isOwner = event.created_by === userId;
  
  // Get permission fields from projection (with defaults)
  const canEdit = projection.can_edit ?? false;
  const detailLevel = projection.detail_level || (
    projection.scope === 'full' ? 'detailed' : 'overview'
  );
  const nestedScope = projection.nested_scope || 'container';
  
  // Map nested_scope to ShareScope
  const shareScope: ShareScope = 
    nestedScope === 'container+items' ? 'include_children' : 'this_only';
  
  return {
    can_view: true,  // If projection is accepted, user can view
    can_comment: false,  // Calendar events don't support comments yet
    can_edit: isOwner || canEdit,  // Owner always can edit, others depend on projection
    can_manage: isOwner,  // Only owner can manage
    detail_level: detailLevel,
    scope: shareScope,
  };
}

/**
 * Get calendar view for a specific mode
 * 
 * ⚠️ PERMISSION SOVEREIGNTY:
 * - Permissions come ONLY from projection metadata
 * - Calendar mode does NOT determine permissions
 * - Shared calendars can show nested events IF permission allows
 * - Personal calendars can be read-only IF permission restricts
 * 
 * Rules:
 * - Filter events strictly based on projections
 * - Strip nested events if scope does not allow them
 * - Strip detail fields if detail_level === 'overview'
 * - Service layer enforces permissions (not UI)
 */
export async function getCalendarView(
  userId: string,
  mode: CalendarViewMode,
  filters?: {
    start_date?: string;
    end_date?: string;
    context_ids?: string[];
  }
): Promise<ServiceResponse<{
  containers: ContainerCalendarBlock[];
  nested_items: NestedCalendarItem[];
}>> {
  try {
    const startDate = filters?.start_date || new Date().toISOString();
    const endDate = filters?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get accepted projections for user
    let projectionQuery = supabase
      .from('calendar_projections')
      .select(`
        id,
        event_id,
        scope,
        status,
        can_edit,
        detail_level,
        nested_scope,
        event:context_events!inner(
          id,
          event_scope,
          parent_context_event_id,
          title,
          description,
          location,
          start_at,
          end_at,
          timezone,
          event_type,
          time_scope,
          context_id,
          created_by,
          context:contexts(
            id,
            name,
            type
          )
        )
      `)
      .eq('target_user_id', userId)
      .eq('status', 'accepted');
    
    // For shared mode, filter by target_space_id
    if (mode === 'shared') {
      projectionQuery = projectionQuery.not('target_space_id', 'is', null);
    } else {
      // For personal mode, only personal projections (target_space_id is null)
      projectionQuery = projectionQuery.is('target_space_id', null);
    }
    
    // Apply date range filter
    projectionQuery = projectionQuery
      .gte('event.start_at', startDate)
      .lte('event.start_at', endDate);
    
    // Apply context filter if provided
    if (filters?.context_ids && filters.context_ids.length > 0) {
      projectionQuery = projectionQuery.in('event.context_id', filters.context_ids);
    }
    
    const { data: projections, error } = await projectionQuery;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!projections) {
      return {
        success: true,
        data: { containers: [], nested_items: [] },
      };
    }
    
    // Track container projections to check nested scope
    const containerProjections = new Map<string, any>();
    
    // Separate containers and nested items
    const containers: ContainerCalendarBlock[] = [];
    const nested_items: NestedCalendarItem[] = [];
    
    for (const projection of projections) {
      const event = projection.event as any;
      const context = event.context as any;
      
      // Compute permissions from projection
      const permissions = computePermissions(projection, event, userId);
      
      // If user cannot view, skip (service layer enforcement)
      if (!permissions.can_view) {
        continue;
      }
      
      if (event.event_scope === 'container') {
        // Store container projection for nested scope checking
        containerProjections.set(event.id, projection);
        
        // Strip detail fields if detail_level === 'overview'
        const title = event.title;
        const description = permissions.detail_level === 'detailed' ? (event.description || '') : '';
        const location = permissions.detail_level === 'detailed' ? (event.location || '') : '';
        
        containers.push({
          id: event.id,
          title,
          description,
          location,
          start_at: event.start_at,
          end_at: event.end_at,
          timezone: event.timezone,
          context_id: event.context_id,
          context_name: context.name,
          context_type: context.type,
          event_type: event.event_type,
          time_scope: event.time_scope,
          projection_id: projection.id,
          is_own_event: event.created_by === userId,
          permissions,
        });
      } else if (event.event_scope === 'item') {
        // Nested event - check if parent container allows nested items
        const parentProjection = containerProjections.get(event.parent_context_event_id);
        
        // Check if nested scope allows nested items
        // If no parent projection, check this event's projection nested_scope
        const parentScope = parentProjection?.nested_scope || projection.nested_scope || 'container';
        const allowsNested = parentScope === 'container+items';
        
        // Service layer enforcement: filter nested events if scope doesn't allow
        if (!allowsNested) {
          continue;
        }
        
        // Get parent container info
        const { data: parent } = await supabase
          .from('context_events')
          .select('id, title')
          .eq('id', event.parent_context_event_id)
          .single();
        
        // Strip detail fields if detail_level === 'overview'
        const title = event.title;
        const description = permissions.detail_level === 'detailed' ? (event.description || '') : '';
        const location = permissions.detail_level === 'detailed' ? (event.location || '') : '';
        
        nested_items.push({
          id: event.id,
          title,
          description,
          location,
          start_at: event.start_at,
          end_at: event.end_at,
          timezone: event.timezone,
          parent_event_id: event.parent_context_event_id,
          parent_event_title: parent?.title || 'Unknown',
          context_id: event.context_id,
          context_name: context.name,
          context_type: context.type,
          event_type: event.event_type,
          time_scope: event.time_scope,
          projection_id: projection.id,
          is_own_event: event.created_by === userId,
          permissions,
        });
      }
    }
    
    return {
      success: true,
      data: { containers, nested_items },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get projection permission state for a container and its nested events
 * 
 * Returns explicit permissions from projection metadata.
 */
export async function getProjectionPermissionState(
  containerEventId: string,
  targetUserId: string
): Promise<ServiceResponse<ProjectionPermissionState>> {
  try {
    // Get container projection with permission fields
    const { data: containerProjection } = await supabase
      .from('calendar_projections')
      .select('id, scope, status, can_edit, detail_level, nested_scope')
      .eq('event_id', containerEventId)
      .eq('target_user_id', targetUserId)
      .maybeSingle();
    
    // Get nested events
    const { data: nestedEvents } = await supabase
      .from('context_events')
      .select('id')
      .eq('parent_context_event_id', containerEventId)
      .eq('event_scope', 'item');
    
    // Get nested event projections
    const nestedProjections: ProjectionPermissionState['nested_projections'] = [];
    
    if (nestedEvents && nestedEvents.length > 0) {
      const nestedEventIds = nestedEvents.map(e => e.id);
      
      const { data: projections } = await supabase
        .from('calendar_projections')
        .select('id, event_id, scope, status, can_edit, detail_level')
        .in('event_id', nestedEventIds)
        .eq('target_user_id', targetUserId);
      
      if (projections) {
        for (const projection of projections) {
          nestedProjections.push({
            event_id: projection.event_id,
            projection_id: projection.id,
            status: projection.status as ProjectionStatus,
            scope: projection.scope as ProjectionScope,
          });
        }
      }
    }
    
    return {
      success: true,
      data: {
        container_projection: containerProjection
          ? {
              id: containerProjection.id,
              status: containerProjection.status as ProjectionStatus,
              scope: containerProjection.scope as ProjectionScope,
            }
          : null,
        nested_projections: nestedProjections,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

