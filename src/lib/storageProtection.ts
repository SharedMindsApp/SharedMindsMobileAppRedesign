/**
 * Phase 5: State Management Resilience
 * 
 * Utilities for safe localStorage/sessionStorage operations with quota monitoring
 * and corruption protection.
 */

import { logError, logWarning, logInfo } from './errorLogger';

export interface StorageInfo {
  /**
   * Estimated storage used (bytes)
   */
  used: number;
  
  /**
   * Storage quota (bytes, if available)
   */
  quota?: number;
  
  /**
   * Storage usage percentage (if quota available)
   */
  usagePercent?: number;
  
  /**
   * Whether quota is exceeded
   */
  quotaExceeded: boolean;
}

export interface StorageOperationResult<T> {
  /**
   * Operation success
   */
  success: boolean;
  
  /**
   * Result data (if successful)
   */
  data?: T;
  
  /**
   * Error message (if failed)
   */
  error?: string;
  
  /**
   * Whether quota was exceeded
   */
  quotaExceeded?: boolean;
}

// Storage quota threshold (warn when usage exceeds this percentage)
const QUOTA_WARNING_THRESHOLD = 0.8; // 80%
const QUOTA_CRITICAL_THRESHOLD = 0.9; // 90%

/**
 * Get storage information (if available).
 * 
 * @param storage - Storage object (localStorage or sessionStorage)
 * @returns Storage info or null if not available
 */
export function getStorageInfo(storage: Storage): StorageInfo | null {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }

  try {
    // Estimate is async, but we'll use a synchronous approximation
    let used = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }

    return {
      used,
      quotaExceeded: false,
    };
  } catch (error) {
    logError(
      'Failed to get storage info',
      error instanceof Error ? error : new Error(String(error)),
      {
        component: 'StorageProtection',
        action: 'getStorageInfo',
      }
    );
    return null;
  }
}

/**
 * Check if storage quota is approaching limits.
 * 
 * @param storage - Storage object
 * @returns Warning level: 'none' | 'warning' | 'critical'
 */
export function checkStorageQuota(storage: Storage): 'none' | 'warning' | 'critical' {
  const info = getStorageInfo(storage);
  if (!info || !info.usagePercent) {
    return 'none';
  }

  if (info.usagePercent >= QUOTA_CRITICAL_THRESHOLD) {
    return 'critical';
  } else if (info.usagePercent >= QUOTA_WARNING_THRESHOLD) {
    return 'warning';
  }

  return 'none';
}

/**
 * Safely get an item from storage with error handling.
 * 
 * @param storage - Storage object
 * @param key - Item key
 * @param defaultValue - Default value if item not found or error
 * @returns Operation result
 * 
 * @example
 * ```typescript
 * const result = safeStorageGet(localStorage, 'userPreferences', {});
 * if (result.success && result.data) {
 *   setPreferences(result.data);
 * }
 * ```
 */
export function safeStorageGet<T>(
  storage: Storage,
  key: string,
  defaultValue?: T
): StorageOperationResult<T> {
  try {
    const item = storage.getItem(key);
    if (item === null) {
      return {
        success: true,
        data: defaultValue,
      };
    }

    const parsed = JSON.parse(item);
    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    // Corrupted data - remove it
    try {
      storage.removeItem(key);
    } catch (removeError) {
      // Ignore remove errors
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'Failed to get storage item, removed corrupted data',
      err,
      {
        component: 'StorageProtection',
        action: 'safeStorageGet',
        key,
      }
    );

    return {
      success: true,
      data: defaultValue,
      error: 'Corrupted data removed',
    };
  }
}

/**
 * Safely set an item in storage with error handling and quota checking.
 * 
 * @param storage - Storage object
 * @param key - Item key
 * @param value - Item value
 * @param context - Context for logging
 * @returns Operation result
 * 
 * @example
 * ```typescript
 * const result = safeStorageSet(
 *   localStorage,
 *   'userPreferences',
 *   preferences,
 *   { component: 'UIPreferences', action: 'savePreferences' }
 * );
 * if (!result.success) {
 *   showError('Failed to save preferences');
 * }
 * ```
 */
