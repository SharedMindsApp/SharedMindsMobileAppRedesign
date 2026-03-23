/**
 * Projections Service - Explicit event visibility control
 * 
 * This is the CORE INNOVATION of the context-sovereign system:
 * - Events do NOT appear in calendars without projections
 * - Users must ACCEPT projections (opt-in)
 * - Projections can be REVOKED (immediate hiding)
 * - No auto-sync (all projection is explicit)
 * 
 * Projection lifecycle:
 * 1. suggested → System suggests (user hasn't seen yet)
 * 2. pending → Explicitly offered (awaiting user action)
 * 3. accepted → User accepted (visible in calendar)
 * 4. declined → User declined (hidden)
 * 5. revoked → Owner revoked (immediately hidden)
 * 
 * Safety guarantees:
 * - No auto-projection
 * - All visibility changes require explicit user action or owner revocation
 * - RLS enforces permission checks
 */

import { supabase } from '../supabase';
import type {
  CalendarProjection,
  CalendarProjectionWithEvent,
  CreateProjectionInput,
  UpdateProjectionInput,
  ServiceResponse,
} from './types';

// ============================================================================
// Projection CRUD
// ============================================================================

/**
 * Create a projection (offer event to user's calendar)
 * 
 * Note: Only event creator or context admin can create projections (enforced by RLS)
 * Default status is 'pending' (awaiting user acceptance)
 */
