# Phase 3.3: Permission-Aware UI Architecture

**Status:** Architecture Decision  
**Date:** January 2025  
**Phase:** 3.3 of N (Schema → Services → API → Transport → Hooks → **Permission-Aware UI**)

---

## Overview

Phase 3.3 defines **how permissions influence UI structure** at different levels (routes, sections, actions). This establishes canonical patterns for permission-gated UI while maintaining clean separation of concerns.

### Context

- Phase 2.1: Permission resolver implemented (project roles, entity grants, creator rights)
- Phase 2.2: Integration into `aiPermissions.ts` (canUserAccessTrack, canUserEditTrack)
- Phase 3.2: Hook-based API consumption patterns established
- UI currently uses: `canUserAccessTrack`, `canUserEditTrack`, `canUserAccessProject`
- Resolver debug APIs exist but are NOT for normal UI flows

### Goal

Define a canonical way for UI to:
- Gate entire screens, sections, and routes
- Control component visibility vs interactivity
- Avoid permission flicker (UI rendering before permission is known)
- Avoid duplicated permission checks
- Remain declarative and predictable
- Scale as permission rules grow more complex

### Problems to Solve

1. **Permission Flicker** - UI renders before permission check completes
2. **Duplicated Checks** - Same permission checked in multiple places
3. **Inconsistent Patterns** - Different approaches across features
4. **Logic Leakage** - Permission logic scattered in components

---

## Permission Scopes

### Scope 1: Route-Level (Page Access)

**Definition:** Determines whether a user can access an entire page/route.

**Examples:**
- Can user access the "Tracks" page for a project?
- Can user view the "Team Groups" page?
- Can user access the "Permissions" settings page?

**Check Location:** Route guards (before route component renders)

**Used For:**
- Redirecting unauthorized users
- Showing 404/403 pages
- Gate entire feature areas

**Permission Functions:**
- `canUserAccessProject(userId, projectId)`
- Project-level permission checks
- Team membership checks

---

### Scope 2: Section-Level (Panel/Section Visibility)

**Definition:** Determines whether a user can see a section or panel within a page.

**Examples:**
- "Permissions" section in settings (only for project owners)
- "Group Management" panel (only for team admins)
- "Distribution" section (only if feature flag + permissions)

**Check Location:** Component-level guards or conditional rendering hooks

**Used For:**
- Hiding entire sections (not just disabling)
- Showing/hiding feature areas
- Conditional layout rendering

**Permission Functions:**
- `canUserEditTrack(userId, trackId)` (for track settings)
- Project role checks (owner/admin for settings)
- Team role checks (owner/admin for team features)

---

### Scope 3: Action-Level (Button/Control Interactivity)

**Definition:** Determines whether a user can perform a specific action.

**Examples:**
- "Create Group" button (team admin/owner)
- "Grant Permission" button (project owner)
- "Edit" button on a track (edit permission)

**Check Location:** Inline checks in components or action hooks

