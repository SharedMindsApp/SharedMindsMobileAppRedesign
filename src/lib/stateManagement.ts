/**
 * Phase 5: State Management Resilience
 * 
 * Utilities for state validation, rollback, snapshots, and consistency checks.
 * Provides robust state management with recovery mechanisms.
 */

import { logError, logWarning, logInfo } from './errorLogger';

export interface StateSnapshot<T> {
  /**
   * Unique snapshot ID
   */
  id: string;
  
  /**
   * Snapshot timestamp
   */
  timestamp: number;
  
  /**
   * Snapshot data
   */
  data: T;
  
  /**
   * Context for logging
   */
  context?: {
    component?: string;
    action?: string;
  };
}

export interface StateValidationResult {
  /**
   * Whether the state is valid
   */
  isValid: boolean;
  
  /**
   * Validation errors
   */
  errors: string[];
  
  /**
   * Validation warnings
   */
  warnings: string[];
}

export interface OptimisticUpdate<T> {
  /**
   * Unique update ID
   */
  id: string;
  
  /**
   * Original state before update
   */
  previousState: T;
  
  /**
   * Optimistic state
   */
  optimisticState: T;
  
  /**
   * Update operation
   */
  operation: () => Promise<any>;
  
  /**
   * Rollback function
   */
  rollback: () => void;
  
  /**
   * Context for logging
   */
  context?: {
    component?: string;
    action?: string;
  };
  
  /**
   * Timestamp when update was created
   */
  timestamp: number;
  
  /**
   * Retry count
   */
  retryCount?: number;
}

// State snapshot storage (in-memory, limited size)
const stateSnapshots = new Map<string, StateSnapshot<any>[]>();
const MAX_SNAPSHOTS_PER_KEY = 10; // Keep last 10 snapshots per key

// Optimistic updates queue
const optimisticUpdates = new Map<string, OptimisticUpdate<any>>();

/**
 * Create a state snapshot for recovery purposes.
 * 
 * @param key - Unique key for this state (e.g., 'widgets', 'tasks')
 * @param data - State data to snapshot
 * @param context - Context for logging
 * @returns Snapshot ID
 * 
 * @example
 * ```typescript
 * const snapshotId = createStateSnapshot('widgets', widgets, {
 *   component: 'SpacesOSLauncher',
 *   action: 'beforeReorder'
 * });
 * ```
 */
