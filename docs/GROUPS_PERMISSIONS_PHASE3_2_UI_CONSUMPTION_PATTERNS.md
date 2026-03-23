# Phase 3.2: UI API Consumption & Hook Patterns

**Status:** Architecture Decision  
**Date:** January 2025  
**Phase:** 3.2 of N (Schema → Services → API Layer → Transport → **UI Consumption Patterns**)

---

## Overview

Phase 3.2 defines **how UI components consume API handlers** from Phase 3.1. This establishes the canonical pattern for UI code to call APIs while maintaining clean separation of concerns.

### Context

- Phase 3.1 established: UI calls API handlers via direct function imports
- API handlers return `ApiResponse<T>` with `success`, `data`, `error`
- Services are never imported by UI
- Feature flags are checked in API handlers

### Goal

Define a single, canonical UI consumption pattern that:
- Keeps UI components declarative (not orchestration layers)
- Centralizes loading/error state management
- Prevents permission logic from leaking into components
- Encourages reuse across the app
- Works cleanly with feature flags and resolver-based permissions
- Scales as the app grows

### Problems to Solve

1. **Logic Duplication** - Multiple components doing the same API call + error handling
2. **Inconsistent State** - Different loading/error patterns across components
3. **Permission Leaks** - Permission logic scattered in components
4. **Orchestration Layers** - Components becoming too complex

---

## Chosen Consumption Pattern

### Decision: **Domain-Specific Custom React Hooks**

**Pattern Structure:**
- One hook per domain/operation (e.g., `useCreateGroup`, `useGrantEntityPermission`)
- Hooks live in `src/hooks/` organized by domain
- Hooks unwrap `ApiResponse<T>` into `{ data, loading, error, action }` pattern
- Components call hooks, hooks call API handlers

**Rationale:**

1. **Separation of Concerns**
   - Components: Declarative UI rendering
   - Hooks: State management + API orchestration
   - API Handlers: Request/response handling
   - Services: Business logic

2. **Reusability**
   - Hook logic reused across multiple components
   - Consistent behavior everywhere
   - Easy to test hooks independently

3. **Centralized State Management**
   - Loading/error state in one place
   - No duplication across components
   - Easier to debug and maintain

4. **Type Safety**
   - Full TypeScript support
   - Domain-specific hooks maintain type safety
   - Generic hooks lose type information

5. **Scalability**
   - Easy to add new hooks as features grow
   - Clear organization by domain
   - No single massive hook file

### Alternatives Considered and Rejected

**Direct API Calls in Components:**
- ❌ Logic duplication across components
- ❌ Inconsistent error handling
- ❌ Components become orchestration layers

**Generic Hook (useApiCall):**
- ❌ Loses type safety
- ❌ Less discoverable
- ❌ Harder to add domain-specific behavior

**Service Layer Hooks:**
- ❌ Bypasses API layer
- ❌ Violates Phase 3.1 rules
- ❌ No auth/validation layer

---

## Hook Contract Rules

### Rule 1: Hook Naming Convention

**Pattern:** `use{Action}{Entity}` or `use{Entity}{Action}`

**Examples:**
- `useCreateGroup` (action + entity)
- `useListGroups` (action + entity)
- `useGrantEntityPermission` (action + entity)
- `useGroupMembers` (entity + implicit read)

**Guidelines:**
- Use action verbs for mutating hooks (`useCreate`, `useUpdate`, `useDelete`)
- Use entity names for query hooks (`useGroups`, `useEntityPermissions`)
- Be specific: `useCreateGroup` not `useCreate`

### Rule 2: Return Value Shape

**All hooks MUST return:**

```typescript
interface HookResult<T> {
  // Data (only present on success)
  data: T | null;
  
  // Loading state
  loading: boolean;
  
  // Error (only present on failure)
  error: string | null;
  
  // Action function (for mutations)
  action: (...args: any[]) => Promise<T | null>;
  
  // Optional: Refresh/reload function (for queries)
  refresh?: () => Promise<void>;
}
```

**Key Points:**
- `data` is `T | null` (null until success, then populated)
- `loading` is boolean (true during API call)
- `error` is `string | null` (null until error, then error message)
- `action` is async function that returns `T | null`
- Hooks **never throw** - errors are returned in `error` field

### Rule 3: Error Handling

**Hooks MUST:**
- Catch all errors from API handlers
- Set `error` state with user-friendly message
- Never throw errors (return error state instead)
- Clear error state when action is retried

