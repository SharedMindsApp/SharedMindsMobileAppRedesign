/**
 * Phase 4B: Offline Indicator
 * Phase 5A: Enhanced with queue visibility and retry
 * 
 * Subtle, non-blocking indicator for offline state.
 * Shows when offline and brief "syncing" message when back online.
 */

import { useEffect, useState } from 'react';
import { useNetworkStatusContext } from '../contexts/NetworkStatusContext';
import { syncQueuedActions, SyncResult } from '../lib/offlineSync';
import { getQueuedActions } from '../lib/offlineQueue';
import { Wifi, WifiOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

// Phase 5A: Action type labels for user-friendly display
const ACTION_TYPE_LABELS: Record<string, string> = {
  'create_calendar_event': 'Calendar event',
  'create_todo': 'Task',
  'create_meal': 'Meal',
  'create_custom_meal': 'Meal',
  'create_container_event': 'Event',
  'create_activity': 'Activity',
  'create_goal': 'Goal',
};

function getActionTypeLabel(type: string): string {
  return ACTION_TYPE_LABELS[type] || type.replace('create_', '').replace(/_/g, ' ');
}

export function OfflineIndicator() {
  const { isOffline } = useNetworkStatusContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [queuedCount, setQueuedCount] = useState(0);
  const [failedActionType, setFailedActionType] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Phase 5A: Update queued count when offline status changes
  useEffect(() => {
    const updateQueueCount = () => {
      const actions = getQueuedActions();
      setQueuedCount(actions.length);
    };
    
    updateQueueCount();
    const interval = setInterval(updateQueueCount, 1000);
    return () => clearInterval(interval);
  }, [isOffline]);

  // Phase 5A: Manual retry function
  const handleRetrySync = async () => {
    if (isSyncing || isOffline) return;
    
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncMessage('Syncing...');
    setFailedActionType(null);

    const result = await syncQueuedActions();
    setLastSyncResult(result);
    
    if (result.success) {
      setSyncStatus('success');
      setSyncMessage(
        result.syncedCount > 0
          ? `Synced ${result.syncedCount} ${result.syncedCount === 1 ? 'action' : 'actions'}`
          : 'All synced'
      );
      setQueuedCount(0);
      
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } else {
      setSyncStatus('error');
      // Phase 5A: Show which action type failed
      if (result.failedActionId) {
        const actions = getQueuedActions();
        const failedAction = actions.find(a => a.id === result.failedActionId);
        if (failedAction) {
          setFailedActionType(failedAction.type);
          setSyncMessage(`Failed to sync ${getActionTypeLabel(failedAction.type)}`);
        } else {
          setSyncMessage(result.error || 'Sync failed');
        }
      } else {
        setSyncMessage(result.error || 'Sync failed');
      }
      
      // Phase 5A: Update remaining count
      const remaining = getQueuedActions();
      setQueuedCount(remaining.length);
    }
    
    setIsSyncing(false);
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOffline && !isSyncing) {
      const queuedActions = getQueuedActions();
      
      if (queuedActions.length > 0) {
        handleRetrySync();
      }
    }
  }, [isOffline]);

  // Phase 5A: Show queue count when offline
  const shouldShow = isOffline || syncStatus !== 'idle' || syncMessage || queuedCount > 0;

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 rounded-lg shadow-lg
        flex items-center gap-2
        text-sm font-medium
        transition-all duration-300
        ${
          isOffline
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : syncStatus === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : syncStatus === 'error'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }
      `}
    >
      {isOffline ? (
        <>
          <WifiOff size={16} />
          <span>
            Offline
            {queuedCount > 0 && (
              <span className="ml-2 text-xs opacity-75">
                ({queuedCount} {queuedCount === 1 ? 'action' : 'actions'} queued)
              </span>
            )}
          </span>
        </>
      ) : syncStatus === 'success' ? (
        <>
          <CheckCircle2 size={16} />
          <span>{syncMessage}</span>
        </>
      ) : syncStatus === 'error' ? (
        <>
          <AlertCircle size={16} />
          <div className="flex items-center gap-2">
            <span>{syncMessage}</span>
            {queuedCount > 0 && (
              <button
                onClick={handleRetrySync}
                disabled={isSyncing}
                className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                aria-label="Retry sync"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                Retry
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <Wifi size={16} className="animate-pulse" />
          <span>
            {syncMessage}
            {isSyncing && lastSyncResult && lastSyncResult.syncedCount > 0 && (
              <span className="ml-2 text-xs opacity-75">
                ({lastSyncResult.syncedCount} of {lastSyncResult.syncedCount + queuedCount} synced)
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}