export function createStateSnapshot<T>(
  key: string,
  data: T,
  context?: { component?: string; action?: string }
): string {
  const snapshot: StateSnapshot<T> = {
    id: `${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    data: JSON.parse(JSON.stringify(data)), // Deep clone
    context,
  };

  const snapshots = stateSnapshots.get(key) || [];
  snapshots.push(snapshot);

  // Keep only last N snapshots
  if (snapshots.length > MAX_SNAPSHOTS_PER_KEY) {
    snapshots.shift();
  }

  stateSnapshots.set(key, snapshots);

  logInfo('State snapshot created', {
    ...context,
    action: 'createStateSnapshot',
    snapshotId: snapshot.id,
    key,
  });

  return snapshot.id;
}

/**
 * Restore state from a snapshot.
 * 
 * @param key - Snapshot key
 * @param snapshotId - Snapshot ID (optional, uses latest if not provided)
 * @returns Restored state or null if snapshot not found
 * 
 * @example
 * ```typescript
 * const restored = restoreStateSnapshot('widgets', snapshotId);
 * if (restored) {
 *   setWidgets(restored);
 * }
 * ```
 */
export function restoreStateSnapshot<T>(
  key: string,
  snapshotId?: string
): T | null {
  const snapshots = stateSnapshots.get(key);
  if (!snapshots || snapshots.length === 0) {
    logWarning('No snapshots found for key', {
      action: 'restoreStateSnapshot',
      key,
    });
    return null;
  }

  let snapshot: StateSnapshot<T> | undefined;
  if (snapshotId) {
    snapshot = snapshots.find(s => s.id === snapshotId);
  } else {
    // Use latest snapshot
    snapshot = snapshots[snapshots.length - 1];
  }

  if (!snapshot) {
    logWarning('Snapshot not found', {
      action: 'restoreStateSnapshot',
      key,
      snapshotId,
    });
    return null;
  }

  logInfo('State restored from snapshot', {
    ...snapshot.context,
    action: 'restoreStateSnapshot',
    snapshotId: snapshot.id,
    key,
  });

  return JSON.parse(JSON.stringify(snapshot.data)); // Deep clone
}

/**
 * Validate state consistency.
 * 
 * @param data - State data to validate
 * @param validators - Array of validation functions
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const result = validateState(widgets, [
 *   (w) => w.length > 0 || 'Widgets array cannot be empty',
 *   (w) => w.every(w => w.id) || 'All widgets must have IDs',
 * ]);
 * ```
 */
export function validateState<T>(
  data: T,
  validators: Array<(data: T) => string | null | undefined>
): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const validator of validators) {
    try {
      const result = validator(data);
      if (result) {
        // If result is a string, treat as error
        errors.push(result);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Execute an operation with state rollback on failure.
 * 
 * @param key - State key for snapshot
 * @param currentState - Current state
 * @param operation - Operation to execute
 * @param updateState - Function to update state
 * @param context - Context for logging
 * @returns Operation result
 * 
 * @example
 * ```typescript
 * const result = await executeWithRollback(
 *   'widgets',
 *   widgets,
 *   async () => await saveWidgetOrder(newOrder),
 *   setWidgets,
 *   { component: 'SpacesOSLauncher', action: 'saveOrder' }
 * );
 * ```
 */
export async function executeWithRollback<T>(
  key: string,
  currentState: T,
  operation: () => Promise<any>,
  updateState: (state: T) => void,
  context?: { component?: string; action?: string }
): Promise<{ success: boolean; error?: Error }> {
  // Create snapshot before operation
  const snapshotId = createStateSnapshot(key, currentState, context);

  try {
    await operation();
    return { success: true };
  } catch (error) {
    // Rollback to snapshot
    const restored = restoreStateSnapshot<T>(key, snapshotId);
    if (restored) {
      updateState(restored);
      logInfo('State rolled back after operation failure', {
        ...context,
        action: 'executeWithRollback',
        key,
        snapshotId,
      });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'Operation failed, state rolled back',
      err,
      {
        ...context,
        action: 'executeWithRollback',
        key,
        snapshotId,
      }
    );

    return { success: false, error: err };
  }
}

/**
 * Execute an optimistic update with automatic rollback on failure.
 * 
 * @param key - Unique key for this update
 * @param currentState - Current state
 * @param optimisticState - Optimistic state to apply
 * @param updateState - Function to update state
 * @param operation - Operation to execute
 * @param context - Context for logging
 * @returns Update result
 * 
 * @example
 * ```typescript
 * const result = await executeOptimisticUpdate(
 *   `widget-${widgetId}`,
 *   widgets,
 *   [...widgets, newWidget],
 *   setWidgets,
 *   async () => await createWidget(data),
 *   { component: 'SpacesOSLauncher', action: 'createWidget' }
 * );
 * ```
 */
export async function executeOptimisticUpdate<T>(
  key: string,
  currentState: T,
  optimisticState: T,
  updateState: (state: T) => void,
  operation: () => Promise<any>,
  context?: { component?: string; action?: string }
): Promise<{ success: boolean; error?: Error; rolledBack: boolean }> {
  // Store previous state for rollback
  const previousState = JSON.parse(JSON.stringify(currentState));

  // Apply optimistic update
  updateState(optimisticState);

  // Create optimistic update record
  const optimisticUpdate: OptimisticUpdate<T> = {
    id: `${key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    previousState,
    optimisticState,
    operation,
    rollback: () => {
      updateState(previousState);
    },
    context,
    timestamp: Date.now(),
    retryCount: 0,
  };

  optimisticUpdates.set(key, optimisticUpdate);

  try {
    await operation();
    
    // Success - remove from queue
    optimisticUpdates.delete(key);
    
    logInfo('Optimistic update succeeded', {
      ...context,
      action: 'executeOptimisticUpdate',
      key,
      updateId: optimisticUpdate.id,
    });

    return { success: true, rolledBack: false };
  } catch (error) {
    // Failure - rollback
    optimisticUpdate.rollback();
    optimisticUpdates.delete(key);

    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'Optimistic update failed, rolled back',
      err,
      {
        ...context,
        action: 'executeOptimisticUpdate',
        key,
        updateId: optimisticUpdate.id,
      }
    );

    return { success: false, error: err, rolledBack: true };
  }
}

/**
 * Retry a failed optimistic update.
 * 
 * @param key - Update key
 * @param maxRetries - Maximum retry attempts
 * @returns Retry result
 */
export async function retryOptimisticUpdate(
  key: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: Error }> {
  const update = optimisticUpdates.get(key);
  if (!update) {
    return { success: false, error: new Error('Optimistic update not found') };
  }

  const retryCount = (update.retryCount || 0) + 1;
  if (retryCount > maxRetries) {
    optimisticUpdates.delete(key);
    return { success: false, error: new Error('Max retries exceeded') };
  }

  update.retryCount = retryCount;

  try {
    await update.operation();
    optimisticUpdates.delete(key);
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { success: false, error: err };
  }
}

/**
 * Get all pending optimistic updates.
 */
export function getPendingOptimisticUpdates(): OptimisticUpdate<any>[] {
  return Array.from(optimisticUpdates.values());
}

/**
 * Clear all optimistic updates (useful for cleanup or testing).
 */
export function clearOptimisticUpdates(): void {
  optimisticUpdates.clear();
  logInfo('Optimistic updates cleared', {
    action: 'clearOptimisticUpdates',
  });
}

/**
 * Clear all state snapshots (useful for cleanup or testing).
 */
export function clearStateSnapshots(key?: string): void {
  if (key) {
    stateSnapshots.delete(key);
  } else {
    stateSnapshots.clear();
  }
  logInfo('State snapshots cleared', {
    action: 'clearStateSnapshots',
    key,
  });
}

/**
 * Development-only: Check state consistency and log warnings.
 * 
 * @param key - State key
 * @param data - State data
 * @param validators - Validation functions
 * @param context - Context for logging
 */
export function checkStateConsistency<T>(
  key: string,
  data: T,
  validators: Array<(data: T) => string | null | undefined>,
  context?: { component?: string; action?: string }
): void {
  if (!import.meta.env.DEV) {
    return; // Only run in development
  }

  const result = validateState(data, validators);
  if (!result.isValid) {
    logWarning('State consistency check failed', {
      ...context,
      action: 'checkStateConsistency',
      key,
      errors: result.errors,
    });
  }
}