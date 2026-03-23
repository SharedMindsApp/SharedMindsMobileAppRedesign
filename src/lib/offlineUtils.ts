/**
 * Phase 4B: Offline Utilities
 * 
 * Helper functions for queueable actions.
 * Wraps API calls to queue when offline, execute immediately when online.
 */

import { queueAction } from './offlineQueue';

/**
 * Execute an action, queueing if offline
 * 
 * @param actionType - Type identifier for the action
 * @param payload - Action payload
 * @param executeFn - Function to execute when online
 * @returns Promise that resolves when action is queued or executed
 */
export async function executeOrQueue<T>(
  actionType: string,
  payload: Record<string, unknown>,
  executeFn: () => Promise<T>
): Promise<T> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  if (isOnline) {
    // Execute immediately
    return await executeFn();
  } else {
    // Queue for later
    queueAction(actionType, payload);
    // Return a mock result that looks like the real thing
    // This allows the UI to update optimistically
    return {
      id: `offline-${Date.now()}`,
      ...payload,
      _queued: true,
      _queuedAt: new Date().toISOString(),
    } as T;
  }
}

/**
 * Check if an action is allowed offline
 * 
 * Allowed:
 * - Create operations (append-only)
 * - Lightweight updates that are clearly reversible
 * 
 * Not allowed:
 * - Delete operations
 * - Destructive updates
 * - Actions requiring server validation
 * - Multi-step dependent actions
 */
export function isActionAllowedOffline(actionType: string): boolean {
  const allowedTypes = [
    'create_calendar_event',
    'create_personal_calendar_event', // Phase 7A: Personal calendar events
    'update_personal_calendar_event', // Phase 7A: Personal calendar event updates
    'create_todo',
    'create_meal',
    'create_custom_meal',
    'create_container_event',
    'create_activity',
    'create_goal',
    'create_nutrition_log',
  ];
  
  return allowedTypes.includes(actionType);
}

/**
 * Check if an action is destructive (not allowed offline)
 */
export function isDestructiveAction(actionType: string): boolean {
  const destructivePatterns = ['delete', 'remove', 'destroy', 'archive'];
  return destructivePatterns.some(pattern => 
    actionType.toLowerCase().includes(pattern)
  );
}

