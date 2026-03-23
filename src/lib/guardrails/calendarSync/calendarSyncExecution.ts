/**
 * Calendar Sync Execution Service
 * 
 * Phase 6/7: Executes calendar sync based on resolver output.
 * 
 * This is the SINGLE ENTRY POINT for calendar writes from Guardrails.
 * All calendar sync execution must go through this service.
 * 
 * Rules:
 * - Uses resolveEffectiveCalendarSync() exclusively
 * - Supports Personal Calendar (Phase 6) ✅
 * - Supports Shared Calendar via projections (Phase 7) ✅
 * - Supports "Both" target (Phase 7) ✅
 * - Only supports roadmap events (Phase 6/7)
 * - Idempotent (safe to call repeatedly)
 * - Reversible (can unsync cleanly)
 * 
 * TODO (Future Phases):
 * - Phase 8: Background reconciliation jobs
 * - Phase 8: Conflict resolution
 * - Phase 8: Bulk sync propagation from parent scope changes
 * - Tasks & Mind Mesh events (currently NOOP)
 */

import { supabase } from '../../supabase';
import { resolveEffectiveCalendarSync } from './syncSettingsResolver';
import type { SyncableEntityType } from './types';
import { getRoadmapItem } from '../roadmapService';
import {
  ensureSharedProjectionForRoadmapEvent,
  removeSharedProjectionForRoadmapEvent,
} from './calendarSharedProjectionSync';

/**
 * Execution result for a single event
 */
export interface ExecutionResult {
  executed: boolean;
  action: 'created' | 'updated' | 'deleted' | 'noop';
  calendarEventId?: string;
  reason: string;
  error?: string;
}

/**
 * Get user's household_id (required for calendar_events)
 */
async function getUserHouseholdId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error) {
    console.error('[CalendarSyncExecution] Failed to get household:', error);
    return null;
  }

  return data?.household_id || null;
}

/**
 * Find existing calendar event for a Guardrails event
 */