**Example:**
```typescript
const action = async (...args) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await apiHandler(...args);
    if (response.success) {
      setData(response.data);
      setLoading(false);
      return response.data;
    } else {
      setError(response.error || 'An error occurred');
      setLoading(false);
      return null;
    }
  } catch (err) {
    setError('An unexpected error occurred');
    setLoading(false);
    return null;
  }
};
```

### Rule 4: Loading State Management

**Hooks MUST:**
- Set `loading = true` before API call
- Set `loading = false` after API call (success or error)
- Clear error state when new action starts
- Handle concurrent calls (cancel previous if needed, or queue)

### Rule 5: Query Hooks vs Mutation Hooks

**Query Hooks (Read Operations):**
- Load data on mount (via `useEffect`)
- Return `data`, `loading`, `error`, `refresh`
- Example: `useGroups(teamId)`, `useEntityPermissions(entityType, entityId)`

**Mutation Hooks (Write Operations):**
- Do NOT load data on mount
- Return `data`, `loading`, `error`, `action`
- Action must be called explicitly by component
- Example: `useCreateGroup()`, `useGrantEntityPermission()`

### Rule 6: Hook Location

**File Structure:**
```
src/hooks/
├── groups/
│   ├── useGroups.ts          # List groups
│   ├── useCreateGroup.ts     # Create group
│   ├── useGroupMembers.ts    # List members
│   └── useGroupMembership.ts # Membership actions
├── permissions/
│   ├── useEntityPermissions.ts
│   ├── useGrantPermission.ts
│   └── useCreatorRights.ts
└── distribution/
    ├── useTaskDistribution.ts
    └── useEventDistribution.ts
```

**One hook per file** for clarity and discoverability.

---

## Permission-Aware UI Rules

### Rule 1: Permission Checks for Rendering

**UI components MUST use existing permission functions for conditional rendering:**

```typescript
// ✅ CORRECT: Use existing permission checks
import { canUserAccessTrack } from '@/lib/guardrails/ai/aiPermissions';

const canEdit = await canUserEditTrack(userId, trackId);
if (canEdit) {
  // Show edit button
}
```

**Do NOT:**
- Call resolver directly from UI
- Duplicate permission logic in components
- Use resolver debug APIs for normal flows

### Rule 2: Hide vs Disable vs Error

**Hide (No UI Element):**
- User should not see the action at all
- Permission check fails (no access)
- Example: "Grant Permission" button hidden if user is not project owner

**Disable (UI Element Visible but Inactive):**
- User can see the action but cannot perform it
- Temporary state (e.g., loading, pending validation)
- Example: "Create Group" button disabled while form is invalid

**Error (Show Error Message):**
- User attempted action but authorization failed
- API handler returns authorization error
- Show error message, don't disable (action already attempted)

### Rule 3: Optimistic Rendering

**When to Optimistically Render:**
- ✅ Non-critical actions (e.g., UI state changes)
- ✅ Actions that can be easily reverted
- ✅ When permission is already checked (user owns entity)

**When to Wait for Permission Check:**
- ❌ Critical actions (e.g., delete, revoke permissions)
- ❌ Actions that affect other users
- ❌ When permission state is unknown

**Guideline:** Default to waiting for permission checks. Only use optimistic rendering when explicitly justified.

### Rule 4: Resolver Debug APIs

**Resolver debug APIs (`resolvePermissionsApi`) are for:**
- Debugging permission issues
- Admin/debugging interfaces
- Understanding permission resolution

**Resolver debug APIs are NOT for:**
- Normal UI permission checks
- Conditional rendering
- Access control decisions

**UI should use:**
- `canUserAccessTrack`, `canUserEditTrack` for tracks
- Project-level permission checks for projects
- Service-layer permission functions (not resolver directly)

---

## Examples

### Example 1: Write Action (Create Group)

#### Hook

```typescript
// src/hooks/groups/useCreateGroup.ts
import { useState } from 'react';
import { createGroupApi, type TeamGroup } from '@/lib/api/groups/groupsApi';

export function useCreateGroup() {
  const [data, setData] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = async (
    teamId: string,
    name: string,
    description?: string
  ): Promise<TeamGroup | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await createGroupApi({
        teamId,
        name,
        description,
      });

      if (response.success) {
        setData(response.data!);
        setLoading(false);
        return response.data!;
      } else {
        setError(response.error || 'Failed to create group');
        setLoading(false);
        return null;
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
      return null;
    }
  };

  return {
    data,
    loading,
    error,
    createGroup,
  };
}
```

