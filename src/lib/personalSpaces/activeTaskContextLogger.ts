/**
 * Dev-Only Logging Utility for Active Task Context
 * 
 * Provides structured, readable logs for task context operations.
 * Only logs in development mode - completely no-op in production.
 * 
 * Logs:
 * - Context switches (from -> to)
 * - Permission downgrades (write -> read)
 * - Access revocations and auto-fallbacks
 * - Context validation failures
 */

/**
 * Check if we're in development mode
 */
function isDevMode(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('.local') ||
      import.meta.env?.MODE === 'development' ||
      import.meta.env?.DEV === true)
  );
}

export type TaskContextSwitchLog = {
  from: string;
  to: string;
  reason: 'user_action' | 'auto_fallback' | 'permission_downgrade';
};

export type TaskPermissionChangeLog = {
  shareId: string;
  ownerName: string;
  from: 'read' | 'write';
  to: 'read' | 'write';
};

export type TaskRevocationLog = {
  shareId: string;
  ownerName: string;
  fallbackTo: 'personal';
};

/**
 * Log a context switch
 */
export function logTaskContextSwitch(log: TaskContextSwitchLog): void {
  if (!isDevMode()) return;

  const emoji = log.reason === 'auto_fallback' ? '🔄' : log.reason === 'permission_downgrade' ? '⚠️' : '✓';
  console.log(
    `${emoji} [ActiveTaskContext] Switch: ${log.from} → ${log.to} (${log.reason})`
  );
}

/**
 * Log a permission change
 */
export function logTaskPermissionChange(log: TaskPermissionChangeLog): void {
  if (!isDevMode()) return;

  const isDowngrade = log.from === 'write' && log.to === 'read';
  const emoji = isDowngrade ? '⚠️' : '✅';
  console.log(
    `${emoji} [ActiveTaskContext] Permission changed for "${log.ownerName}": ${log.from} → ${log.to} (share: ${log.shareId})`
  );
}

/**
 * Log access revocation and fallback
 */
export function logTaskRevocation(log: TaskRevocationLog): void {
  if (!isDevMode()) return;

  console.log(
    `🚫 [ActiveTaskContext] Access revoked for "${log.ownerName}" (share: ${log.shareId}), falling back to ${log.fallbackTo}`
  );
}

/**
 * Log context validation failure
 */
export function logTaskValidationFailure(reason: string, fallbackTo: string): void {
  if (!isDevMode()) return;

  console.warn(
    `⚠️ [ActiveTaskContext] Validation failed: ${reason}, falling back to ${fallbackTo}`
  );
}
