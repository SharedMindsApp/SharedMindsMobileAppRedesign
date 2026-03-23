/**
 * Calendar Event Share Adapter
 * 
 * Adapter for sharing personal calendar events via the universal SharingDrawer.
 * Personal authored events only (no nested children).
 * Default: private.
 */

import { supabase } from '../../supabase';
import type { ShareAdapter } from '../adapter';
import type {
  PermissionFlags,
  PermissionGrantWithDisplay,
  PermissionSubjectType,
  ShareScope,
} from '../types';
import { roleToFlags } from '../types';
import { createProjection, updateProjection, deleteProjection, getEventProjections } from '../../contextSovereign/projectionsService';

export class CalendarEventAdapter implements ShareAdapter {
  entityType = 'calendar_event';
  entityId: string;

  constructor(eventId: string) {
    this.entityId = eventId;
  }

  async getEntityTitle(): Promise<string> {
    const { data: event } = await supabase
      .from('context_events')
      .select('title')
      .eq('id', this.entityId)
      .single();
    
    return event?.title || 'Calendar Event';
  }

  async listGrants(): Promise<PermissionGrantWithDisplay[]> {
    // Get all projections for this event
    const projectionsResult = await getEventProjections(this.entityId);
    if (!projectionsResult.success || !projectionsResult.data) {
      return [];
    }

    const projections = projectionsResult.data;
    const grants: PermissionGrantWithDisplay[] = [];

    for (const projection of projections) {
      // Get subject display info
      const displayInfo = await this.getSubjectDisplayInfo(
        projection.target_user_id,
        projection.target_space_id
      );

      if (!displayInfo) continue;

      // Map nested_scope to ShareScope
      const scope: ShareScope = 
        projection.nested_scope === 'container+items' ? 'include_children' : 'this_only';

      grants.push({
        id: projection.id,
        entity_type: this.entityType,
        entity_id: this.entityId,
        subject_type: projection.target_space_id ? 'space' : 'user',
        subject_id: projection.target_user_id,
        flags: {
          can_view: projection.status === 'accepted',
          can_comment: false,  // Calendar events don't support comments yet
          can_edit: projection.can_edit ?? false,
          can_manage: false,  // Only event owner can manage
          detail_level: projection.detail_level || (projection.scope === 'full' ? 'detailed' : 'overview'),
          scope,
        },
        granted_by: projection.created_by,
        granted_at: projection.created_at,
        updated_at: projection.updated_at || projection.created_at,
        display_name: displayInfo.display_name,
        avatar_url: displayInfo.avatar_url,
        email: displayInfo.email,
      });
    }

    return grants;
  }

  async upsertGrant(input: {
    subject_type: PermissionSubjectType;
    subject_id: string;
    flags: PermissionFlags;
  }): Promise<void> {
    // Map ShareScope to nested_scope
    const nestedScope = input.flags.scope === 'include_children' ? 'container+items' : 'container';

    // Map scope for projection
    const projectionScope = input.flags.detail_level === 'detailed' ? 'full' : 'title';

    // Check if projection exists
    const { data: existing } = await supabase
      .from('calendar_projections')
      .select('id')
      .eq('event_id', this.entityId)
      .eq('target_user_id', input.subject_id)
      .eq('target_space_id', input.subject_type === 'space' ? input.subject_id : null)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (existing) {
      // Update existing projection
      await updateProjection(existing.id, {
        can_edit: input.flags.can_edit,
        detail_level: input.flags.detail_level,
        nested_scope: nestedScope,
        scope: projectionScope,
      });
    } else {
      // Create new projection
      await createProjection({
        event_id: this.entityId,
        target_user_id: input.subject_id,
        target_space_id: input.subject_type === 'space' ? input.subject_id : null,
        scope: projectionScope,
        status: 'pending',
        created_by: user.id,
        can_edit: input.flags.can_edit,
        detail_level: input.flags.detail_level,
        nested_scope: nestedScope,
      });
    }
  }

  async revokeGrant(
    subject_type: PermissionSubjectType,
    subject_id: string
  ): Promise<void> {
    // Find and delete projection
    const { data: projection } = await supabase
      .from('calendar_projections')
      .select('id')
      .eq('event_id', this.entityId)
      .eq('target_user_id', subject_id)
      .eq('target_space_id', subject_type === 'space' ? subject_id : null)
      .maybeSingle();

    if (projection) {
      await deleteProjection(projection.id);
    }
  }

  async previewScopeImpact(scope: ShareScope): Promise<{
    affected_count: number;
    sample: string[];
  } | null> {
    // Calendar events don't have nested children
    return { affected_count: 0, sample: [] };
  }

  async canManagePermissions(): Promise<boolean> {
    // Get event owner
    const { data: event } = await supabase
      .from('context_events')
      .select('created_by')
      .eq('id', this.entityId)
      .single();

    if (!event) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Only owner can manage permissions
    return event.created_by === user.id;
  }

  private async getSubjectDisplayInfo(
    userId: string,
    spaceId: string | null
  ): Promise<{ display_name: string; email?: string; avatar_url?: string } | null> {
    if (spaceId) {
      // Get space info
      const { data: space } = await supabase
        .from('spaces')
        .select('name')
        .eq('id', spaceId)
        .single();

      if (space) {
        return { display_name: space.name };
      }
    } else {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', userId)
        .single();

      if (profile) {
        return {
          display_name: profile.full_name || profile.email || 'User',
          email: profile.email || undefined,
          avatar_url: profile.avatar_url || undefined,
        };
      }
    }

    return null;
  }
}

