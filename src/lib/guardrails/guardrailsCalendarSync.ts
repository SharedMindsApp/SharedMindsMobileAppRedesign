/**
 * Guardrails → Calendar Sync Service (PROMPT 2)
 *
 * ONE-WAY SYNC ONLY: Guardrails → calendar_events
 *
 * ✅ Respects calendar_sync_settings (user-controlled)
 * ✅ Idempotent (one calendar event per Guardrails entity)
 * ✅ Deterministic (no inference, no auto-repair)
 * ✅ Explicit diagnostics (synced, skipped, failed)
 * ✅ No side effects outside calendar_events
 *
 * ❌ NO Personal Spaces → Guardrails sync
 * ❌ NO automatic trigger-based syncing
 * ❌ NO calendar sharing logic
 * ❌ NO inference about user intent
 * ❌ NO auto-creation of missing Guardrails entities
 *
 * Prime Rule: Guardrails entities are the source of truth.
 * Calendar events reflect them, never the reverse.
 */

import { supabase } from '../supabase';
import {
  getCalendarSyncSettings,
  type CalendarSyncSettings,
} from '../calendarSyncSettings';

/**
 * Sync result status
 */
export type SyncResultStatus = 'synced' | 'skipped' | 'failed';

/**
 * Sync result for a single entity
 */
export interface SyncResult {
  status: SyncResultStatus;
  calendarEventId?: string;
  reason?: string;
  error?: string;
}

/**
 * Roadmap item (simplified for sync purposes)
 */
export interface RoadmapItemForSync {
  id: string;
  title: string;
  description?: string;
  start_date: string; // date string
  end_date: string; // date string
  type: 'event' | 'task' | 'milestone' | 'goal' | 'note' | 'document' | 'photo' | 'grocery_list' | 'habit' | 'review';
  status: string;
  color?: string;
  master_project_id: string;
  track_id?: string;
}

/**
 * Task with dates (simplified for sync purposes)
 */
export interface TaskForSync {
  id: string;
  title: string;
  description?: string;
  dueAt?: string; // timestamptz string
  scheduledAt?: string; // timestamptz string
  status: string;
  master_project_id: string;
}

/**
 * Mind Mesh container (simplified for sync purposes)
 */
export interface MindMeshContainerForSync {
  id: string;
  title: string;
  description?: string;
  start_date?: string; // date string
  end_date?: string; // date string
  project_id?: string;
  track_id?: string;
}

/**
 * Get user's household_id
 * Required because calendar_events belong to households
 */
async function getUserHouseholdId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error) {
    console.error('[GuardrailsCalendarSync] Failed to get household:', error);
    return null;
  }

  return data?.household_id || null;
}

/**
 * Sync a roadmap event to calendar_events
 *
 * Only syncs if:
 * - sync_guardrails_to_personal = true
 * - sync_roadmap_events = true
 * - item.type = 'event' (milestone can optionally be synced in future)
 *
 * @param userId - User ID requesting sync
 * @param item - Roadmap item to sync
 * @returns SyncResult with status and details
 */