export function safeStorageSet<T>(
  storage: Storage,
  key: string,
  value: T,
  context?: { component?: string; action?: string }
): StorageOperationResult<void> {
  try {
    const serialized = JSON.stringify(value);
    
    // Check quota before setting
    const quotaLevel = checkStorageQuota(storage);
    if (quotaLevel === 'critical') {
      logWarning('Storage quota critical, attempting cleanup', {
        ...context,
        action: 'safeStorageSet',
        key,
      });
      
      // Attempt cleanup
      cleanupStorage(storage, context);
    }

    storage.setItem(key, serialized);
    
    if (quotaLevel === 'warning') {
      logWarning('Storage quota warning', {
        ...context,
        action: 'safeStorageSet',
        key,
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Check if it's a quota error
    if (err.name === 'QuotaExceededError' || err.message.includes('quota')) {
      logError(
        'Storage quota exceeded',
        err,
        {
          ...context,
          action: 'safeStorageSet',
          key,
        }
      );

      // Attempt cleanup and retry
      cleanupStorage(storage, context);
      
      try {
        storage.setItem(key, JSON.stringify(value));
        return {
          success: true,
        };
      } catch (retryError) {
        return {
          success: false,
          error: 'Storage quota exceeded, cleanup failed',
          quotaExceeded: true,
        };
      }
    }

    logError(
      'Failed to set storage item',
      err,
      {
        ...context,
        action: 'safeStorageSet',
        key,
      }
    );

    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Safely remove an item from storage.
 * 
 * @param storage - Storage object
 * @param key - Item key
 * @returns Operation result
 */
export function safeStorageRemove(
  storage: Storage,
  key: string
): StorageOperationResult<void> {
  try {
    storage.removeItem(key);
    return {
      success: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'Failed to remove storage item',
      err,
      {
        component: 'StorageProtection',
        action: 'safeStorageRemove',
        key,
      }
    );

    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Safely clear all items from storage.
 * 
 * @param storage - Storage object
 * @param context - Context for logging
 * @returns Operation result
 */
export function safeStorageClear(
  storage: Storage,
  context?: { component?: string; action?: string }
): StorageOperationResult<void> {
  try {
    storage.clear();
    logInfo('Storage cleared', {
      ...context,
      action: 'safeStorageClear',
    });
    return {
      success: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'Failed to clear storage',
      err,
      {
        ...context,
        action: 'safeStorageClear',
      }
    );

    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Cleanup storage by removing old or non-essential items.
 * 
 * @param storage - Storage object
 * @param context - Context for logging
 * @returns Number of items removed
 */
export function cleanupStorage(
  storage: Storage,
  context?: { component?: string; action?: string }
): number {
  let removed = 0;
  const keysToRemove: string[] = [];

  // Identify non-essential keys (cache, temporary data, etc.)
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      // Remove cache entries, temporary data, etc.
      if (
        key.startsWith('cache_') ||
        key.startsWith('temp_') ||
        key.startsWith('_') ||
        key.includes('_old') ||
        key.includes('_backup')
      ) {
        keysToRemove.push(key);
      }
    }
  }

  // Remove identified keys
  for (const key of keysToRemove) {
    try {
      storage.removeItem(key);
      removed++;
    } catch (error) {
      // Ignore individual removal errors
    }
  }

  if (removed > 0) {
    logInfo('Storage cleanup completed', {
      ...context,
      action: 'cleanupStorage',
      removedCount: removed,
    });
  }

  return removed;
}

/**
 * Get all storage keys (for debugging).
 * 
 * @param storage - Storage object
 * @returns Array of keys
 */
export function getStorageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Get storage size estimate (in bytes).
 * 
 * @param storage - Storage object
 * @returns Estimated size in bytes
 */
export function getStorageSize(storage: Storage): number {
  let size = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      const value = storage.getItem(key);
      if (value) {
        size += key.length + value.length;
      }
    }
  }
  return size;
}