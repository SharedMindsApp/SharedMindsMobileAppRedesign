/**
 * Active Task Context Provider
 * 
 * Provides the currently active task context to all child components.
 * 
 * Features:
 * - Permission drift monitoring (detects permission changes while app is open)
 * - Auto-fallback on revoked access
 * - State validation on mount
 * 
 * Public API Surface:
 * ===================
 * Components should consume this via `useActiveTaskContext()` hook:
 * 
 * ```tsx
 * const { activeContext, setActiveContext, isReadOnly } = useActiveTaskContext();
 * ```
 * 
 * DO NOT access internal implementation details:
 * - localStorage keys
 * - validation intervals
 * - permission check logic
 * 
 * All decision logic is centralized in:
 * - `activeTaskContext.ts` (utilities)
 * - This provider (state management)
 * 
 * @TEST Critical paths:
 * - Context initialization and validation
 * - Permission drift detection and auto-fallback
 * - Context switching without stale state
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import {
  type ActiveTaskContext,
  loadActiveTaskContext,
  saveActiveTaskContext,
  createPersonalTaskContext,
  isTaskContextReadOnly,
  getTaskContextKey,
} from '../lib/personalSpaces/activeTaskContext';
import { getReceivedTaskShares } from '../lib/personalSpaces/taskSharingService';
import { showToast } from '../components/Toast';
import {
  logTaskContextSwitch,
  logTaskPermissionChange,
  logTaskRevocation,
  logTaskValidationFailure,
} from '../lib/personalSpaces/activeTaskContextLogger';

interface ActiveTaskContextValue {
  activeContext: ActiveTaskContext;
  setActiveContext: (context: ActiveTaskContext) => void;
  isReadOnly: boolean;
}

const ActiveTaskContextContext = createContext<ActiveTaskContextValue | undefined>(undefined);

// Permission monitoring interval (check every 30 seconds)
const PERMISSION_CHECK_INTERVAL = 30000;

export function ActiveTaskContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeContext, setActiveContextState] = useState<ActiveTaskContext | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousContextRef = useRef<ActiveTaskContext | null>(null);

  // Initialize context on mount
  useEffect(() => {
    if (!user) {
      setActiveContextState(null);
      return;
    }

    const initializeContext = async () => {
      const saved = loadActiveTaskContext();
      let initialContext: ActiveTaskContext;

      if (saved) {
        // Validate saved context, especially for shared task lists
        if (saved.kind === 'shared') {
          try {
            const shares = await getReceivedTaskShares(user.id);
            const shareExists = shares.some(s => s.id === saved.shareId && s.status === 'active');
            if (!shareExists) {
              // Saved shared task list no longer active, fallback to personal
              // @TEST Edge case: Shared task list revoked on app reload
              logTaskRevocation({
                shareId: saved.shareId,
                ownerName: saved.ownerName,
                fallbackTo: 'personal',
              });
              initialContext = createPersonalTaskContext(user.id);
              showToast('info', 'Access to that task list is no longer available');
            } else {
              // Validate permission matches current share
              const currentShare = shares.find(s => s.id === saved.shareId);
              if (currentShare && currentShare.permission !== saved.permission) {
                // Permission changed, update context
                // @TEST Edge case: Permission changed while app was closed
                logTaskPermissionChange({
                  shareId: saved.shareId,
                  ownerName: saved.ownerName,
                  from: saved.permission,
                  to: currentShare.permission,
                });
                initialContext = {
                  ...saved,
                  permission: currentShare.permission,
                };
              } else {
                initialContext = saved;
              }
            }
          } catch (error) {
            console.error('[ActiveTaskContext] Error validating saved context:', error);
            // On error, fallback to personal
            // @TEST Edge case: Network failure during validation
            logTaskValidationFailure('Network or validation error', 'personal');
            initialContext = createPersonalTaskContext(user.id);
          }
        } else {
          initialContext = saved;
        }
      } else {
        // Default to personal task list
        initialContext = createPersonalTaskContext(user.id);
      }

      setActiveContextState(initialContext);
      previousContextRef.current = initialContext;
      saveActiveTaskContext(initialContext);
    };

    initializeContext();
  }, [user]);

  // Monitor permission drift for shared task lists
  useEffect(() => {
    if (!user || !activeContext || activeContext.kind !== 'shared') {
      // Clear interval if not viewing shared task list
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = null;
      }
      return;
    }

    // Set up periodic permission check
    const checkPermissions = async () => {
      if (isValidating) return; // Prevent concurrent checks

      setIsValidating(true);
      try {
        const shares = await getReceivedTaskShares(user.id);
        const currentShare = shares.find(s => s.id === activeContext.shareId);

        if (!currentShare || currentShare.status !== 'active') {
          // Share revoked, fallback to personal
          // @TEST Critical path: Permission revocation detection
          logTaskRevocation({
            shareId: activeContext.shareId,
            ownerName: activeContext.ownerName,
            fallbackTo: 'personal',
          });
          const personalContext = createPersonalTaskContext(user.id);
          setActiveContextState(personalContext);
          previousContextRef.current = personalContext;
          saveActiveTaskContext(personalContext);
          showToast('info', 'Access to that task list has been revoked');
          return;
        }

        // Check if permission changed
        if (currentShare.permission !== activeContext.permission) {
          // @TEST Critical path: Permission drift detection
          logTaskPermissionChange({
            shareId: activeContext.shareId,
            ownerName: activeContext.ownerName,
            from: activeContext.permission,
            to: currentShare.permission,
          });
          const updatedContext: ActiveTaskContext = {
            ...activeContext,
            permission: currentShare.permission,
          };
          setActiveContextState(updatedContext);
          previousContextRef.current = updatedContext;
          saveActiveTaskContext(updatedContext);

          // Notify user of permission change
          if (currentShare.permission === 'read' && activeContext.permission === 'write') {
            showToast('info', 'Task list access changed to read-only');
          }
        }
      } catch (error) {
        console.error('[ActiveTaskContext] Error checking permissions:', error);
      } finally {
        setIsValidating(false);
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkPermissions, 2000);

    // Then check periodically
    validationIntervalRef.current = setInterval(checkPermissions, PERMISSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = null;
      }
    };
  }, [user, activeContext, isValidating]);

  const setActiveContext = useCallback((context: ActiveTaskContext) => {
    // Guard: Ensure context is valid before setting
    // @TEST Edge case: Setting context without user
    if (!user) {
      console.warn('[ActiveTaskContext] Attempted to set context without user');
      return;
    }

    // Log context switch if context actually changed
    if (previousContextRef.current) {
      const previousKey = getTaskContextKey(previousContextRef.current);
      const newKey = getTaskContextKey(context);
      if (previousKey !== newKey) {
        logTaskContextSwitch({
          from: `${previousContextRef.current.kind}:${previousKey}`,
          to: `${context.kind}:${newKey}`,
          reason: 'user_action',
        });
      }
    }

    // If switching away from a shared context, clear validation interval
    if (previousContextRef.current?.kind === 'shared' && context.kind !== 'shared') {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = null;
      }
    }

    // @TEST Critical path: Context state update
    setActiveContextState(context);
    previousContextRef.current = context;
    saveActiveTaskContext(context);
  }, [user]);

  // Provide default if not initialized yet
  const effectiveContext = activeContext || (user ? createPersonalTaskContext(user.id) : null);

  if (!effectiveContext || !user) {
    return <>{children}</>;
  }

  const value: ActiveTaskContextValue = {
    activeContext: effectiveContext,
    setActiveContext,
    isReadOnly: isTaskContextReadOnly(effectiveContext),
  };

  return (
    <ActiveTaskContextContext.Provider value={value}>
      {children}
    </ActiveTaskContextContext.Provider>
  );
}

/**
 * Hook to access active task context.
 * 
 * Returns a default personal context if provider is not available.
 * This allows PlannerShell to be used on routes that don't need task context.
 */
export function useActiveTaskContext(): ActiveTaskContextValue {
  const context = useContext(ActiveTaskContextContext);
  const { user } = useAuth();

  // If context is not available, return a default personal context
  // This allows PlannerShell to work on routes that don't wrap it with the provider
  if (!context) {
    if (!user) {
      // Return a safe default that won't break if user is not available
      return {
        activeContext: {
          kind: 'personal',
          ownerUserId: '',
          label: 'My Tasks',
          permission: 'write',
        },
        setActiveContext: () => {
          console.warn('[useActiveTaskContext] Attempted to set context without provider');
        },
        isReadOnly: false,
      };
    }

    // Return default personal context for current user
    const defaultContext = createPersonalTaskContext(user.id);
    return {
      activeContext: defaultContext,
      setActiveContext: () => {
        console.warn('[useActiveTaskContext] Attempted to set context without provider');
      },
      isReadOnly: false,
    };
  }

  return context;
}
