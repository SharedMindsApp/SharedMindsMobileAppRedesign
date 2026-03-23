/**
 * Phase 4: Network Resilience
 * 
 * Automatic retry queue for failed operations when connection is restored.
 * Queues failed network operations and automatically retries them when connection is healthy.
 */

import { subscribeToHealthState, getHealthState } from './connectionHealth';
import { logInfo, logWarning, logError } from './errorLogger';

export interface RetryableOperation {
  /**
   * Unique ID for the operation
   */
  id: string;
  
  /**
   * Operation to retry
   */
  operation: () => Promise<any>;
  
  /**
   * Context for logging
   */
  context?: {
    component?: string;
    action?: string;
  };
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Current retry count
   */
  retryCount?: number;
  
  /**
   * Timestamp when operation was queued
   */
  queuedAt: number;
  
  /**
   * Callback when operation succeeds
   */
  onSuccess?: (result: any) => void;
  
  /**
   * Callback when operation fails after all retries
   */
  onFailure?: (error: Error) => void;
}

// Retry queue storage
const retryQueue: RetryableOperation[] = [];
let isProcessing = false;
let healthSubscription: (() => void) | null = null;

/**
 * Add an operation to the retry queue.
 * Operations will be automatically retried when connection is restored.
 * 
 * @param operation - Operation to retry
 * @returns Operation ID
 * 
 * @example
 * ```typescript
 * queueForRetry({
 *   operation: async () => {
 *     await saveUserData(data);
 *   },
 *   context: { component: 'UserProfile', action: 'saveData' },
 *   onSuccess: () => console.log('Saved!'),
 *   onFailure: (error) => console.error('Failed:', error),
 * });
 * ```
 */
export function queueForRetry(operation: Omit<RetryableOperation, 'id' | 'queuedAt' | 'retryCount'>): string {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const retryableOperation: RetryableOperation = {
    id,
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    ...operation,
  };

  retryQueue.push(retryableOperation);

  logInfo('Operation queued for retry', {
    ...operation.context,
    action: 'queueForRetry',
    operationId: id,
    queueSize: retryQueue.length,
  });

  // Start processing if connection is healthy
  const healthState = getHealthState();
  if (healthState.isHealthy && !isProcessing) {
    processRetryQueue();
  }

  return id;
}

/**
 * Remove an operation from the retry queue.
 * 
 * @param operationId - Operation ID to remove
 */
export function removeFromRetryQueue(operationId: string): void {
  const index = retryQueue.findIndex(op => op.id === operationId);
  if (index !== -1) {
    retryQueue.splice(index, 1);
    logInfo('Operation removed from retry queue', {
      action: 'removeFromRetryQueue',
      operationId,
      queueSize: retryQueue.length,
    });
  }
}

/**
 * Clear all operations from the retry queue.
 */
export function clearRetryQueue(): void {
  const count = retryQueue.length;
  retryQueue.length = 0;
  logInfo('Retry queue cleared', {
    action: 'clearRetryQueue',
    clearedCount: count,
  });
}

/**
 * Get all queued operations.
 */
export function getQueuedOperations(): RetryableOperation[] {
  return [...retryQueue];
}

/**
 * Process the retry queue when connection is healthy.
 * Exported for use by connectionHealth module.
 */
export async function processRetryQueue(): Promise<void> {
  if (isProcessing || retryQueue.length === 0) {
    return;
  }

  const healthState = getHealthState();
  if (!healthState.isHealthy) {
    logInfo('Skipping retry queue processing - connection not healthy', {
      action: 'processRetryQueue',
      status: healthState.status,
      queueSize: retryQueue.length,
    });
    return;
  }

  isProcessing = true;

  logInfo('Processing retry queue', {
    action: 'processRetryQueue',
    queueSize: retryQueue.length,
  });

  // Process operations one at a time
  while (retryQueue.length > 0) {
    const healthState = getHealthState();
    if (!healthState.isHealthy) {
      logInfo('Stopping retry queue processing - connection degraded', {
        action: 'processRetryQueue',
        status: healthState.status,
        remainingQueueSize: retryQueue.length,
      });
      break;
    }

    const operation = retryQueue[0];
    const maxRetries = operation.maxRetries || 3;

    try {
      logInfo('Retrying operation', {
        ...operation.context,
        action: 'processRetryQueue',
        operationId: operation.id,
        retryCount: operation.retryCount || 0,
        maxRetries,
      });

      const result = await operation.operation();

      // Success - remove from queue and call success callback
      retryQueue.shift();
      
      if (operation.onSuccess) {
        try {
          operation.onSuccess(result);
        } catch (error) {
          logError(
            'Error in retry success callback',
            error instanceof Error ? error : new Error(String(error)),
            {
              ...operation.context,
              action: 'processRetryQueue',
              operationId: operation.id,
            }
          );
        }
      }

      logInfo('Operation retry succeeded', {
        ...operation.context,
        action: 'processRetryQueue',
        operationId: operation.id,
        remainingQueueSize: retryQueue.length,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const retryCount = (operation.retryCount || 0) + 1;

      if (retryCount >= maxRetries) {
        // Max retries reached - remove from queue and call failure callback
        retryQueue.shift();

        logError(
          'Operation retry failed after max attempts',
          err,
          {
            ...operation.context,
            action: 'processRetryQueue',
            operationId: operation.id,
            retryCount,
            maxRetries,
          }
        );

        if (operation.onFailure) {
          try {
            operation.onFailure(err);
          } catch (callbackError) {
            logError(
              'Error in retry failure callback',
              callbackError instanceof Error ? callbackError : new Error(String(callbackError)),
              {
                ...operation.context,
                action: 'processRetryQueue',
                operationId: operation.id,
              }
            );
          }
        }
      } else {
        // Increment retry count and keep in queue
        operation.retryCount = retryCount;

        logWarning('Operation retry failed, will retry again', {
          ...operation.context,
          action: 'processRetryQueue',
          operationId: operation.id,
          retryCount,
          maxRetries,
          error: err.message,
        });

        // Move to end of queue for next attempt
        retryQueue.shift();
        retryQueue.push(operation);

        // Wait a bit before next retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  isProcessing = false;

  logInfo('Retry queue processing complete', {
    action: 'processRetryQueue',
    remainingQueueSize: retryQueue.length,
  });
}

/**
 * Initialize retry queue monitoring.
 * Automatically processes queue when connection is restored.
 */
export function startRetryQueueMonitoring(): void {
  if (healthSubscription) {
    logWarning('Retry queue monitoring already started', {
      action: 'startRetryQueueMonitoring',
    });
    return;
  }

  logInfo('Starting retry queue monitoring', {
    action: 'startRetryQueueMonitoring',
  });

  // Subscribe to health state changes
  healthSubscription = subscribeToHealthState((state) => {
    if (state.isHealthy && retryQueue.length > 0 && !isProcessing) {
      logInfo('Connection restored, processing retry queue', {
        action: 'startRetryQueueMonitoring',
        queueSize: retryQueue.length,
      });
      processRetryQueue();
    }
  });

  // Process queue if connection is already healthy
  const healthState = getHealthState();
  if (healthState.isHealthy && retryQueue.length > 0) {
    processRetryQueue();
  }
}

/**
 * Stop retry queue monitoring.
 */
export function stopRetryQueueMonitoring(): void {
  if (healthSubscription) {
    healthSubscription();
    healthSubscription = null;
    logInfo('Retry queue monitoring stopped', {
      action: 'stopRetryQueueMonitoring',
    });
  }
}