export async function syncRoadmapEventToCalendar(
  userId: string,
  item: RoadmapItemForSync
): Promise<SyncResult> {
  console.log(`[GuardrailsCalendarSync] syncRoadmapEventToCalendar: userId=${userId}, itemId=${item.id}, type=${item.type}`);

  // ❌ Only sync events (strict type check)
  if (item.type !== 'event') {
    return {
      status: 'skipped',
      reason: `Item type '${item.type}' is not 'event'`,
    };
  }

  try {
    // Check user's sync settings
    const settings = await getCalendarSyncSettings(userId);

    // ❌ Skip if Guardrails → Personal sync is disabled
    if (!settings.syncGuardrailsToPersonal) {
      return {
        status: 'skipped',
        reason: 'sync_guardrails_to_personal is disabled',
      };
    }

    // ❌ Skip if roadmap events sync is disabled
    if (!settings.syncRoadmapEvents) {
      return {
        status: 'skipped',
        reason: 'sync_roadmap_events is disabled',
      };
    }

    // Get household_id (required for calendar_events)
    const householdId = await getUserHouseholdId(userId);
    if (!householdId) {
      return {
        status: 'failed',
        error: 'User does not belong to a household',
      };
    }

    // ✅ Proceed with sync
    // Check if calendar event already exists for this roadmap item
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('source_type', 'roadmap_event')
      .eq('source_entity_id', item.id)
      .maybeSingle();

    if (fetchError) {
      return {
        status: 'failed',
        error: `Failed to check existing event: ${fetchError.message}`,
      };
    }

    // Convert dates to timestamps
    const startAt = new Date(item.start_date).toISOString();
    const endAt = new Date(item.end_date + 'T23:59:59').toISOString(); // End of day

    const eventData = {
      household_id: householdId,
      created_by: userId,
      title: item.title,
      description: item.description || '',
      start_at: startAt,
      end_at: endAt,
      all_day: true, // Roadmap events are all-day by default
      color: item.color || 'blue',
      source_type: 'roadmap_event',
      source_entity_id: item.id,
      source_project_id: item.master_project_id,
      source_track_id: item.track_id || null,
    };

    if (existingEvent) {
      // Update existing calendar event
      const { data, error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', existingEvent.id)
        .select('id')
        .single();

      if (error) {
        return {
          status: 'failed',
          error: `Failed to update calendar event: ${error.message}`,
        };
      }

      return {
        status: 'synced',
        calendarEventId: data.id,
        reason: 'Updated existing calendar event',
      };
    } else {
      // Create new calendar event
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select('id')
        .single();

      if (error) {
        return {
          status: 'failed',
          error: `Failed to create calendar event: ${error.message}`,
        };
      }

      return {
        status: 'synced',
        calendarEventId: data.id,
        reason: 'Created new calendar event',
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sync a task with dates to calendar_events
 *
 * Only syncs if:
 * - sync_guardrails_to_personal = true
 * - sync_tasks_with_dates = true
 * - task has dueAt OR scheduledAt
 *
 * @param userId - User ID requesting sync
 * @param task - Task to sync
 * @returns SyncResult with status and details
 */
export async function syncTaskToCalendar(
  userId: string,
  task: TaskForSync
): Promise<SyncResult> {
  console.log(`[GuardrailsCalendarSync] syncTaskToCalendar: userId=${userId}, taskId=${task.id}`);

  // ❌ Only sync tasks with dates
  if (!task.dueAt && !task.scheduledAt) {
    return {
      status: 'skipped',
      reason: 'Task has no dueAt or scheduledAt',
    };
  }

  try {
    // Check user's sync settings
    const settings = await getCalendarSyncSettings(userId);

    // ❌ Skip if Guardrails → Personal sync is disabled
    if (!settings.syncGuardrailsToPersonal) {
      return {
        status: 'skipped',
        reason: 'sync_guardrails_to_personal is disabled',
      };
    }

    // ❌ Skip if tasks with dates sync is disabled
    if (!settings.syncTasksWithDates) {
      return {
        status: 'skipped',
        reason: 'sync_tasks_with_dates is disabled',
      };
    }

    // Get household_id (required for calendar_events)
    const householdId = await getUserHouseholdId(userId);
    if (!householdId) {
      return {
        status: 'failed',
        error: 'User does not belong to a household',
      };
    }

    // ✅ Proceed with sync
    // Check if calendar event already exists for this task
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('source_type', 'task')
      .eq('source_entity_id', task.id)
      .maybeSingle();

    if (fetchError) {
      return {
        status: 'failed',
        error: `Failed to check existing event: ${fetchError.message}`,
      };
    }

    // Use scheduledAt if available, otherwise dueAt
    const eventTime = task.scheduledAt || task.dueAt;
    const startAt = new Date(eventTime!).toISOString();
    // Tasks are point-in-time, so end = start
    const endAt = startAt;

    const eventData = {
      household_id: householdId,
      created_by: userId,
      title: task.title,
      description: task.description || '',
      start_at: startAt,
      end_at: endAt,
      all_day: false, // Tasks are specific times
      color: 'blue',
      source_type: 'task',
      source_entity_id: task.id,
      source_project_id: task.master_project_id,
      source_track_id: null, // Tasks don't have tracks directly
    };

    if (existingEvent) {
      // Update existing calendar event
      const { data, error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', existingEvent.id)
        .select('id')
        .single();

      if (error) {
        return {
          status: 'failed',
          error: `Failed to update calendar event: ${error.message}`,
        };
      }

      return {
        status: 'synced',
        calendarEventId: data.id,
        reason: 'Updated existing calendar event',
      };
    } else {
      // Create new calendar event
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select('id')
        .single();

      if (error) {
        return {
          status: 'failed',
          error: `Failed to create calendar event: ${error.message}`,
        };
      }

      return {
        status: 'synced',
        calendarEventId: data.id,
        reason: 'Created new calendar event',
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sync a Mind Mesh integrated event to calendar_events
 *
 * Only syncs if:
 * - sync_guardrails_to_personal = true
 * - sync_mindmesh_events = true
 * - container has start_date AND end_date
 * - container references a Guardrails project
 *
 * @param userId - User ID requesting sync
 * @param container - Mind Mesh container to sync
 * @returns SyncResult with status and details
 */
export async function syncMindMeshEventToCalendar(
  userId: string,
  container: MindMeshContainerForSync
): Promise<SyncResult> {
  console.log(`[GuardrailsCalendarSync] syncMindMeshEventToCalendar: userId=${userId}, containerId=${container.id}`);

  // ❌ Only sync containers with dates and project reference
  if (!container.start_date || !container.end_date) {
    return {
      status: 'skipped',
      reason: 'Container has no start_date or end_date',
    };
  }

  if (!container.project_id) {
    return {
      status: 'skipped',
      reason: 'Container is not integrated with a Guardrails project',
    };
  }

  try {
    // Check user's sync settings
    const settings = await getCalendarSyncSettings(userId);

    // ❌ Skip if Guardrails → Personal sync is disabled
    if (!settings.syncGuardrailsToPersonal) {
      return {
        status: 'skipped',
        reason: 'sync_guardrails_to_personal is disabled',
      };
    }

    // ❌ Skip if Mind Mesh events sync is disabled
    if (!settings.syncMindMeshEvents) {
      return {
        status: 'skipped',
        reason: 'sync_mindmesh_events is disabled',
      };
    }

    // Get household_id (required for calendar_events)
    const householdId = await getUserHouseholdId(userId);
    if (!householdId) {
      return {
        status: 'failed',
        error: 'User does not belong to a household',
      };
    }

    // ✅ Proceed with sync
    // Check if calendar event already exists for this container
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('source_type', 'mindmesh_event')
      .eq('source_entity_id', container.id)
      .maybeSingle();

    if (fetchError) {
      return {
        status: 'failed',
        error: `Failed to check existing event: ${fetchError.message}`,
      };
    }

    // Convert dates to timestamps
    const startAt = new Date(container.start_date).toISOString();
    const endAt = new Date(container.end_date + 'T23:59:59').toISOString(); // End of day

    const eventData = {
      household_id: householdId,
      created_by: userId,
      title: container.title,
      description: container.description || '',
      start_at: startAt,
      end_at: endAt,
      all_day: true, // Mind Mesh events are all-day by default
      color: 'purple',
      source_type: 'mindmesh_event',
      source_entity_id: container.id,
      source_project_id: container.project_id,
      source_track_id: container.track_id || null,
    };

    if (existingEvent) {
      // Update existing calendar event
      const { data, error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', existingEvent.id)
        .select('id')
        .single();

      if (error) {
        return {
          status: 'failed',
          error: `Failed to update calendar event: ${error.message}`,
        };
      }

      return {
        status: 'synced',
        calendarEventId: data.id,
        reason: 'Updated existing calendar event',
      };
    } else {
      // Create new calendar event
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select('id')
        .single();

      if (error) {
        return {
          status: 'failed',
          error: `Failed to create calendar event: ${error.message}`,
        };
      }

      return {
        status: 'synced',
        calendarEventId: data.id,
        reason: 'Created new calendar event',
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete calendar event for a Guardrails entity
 *
 * Called when a Guardrails entity is deleted.
 * Only deletes calendar events that were created by Guardrails sync.
 *
 * @param sourceType - Type of source entity ('roadmap_event', 'task', 'mindmesh_event')
 * @param sourceEntityId - ID of the source entity
 * @returns true if deleted, false if not found or error
 */
export async function deleteCalendarEventForSource(
  sourceType: 'roadmap_event' | 'task' | 'mindmesh_event',
  sourceEntityId: string
): Promise<boolean> {
  console.log(`[GuardrailsCalendarSync] deleteCalendarEventForSource: sourceType=${sourceType}, sourceEntityId=${sourceEntityId}`);

  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_entity_id', sourceEntityId);

    if (error) {
      console.error('[GuardrailsCalendarSync] Failed to delete calendar event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[GuardrailsCalendarSync] Unexpected error deleting calendar event:', error);
    return false;
  }
}
