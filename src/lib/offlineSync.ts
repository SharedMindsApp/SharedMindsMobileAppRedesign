/**
 * Phase 4B: Offline Sync Manager
 * 
 * Handles automatic syncing of queued actions when network reconnects.
 * 
 * Rules:
 * - Replay actions sequentially
 * - Stop on first failure
 * - Handle auth errors gracefully
 * - No silent data loss
 */

import { getQueuedActions, removeQueuedAction, incrementRetryCount } from './offlineQueue';
import { supabase } from './supabase';
import { logError, logWarning, logInfo } from './errorLogger';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  totalCount: number;
  failedActionId?: string;
  failedActionType?: string;
  error?: string;
}

/**
 * Action handlers map
 * Each handler receives the action payload and returns a promise
 */
type ActionHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const actionHandlers: Map<string, ActionHandler> = new Map();

/**
 * Register an action handler
 */
export function registerActionHandler(type: string, handler: ActionHandler): void {
  actionHandlers.set(type, handler);
}

/**
 * Execute a single queued action
 */
async function executeAction(action: { type: string; payload: Record<string, unknown> }): Promise<boolean> {
  const handler = actionHandlers.get(action.type);
  
  if (!handler) {
    console.warn(`[OfflineSync] No handler registered for action type: ${action.type}`);
    return false;
  }

  try {
    await handler(action.payload);
    logInfo(`Successfully executed queued action: ${action.type}`, {
      component: 'OfflineSync',
      action: 'executeAction',
      actionType: action.type,
    });
    return true;
  } catch (error) {
    logError(
      `Error executing queued action: ${action.type}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        component: 'OfflineSync',
        action: 'executeAction',
        actionType: action.type,
        actionId: action.id,
      }
    );
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
async function checkAuth(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const authenticated = !!session;
    if (!authenticated) {
      logWarning('Not authenticated when attempting sync', {
        component: 'OfflineSync',
        action: 'checkAuth',
      });
    }
    return authenticated;
  } catch (error) {
    logError(
      'Error checking auth for sync',
      error instanceof Error ? error : new Error(String(error)),
      {
        component: 'OfflineSync',
        action: 'checkAuth',
      }
    );
    return false;
  }
}

/**
 * Sync all queued actions
 * 
 * Returns:
 * - success: true if all actions synced, false if any failed
 * - syncedCount: number of actions successfully synced
 * - failedActionId: ID of the first action that failed (if any)
 * - error: error message (if any)
 */
export async function syncQueuedActions(): Promise<SyncResult> {
  const actions = getQueuedActions();
  const totalCount = actions.length;
  
  if (actions.length === 0) {
    logInfo('No queued actions to sync', {
      component: 'OfflineSync',
      action: 'syncQueuedActions',
    });
    return { success: true, syncedCount: 0, totalCount: 0 };
  }

  logInfo(`Starting sync of ${totalCount} queued actions`, {
    component: 'OfflineSync',
    action: 'syncQueuedActions',
    totalCount,
  });

  // Check auth first
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    return {
      success: false,
      syncedCount: 0,
      totalCount,
      error: 'Not authenticated. Please log in to sync.',
    };
  }

  let syncedCount = 0;
  let failedActionId: string | undefined;
  let error: string | undefined;

  // Process actions sequentially
  for (const action of actions) {
    try {
      const success = await executeAction(action);
      
      if (success) {
        removeQueuedAction(action.id);
        syncedCount++;
        logInfo(`Successfully synced action ${syncedCount}/${totalCount}: ${action.type}`, {
          component: 'OfflineSync',
          action: 'syncQueuedActions',
          actionType: action.type,
          progress: `${syncedCount}/${totalCount}`,
        });
      } else {
        failedActionId = action.id;
        failedActionType = action.type;
        error = `Failed to execute action: ${action.type}`;
        logError(
          `Failed to execute queued action: ${action.type}`,
          new Error(error),
          {
            component: 'OfflineSync',
            action: 'syncQueuedActions',
            actionType: action.type,
            actionId: action.id,
            syncedCount,
            totalCount,
          }
        );
        break;
      }
    } catch (err) {
      // Check if it's an auth error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('auth') || errorMessage.includes('session') || errorMessage.includes('token')) {
        error = 'Authentication expired. Please log in to continue syncing.';
        logWarning('Sync failed due to auth error', {
          component: 'OfflineSync',
          action: 'syncQueuedActions',
          actionType: action.type,
          actionId: action.id,
          syncedCount,
          totalCount,
        });
      } else {
        error = errorMessage;
      }
      
      failedActionId = action.id;
      failedActionType = action.type;
      incrementRetryCount(action.id);
      
      logError(
        `Sync failed on action: ${action.type}`,
        err instanceof Error ? err : new Error(String(err)),
        {
          component: 'OfflineSync',
          action: 'syncQueuedActions',
          actionType: action.type,
          actionId: action.id,
          syncedCount,
          totalCount,
          errorType: errorMessage.includes('auth') ? 'auth' : 'network',
        }
      );
      
      break; // Stop on first failure
    }
  }

  const result = {
    success: syncedCount === totalCount,
    syncedCount,
    totalCount,
    failedActionId,
    failedActionType,
    error,
  };

  if (result.success) {
    logInfo(`Successfully synced all ${totalCount} queued actions`, {
      component: 'OfflineSync',
      action: 'syncQueuedActions',
      totalCount,
    });
  } else {
    logWarning(`Sync incomplete: ${syncedCount}/${totalCount} actions synced`, {
      component: 'OfflineSync',
      action: 'syncQueuedActions',
      syncedCount,
      totalCount,
      failedActionId,
      failedActionType,
      error,
    });
  }

  return result;
}