export async function createProjection(
  input: CreateProjectionInput
): Promise<ServiceResponse<CalendarProjection>> {
  try {
    // Check if projection already exists
    const { data: existing } = await supabase
      .from('calendar_projections')
      .select('id, status')
      .eq('event_id', input.event_id)
      .eq('target_user_id', input.target_user_id)
      .eq('target_space_id', input.target_space_id || null)
      .maybeSingle();
    
    if (existing) {
      if (existing.status === 'revoked' || existing.status === 'declined') {
        // Re-offer a previously revoked/declined projection
        // Derive default detail_level from scope if not provided
        const detailLevel = input.detail_level || (
          input.scope === 'full' ? 'detailed' : 'overview'
        );
        
        const { data, error } = await supabase
          .from('calendar_projections')
          .update({
            status: input.status || 'pending',
            scope: input.scope,
            can_edit: input.can_edit !== undefined ? input.can_edit : existing.can_edit ?? false,
            detail_level: input.detail_level || detailLevel,
            nested_scope: input.nested_scope || existing.nested_scope || 'container',
            revoked_at: null,
            declined_at: null,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        return { success: true, data };
      } else {
        return {
          success: false,
          error: 'Projection already exists for this event and user',
        };
      }
    }
    
    // Derive default detail_level from scope if not provided
    const detailLevel = input.detail_level || (
      input.scope === 'full' ? 'detailed' : 'overview'
    );
    
    // Create new projection
    const { data, error } = await supabase
      .from('calendar_projections')
      .insert({
        event_id: input.event_id,
        target_user_id: input.target_user_id,
        target_space_id: input.target_space_id || null,
        scope: input.scope,
        status: input.status || 'pending',
        created_by: input.created_by,
        can_edit: input.can_edit ?? false,  // Default: false (read-only)
        detail_level: detailLevel,
        nested_scope: input.nested_scope || 'container',  // Default: container only
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
 * Get projection by ID
 */
export async function getProjection(
  projectionId: string,
  options?: { includeEvent?: boolean }
): Promise<ServiceResponse<CalendarProjection | CalendarProjectionWithEvent>> {
  try {
    let query = supabase
      .from('calendar_projections')
      .select(
        options?.includeEvent
          ? '*, event:context_events(*), context:contexts(*)'
          : '*'
      )
      .eq('id', projectionId);
    
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
 * Get projections for a user (pending, accepted, etc.)
 */
export async function getUserProjections(
  userId: string,
  filters?: {
    status?: string | string[];
    include_event?: boolean;
  }
): Promise<ServiceResponse<CalendarProjection[] | CalendarProjectionWithEvent[]>> {
  try {
    let query = supabase
      .from('calendar_projections')
      .select(
        filters?.include_event
          ? '*, event:context_events(*), context:contexts(*)'
          : '*'
      )
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false });
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
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
 * Get projections for an event (who has access)
 */
export async function getEventProjections(
  eventId: string
): Promise<ServiceResponse<CalendarProjection[]>> {
  try {
    const { data, error } = await supabase
      .from('calendar_projections')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    
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
 * Update projection
 * 
 * Note: Target users can update status (accept/decline)
 * Projection creators can revoke
 */
export async function updateProjection(
  projectionId: string,
  input: UpdateProjectionInput
): Promise<ServiceResponse<CalendarProjection>> {
  try {
    const updates: any = {};
    
    if (input.scope !== undefined) updates.scope = input.scope;
    if (input.can_edit !== undefined) updates.can_edit = input.can_edit;
    if (input.detail_level !== undefined) updates.detail_level = input.detail_level;
    if (input.nested_scope !== undefined) updates.nested_scope = input.nested_scope;
    if (input.status !== undefined) {
      updates.status = input.status;
      
      // Set timestamps based on status
      if (input.status === 'accepted') {
        updates.accepted_at = new Date().toISOString();
      } else if (input.status === 'declined') {
        updates.declined_at = new Date().toISOString();
      } else if (input.status === 'revoked') {
        updates.revoked_at = new Date().toISOString();
      }
    }
    if (input.accepted_at !== undefined) updates.accepted_at = input.accepted_at;
    if (input.declined_at !== undefined) updates.declined_at = input.declined_at;
    if (input.revoked_at !== undefined) updates.revoked_at = input.revoked_at;
    
    const { data, error } = await supabase
      .from('calendar_projections')
      .update(updates)
      .eq('id', projectionId)
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
 * Delete projection
 * 
 * Note: Only projection creator can delete (enforced by RLS)
 */
export async function deleteProjection(projectionId: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('calendar_projections')
      .delete()
      .eq('id', projectionId);
    
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
// User Actions (Simplified API)
// ============================================================================

/**
 * Accept a projection (user action)
 * Makes event visible in user's calendar
 */
export async function acceptProjection(
  projectionId: string
): Promise<ServiceResponse<CalendarProjection>> {
  return updateProjection(projectionId, {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });
}

/**
 * Decline a projection (user action)
 * Hides event from user's calendar
 */
export async function declineProjection(
  projectionId: string
): Promise<ServiceResponse<CalendarProjection>> {
  return updateProjection(projectionId, {
    status: 'declined',
    declined_at: new Date().toISOString(),
  });
}

/**
 * Revoke a projection (owner action)
 * Immediately hides event from user's calendar
 */
export async function revokeProjection(
  projectionId: string
): Promise<ServiceResponse<CalendarProjection>> {
  return updateProjection(projectionId, {
    status: 'revoked',
    revoked_at: new Date().toISOString(),
  });
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Create projections for all context members
 * (Convenience function for event creators)
 */
export async function projectToAllMembers(
  eventId: string,
  contextId: string,
  createdBy: string,
  scope: 'date_only' | 'title' | 'full' = 'full',
  status: 'pending' | 'suggested' = 'pending'
): Promise<ServiceResponse<{ created: number; skipped: number }>> {
  try {
    // Get all accepted members of context (exclude creator)
    const { data: members } = await supabase
      .from('context_members')
      .select('user_id')
      .eq('context_id', contextId)
      .eq('status', 'accepted')
      .neq('user_id', createdBy);
    
    if (!members || members.length === 0) {
      return {
        success: true,
        data: { created: 0, skipped: 0 },
      };
    }
    
    // Get existing projections to avoid duplicates
    const { data: existing } = await supabase
      .from('calendar_projections')
      .select('target_user_id')
      .eq('event_id', eventId);
    
    const existingUserIds = new Set(existing?.map((p) => p.target_user_id) || []);
    
    // Create projections for members who don't have one
    const toCreate = members
      .filter((m) => !existingUserIds.has(m.user_id))
      .map((m) => ({
        event_id: eventId,
        target_user_id: m.user_id,
        target_space_id: null,
        scope,
        status,
        created_by: createdBy,
      }));
    
    if (toCreate.length === 0) {
      return {
        success: true,
        data: { created: 0, skipped: members.length },
      };
    }
    
    const { error } = await supabase.from('calendar_projections').insert(toCreate);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: {
        created: toCreate.length,
        skipped: members.length - toCreate.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Revoke all projections for an event
 * (Useful when deleting or making event private)
 */
export async function revokeAllProjections(
  eventId: string
): Promise<ServiceResponse<{ count: number }>> {
  try {
    // Get count first
    const { count } = await supabase
      .from('calendar_projections')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .neq('status', 'revoked');
    
    // Revoke all active projections
    const { error } = await supabase
      .from('calendar_projections')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .neq('status', 'revoked');
    
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

/**
 * Accept all pending projections for user
 * (Bulk accept convenience function)
 */
export async function acceptAllPendingProjections(
  userId: string
): Promise<ServiceResponse<{ count: number }>> {
  try {
    const now = new Date().toISOString();
    
    // Get count first
    const { count } = await supabase
      .from('calendar_projections')
      .select('*', { count: 'exact', head: true })
      .eq('target_user_id', userId)
      .eq('status', 'pending');
    
    // Accept all pending
    const { error } = await supabase
      .from('calendar_projections')
      .update({
        status: 'accepted',
        accepted_at: now,
      })
      .eq('target_user_id', userId)
      .eq('status', 'pending');
    
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
 * Get pending projection count for user
 */
export async function getPendingProjectionCount(
  userId: string
): Promise<ServiceResponse<number>> {
  try {
    const { count, error } = await supabase
      .from('calendar_projections')
      .select('*', { count: 'exact', head: true })
      .eq('target_user_id', userId)
      .in('status', ['pending', 'suggested']);
    
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

/**
 * Check if user has accepted projection for event
 */
export async function hasAcceptedProjection(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('calendar_projections')
      .select('id')
      .eq('target_user_id', userId)
      .eq('event_id', eventId)
      .eq('status', 'accepted')
      .maybeSingle();
    
    return !!data;
  } catch (err) {
    console.error('Error checking projection acceptance:', err);
    return false;
  }
}

