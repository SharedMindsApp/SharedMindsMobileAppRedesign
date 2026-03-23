/**
 * Active Calendar Context
 * 
 * Represents the currently active calendar being viewed in the Planner.
 * Supports personal, household, and shared calendars.
 * 
 * Architecture Overview:
 * ======================
 * This system solves the problem of managing which calendar is currently active
 * across the Planner application, supporting multi-calendar views (personal,
 * household, shared) with permission-aware behavior.
 * 
 * What it DOES:
 * - Centralizes active calendar state management
 * - Provides permission-aware read-only/write access control
 * - Persists context across page reloads via localStorage
 * - Monitors permission drift and auto-fallbacks on revoked access
 * - Provides utilities for converting context to CalendarScope (for event loading)
 * 
 * What it DOES NOT:
 * - Handle calendar event CRUD operations (that's calendarService.ts)
 * - Manage calendar sharing creation/invites (that's calendarSharingService.ts)
 * - Enforce server-side permissions (that's RLS policies)
 * - Handle offline sync or conflict resolution
 * 
 * Integration:
 * ============
 * Other features (Tasks, Notes, etc.) should consume this context via
 * `useActiveCalendarContext()` hook to:
 * - Check read-only state: `const { isReadOnly } = useActiveCalendarContext()`
 * - Get owner ID for data scoping: `activeContext.ownerUserId` or `activeContext.householdId`
 * - Convert to CalendarScope for event queries: `contextToScope(activeContext, userId)`
 * 
 * DO NOT access internal implementation details (localStorage keys, validation
 * intervals, etc.). The public API surface is:
 * - `ActiveCalendarContext` type
 * - `useActiveCalendarContext()` hook
 * - Utility functions: `contextToScope()`, `getContextKey()`, `getPermissionLabel()`
 * 
 * State Persistence:
 * - Context is persisted to localStorage for session continuity
 * - Pull-to-refresh does NOT reset the context (it's stored in localStorage)
 * - Context is validated on mount to ensure shared calendars are still accessible
 */

import type { CalendarScope } from '../../components/calendarCore/types';

export type ActiveCalendarContext =
  | { kind: 'personal'; ownerUserId: string; label: 'My Calendar'; permission: 'write' }
  | { kind: 'household'; householdId: string; label: 'Household'; permission: 'write' }
  | { kind: 'shared'; ownerUserId: string; ownerName: string; shareId: string; permission: 'read' | 'write' };

const STORAGE_KEY = 'planner_active_calendar_context';

/**
 * Save active calendar context to localStorage
 */
export function saveActiveCalendarContext(context: ActiveCalendarContext): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.error('[activeCalendarContext] Error saving context:', error);
  }
}

/**
 * Load active calendar context from localStorage
 */
export function loadActiveCalendarContext(): ActiveCalendarContext | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate the structure
    if (
      parsed.kind === 'personal' && 
      parsed.ownerUserId && 
      parsed.label === 'My Calendar' &&
      parsed.permission === 'write'
    ) {
      return parsed as ActiveCalendarContext;
    }
    
    if (
      parsed.kind === 'household' && 
      parsed.householdId && 
      parsed.label === 'Household' &&
      parsed.permission === 'write'
    ) {
      return parsed as ActiveCalendarContext;
    }
    
    if (
      parsed.kind === 'shared' && 
      parsed.ownerUserId && 
      parsed.ownerName && 
      parsed.shareId &&
      (parsed.permission === 'read' || parsed.permission === 'write')
    ) {
      return parsed as ActiveCalendarContext;
    }
    
    // Invalid structure, clear it
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch (error) {
    console.error('[activeCalendarContext] Error loading context:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Create default personal calendar context
 */
export function createPersonalContext(userId: string): ActiveCalendarContext {
  return {
    kind: 'personal',
    ownerUserId: userId,
    label: 'My Calendar',
    permission: 'write',
  };
}

/**
 * Check if a context is read-only
 * 
 * @TEST Critical path: Permission enforcement depends on this
 */
export function isContextReadOnly(context: ActiveCalendarContext): boolean {
  return context.kind === 'shared' && context.permission === 'read';
}

/**
 * Convert ActiveCalendarContext to CalendarScope for event loading
 * 
 * This is the centralized decision surface for determining which calendar
 * events to load based on the active context.
 * 
 * @TEST Critical path: Wrong scope = wrong events loaded (data integrity issue)
 * @TEST Edge cases:
 * - Shared calendar should load owner's events (not viewer's)
 * - Household context must include householdId
 * - Personal context must include userId
 */
export function contextToScope(
  context: ActiveCalendarContext,
  currentUserId: string
): CalendarScope {
  switch (context.kind) {
    case 'personal':
      return { userId: context.ownerUserId };
    case 'household':
      return { householdId: context.householdId };
    case 'shared':
      // For shared calendars, load events for the owner's calendar
      // The RPC function will handle visibility based on share permissions
      return { userId: context.ownerUserId };
    default:
      // Fallback: should never happen with discriminated union, but safe default
      return { userId: currentUserId };
  }
}

/**
 * Generate a unique key for a context (for change detection)
 * 
 * Used to detect when the active context has actually changed vs. just
 * being re-rendered with the same context object.
 * 
 * @TEST Critical path: Wrong key = stale state after context switch
 */
export function getContextKey(context: ActiveCalendarContext): string {
  if (context.kind === 'shared') {
    return `${context.kind}-${context.shareId}`;
  } else if (context.kind === 'personal') {
    return `${context.kind}-${context.ownerUserId}`;
  } else {
    return `${context.kind}-${context.householdId}`;
  }
}

/**
 * Get human-readable permission label for a context
 * 
 * Returns null for personal/household (always write), or permission
 * label for shared calendars.
 * 
 * @TEST Low priority: Display only, no data integrity impact
 */
export function getPermissionLabel(context: ActiveCalendarContext): string | null {
  if (context.kind === 'shared') {
    return context.permission === 'read' ? 'Read-only' : 'Write access';
  }
  return null;
}
