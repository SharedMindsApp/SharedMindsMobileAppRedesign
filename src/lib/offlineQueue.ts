/**
 * Phase 4B: Offline Action Queue
 * Phase 5: State Management Resilience - Added storage protection
 * 
 * Simple write-behind queue for offline actions.
 * Stores actions in localStorage and replays them when online.
 * 
 * Rules:
 * - Only queue safe, append-only actions
 * - No conflict resolution
 * - Stop on first failure during sync
 */

import { safeStorageGet, safeStorageSet, safeStorageRemove } from './storageProtection';

const QUEUE_STORAGE_KEY = 'offline_action_queue';
const MAX_QUEUE_SIZE = 100; // Prevent unbounded growth

export interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount?: number;
}

/**
 * Phase 5: Get all queued actions from storage with protection
 */
export function getQueuedActions(): QueuedAction[] {
  const result = safeStorageGet<QueuedAction[]>(
    localStorage,
    QUEUE_STORAGE_KEY,
    []
  );
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return Array.isArray(result.data) ? result.data : [];
}

/**
 * Phase 5: Add an action to the queue with storage protection
 */
export function queueAction(
  type: string,
  payload: Record<string, unknown>
): QueuedAction {
  const actions = getQueuedActions();
  
  // Prevent queue from growing too large
  if (actions.length >= MAX_QUEUE_SIZE) {
    console.warn('[OfflineQueue] Queue full, dropping oldest action');
    actions.shift();
  }

  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  actions.push(action);
  
  // Phase 5: Use safe storage set
  const result = safeStorageSet(
    localStorage,
    QUEUE_STORAGE_KEY,
    actions,
    { component: 'OfflineQueue', action: 'queueAction' }
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to queue action');
  }

  return action;
}

/**
 * Phase 5: Remove an action from the queue with storage protection
 */
export function removeQueuedAction(actionId: string): void {
  const actions = getQueuedActions();
  const filtered = actions.filter(a => a.id !== actionId);
  
  // Phase 5: Use safe storage set
  safeStorageSet(
    localStorage,
    QUEUE_STORAGE_KEY,
    filtered,
    { component: 'OfflineQueue', action: 'removeQueuedAction' }
  );
}

/**
 * Phase 5: Clear all queued actions with storage protection
 */
export function clearQueue(): void {
  safeStorageRemove(localStorage, QUEUE_STORAGE_KEY);
}

/**
 * Phase 5: Increment retry count with storage protection
 */
export function incrementRetryCount(actionId: string): void {
  const actions = getQueuedActions();
  const action = actions.find(a => a.id === actionId);
  if (action) {
    action.retryCount = (action.retryCount || 0) + 1;
    
    // Phase 5: Use safe storage set
    safeStorageSet(
      localStorage,
      QUEUE_STORAGE_KEY,
      actions,
      { component: 'OfflineQueue', action: 'incrementRetryCount' }
    );
  }
}