async function findExistingCalendarEvent(
  userId: string,
  eventId: string,
  entityType: SyncableEntityType
): Promise<string | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('source_type', entityType === 'roadmap_event' ? 'roadmap_event' : entityType)
    .eq('source_entity_id', eventId)
    .eq('created_by', userId)
    .maybeSingle();

  if (error) {
    console.error('[CalendarSyncExecution] Failed to find existing event:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Create or update calendar event in Personal Calendar
 */
async function upsertCalendarEvent(
  userId: string,
  householdId: string,
  event: {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    color: string | null;
    trackId?: string;
    subtrackId?: string;
  },
  projectId: string,
  trackId?: string,
  subtrackId?: string
): Promise<string> {
  // Check if event already exists
  const existingId = await findExistingCalendarEvent(userId, event.id, 'roadmap_event');

  // Convert dates to timestamps
  const startAt = new Date(event.startDate).toISOString();
  const endAt = event.endDate 
    ? new Date(event.endDate + 'T23:59:59').toISOString() // End of day
    : new Date(event.startDate + 'T23:59:59').toISOString();
  
  // Use provided trackId/subtrackId or fall back to event's
  const effectiveTrackId = trackId || event.trackId;
  const effectiveSubtrackId = subtrackId || event.subtrackId;

  const eventData = {
    household_id: householdId,
    created_by: userId,
    title: event.title,
    description: event.description || '',
    start_at: startAt,
    end_at: endAt,
    all_day: true, // Roadmap events are all-day by default
    color: event.color || 'blue',
    source_type: 'roadmap_event',
    source_entity_id: event.id,
    source_project_id: projectId,
    source_track_id: effectiveTrackId || null,
    source_subtrack_id: effectiveSubtrackId || null,
  };

  if (existingId) {
    // Update existing calendar event
    const { data, error } = await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', existingId)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }

    return data.id;
  } else {
    // Create new calendar event
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(eventData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    return data.id;
  }
}

/**
 * Delete calendar event (unsync)
 */
async function deleteCalendarEvent(
  userId: string,
  eventId: string,
  entityType: SyncableEntityType
): Promise<void> {
  const existingId = await findExistingCalendarEvent(userId, eventId, entityType);
  
  if (!existingId) {
    // Already deleted, nothing to do
    return;
  }

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', existingId);

  if (error) {
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
}

/**
 * Execute calendar sync for a single event
 * 
 * This is the SINGLE ENTRY POINT for calendar sync execution.
 * All calendar writes from Guardrails must go through this function.
 * 
 * Phase 7: Now supports Personal, Shared, and Both targets.
 * 
 * @param userId - User ID requesting sync
 * @param eventId - Event ID (roadmap item, task, or mindmesh container)
 * @param entityType - Type of entity ('roadmap_event', 'task', 'mindmesh_event')
 * @param projectId - Project ID (required for resolver)
 * @param projectName - Project name (required for shared projections)
 * @param trackId - Track ID (optional, for resolver)
 * @param subtrackId - Subtrack ID (optional, for resolver)
 * @returns ExecutionResult with action taken and reason
 */
export async function executeCalendarSyncForEvent(
  userId: string,
  eventId: string,
  entityType: SyncableEntityType,
  projectId: string,
  projectName: string,
  trackId?: string,
  subtrackId?: string
): Promise<ExecutionResult> {
  const logPrefix = `[CalendarSyncExecution] Event ${eventId} (${entityType})`;

  try {
    // 1. Resolve effective sync intent
    const effective = await resolveEffectiveCalendarSync(userId, {
      projectId,
      trackId,
      subtrackId,
      eventId,
      entityType,
    });

    console.log(`${logPrefix} - Resolved:`, {
      shouldSync: effective.shouldSync,
      targetCalendar: effective.targetCalendar,
      source: effective.source,
    });

    // 2. Check if sync is enabled
    if (!effective.shouldSync) {
      // Sync is disabled - ensure calendar events and projections are removed
      const existingId = await findExistingCalendarEvent(userId, eventId, entityType);
      
      if (existingId) {
        await deleteCalendarEvent(userId, eventId, entityType);
        console.log(`${logPrefix} - Unsynced: Removed personal calendar event (sync disabled)`);
      }

      // Remove shared projections if they exist
      // We need to check all possible target spaces - for now, we'll remove based on previous target
      // TODO (Phase 8): Track previous target_space_id to clean up more precisely
      if (effective.targetSpaceId) {
        await removeSharedProjectionForRoadmapEvent(userId, eventId, effective.targetSpaceId);
        console.log(`${logPrefix} - Unsynced: Removed shared projection (sync disabled)`);
      }

      if (existingId || effective.targetSpaceId) {
        return {
          executed: true,
          action: 'deleted',
          reason: `Sync disabled (source: ${effective.source})`,
        };
      }

      console.log(`${logPrefix} - Skipped: Sync disabled (source: ${effective.source})`);
      return {
        executed: false,
        action: 'noop',
        reason: `Sync disabled (source: ${effective.source})`,
      };
    }

    // 3. Handle target calendar (Phase 7: Personal, Shared, and Both)
    const targetCalendar = effective.targetCalendar;
    const targetSpaceId = effective.targetSpaceId;

    // If shared or both, require target_space_id
    if ((targetCalendar === 'shared' || targetCalendar === 'both') && !targetSpaceId) {
      console.log(`${logPrefix} - Skipped: Shared/Both target requires target_space_id`);
      return {
        executed: false,
        action: 'noop',
        reason: 'Shared/Both target requires target_space_id',
      };
    }

    // 4. Check entity type (Phase 6/7: Only roadmap events supported)
    if (entityType !== 'roadmap_event') {
      // TODO (Phase 8): Tasks & Mind Mesh events
      console.log(`${logPrefix} - Skipped: Entity type '${entityType}' not supported`);
      return {
        executed: false,
        action: 'noop',
        reason: `Entity type '${entityType}' not supported`,
      };
    }

    // 5. Fetch roadmap event
    const event = await getRoadmapItem(eventId);
    if (!event) {
      console.log(`${logPrefix} - Skipped: Event not found`);
      return {
        executed: false,
        action: 'noop',
        reason: 'Event not found',
      };
    }

    // 6. Check if event has dates
    if (!event.startDate) {
      // If event loses dates, remove any existing projections
      if (targetCalendar === 'shared' || targetCalendar === 'both') {
        if (targetSpaceId) {
          await removeSharedProjectionForRoadmapEvent(userId, eventId, targetSpaceId);
        }
      }
      console.log(`${logPrefix} - Skipped: Event has no start date`);
      return {
        executed: false,
        action: 'noop',
        reason: 'Event has no start date',
      };
    }

    // Use provided trackId/subtrackId or fall back to event's
    const effectiveTrackId = trackId || event.trackId || undefined;
    const effectiveSubtrackId = subtrackId || event.subtrackId || undefined;

    // 7. Execute Personal Calendar sync (if target is 'personal' or 'both')
    let personalResult: ExecutionResult | null = null;
    if (targetCalendar === 'personal' || targetCalendar === 'both') {
      const householdId = await getUserHouseholdId(userId);
      if (!householdId) {
        console.error(`${logPrefix} - Failed: User does not belong to a household`);
        return {
          executed: false,
          action: 'noop',
          reason: 'User does not belong to a household',
          error: 'No household_id',
        };
      }

      const existingId = await findExistingCalendarEvent(userId, eventId, entityType);
      const calendarEventId = await upsertCalendarEvent(
        userId,
        householdId,
        {
          id: event.id,
          title: event.title,
          description: event.description || null,
          startDate: event.startDate,
          endDate: event.endDate || null,
          color: (event.metadata as any)?.color || null,
          trackId: effectiveTrackId,
          subtrackId: effectiveSubtrackId,
        },
        projectId,
        effectiveTrackId,
        effectiveSubtrackId
      );

      const action = existingId ? 'updated' : 'created';
      console.log(`${logPrefix} - Personal sync: ${action} calendar event ${calendarEventId}`);
      personalResult = {
        executed: true,
        action,
        calendarEventId,
        reason: `${action} personal calendar event`,
      };
    }

    // 8. Execute Shared Calendar sync (if target is 'shared' or 'both')
    // Import the SharedProjectionResult type
    type SharedProjectionResult = {
      executed: boolean;
      action: 'created' | 'updated' | 'deleted' | 'noop';
      projectionId?: string;
      contextEventId?: string;
      reason: string;
      error?: string;
    };

    let sharedResult: SharedProjectionResult | null = null;
    if (targetCalendar === 'shared' || targetCalendar === 'both') {
      if (!targetSpaceId) {
        console.log(`${logPrefix} - Skipped: Shared target requires target_space_id`);
        // If personal sync succeeded, return that result
        if (personalResult) {
          return personalResult;
        }
        return {
          executed: false,
          action: 'noop',
          reason: 'Shared target requires target_space_id',
        };
      }

      sharedResult = await ensureSharedProjectionForRoadmapEvent(
        userId,
        {
          id: event.id,
          title: event.title,
          description: event.description || null,
          startDate: event.startDate,
          endDate: event.endDate || null,
        },
        projectId,
        projectName,
        targetSpaceId,
        effectiveTrackId,
        effectiveSubtrackId
      );

      if (sharedResult.executed) {
        console.log(`${logPrefix} - Shared sync: ${sharedResult.action} projection ${sharedResult.projectionId}`);
      } else {
        console.log(`${logPrefix} - Shared sync skipped: ${sharedResult.reason}`);
      }
    }

    // 9. Return combined result
    if (targetCalendar === 'both') {
      const bothExecuted = (personalResult?.executed || false) || (sharedResult?.executed || false);
      return {
        executed: bothExecuted,
        action: bothExecuted ? 'updated' : 'noop',
        calendarEventId: personalResult?.calendarEventId,
        reason: `Personal: ${personalResult?.reason || 'skipped'}, Shared: ${sharedResult?.reason || 'skipped'}`,
      };
    } else if (targetCalendar === 'shared') {
      return {
        executed: sharedResult?.executed || false,
        action: sharedResult?.action || 'noop',
        reason: sharedResult?.reason || 'No shared sync executed',
      };
    } else {
      // Personal only
      return personalResult || {
        executed: false,
        action: 'noop',
        reason: 'No sync executed',
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
 * Helper function to sync a roadmap item
 * 
 * This is a convenience wrapper that:
 * - Gets the current user
 * - Fetches project name
 * - Calls executeCalendarSyncForEvent with proper parameters
 * 
 * Used by roadmapService.ts for automatic sync on create/update.
 */
export async function executeCalendarSyncForRoadmapItem(
  roadmapItem: {
    id: string;
    masterProjectId: string;
    trackId: string;
    subtrackId?: string | null;
    type: string;
  }
): Promise<void> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('[CalendarSyncExecution] executeCalendarSyncForRoadmapItem: No authenticated user');
      return;
    }

    // Only sync events
    if (roadmapItem.type !== 'event') {
      return;
    }

    // Fetch project name (required for shared projections)
    const { data: project, error: projectError } = await supabase
      .from('master_projects')
      .select('name')
      .eq('id', roadmapItem.masterProjectId)
      .maybeSingle();

    if (projectError || !project) {
      console.error('[CalendarSyncExecution] Failed to fetch project name:', projectError);
      // Continue with empty name - will fail gracefully if shared sync is attempted
    }

    const projectName = project?.name || 'Unknown Project';

    // Execute sync (non-blocking - errors are logged but not thrown)
    await executeCalendarSyncForEvent(
      user.id,
      roadmapItem.id,
      'roadmap_event',
      roadmapItem.masterProjectId,
      projectName,
      roadmapItem.trackId,
      roadmapItem.subtrackId || undefined
    );
  } catch (error) {
    // Non-blocking: log but don't throw
    console.error('[CalendarSyncExecution] executeCalendarSyncForRoadmapItem error:', error);
  }
}

/**
 * Sync affected events when sync settings change
 * 
 * This function should be called when:
 * - Project-level sync settings change
 * - Track-level sync settings change
 * - Subtrack-level sync settings change
 * - Event-level sync settings change
 * 
 * @param userId - User ID
 * @param projectId - Project ID
 * @param trackId - Track ID (optional, if track-level change)
 * @param subtrackId - Subtrack ID (optional, if subtrack-level change)
 */
export async function syncAffectedEvents(
  userId: string,
  projectId: string,
  trackId?: string,
  subtrackId?: string
): Promise<void> {
  // TODO (Phase 8): Implement bulk sync for affected events
  // For now, this is a placeholder that logs the intent
  console.log(`[CalendarSyncExecution] syncAffectedEvents called:`, {
    userId,
    projectId,
    trackId,
    subtrackId,
  });
  console.log(`[CalendarSyncExecution] TODO (Phase 8): Implement bulk sync for affected events`);
}
