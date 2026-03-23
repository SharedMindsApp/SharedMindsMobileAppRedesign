/**
 * Trip Share Adapter
 * 
 * Adapter for sharing trips via the universal SharingDrawer.
 * Uses context projections to manage permissions.
 */

import { supabase } from '../../supabase';
import type { ShareAdapter } from '../adapter';
import type {
  PermissionFlags,
  PermissionGrantWithDisplay,
  PermissionSubjectType,
  ShareScope,
} from '../types';
import { ensureTripContext } from '../../personalSpaces/tripContextIntegration';
import { getTrip } from '../../travelService';
import { createProjection, updateProjection, deleteProjection, getEventProjections } from '../../contextSovereign/projectionsService';
import { getContainerEvents } from '../../contextSovereign/contextEventsService';
import { getNestedEvents } from '../../contextSovereign/contextEventsService';

export class TripAdapter implements ShareAdapter {
  entityType = 'trip';
  entityId: string;

  constructor(tripId: string) {
    this.entityId = tripId;
  }

  async getEntityTitle(): Promise<string> {
    const trip = await getTrip(this.entityId);
    return trip?.name || 'Trip';
  }

  async listGrants(): Promise<PermissionGrantWithDisplay[]> {
    // Ensure trip has context
    const contextResult = await ensureTripContext(this.entityId);
    if (!contextResult.success || !contextResult.data) {
      return [];
    }

    const contextId = contextResult.data;

    // Get container event
    const containerResult = await getContainerEvents(contextId);
    if (!containerResult.success || !containerResult.data || containerResult.data.length === 0) {
      return [];
    }

    const containerEventId = containerResult.data[0].id;

    // Get all projections for container event
    const projectionsResult = await getEventProjections(containerEventId);
    if (!projectionsResult.success || !projectionsResult.data) {
      return [];
    }

    const projections = projectionsResult.data;

    // Map projections to grants
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
          can_comment: false,  // Trips don't support comments yet
          can_edit: projection.can_edit ?? false,
          can_manage: false,  // Only trip owner can manage
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
    // Ensure trip has context and container
    const contextResult = await ensureTripContext(this.entityId);
    if (!contextResult.success || !contextResult.data) {
      throw new Error('Trip context not found');
    }

    const containerResult = await getContainerEvents(contextResult.data);
    if (!containerResult.success || !containerResult.data || containerResult.data.length === 0) {
      throw new Error('Trip container event not found');
    }

    const containerEventId = containerResult.data[0].id;

    // Map ShareScope to nested_scope
    const nestedScope = input.flags.scope === 'include_children' ? 'container+items' : 'container';

    // Map scope for projection
    const projectionScope = input.flags.detail_level === 'detailed' ? 'full' : 'title';

    // Check if projection exists
    const { data: existing } = await supabase
      .from('calendar_projections')
      .select('id')
      .eq('event_id', containerEventId)
      .eq('target_user_id', input.subject_id)
      .eq('target_space_id', input.subject_type === 'space' ? input.subject_id : null)
      .maybeSingle();

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await createProjection({
        event_id: containerEventId,
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
    // Ensure trip has context and container
    const contextResult = await ensureTripContext(this.entityId);
    if (!contextResult.success || !contextResult.data) {
      throw new Error('Trip context not found');
    }

    const containerResult = await getContainerEvents(contextResult.data);
    if (!containerResult.success || !containerResult.data || containerResult.data.length === 0) {
      throw new Error('Trip container event not found');
    }

    const containerEventId = containerResult.data[0].id;

    // Find and delete projection
    const { data: projection } = await supabase
      .from('calendar_projections')
      .select('id')
      .eq('event_id', containerEventId)
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
    if (scope === 'this_only') {
      return { affected_count: 0, sample: [] };
    }

    // Get nested events count
    const contextResult = await ensureTripContext(this.entityId);
    if (!contextResult.success || !contextResult.data) {
      return null;
    }

    const containerResult = await getContainerEvents(contextResult.data);
    if (!containerResult.success || !containerResult.data || containerResult.data.length === 0) {
      return { affected_count: 0, sample: [] };
    }

    const containerEventId = containerResult.data[0].id;
    const nestedResult = await getNestedEvents(containerEventId);
    const nestedEvents = nestedResult.success ? nestedResult.data : null;

    const count = nestedEvents?.length || 0;
    const sample = (nestedEvents || [])
      .slice(0, 5)
      .map(e => e.title);

    return {
      affected_count: count,
      sample,
    };
  }

  async canManagePermissions(): Promise<boolean> {
    const trip = await getTrip(this.entityId);
    if (!trip) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Trip owner can manage permissions
    return trip.owner_id === user.id;
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

