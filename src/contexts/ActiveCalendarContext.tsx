/**
 * Active Calendar Context Provider
 * 
 * Provides the currently active calendar context to all child components.
 * 
 * Features:
 * - Permission drift monitoring (detects permission changes while app is open)
 * - Auto-fallback on revoked access
 * - State validation on mount
 * 
 * Public API Surface:
 * ===================
 * Components should consume this via `useActiveCalendarContext()` hook:
 * 
 * ```tsx
 * const { activeContext, setActiveContext, isReadOnly } = useActiveCalendarContext();
 * ```
 * 
 * DO NOT access internal implementation details:
 * - localStorage keys
 * - validation intervals
 * - permission check logic
 * 
 * All decision logic is centralized in:
 * - `activeCalendarContext.ts` (utilities)
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
  type ActiveCalendarContext,
  loadActiveCalendarContext,
  saveActiveCalendarContext,
  createPersonalContext,
  isContextReadOnly,
  getContextKey,
} from '../lib/personalSpaces/activeCalendarContext';
import { getReceivedCalendarShares } from '../lib/personalSpaces/calendarSharingService';
import { showToast } from '../components/Toast';
import {
  logContextSwitch,
  logPermissionChange,
  logRevocation,
  logValidationFailure,
} from '../lib/personalSpaces/activeCalendarContextLogger';

interface ActiveCalendarContextValue {
  activeContext: ActiveCalendarContext;
  setActiveContext: (context: ActiveCalendarContext) => void;
  isReadOnly: boolean;
}

const ActiveCalendarContextContext = createContext<ActiveCalendarContextValue | undefined>(undefined);

// Permission monitoring interval (check every 30 seconds)
const PERMISSION_CHECK_INTERVAL = 30000;

export function ActiveCalendarContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeContext, setActiveContextState] = useState<ActiveCalendarContext | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousContextRef = useRef<ActiveCalendarContext | null>(null);

  // Initialize context on mount
  useEffect(() => {
    if (!user) {
      setActiveContextState(null);
      return;
    }

    const initializeContext = async () => {
      const saved = loadActiveCalendarContext();
      let initialContext: ActiveCalendarContext;

      if (saved) {
        // Validate saved context, especially for shared calendars
        if (saved.kind === 'shared') {
          try {
            const shares = await getReceivedCalendarShares(user.id);
            const shareExists = shares.some(s => s.id === saved.shareId && s.status === 'active');
            if (!shareExists) {
              // Saved shared calendar no longer active, fallback to personal
              // @TEST Edge case: Shared calendar revoked on app reload
              logRevocation({
                shareId: saved.shareId,
                ownerName: saved.ownerName,
                fallbackTo: 'personal',
              });
              initialContext = createPersonalContext(user.id);
              showToast('info', 'Access to that calendar is no longer available');
            } else {
              // Validate permission matches current share
              const currentShare = shares.find(s => s.id === saved.shareId);
              if (currentShare && currentShare.permission !== saved.permission) {
                // Permission changed, update context
                // @TEST Edge case: Permission changed while app was closed
                logPermissionChange({
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
            console.error('[ActiveCalendarContext] Error validating saved context:', error);
            // On error, fallback to personal
            // @TEST Edge case: Network failure during validation
            logValidationFailure('Network or validation error', 'personal');
            initialContext = createPersonalContext(user.id);
          }
        } else {
          initialContext = saved;
        }
      } else {
        // Default to personal calendar
        initialContext = createPersonalContext(user.id);
      }

      setActiveContextState(initialContext);
      previousContextRef.current = initialContext;
      saveActiveCalendarContext(initialContext);
    };

    initializeContext();
  }, [user]);

  // Monitor permission drift for shared calendars
  useEffect(() => {
    if (!user || !activeContext || activeContext.kind !== 'shared') {
      // Clear interval if not viewing shared calendar
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
        const shares = await getReceivedCalendarShares(user.id);
        const currentShare = shares.find(s => s.id === activeContext.shareId);

        if (!currentShare || currentShare.status !== 'active') {
          // Share revoked, fallback to personal
          // @TEST Critical path: Permission revocation detection
          logRevocation({
            shareId: activeContext.shareId,
            ownerName: activeContext.ownerName,
            fallbackTo: 'personal',
          });
          const personalContext = createPersonalContext(user.id);
          setActiveContextState(personalContext);
          previousContextRef.current = personalContext;
          saveActiveCalendarContext(personalContext);
          showToast('info', 'Access to that calendar has been revoked');
          return;
        }

        // Check if permission changed
        if (currentShare.permission !== activeContext.permission) {
          // @TEST Critical path: Permission drift detection
          logPermissionChange({
            shareId: activeContext.shareId,
            ownerName: activeContext.ownerName,
            from: activeContext.permission,
            to: currentShare.permission,
          });
          const updatedContext: ActiveCalendarContext = {
            ...activeContext,
            permission: currentShare.permission,
          };
          setActiveContextState(updatedContext);
          previousContextRef.current = updatedContext;
          saveActiveCalendarContext(updatedContext);

          // Notify user of permission change
          if (currentShare.permission === 'read' && activeContext.permission === 'write') {
            showToast('info', 'Calendar access changed to read-only');
          }
        }
      } catch (error) {
        console.error('[ActiveCalendarContext] Error checking permissions:', error);
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

  const setActiveContext = useCallback((context: ActiveCalendarContext) => {
    // Guard: Ensure context is valid before setting
    // @TEST Edge case: Setting context without user
    if (!user) {
      console.warn('[ActiveCalendarContext] Attempted to set context without user');
      return;
    }

    // Log context switch if context actually changed
    if (previousContextRef.current) {
      const previousKey = getContextKey(previousContextRef.current);
      const newKey = getContextKey(context);
      if (previousKey !== newKey) {
        logContextSwitch({
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
    saveActiveCalendarContext(context);
  }, [user]);

  // Provide default if not initialized yet
  const effectiveContext = activeContext || (user ? createPersonalContext(user.id) : null);

  if (!effectiveContext || !user) {
    return <>{children}</>;
  }

  const value: ActiveCalendarContextValue = {
    activeContext: effectiveContext,
    setActiveContext,
    isReadOnly: isContextReadOnly(effectiveContext),
  };

  return (
    <ActiveCalendarContextContext.Provider value={value}>
      {children}
    </ActiveCalendarContextContext.Provider>
  );
}

/**
 * Hook to access active calendar context.
 * 
 * Returns a default personal context if provider is not available.
 * This allows PlannerShell to be used on routes that don't need calendar context.
 */
export function useActiveCalendarContext(): ActiveCalendarContextValue {
  const context = useContext(ActiveCalendarContextContext);
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
          label: 'My Calendar',
          permission: 'write',
        },
        setActiveContext: () => {
          console.warn('[useActiveCalendarContext] Attempted to set context without provider');
        },
        isReadOnly: false,
      };
    }

    // Return default personal context for current user
    const defaultContext = createPersonalContext(user.id);
    return {
      activeContext: defaultContext,
      setActiveContext: () => {
        console.warn('[useActiveCalendarContext] Attempted to set context without provider');
      },
      isReadOnly: false,
    };
  }

  return context;
}
