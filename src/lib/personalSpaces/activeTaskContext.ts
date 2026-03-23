/**
 * Active Task Context
 * 
 * Represents the currently active task scope being viewed in the Planner.
 * Supports personal, household, and shared task lists.
 * 
 * Architecture Overview:
 * ======================
 * This system solves the problem of managing which task scope is currently active
 * across the Planner application, supporting multi-scope views (personal,
 * household, shared) with permission-aware behavior.
 * 
 * What it DOES:
 * - Centralizes active task scope state management
 * - Provides permission-aware read-only/write access control
 * - Persists context across page reloads via localStorage
 * - Monitors permission drift and auto-fallbacks on revoked access
 * - Provides utilities for converting context to TaskScope (for task loading)
 * 
 * What it DOES NOT:
 * - Handle task CRUD operations (that's eventTasksService.ts)
 * - Manage task sharing creation/invites (future feature)
 * - Enforce server-side permissions (that's RLS policies)
 * - Handle offline sync or conflict resolution
 * 
 * Integration:
 * ============
 * Components should consume this context via `useActiveTaskContext()` hook to:
 * - Check read-only state: `const { isReadOnly } = useActiveTaskContext()`
 * - Get owner ID for data scoping: `activeContext.ownerUserId` or `activeContext.householdId`
 * - Convert to TaskScope for task queries: `contextToScope(activeContext, userId)`
 * 
 * DO NOT access internal implementation details (localStorage keys, validation
 * intervals, etc.). The public API surface is:
 * - `ActiveTaskContext` type
 * - `useActiveTaskContext()` hook
 * - Utility functions: `contextToScope()`, `getContextKey()`, `getPermissionLabel()`
 * 
 * State Persistence:
 * - Context is persisted to localStorage for session continuity
 * - Pull-to-refresh does NOT reset the context (it's stored in localStorage)
 * - Context is validated on mount to ensure shared task lists are still accessible
 */

export type TaskScope = 
  | { userId: string }
  | { householdId: string };

export type ActiveTaskContext =
  | { kind: 'personal'; ownerUserId: string; label: 'My Tasks'; permission: 'write' }
  | { kind: 'household'; householdId: string; label: 'Household'; permission: 'write' }
  | { kind: 'shared'; ownerUserId: string; ownerName: string; shareId: string; permission: 'read' | 'write' };

const STORAGE_KEY = 'planner_active_task_context';

/**
 * Save active task context to localStorage
 */
export function saveActiveTaskContext(context: ActiveTaskContext): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.error('[activeTaskContext] Error saving context:', error);
  }
}

/**
 * Load active task context from localStorage
 */
export function loadActiveTaskContext(): ActiveTaskContext | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Validate the structure
    if (
      parsed.kind === 'personal' && 
      parsed.ownerUserId && 
      parsed.label === 'My Tasks' &&
      parsed.permission === 'write'
    ) {
      return parsed as ActiveTaskContext;
    }
    
    if (
      parsed.kind === 'household' && 
      parsed.householdId && 
      parsed.label === 'Household' &&
      parsed.permission === 'write'
    ) {
      return parsed as ActiveTaskContext;
    }
    
    if (
      parsed.kind === 'shared' && 
      parsed.ownerUserId && 
      parsed.ownerName && 
      parsed.shareId &&
      (parsed.permission === 'read' || parsed.permission === 'write')
    ) {
      return parsed as ActiveTaskContext;
    }
    
    // Invalid structure, clear it
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch (error) {
    console.error('[activeTaskContext] Error loading context:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Create default personal task context
 */
export function createPersonalTaskContext(userId: string): ActiveTaskContext {
  return {
    kind: 'personal',
    ownerUserId: userId,
    label: 'My Tasks',
    permission: 'write',
  };
}

/**
 * Check if a context is read-only
 * 
 * @TEST Critical path: Permission enforcement depends on this
 */
export function isTaskContextReadOnly(context: ActiveTaskContext): boolean {
  return context.kind === 'shared' && context.permission === 'read';
}

/**
 * Convert ActiveTaskContext to TaskScope for task loading
 * 
 * This is the centralized decision surface for determining which tasks
 * to load based on the active context.
 * 
 * @TEST Critical path: Wrong scope = wrong tasks loaded (data integrity issue)
 * @TEST Edge cases:
 * - Shared task list should load owner's tasks (not viewer's)
 * - Household context must include householdId
 * - Personal context must include userId
 */
export function contextToTaskScope(
  context: ActiveTaskContext,
  currentUserId: string
): TaskScope {
  switch (context.kind) {
    case 'personal':
      return { userId: context.ownerUserId };
    case 'household':
      return { householdId: context.householdId };
    case 'shared':
      // For shared task lists, load tasks for the owner's scope
      // The service function will handle visibility based on share permissions
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
export function getTaskContextKey(context: ActiveTaskContext): string {
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
 * label for shared task lists.
 * 
 * @TEST Low priority: Display only, no data integrity impact
 */
export function getTaskPermissionLabel(context: ActiveTaskContext): string | null {
  if (context.kind === 'shared') {
    return context.permission === 'read' ? 'Read-only' : 'Write access';
  }
  return null;
}
