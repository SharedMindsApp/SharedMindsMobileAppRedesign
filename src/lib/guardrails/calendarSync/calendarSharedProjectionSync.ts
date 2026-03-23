/**
 * Shared Calendar Projection Sync Service
 * 
 * Phase 7: Manages shared calendar projections for Guardrails roadmap events.
 * 
 * This service handles creating/updating/removing calendar_projections that
 * project Guardrails events into shared space calendars.
 * 
 * Architecture:
 * - Uses context_events + calendar_projections (existing projection model)
 * - Requires context for Guardrails project (type='project', linked_project_id)
 * - Creates context_event representing the roadmap event
 * - Creates calendar_projection targeting the shared space
 * - Status = 'accepted' (user explicitly enabled sync)
 * 
 * Rules:
 * - Idempotent (safe to call repeatedly)
 * - Reversible (can unsync cleanly)
 * - Requires target_space_id
 * - Never auto-creates contexts or events without explicit sync intent
 * 
 * TODO (Future Phases):
 * - Phase 8: Bulk sync propagation from parent scope changes
 * - Tasks & Mind Mesh events support
 */

import { supabase } from '../../supabase';

/**
 * Result of shared projection operation
 */
export interface SharedProjectionResult {
  executed: boolean;
  action: 'created' | 'updated' | 'deleted' | 'noop';
  projectionId?: string;
  contextEventId?: string;
  reason: string;
  error?: string;
}

/**
 * Find or create context for a Guardrails project
 * 
 * Contexts are used to own context_events, which are then projected.
 * This function ensures a context exists for the project.
 */