#### Component Usage

```typescript
// src/components/groups/CreateGroupForm.tsx
import { useState } from 'react';
import { useCreateGroup } from '@/hooks/groups/useCreateGroup';

export function CreateGroupForm({ teamId, onSuccess }: {
  teamId: string;
  onSuccess?: (group: TeamGroup) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { createGroup, loading, error } = useCreateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newGroup = await createGroup(teamId, name, description);
    if (newGroup) {
      // Success
      setName('');
      setDescription('');
      onSuccess?.(newGroup);
    }
    // Error is already set in hook
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        disabled={loading}
        required
      />
      
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        disabled={loading}
      />
      
      <button type="submit" disabled={loading || !name.trim()}>
        {loading ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  );
}
```

**Key Points:**
- Hook manages loading/error state
- Component is declarative (form UI only)
- No service imports
- No business logic in component

---

### Example 2: Permission-Sensitive Action (Grant Permission Button)

#### Hook

```typescript
// src/hooks/permissions/useGrantEntityPermission.ts
import { useState } from 'react';
import { grantEntityPermissionApi, type EntityPermissionGrant } from '@/lib/api/permissions/entityGrantsApi';
import type { EntityType, SubjectType, PermissionRole } from '@/lib/permissions/entityGrantsService';

export function useGrantEntityPermission() {
  const [data, setData] = useState<EntityPermissionGrant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantPermission = async (
    entityType: EntityType,
    entityId: string,
    subjectType: SubjectType,
    subjectId: string,
    role: PermissionRole
  ): Promise<EntityPermissionGrant | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await grantEntityPermissionApi({
        entityType,
        entityId,
        subjectType,
        subjectId,
        role,
      });

      if (response.success) {
        setData(response.data!);
        setLoading(false);
        return response.data!;
      } else {
        setError(response.error || 'Failed to grant permission');
        setLoading(false);
        return null;
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
      return null;
    }
  };

  return {
    data,
    loading,
    error,
    grantPermission,
  };
}
```

#### Component Usage

```typescript
// src/components/permissions/GrantPermissionButton.tsx
import { useState } from 'react';
import { useGrantEntityPermission } from '@/hooks/permissions/useGrantEntityPermission';
import { canUserEditTrack } from '@/lib/guardrails/ai/aiPermissions';
import { useAuth } from '@/contexts/AuthContext';

export function GrantPermissionButton({
  entityType,
  entityId,
  subjectType,
  subjectId,
  role,
}: {
  entityType: 'track' | 'subtrack';
  entityId: string;
  subjectType: 'user' | 'group';
  subjectId: string;
  role: 'editor' | 'commenter' | 'viewer';
}) {
  const { user } = useAuth();
  const [canGrant, setCanGrant] = useState(false);
  const { grantPermission, loading, error } = useGrantEntityPermission();

  // Check permission (only for tracks, adjust for subtracks)
  useEffect(() => {
    if (entityType === 'track' && user?.id) {
      canUserEditTrack(user.id, entityId).then(setCanGrant);
    } else {
      setCanGrant(false);
    }
  }, [entityType, entityId, user?.id]);

  const handleGrant = async () => {
    const result = await grantPermission(
      entityType,
      entityId,
      subjectType,
      subjectId,
      role
    );
    
    if (result) {
      // Success - permission granted
      // Refresh permission list, show success message, etc.
    }
  };

  // Hide button if user cannot grant permissions
  if (!canGrant) {
    return null;
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button onClick={handleGrant} disabled={loading}>
        {loading ? 'Granting...' : `Grant ${role} permission`}
      </button>
    </div>
  );
}
```

**Key Points:**
- Permission check via existing function (`canUserEditTrack`)
- Button hidden if no permission (not disabled)
- Hook handles API call and error state
- Component is declarative

---

### Example 3: List/Read Action (List Groups)

#### Hook

```typescript
// src/hooks/groups/useGroups.ts
import { useState, useEffect } from 'react';
import { listGroupsApi, type TeamGroup } from '@/lib/api/groups/groupsApi';

export function useGroups(teamId: string) {
  const [data, setData] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listGroupsApi(teamId);

      if (response.success) {
        setData(response.data || []);
        setLoading(false);
      } else {
        setError(response.error || 'Failed to load groups');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [teamId]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
```

#### Component Usage

