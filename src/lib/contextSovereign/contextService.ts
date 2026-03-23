/**
 * Context Service - CRUD operations for contexts and members
 * 
 * ⚠️ EXPERIMENTAL: This service operates on the parallel context system.
 * It does NOT touch existing tables (households, projects, trips, spaces).
 * 
 * Safety guarantees:
 * - All operations are on new tables only
 * - RLS policies enforce permission checks
 * - No auto-sync or auto-projection
 * - Feature flags control availability
 */

import { supabase } from '../supabase';
import type {
  Context,
  ContextWithStats,
  CreateContextInput,
  UpdateContextInput,
  ContextMember,
  ContextMemberWithProfile,
  AddContextMemberInput,
  UpdateContextMemberInput,
  ServiceResponse,
  ListResponse,
  PermissionCheck,
} from './types';

// ============================================================================
// Context CRUD
// ============================================================================

/**
 * Create a new context
 * 
 * Note: Caller is automatically added as owner in context_members
 * (handled by application logic, not database trigger)
 */
export async function createContext(
  input: CreateContextInput
): Promise<ServiceResponse<Context>> {
  try {
    // Validate: Personal contexts cannot have links
    if (input.type === 'personal') {
      if (input.linked_project_id || input.linked_trip_id || input.linked_space_id) {
        return {
          success: false,
          error: 'Personal contexts cannot link to projects, trips, or spaces',
        };
      }
    }
    
    // Validate: Non-personal contexts should ideally have a link (warning only)
    if (input.type !== 'personal') {
      const hasLink = !!(
        input.linked_project_id ||
        input.linked_trip_id ||
        input.linked_space_id
      );
      
      if (!hasLink) {
        console.warn(
          `Creating ${input.type} context without link to existing entity. ` +
          `This is allowed but unusual.`
        );
      }
    }
    
    // Create context
    const { data: context, error } = await supabase
      .from('contexts')
      .insert({
        type: input.type,
        owner_user_id: input.owner_user_id,
        name: input.name,
        description: input.description || '',
        metadata: input.metadata || {},
        linked_project_id: input.linked_project_id || null,
        linked_trip_id: input.linked_trip_id || null,
        linked_space_id: input.linked_space_id || null,
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Add owner as member
    const { error: memberError } = await supabase
      .from('context_members')
      .insert({
        context_id: context.id,
        user_id: input.owner_user_id,
        role: 'owner',
        status: 'accepted',
        invited_by: input.owner_user_id,
        responded_at: new Date().toISOString(),
      });
    
    if (memberError) {
      console.error('Failed to add owner as member:', memberError);
      // Non-fatal: context still created
    }
    
    return { success: true, data: context };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get context by ID
 */
export async function getContext(contextId: string): Promise<ServiceResponse<Context>> {
  try {
    const { data, error } = await supabase
      .from('contexts')
      .select('*')
      .eq('id', contextId)
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
 * Get contexts for user (as owner or member)
 */
export async function getUserContexts(
  userId: string,
  filters?: {
    type?: string;
    includeStats?: boolean;
  }
): Promise<ServiceResponse<Context[] | ContextWithStats[]>> {
  try {
    let query = supabase
      .from('contexts')
      .select('*')
      .or(`owner_user_id.eq.${userId},id.in.(select context_id from context_members where user_id=${userId} and status=accepted)`)
      .order('created_at', { ascending: false });
    
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    
    const { data: contexts, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Optionally enrich with stats
    if (filters?.includeStats) {
      const enriched = await Promise.all(
        contexts.map(async (context) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('context_members')
            .select('*', { count: 'exact', head: true })
            .eq('context_id', context.id)
            .eq('status', 'accepted');
          
          // Get event count
          const { count: eventCount } = await supabase
            .from('context_events')
            .select('*', { count: 'exact', head: true })
            .eq('context_id', context.id);
          
          // Get pending projection count
          const { count: projectionCount } = await supabase
            .from('calendar_projections')
            .select('event_id', { count: 'exact', head: true })
            .in('event_id', [
              supabase
                .from('context_events')
                .select('id')
                .eq('context_id', context.id),
            ])
            .eq('status', 'pending');
          
          return {
            ...context,
            member_count: memberCount || 0,
            event_count: eventCount || 0,
            pending_projection_count: projectionCount || 0,
          } as ContextWithStats;
        })
      );
      
      return { success: true, data: enriched };
    }
    
    return { success: true, data: contexts };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Update context
 * 
 * Note: Only owner can update (enforced by RLS)
 */
export async function updateContext(
  contextId: string,
  input: UpdateContextInput
): Promise<ServiceResponse<Context>> {
  try {
    const { data, error } = await supabase
      .from('contexts')
      .update({
        name: input.name,
        description: input.description,
        metadata: input.metadata,
      })
      .eq('id', contextId)
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
 * Delete context
 * 
 * Note: Only owner can delete (enforced by RLS)
 * Cascade deletes: context_members, context_events, calendar_projections
 */
export async function deleteContext(contextId: string): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('contexts')
      .delete()
      .eq('id', contextId);
    
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
// Context Members
// ============================================================================

/**
 * Get members of a context
 */
export async function getContextMembers(
  contextId: string,
  includeProfiles?: boolean
): Promise<ServiceResponse<ContextMember[] | ContextMemberWithProfile[]>> {
  try {
    let query = supabase
      .from('context_members')
      .select(includeProfiles ? '*, profiles(id, email, name)' : '*')
      .eq('context_id', contextId)
      .order('created_at', { ascending: true });
    
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
 * Add member to context
 * 
 * Note: Only owners and admins can add members (enforced by RLS)
 */
export async function addContextMember(
  input: AddContextMemberInput
): Promise<ServiceResponse<ContextMember>> {
  try {
    // Check if user is already a member
    const { data: existing } = await supabase
      .from('context_members')
      .select('id, status')
      .eq('context_id', input.context_id)
      .eq('user_id', input.user_id)
      .maybeSingle();
    
    if (existing) {
      if (existing.status === 'removed') {
        // Re-activate removed member
        const { data, error } = await supabase
          .from('context_members')
          .update({
            role: input.role,
            status: 'pending',
            invited_by: input.invited_by,
            invited_at: new Date().toISOString(),
            responded_at: null,
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
          error: 'User is already a member of this context',
        };
      }
    }
    
    // Add new member
    const { data, error } = await supabase
      .from('context_members')
      .insert({
        context_id: input.context_id,
        user_id: input.user_id,
        role: input.role,
        status: 'pending',
        invited_by: input.invited_by,
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
 * Update context member
 * 
 * Users can update their own status (accept/decline)
 * Owners/admins can update any member
 */
export async function updateContextMember(
  memberId: string,
  input: UpdateContextMemberInput
): Promise<ServiceResponse<ContextMember>> {
  try {
    const updates: any = {};
    
    if (input.role !== undefined) updates.role = input.role;
    if (input.status !== undefined) {
      updates.status = input.status;
      
      // Set responded_at if accepting or declining
      if (input.status === 'accepted' || input.status === 'declined') {
        updates.responded_at = new Date().toISOString();
      }
    }
    if (input.responded_at !== undefined) updates.responded_at = input.responded_at;
    
    const { data, error } = await supabase
      .from('context_members')
      .update(updates)
      .eq('id', memberId)
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
 * Remove member from context
 * 
 * Note: Only owners and admins can remove members (enforced by RLS)
 * Does not delete, marks as 'removed'
 */
export async function removeContextMember(
  memberId: string
): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('context_members')
      .update({ status: 'removed' })
      .eq('id', memberId);
    
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
// Permission Checks
// ============================================================================

/**
 * Check user's permissions for a context
 */
export async function checkContextPermissions(
  contextId: string,
  userId: string
): Promise<ServiceResponse<PermissionCheck>> {
  try {
    // Check if user is owner
    const { data: context } = await supabase
      .from('contexts')
      .select('owner_user_id')
      .eq('id', contextId)
      .single();
    
    if (!context) {
      return {
        success: true,
        data: {
          can_view: false,
          can_edit: false,
          can_delete: false,
          reason: 'Context not found',
        },
      };
    }
    
    if (context.owner_user_id === userId) {
      return {
        success: true,
        data: {
          can_view: true,
          can_edit: true,
          can_delete: true,
          reason: 'Owner',
        },
      };
    }
    
    // Check member status
    const { data: member } = await supabase
      .from('context_members')
      .select('role, status')
      .eq('context_id', contextId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!member || member.status !== 'accepted') {
      return {
        success: true,
        data: {
          can_view: false,
          can_edit: false,
          can_delete: false,
          reason: member ? 'Not an accepted member' : 'Not a member',
        },
      };
    }
    
    // Determine permissions based on role
    const canEdit = ['owner', 'admin', 'editor'].includes(member.role);
    const canDelete = ['owner', 'admin'].includes(member.role);
    
    return {
      success: true,
      data: {
        can_view: true,
        can_edit: canEdit,
        can_delete: canDelete,
        reason: `Member (${member.role})`,
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
 * Check if user can view context (lightweight check)
 */
export async function canUserViewContext(
  contextId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('user_can_view_context', {
      check_context_id: contextId,
      check_user_id: userId,
    });
    
    return data === true;
  } catch (err) {
    console.error('Error checking context view permission:', err);
    return false;
  }
}

/**
 * Check if user can edit context (lightweight check)
 */
export async function canUserEditContext(
  contextId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('user_can_edit_context', {
      check_context_id: contextId,
      check_user_id: userId,
    });
    
    return data === true;
  } catch (err) {
    console.error('Error checking context edit permission:', err);
    return false;
  }
}