async function getOrCreateProjectContext(
  userId: string,
  projectId: string,
  projectName: string
): Promise<string> {
  // Try to find existing context linked to this project
  const { data: existing, error: findError } = await supabase
    .from('contexts')
    .select('id')
    .eq('type', 'project')
    .eq('linked_project_id', projectId)
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (findError) {
    console.error('[SharedProjectionSync] Error finding project context:', findError);
    throw new Error(`Failed to find project context: ${findError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  // Create new context for this project
  const { data: created, error: createError } = await supabase
    .from('contexts')
    .insert({
      type: 'project',
      owner_user_id: userId,
      name: projectName,
      description: `Guardrails project: ${projectName}`,
      linked_project_id: projectId,
      metadata: {
        source: 'guardrails',
        project_id: projectId,
      },
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[SharedProjectionSync] Error creating project context:', createError);
    throw new Error(`Failed to create project context: ${createError.message}`);
  }

  return created.id;
}

/**
 * Find or create context_event for a roadmap event
 * 
 * Context events represent the roadmap event in the context system.
 * This function ensures a context_event exists for the roadmap item.
 */
async function getOrCreateContextEvent(
  contextId: string,
  userId: string,
  event: {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
  },
  projectId: string,
  trackId?: string,
  subtrackId?: string
): Promise<string> {
  // Try to find existing context_event for this roadmap event
  // We'll store the roadmap_item_id in metadata to identify it
  const { data: existing, error: findError } = await supabase
    .from('context_events')
    .select('id')
    .eq('context_id', contextId)
    .eq('created_by', userId)
    .eq('metadata->>source', 'guardrails')
    .eq('metadata->>roadmap_item_id', event.id)
    .maybeSingle();

  if (findError) {
    console.error('[SharedProjectionSync] Error finding context event:', findError);
    throw new Error(`Failed to find context event: ${findError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  // Convert dates to timestamps
  const startAt = new Date(event.startDate).toISOString();
  const endAt = event.endDate 
    ? new Date(event.endDate + 'T23:59:59').toISOString()
    : new Date(event.startDate + 'T23:59:59').toISOString();

  // Create new context_event for this roadmap event
  const { data: created, error: createError } = await supabase
    .from('context_events')
    .insert({
      context_id: contextId,
      created_by: userId,
      event_type: 'milestone', // Roadmap events are milestones
      time_scope: 'all_day',
      title: event.title,
      description: event.description || '',
      start_at: startAt,
      end_at: endAt,
      metadata: {
        source: 'guardrails',
        roadmap_item_id: event.id,
        project_id: projectId,
        track_id: trackId || null,
        subtrack_id: subtrackId || null,
      },
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[SharedProjectionSync] Error creating context event:', createError);
    throw new Error(`Failed to create context event: ${createError.message}`);
  }

  return created.id;
}

/**
 * Update existing context_event with new data
 */
async function updateContextEvent(
  contextEventId: string,
  event: {
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
  }
): Promise<void> {
  const startAt = new Date(event.startDate).toISOString();
  const endAt = event.endDate 
    ? new Date(event.endDate + 'T23:59:59').toISOString()
    : new Date(event.startDate + 'T23:59:59').toISOString();

  const { error } = await supabase
    .from('context_events')
    .update({
      title: event.title,
      description: event.description || '',
      start_at: startAt,
      end_at: endAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contextEventId);

  if (error) {
    console.error('[SharedProjectionSync] Error updating context event:', error);
    throw new Error(`Failed to update context event: ${error.message}`);
  }
}

/**
 * Find existing calendar_projection for a roadmap event to a shared space
 */
async function findExistingProjection(
  contextEventId: string,
  targetSpaceId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('calendar_projections')
    .select('id')
    .eq('event_id', contextEventId)
    .eq('target_space_id', targetSpaceId)
    .eq('created_by', userId)
    .maybeSingle();

  if (error) {
    console.error('[SharedProjectionSync] Error finding projection:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Ensure shared projection exists for a roadmap event
 * 
 * This function:
 * 1. Gets/creates context for the project
 * 2. Gets/creates context_event for the roadmap event
 * 3. Creates/updates calendar_projection targeting the shared space
 * 4. Sets status = 'accepted' (user explicitly enabled sync)
 */
export async function ensureSharedProjectionForRoadmapEvent(
  userId: string,
  event: {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
  },
  projectId: string,
  projectName: string,
  targetSpaceId: string,
  trackId?: string,
  subtrackId?: string
): Promise<SharedProjectionResult> {
  const logPrefix = `[SharedProjectionSync] Event ${event.id} → Space ${targetSpaceId}`;

  try {
    // 1. Get or create context for project
    const contextId = await getOrCreateProjectContext(userId, projectId, projectName);
    console.log(`${logPrefix} - Context: ${contextId}`);

    // 2. Get or create context_event for roadmap event
    const contextEventId = await getOrCreateContextEvent(
      contextId,
      userId,
      event,
      projectId,
      trackId,
      subtrackId
    );
    console.log(`${logPrefix} - Context Event: ${contextEventId}`);

    // Update context_event if it already existed (in case event data changed)
    await updateContextEvent(contextEventId, event);

    // 3. Find or create calendar_projection
    const existingProjectionId = await findExistingProjection(
      contextEventId,
      targetSpaceId,
      userId
    );

    if (existingProjectionId) {
      // Update existing projection (ensure status is accepted)
      const { error: updateError } = await supabase
        .from('calendar_projections')
        .update({
          status: 'accepted',
          scope: 'full', // Show all details
          accepted_at: new Date().toISOString(),
        })
        .eq('id', existingProjectionId);

      if (updateError) {
        throw new Error(`Failed to update projection: ${updateError.message}`);
      }

      console.log(`${logPrefix} - Updated projection: ${existingProjectionId}`);
      return {
        executed: true,
        action: 'updated',
        projectionId: existingProjectionId,
        contextEventId,
        reason: 'Updated existing shared projection',
      };
    } else {
      // Create new projection
      const { data: created, error: createError } = await supabase
        .from('calendar_projections')
        .insert({
          event_id: contextEventId,
          target_user_id: userId, // Project to the user who enabled sync
          target_space_id: targetSpaceId,
          created_by: userId,
          scope: 'full', // Show all details
          status: 'accepted', // User explicitly enabled sync, so auto-accept
          accepted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create projection: ${createError.message}`);
      }

      console.log(`${logPrefix} - Created projection: ${created.id}`);
      return {
        executed: true,
        action: 'created',
        projectionId: created.id,
        contextEventId,
        reason: 'Created new shared projection',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} - Failed: ${errorMessage}`);
    return {
      executed: false,
      action: 'noop',
      reason: 'Execution failed',
      error: errorMessage,
    };
  }
}

/**
 * Remove shared projection for a roadmap event
 * 
 * This function:
 * 1. Finds the context_event for the roadmap event
 * 2. Finds the calendar_projection targeting the space
 * 3. Revokes the projection (sets status = 'revoked')
 * 
 * Note: We revoke rather than delete to maintain audit trail.
 * The context_event is NOT deleted (it may be used by other projections).
 */
export async function removeSharedProjectionForRoadmapEvent(
  userId: string,
  eventId: string,
  targetSpaceId: string
): Promise<SharedProjectionResult> {
  const logPrefix = `[SharedProjectionSync] Remove Event ${eventId} → Space ${targetSpaceId}`;

  try {
    // Find context_event for this roadmap event
    // We need to search by metadata->>roadmap_item_id
    const { data: contextEvents, error: findError } = await supabase
      .from('context_events')
      .select('id')
      .eq('created_by', userId)
      .eq('metadata->>source', 'guardrails')
      .eq('metadata->>roadmap_item_id', eventId);

    if (findError) {
      console.error(`${logPrefix} - Error finding context events:`, findError);
      return {
        executed: false,
        action: 'noop',
        reason: 'Failed to find context events',
        error: findError.message,
      };
    }

    if (!contextEvents || contextEvents.length === 0) {
      console.log(`${logPrefix} - No context events found, nothing to remove`);
      return {
        executed: false,
        action: 'noop',
        reason: 'No context events found',
      };
    }

    // Find and revoke projections for all matching context events
    let revokedCount = 0;
    for (const contextEvent of contextEvents) {
      const { data: projections, error: projError } = await supabase
        .from('calendar_projections')
        .select('id')
        .eq('event_id', contextEvent.id)
        .eq('target_space_id', targetSpaceId)
        .eq('created_by', userId)
        .in('status', ['accepted', 'pending']); // Only revoke active projections

      if (projError) {
        console.error(`${logPrefix} - Error finding projections:`, projError);
        continue;
      }

      if (projections && projections.length > 0) {
        for (const projection of projections) {
          const { error: revokeError } = await supabase
            .from('calendar_projections')
            .update({
              status: 'revoked',
              revoked_at: new Date().toISOString(),
            })
            .eq('id', projection.id);

          if (revokeError) {
            console.error(`${logPrefix} - Error revoking projection ${projection.id}:`, revokeError);
          } else {
            revokedCount++;
            console.log(`${logPrefix} - Revoked projection: ${projection.id}`);
          }
        }
      }
    }

    if (revokedCount === 0) {
      console.log(`${logPrefix} - No active projections found to revoke`);
      return {
        executed: false,
        action: 'noop',
        reason: 'No active projections found',
      };
    }

    return {
      executed: true,
      action: 'deleted',
      reason: `Revoked ${revokedCount} projection(s)`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} - Failed: ${errorMessage}`);
    return {
      executed: false,
      action: 'noop',
      reason: 'Execution failed',
      error: errorMessage,
    };
  }
}