```typescript
// src/components/groups/GroupsList.tsx
import { useGroups } from '@/hooks/groups/useGroups';

export function GroupsList({ teamId }: { teamId: string }) {
  const { data: groups, loading, error, refresh } = useGroups(teamId);

  if (loading) {
    return <div>Loading groups...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error">{error}</div>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (groups.length === 0) {
    return <div>No groups found</div>;
  }

  return (
    <div>
      <h2>Groups</h2>
      <ul>
        {groups.map((group) => (
          <li key={group.id}>
            {group.name}
            {group.description && <span> - {group.description}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Key Points:**
- Hook loads data on mount (query hook pattern)
- Component handles loading/error/empty states
- No service imports
- Clean, declarative component

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Direct API Calls in Components

```typescript
// ❌ WRONG: Direct API call in component
function CreateGroupForm() {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    setLoading(true);
    const response = await createGroupApi({ teamId, name });
    // Error handling duplicated everywhere...
  };
}
```

**Problem:** Logic duplication, inconsistent error handling

**Correct:** Use hook (see Example 1)

---

### ❌ Anti-Pattern 2: Service Imports from UI

```typescript
// ❌ WRONG: Import service directly
import { createGroup } from '@/lib/groups/teamGroupsService';

function CreateGroupForm() {
  const handleSubmit = async () => {
    await createGroup(teamId, name); // Bypasses API layer!
  };
}
```

**Problem:** Violates Phase 3.1 rules, bypasses auth/validation

**Correct:** Import API handler or use hook

---

### ❌ Anti-Pattern 3: Permission Logic in Components

```typescript
// ❌ WRONG: Permission logic in component
function GrantButton() {
  const checkPermission = async () => {
    // Complex permission logic here...
    const projectRole = await getUserProjectRole(userId, projectId);
    const creatorRights = await checkCreatorRights(...);
    // ...
  };
}
```

**Problem:** Permission logic scattered, hard to maintain

**Correct:** Use existing permission functions (`canUserEditTrack`, etc.)

---

### ❌ Anti-Pattern 4: Throwing Errors from Hooks

```typescript
// ❌ WRONG: Hook throws errors
export function useCreateGroup() {
  const createGroup = async () => {
    const response = await createGroupApi(...);
    if (!response.success) {
      throw new Error(response.error); // Don't throw!
    }
  };
}
```

**Problem:** Forces try/catch in every component, inconsistent error handling

**Correct:** Return error state (see Hook Contract Rule 3)

---

### ❌ Anti-Pattern 5: Generic Hook for Everything

```typescript
// ❌ WRONG: Generic hook loses type safety
function useApiCall(apiFunction: any) {
  // Generic implementation...
}

// Usage loses type information
const { data } = useApiCall(createGroupApi);
```

**Problem:** Loses type safety, less discoverable, harder to extend

**Correct:** Domain-specific hooks (see Chosen Pattern)

---

### ❌ Anti-Pattern 6: Resolver Debug APIs for Normal Flows

```typescript
// ❌ WRONG: Using resolver debug API for permission check
function GrantButton() {
  const checkPermission = async () => {
    const resolved = await resolvePermissionsApi({...});
    if (resolved.data?.canEdit) {
      // Show button
    }
  };
}
```

**Problem:** Overkill, wrong abstraction, debug API not for normal flows

**Correct:** Use `canUserEditTrack` or similar permission functions

---

## Summary

### Chosen Pattern

**Domain-Specific Custom React Hooks**

### Key Rules

1. **Hook Naming:** `use{Action}{Entity}` or `use{Entity}{Action}`
2. **Return Shape:** `{ data, loading, error, action, refresh? }`
3. **Error Handling:** Never throw, return error state
4. **Query vs Mutation:** Queries load on mount, mutations require explicit call
5. **File Location:** `src/hooks/{domain}/{hookName}.ts`

### Permission Rules

1. **Use Existing Functions:** `canUserAccessTrack`, `canUserEditTrack`, etc.
2. **Hide vs Disable:** Hide if no permission, disable if temporary state
3. **Optimistic Rendering:** Default to waiting, only use when justified
4. **Debug APIs:** Only for debugging, not normal UI flows

### Benefits

- ✅ Clean separation of concerns
- ✅ Reusable hooks across components
- ✅ Centralized state management
- ✅ Type-safe and discoverable
- ✅ Scalable as app grows

### Next Steps

1. Implement hooks (one domain at a time)
2. Update components to use hooks (Phase 4)
3. Add hook tests (unit tests with mocked API handlers)
4. Document hook API surface for component developers

---

**End of UI Consumption Patterns Document**
