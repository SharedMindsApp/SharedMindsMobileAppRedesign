/**
 * Calendar Defaults Application Helper
 * 
 * Phase 7.0: Helper functions to apply calendar defaults to newly created events/tasks
 * via promotion to context events and distribution.
 * 
 * This module provides helper functions that can be called after event/task creation
 * to promote events to context events and apply calendar visibility defaults.
 * 
 * Constraints:
 * - Promotes calendar_events to context_events before distribution
 * - Only applies to group audiences (distribution APIs only support groups)
 * - Only applies when feature flag is enabled
 * - Only applies when defaults are enabled and audiences exist
 * - Non-blocking, error-tolerant
 * - Never fails creation
 */

import { ENABLE_GROUP_DISTRIBUTION } from '../featureFlags';
import { promoteCalendarEventToContextEvent } from './calendarEventPromotionService';
import type { CalendarVisibilityDefaults } from '../../hooks/useCalendarVisibilityDefaults';

/**
 * Apply calendar defaults to a newly created event
 * 
 * Phase 7.0: Promotes the calendar event to a context event first, then applies distribution.
 * 
 * Only processes group audiences (distribution API only supports groups).
 * User/household audiences are silently skipped.
 * 
 * @param calendarEventId - The ID of the newly created calendar event (calendar_events.id)
 * @param defaults - The calendar visibility defaults
 * @param initiatedByUserId - The auth.users.id of the user initiating promotion
 * @param distributeEventFn - Function to distribute event (from useDistributeEvent hook, expects context_event.id)
 * @returns Promise that resolves when promotion and distribution are complete (or skipped)
 */
export async function applyCalendarDefaultsToEvent(
  calendarEventId: string,
  defaults: CalendarVisibilityDefaults,
  initiatedByUserId: string, // auth.users.id
  distributeEventFn: (request: { eventId: string; groupId: string; options?: { scope?: 'date_only' | 'title' | 'full'; status?: 'suggested' | 'pending' | 'accepted' | 'declined' | 'revoked' } }) => Promise<{ created: number; skipped: number } | null>
): Promise<void> {
  // Feature flag check
  if (!ENABLE_GROUP_DISTRIBUTION) {
    return;
  }

  // Defaults enabled check
  if (!defaults.enabled) {
    return;
  }

  // Audience existence check
  if (!defaults.audiences || defaults.audiences.length === 0) {
    return;
  }

  // Filter to only group audiences (distribution API only supports groups)
  const groupAudiences = defaults.audiences.filter(a => a.type === 'group');

  if (groupAudiences.length === 0) {
    // No group audiences to apply, silently return
    return;
  }

  // Phase 7.0: Promote calendar event to context event first
  let contextEventId: string;
  try {
    contextEventId = await promoteCalendarEventToContextEvent({
      calendarEventId,
      initiatedByUserId,
    });
  } catch (error) {
    // Log error but don't fail - promotion errors should not block
    console.error(`[applyCalendarDefaultsToEvent] Failed to promote calendar event ${calendarEventId}:`, error);
    return;
  }

  // Apply distributions for each group audience (using context_event.id)
  // Errors are caught and logged per audience, but don't fail the overall operation
  for (const audience of groupAudiences) {
    try {
      await distributeEventFn({
        eventId: contextEventId, // Use context_event.id for distribution
        groupId: audience.id,
        options: {
          scope: 'full', // Default scope
          status: 'suggested', // Default status for calendar defaults
        },
      });
    } catch (error) {
      // Log error but continue with remaining audiences
      console.error(`[applyCalendarDefaultsToEvent] Failed to distribute context event ${contextEventId} to group ${audience.id}:`, error);
      // Continue to next audience
    }
  }
}

/**
 * Apply calendar defaults to a newly created task
 * 
 * Only processes group audiences (distribution API only supports groups).
 * User/household audiences are silently skipped.
 * 
 * @param taskId - The ID of the newly created task
 * @param defaults - The calendar visibility defaults
 * @param distributeTaskFn - Function to distribute task (from useDistributeTask hook)
 * @returns Promise that resolves when distribution is complete (or skipped)
 */
export async function applyCalendarDefaultsToTask(
  taskId: string,
  defaults: CalendarVisibilityDefaults,
  distributeTaskFn: (request: { taskId: string; groupId: string; options?: { canEdit?: boolean; canComplete?: boolean; status?: 'pending' | 'accepted' | 'declined' | 'revoked' } }) => Promise<{ created: number; skipped: number } | null>
): Promise<void> {
  // Feature flag check
  if (!ENABLE_GROUP_DISTRIBUTION) {
    return;
  }

  // Defaults enabled check
  if (!defaults.enabled) {
    return;
  }

  // Audience existence check
  if (!defaults.audiences || defaults.audiences.length === 0) {
    return;
  }

  // Filter to only group audiences (distribution API only supports groups)
  const groupAudiences = defaults.audiences.filter(a => a.type === 'group');

  if (groupAudiences.length === 0) {
    // No group audiences to apply, silently return
    return;
  }

  // Apply distributions for each group audience
  // Errors are caught and logged per audience, but don't fail the overall operation
  for (const audience of groupAudiences) {
    try {
      await distributeTaskFn({
        taskId,
        groupId: audience.id,
        options: {
          canEdit: false, // Default: no edit permission
          canComplete: false, // Default: no complete permission
        },
      });
    } catch (error) {
      // Log error but continue with remaining audiences
      console.error(`[applyCalendarDefaultsToTask] Failed to distribute task ${taskId} to group ${audience.id}:`, error);
      // Continue to next audience
    }
  }
}