**Used For:**
- Hiding buttons (if user shouldn't see action)
- Disabling buttons (if user can see but not perform)
- Showing error messages (after failed attempt)

**Permission Functions:**
- `canUserEditTrack(userId, trackId)`
- `canUserAccessTrack(userId, trackId)`
- Entity-level permission checks

---

## Permission Check Locations

### Rule 1: Route Guards for Route-Level Permissions

**Location:** Route configuration or route guard components

**Pattern:**
```typescript
// Route guard component
<ProtectedRoute
  canAccess={async (params) => {
    return await canUserAccessProject(userId, params.projectId);
  }}
  redirectTo="/projects"
  fallback={<LoadingSkeleton />}
>
  <ProjectPage />
</ProtectedRoute>
```

**Responsibility:**
- Check permission before rendering route component
- Show loading state while checking
- Redirect if unauthorized
- Gate entire page access

**Allowed:**
- Route-level permission checks
- Loading states
- Redirects

**Forbidden:**
- Business logic
- Data fetching (separate concern)
- Component rendering logic

---

### Rule 2: Permission Hooks for Section-Level Permissions

**Location:** Custom hooks that wrap permission checks

**Pattern:**
```typescript
// Permission hook - MUST call permission helpers, NEVER Supabase directly
function useCanManageTeamGroups(teamId: string) {
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const check = async () => {
      setLoading(true);
      // ✅ CORRECT: Call permission helper function
      const result = await canUserManageTeamGroups(userId, teamId);
      setCanManage(result);
      setLoading(false);
    };
    check();
  }, [teamId, userId]);
  
  return { canManage, loading };
}

// Component usage
function SettingsPage() {
  const { canManage, loading } = useCanManageTeamGroups(teamId);
  
  if (loading) return <LoadingSkeleton />;
  if (!canManage) return null; // Hide section
  
  return <GroupManagementSection />;
}
```

**Responsibility:**
- Manage permission state (loading, result)
- Provide clean API for components
- Handle async permission checks

**Allowed:**
- Permission state management
- Loading state handling
- Memoization of permission checks
- Calling permission helper functions

**Forbidden:**
- ❌ Direct Supabase access (knows schema, bypasses RLS, duplicates business rules)
- ❌ Business logic
- ❌ Data fetching (use services/helpers instead)
- ❌ Component rendering (component decides what to render)

**Critical Rule:** Permission hooks may ONLY call permission helpers, never Supabase directly. This keeps the permission system single-source-of-truth.

---

### Rule 3: Inline Checks for Action-Level Permissions

**Location:** Direct calls in components (for actions) or action hooks

**Pattern:**
```typescript
// In component or action hook
function GrantPermissionButton({ trackId }: { trackId: string }) {
  const [canGrant, setCanGrant] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  
  // ✅ CORRECT: Permission check in useEffect
  useEffect(() => {
    canUserEditTrack(userId, trackId).then(result => {
      setCanGrant(result);
      setChecking(false);
    });
  }, [trackId]);
  
  // ✅ CORRECT: null === unknown (prevents flicker)
  if (checking || canGrant === null) return null; // Hide until checked
  if (!canGrant) return null; // Hide if no permission
  
  return <button>Grant Permission</button>;
}
```

**Responsibility:**
- Quick permission checks for specific actions
- Hide/show UI elements
- Enable/disable controls

**Allowed:**
- Simple permission checks in `useEffect`
- Conditional rendering based on permission state
- Action-specific logic

**Forbidden:**
- ❌ Permission checks inside render bodies (async in render breaks React rules, causes race conditions, impossible to memoize)
- ❌ Complex permission logic (use resolver if needed)
- ❌ Duplicated checks (extract to hook if reused)
- ❌ Business logic
- ❌ Direct Supabase access (must call permission helpers)

**Critical Rules:**
- Permission checks MUST be in `useEffect`, custom hooks, or route guards - NEVER in render bodies
- Permission state MUST use `boolean | null` where `null` means "unknown" (prevents flicker)

---

## Hide/Disable/Redirect Rules

### Rule 1: When to Hide UI

**Hide (Return `null` or don't render) when:**

1. **User should not see the action/section at all**
   - Not authorized to perform action
   - Feature not available to user
   - Permission check fails (not temporary)

2. **Permission state is unknown (loading)**
   - While permission check is in progress
   - Show loading skeleton instead (for sections)
   - Hide buttons/actions (for actions)

3. **Feature flag is disabled**
   - Entire feature hidden (not just disabled)
   - User shouldn't know feature exists

**Examples:**
- "Grant Permission" button hidden if user is not project owner
- "Team Groups" section hidden if user is not team admin
- "Creator Rights" section hidden if feature flag is off

**Pattern:**
```typescript
if (!canPerformAction) return null; // Hide
```

---

### Rule 2: When to Disable UI

**Disable (Show but make inactive) when:**

1. **Temporary state**
   - Form validation in progress
   - Loading state (API call in progress)
   - Awaiting user input

2. **User can see but not act (temporary)**
   - Waiting for another action to complete
   - Optimistic UI update in progress
   - Rate limiting (temporary cooldown)

3. **Conditional availability**
   - Requires prerequisites (e.g., select group before adding member)
   - Form is invalid
   - Confirmation pending

**Examples:**
- "Create Group" button disabled while form is invalid
- "Save" button disabled while saving
- "Add Member" button disabled until group is selected

**Pattern:**
```typescript
<button disabled={loading || !isValid}>
  {loading ? 'Saving...' : 'Save'}
</button>
```

---

### Rule 3: When to Redirect

**Redirect (Navigate away) when:**

1. **Route-level unauthorized access**
   - User navigated to route they cannot access
   - Permission check fails at route level
   - Permanent denial (not temporary)

2. **Resource not found or inaccessible**
   - Entity doesn't exist
   - User lost access to resource
   - 404/403 scenarios

**Examples:**
- User tries to access `/projects/123` but not a member → redirect to `/projects`
- User tries to access `/teams/456/groups` but not team member → redirect to `/teams`

**Pattern:**
```typescript
// In route guard
if (!canAccess) {
  navigate(redirectTo);
  return null;
}
```

---

### Rule 4: When to Show Error States

**Show error message when:**

1. **Action attempted but failed**
   - User clicked button, API returned error
   - Permission denied after action attempt
   - Validation failed

2. **Permanent failure (not temporary)**
   - User tried to perform action, authorization failed
   - Not a loading state, not a temporary state
   - Action was attempted, permission denied

**Examples:**
- User clicks "Create Group" but not team admin → show error message
- User tries to grant permission but not project owner → show error message

**Pattern:**
```typescript
const { error } = useCreateGroup();
if (error) {
  return <ErrorMessage>{error}</ErrorMessage>;
}
```

---

## Flicker Prevention Strategy

### Problem

UI renders before permission check completes, causing:
- Elements appearing then disappearing
- Layout shifts
- Poor user experience

### Solution 1: Loading States

**For Route-Level:**
- Route guard shows loading skeleton before permission check
- Route component doesn't render until permission confirmed

**For Section-Level:**
- Permission hook returns `loading` state
- Component shows skeleton while `loading === true`
- Component renders/hides only after permission confirmed

**For Action-Level:**
- Hide button until permission check completes
- Or show disabled state with loading indicator

### Solution 2: Suspense Boundaries (Future)

**If React Suspense is adopted:**
- Wrap permission-gated sections in Suspense
- Throw promises from permission checks
- React handles loading states automatically

**Current Approach (No Suspense):**
- Use explicit loading states
- Hide UI until permission confirmed
- Show skeletons for sections

### Solution 3: Caching Expectations (Future Consideration)

**Note:** Permission hooks currently re-check permissions on mount and dependency changes. This is correct and safe.

**Future Optimization (Non-Binding):**
- Permission hooks MAY internally cache results (per entity + user combination)
- Cache MUST invalidate on:
  - Auth state changes (user login/logout/switch)
  - Entity changes (entity deleted, permissions modified)
  - Dependency changes (teamId, trackId, etc.)
- Cache SHOULD NOT be shared across components (each hook instance manages its own state)
- If caching is implemented, it must remain transparent to components (hook API unchanged)

**Current Rule:** Do not implement caching yet - current behavior (re-check on mount) is correct. This note prevents future "optimization" that might break correctness.

### Solution 4: Optimistic Permission Checks

**When to Use:**
- Permission is very likely to be granted
- User already has higher-level permission
- Non-critical UI elements

**When NOT to Use:**
- Critical actions (delete, revoke permissions)
- Unknown permission state
- First-time access

**Guideline:** Default to waiting for permission check. Only use optimistic rendering when explicitly justified.

### Rule: Never Render Permission-Gated UI Until Permission is Known

**Permission State Standard:**
- `null` = unknown/unresolved (hide UI)
- `true` = permission granted (show UI)
- `false` = permission denied (hide UI)

**Type Definition:**
```typescript
type PermissionState = boolean | null;
```

**Rule:** Permission hooks MUST return `null` while permission is unresolved. This enables flicker prevention and easier Suspense adoption later.

**Pattern:**
```typescript
// ❌ WRONG: Renders then hides (flicker)
if (canEdit) {
  return <EditButton />;
}

// ❌ WRONG: Permission check in render body (async in render breaks React)
if (await canUserEditTrack(userId, trackId)) {
  return <EditButton />;
}

// ✅ CORRECT: Wait for permission check (null means unknown)
if (loading || canEdit === null) return null; // Or skeleton
if (!canEdit) return null;
return <EditButton />;
```

---

## Examples

### Example 1: Route Guard (Route-Level Permission)

#### Route Guard Component

```typescript
// src/components/guards/ProjectRouteGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { canUserAccessProject } from '@/lib/guardrails/ai/aiPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectPageSkeleton } from '@/components/skeletons/ProjectPageSkeleton';

interface ProjectRouteGuardProps {
  children: React.ReactNode;
}

export function ProjectRouteGuard({ children }: ProjectRouteGuardProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!projectId || !user?.id) {
        setCanAccess(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const hasAccess = await canUserAccessProject(user.id, projectId);
      setCanAccess(hasAccess);
      setLoading(false);

      if (!hasAccess) {
        // Redirect if no access
        navigate('/projects', { replace: true });
      }
    };

    checkAccess();
  }, [projectId, user?.id, navigate]);

  // Show skeleton while checking
  if (loading || canAccess === null) {
    return <ProjectPageSkeleton />;
  }

  // Redirect handled in useEffect, but guard return for safety
  if (!canAccess) {
    return null;
  }

  return <>{children}</>;
}
```

#### Route Configuration

```typescript
// src/App.tsx or route config
<Route
  path="/projects/:projectId/*"
  element={
    <ProjectRouteGuard>
      <ProjectLayout />
    </ProjectRouteGuard>
  }
/>
```

**Key Points:**
- Permission checked before route component renders
- Loading skeleton shown during check
- Redirect if unauthorized
- No flicker (component doesn't render until permission confirmed)

---

### Example 2: Section-Level Permission (Permission Hook)

#### Permission Helper Function

```typescript
// src/lib/permissions/teamPermissions.ts
// Permission helper functions live in the service/permission layer
export async function canUserManageTeamGroups(
  userId: string,
  teamId: string
): Promise<boolean> {
  // Encapsulated logic here - checks team_members table
  // Handles RLS, business rules, schema details
  // UI hooks must call this, never access Supabase directly
}
```

#### Permission Hook

```typescript
// src/hooks/permissions/useCanManageTeamGroups.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canUserManageTeamGroups } from '@/lib/permissions/teamPermissions';

export function useCanManageTeamGroups(teamId: string) {
  const { user } = useAuth();
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!teamId || !user?.id) {
        setCanManage(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      // ✅ CORRECT: Call permission helper, not Supabase directly
      const result = await canUserManageTeamGroups(user.id, teamId);
      setCanManage(result);
      setLoading(false);
    };

    check();
  }, [teamId, user?.id]);

  return { canManage, loading };
}
```

#### Component Usage

```typescript
// src/components/teams/TeamSettingsPage.tsx
import { useCanManageTeamGroups } from '@/hooks/permissions/useCanManageTeamGroups';
import { TeamSettingsSkeleton } from '@/components/skeletons/TeamSettingsSkeleton';

export function TeamSettingsPage({ teamId }: { teamId: string }) {
  const { canManage, loading } = useCanManageTeamGroups(teamId);

  if (loading) {
    return <TeamSettingsSkeleton />;
  }

  return (
    <div>
      <h1>Team Settings</h1>
      
      {/* General settings - all members can see */}
      <GeneralSettingsSection teamId={teamId} />
      
      {/* Group management - only admins/owners */}
      {canManage && <GroupManagementSection teamId={teamId} />}
    </div>
  );
}
```

**Key Points:**
- Permission hook manages state (loading, result)
- Component shows skeleton while loading
- Section hidden (not disabled) if no permission
- No flicker (section doesn't render until permission confirmed)

---

### Example 3: Action-Level Permission (Inline Check)

#### Component with Permission Check

```typescript
// src/components/tracks/TrackActions.tsx
import { useState, useEffect } from 'react';
import { canUserEditTrack } from '@/lib/guardrails/ai/aiPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateGroup } from '@/hooks/groups/useCreateGroup';

export function TrackActions({ trackId }: { trackId: string }) {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!trackId || !user?.id) {
        setCanEdit(false);
        setChecking(false);
        return;
      }

      setChecking(true);
      const result = await canUserEditTrack(user.id, trackId);
      setCanEdit(result);
      setChecking(false);
    };

    check();
  }, [trackId, user?.id]);

  // Hide actions until permission checked (prevents flicker)
  if (checking) {
    return null;
  }

  // Hide edit button if no permission
  if (!canEdit) {
    return (
      <div>
        <ViewButton trackId={trackId} />
        {/* Other view-only actions */}
      </div>
    );
  }

  // Show all actions if can edit
  return (
    <div>
      <ViewButton trackId={trackId} />
      <EditButton trackId={trackId} />
      <DeleteButton trackId={trackId} />
      {/* Other edit actions */}
    </div>
  );
}
```

#### Alternative: Permission Hook for Reusability

```typescript
// src/hooks/permissions/useCanEditTrack.ts
import { canUserEditTrack } from '@/lib/guardrails/ai/aiPermissions';

export function useCanEditTrack(trackId: string) {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!trackId || !user?.id) {
        setCanEdit(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      // ✅ CORRECT: Call permission helper function
      const result = await canUserEditTrack(user.id, trackId);
      setCanEdit(result);
      setLoading(false);
    };

    check();
  }, [trackId, user?.id]);

  return { canEdit, loading };
}

// Component usage
export function TrackActions({ trackId }: { trackId: string }) {
  const { canEdit, loading } = useCanEditTrack(trackId);

  // ✅ CORRECT: null means unknown (hide until resolved)
  if (loading || canEdit === null) return null;
  if (!canEdit) {
    return <ViewButton trackId={trackId} />;
  }

  return (
    <div>
      <ViewButton trackId={trackId} />
      <EditButton trackId={trackId} />
    </div>
  );
}
```

**Key Points:**
- Permission check in component or reusable hook
- Hide until permission confirmed (prevents flicker)
- Hide button if no permission (not disable)
- Clean, declarative component

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Inline Resolver Calls in UI

```typescript
// ❌ WRONG: Calling resolver directly from UI
function GrantButton() {
  const [canGrant, setCanGrant] = useState(false);
  
  useEffect(() => {
    resolveEntityPermissions({ userId, entityType, entityId })
      .then(result => setCanGrant(result.canEdit));
  }, []);
}
```

**Problem:** Resolver is for debugging, not normal UI flows. Use permission functions instead.

**Correct:** Use `canUserEditTrack` or similar permission functions.

---

### ❌ Anti-Pattern 2: Permission Logic in Components

```typescript
// ❌ WRONG: Permission logic in component
function GrantButton() {
  const checkPermission = async () => {
    const projectRole = await getUserProjectRole(userId, projectId);
    const creatorRights = await checkCreatorRights(...);
    const grants = await listEntityPermissions(...);
    // Complex logic here...
  };
}
```

**Problem:** Permission logic scattered, hard to maintain, duplicates resolver logic.

**Correct:** Use existing permission functions (`canUserEditTrack`, etc.). Resolver handles complexity.

---

### ❌ Anti-Pattern 3: Hardcoded Role Checks in Components

```typescript
// ❌ WRONG: Hardcoded role check
function AdminSection() {
  if (user.role === 'admin' || user.role === 'owner') {
    return <AdminPanel />;
  }
}
```

**Problem:** Bypasses permission system, doesn't account for entity-level permissions, hard to maintain.

**Correct:** Use permission functions that consider all permission sources (project, entity, creator).

---

### ❌ Anti-Pattern 4: Mixed Permission Patterns

```typescript
// ❌ WRONG: Different patterns in same feature
function SettingsPage() {
  // Pattern 1: Direct check
  if (user.role === 'admin') return <AdminSection />;
  
  // Pattern 2: Hook
  const { canEdit } = useCanEditTrack(trackId);
  
  // Pattern 3: Resolver
  const resolved = await resolveEntityPermissions(...);
}
```

**Problem:** Inconsistent, hard to maintain, confusing for developers.

**Correct:** Use consistent pattern (hooks for sections, inline for actions, guards for routes).

---

### ❌ Anti-Pattern 5: Permission Checks in Render Bodies

```typescript
// ❌ WRONG: Async permission check in render body
function EditButton({ trackId }: { trackId: string }) {
  // Breaks React rules: async in render
  if (await canUserEditTrack(userId, trackId)) {
    return <button>Edit</button>;
  }
  return null;
}

// ❌ WRONG: Permission check in render (race conditions)
function EditButton({ trackId }: { trackId: string }) {
  const [canEdit, setCanEdit] = useState(false);
  
  // Wrong: calling async function in render
  canUserEditTrack(userId, trackId).then(setCanEdit);
  
  return canEdit ? <button>Edit</button> : null;
}
```

**Problem:** 
- Breaks React rules (async in render)
- Causes race conditions
- Impossible to memoize
- UI flickers, poor UX, layout shifts

**Correct:** Permission checks MUST be in `useEffect`, custom hooks, or route guards - NEVER in render bodies.

```typescript
// ✅ CORRECT: Permission check in useEffect
function EditButton({ trackId }: { trackId: string }) {
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  
  useEffect(() => {
    canUserEditTrack(userId, trackId).then(setCanEdit);
  }, [trackId]);
  
  if (canEdit === null) return null; // Hide until checked
  if (!canEdit) return null;
  return <button>Edit</button>;
}
```

---

### ❌ Anti-Pattern 6: Rendering Before Permission Check Completes

```typescript
// ❌ WRONG: Renders then hides (flicker)
function EditButton() {
  const [canEdit, setCanEdit] = useState(false);
  
  useEffect(() => {
    canUserEditTrack(userId, trackId).then(setCanEdit);
  }, []);
  
  // Renders null initially, then button (flicker if state starts as false)
  return canEdit ? <button>Edit</button> : null;
}
```

**Problem:** UI flickers, poor UX, layout shifts.

**Correct:** Use `null` for unknown state, hide until permission confirmed (see Flicker Prevention).

---

### ❌ Anti-Pattern 7: Disabling Instead of Hiding

```typescript
// ❌ WRONG: Disable button user can't use
function GrantButton() {
  const canGrant = false; // User is not project owner
  
  return (
    <button disabled={!canGrant}>
      Grant Permission
    </button>
  );
}
```

**Problem:** Shows action user can't perform, confusing UX.

**Correct:** Hide button if user can't perform action (see Hide/Disable Rules).

---

### ❌ Anti-Pattern 8: Direct Supabase Access in Permission Hooks

```typescript
// ❌ WRONG: Permission hook accessing Supabase directly
export function useCanManageTeamGroups(teamId: string) {
  const [canManage, setCanManage] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Bypasses permission layer, knows schema, duplicates business rules
    const { data } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();
    
    setCanManage(data?.status === 'active' && data?.role === 'owner');
  }, [teamId]);
  
  return { canManage };
}
```

**Problem:**
- UI knows schema details
- Bypasses RLS strategy layering
- Duplicates business rules
- If rules change → UI silently becomes wrong
- Violates single-source-of-truth principle

**Correct:** Permission hooks must ONLY call permission helper functions, never Supabase directly.

```typescript
// ✅ CORRECT: Call permission helper
import { canUserManageTeamGroups } from '@/lib/permissions/teamPermissions';

export function useCanManageTeamGroups(teamId: string) {
  const [canManage, setCanManage] = useState<boolean | null>(null);
  
  useEffect(() => {
    canUserManageTeamGroups(userId, teamId).then(setCanManage);
  }, [teamId]);
  
  return { canManage };
}
```

---

## Summary

### Permission Scopes

1. **Route-Level:** Route guards, gate entire pages
2. **Section-Level:** Permission hooks, gate sections/panels
3. **Action-Level:** Inline checks or action hooks, gate buttons/controls

### Check Locations

1. **Route Guards:** Route-level permissions
2. **Permission Hooks:** Section-level permissions (reusable)
3. **Inline Checks:** Action-level permissions (simple cases)

### Hide/Disable/Redirect Rules

- **Hide:** User shouldn't see action/section (not authorized, loading, feature disabled)
- **Disable:** Temporary state (loading, invalid form, prerequisites)
- **Redirect:** Route-level unauthorized access
- **Error:** Action attempted but failed (permission denied after attempt)

### Flicker Prevention

- Show loading states/skeletons while checking
- Hide UI until permission confirmed
- Never render permission-gated UI until permission is known

### Key Rules

1. **Permission Hooks:** May ONLY call permission helpers, never Supabase directly (keeps permission system single-source-of-truth)
2. **Permission State:** MUST use `boolean | null` where `null` means "unknown/unresolved" (enables flicker prevention)
3. **Permission Checks:** MUST be in `useEffect`, custom hooks, or route guards - NEVER in render bodies (breaks React rules, causes race conditions)
4. **Use Existing Functions:** Use permission functions (`canUserAccessTrack`, `canUserEditTrack`, etc.), not resolver debug APIs
5. **No Duplication:** Do NOT duplicate permission logic
6. **Consistent Patterns:** Consistent patterns across features
7. **Hide vs Disable:** Hide (not disable) when user can't perform action
8. **Flicker Prevention:** Prevent flicker with loading states and `null` for unknown state
9. **Caching (Future):** Permission hooks MAY internally cache results (per entity + user) but MUST invalidate on auth or entity change

### Benefits

- ✅ Clean, declarative UI components
- ✅ Consistent permission patterns
- ✅ No permission flicker
- ✅ Reusable permission hooks
- ✅ Scalable as rules grow complex

---

**End of Permission-Aware UI Architecture Document**
