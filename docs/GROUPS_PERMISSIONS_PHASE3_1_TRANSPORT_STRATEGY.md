# Phase 3.1: API Transport & Invocation Strategy

**Status:** Architecture Decision  
**Date:** January 2025  
**Phase:** 3.1 of N (Schema → Services → API Layer → **Transport Strategy** → UI Integration)

---

## Overview

Phase 3.1 defines **how UI components invoke API handlers** from Phase 3. This is a transport/invocation decision, not a business logic decision.

### Context

- Phase 3 API handlers are complete (createGroupApi, grantEntityPermissionApi, etc.)
- Handlers are thin orchestration layers (auth, validation, error mapping)
- Services remain unchanged and are not directly imported by UI
- This is an **internal application** (monorepo), not a public API
- Supabase authentication is used throughout

### Goal

Choose the canonical way for UI components to call API handlers while:
- Preventing UI from importing services directly
- Maintaining type safety
- Avoiding unnecessary overhead (monorepo context)
- Supporting feature flags cleanly
- Enabling future evolution if needed

---

## Evaluated Options

### Option 1: Direct Function Calls (RPC-Style Imports)

**Description:** UI components directly import and call API handler functions.

```typescript
// UI component
import { createGroupApi } from '@/lib/api/groups/groupsApi';

const handleCreate = async () => {
  const response = await createGroupApi({ teamId, name, description });
  if (response.success) {
    // Handle success
  } else {
    // Handle error
  }
};
```

**Pros:**
- ✅ **Simplest approach** - No infrastructure needed
- ✅ **Zero overhead** - Direct function calls, no HTTP
- ✅ **Type-safe** - Full TypeScript support, compile-time checks
- ✅ **Easy debugging** - Stack traces point to exact code paths
- ✅ **Works in monorepo** - Same codebase, shared types
- ✅ **Preserves handler signatures** - No wrappers needed
- ✅ **Fast iteration** - No build/deploy step for API changes
- ✅ **Future-proof** - Can wrap in HTTP layer later if needed

**Cons:**
- ⚠️ **Couples UI to API structure** - But this is acceptable for internal APIs
- ⚠️ **Not suitable for external APIs** - But this is an internal app

**Fits Architecture:**
- ✅ Perfect fit for internal monorepo application
- ✅ Maintains separation (UI → API → Services)
- ✅ No service imports from UI (enforced by convention/code review)

---

### Option 2: Server Actions (Next.js Pattern)

**Description:** Use Next.js Server Actions or similar server-side function invocation.

**Pros:**
- ✅ Type-safe (with Next.js)
- ✅ Can hide implementation details

**Cons:**
- ❌ **Requires Next.js/server framework** - This is a Vite/React app, not Next.js
- ❌ **Adds complexity** - Requires server setup, routing
- ❌ **Overkill for internal API** - Unnecessary abstraction
- ❌ **HTTP overhead** - Even if optimized, still goes through server layer
- ❌ **Development overhead** - Requires server restarts, more moving parts

**Fits Architecture:**
- ❌ Does not fit - This is not a Next.js application
- ❌ Adds unnecessary complexity for internal monorepo

---

### Option 3: HTTP REST Endpoints

**Description:** Expose API handlers via HTTP REST endpoints (Express, Fastify, etc.).

```typescript
// UI component
const response = await fetch('/api/groups', {
  method: 'POST',
  body: JSON.stringify({ teamId, name, description }),
});

// API endpoint
app.post('/api/groups', async (req, res) => {
  const result = await createGroupApi(req.body);
  res.json(result);
});
```

**Pros:**
- ✅ **Decoupled** - UI and API are separate
- ✅ **Can become external API** - Ready for public consumption
- ✅ **Standard pattern** - Familiar to many developers

**Cons:**
- ❌ **HTTP overhead** - Serialization, network, deserialization
- ❌ **Requires API server** - Additional infrastructure, deployment complexity
- ❌ **More complex** - Routing, middleware, error handling, CORS
- ❌ **Slower development** - Need to start API server, handle hot reload
- ❌ **Overkill for internal API** - Unnecessary for monorepo
- ❌ **Type safety challenges** - Runtime validation needed, not compile-time

**Fits Architecture:**
- ❌ Overkill for internal monorepo application
- ❌ Adds unnecessary complexity and overhead
- ❌ Can be added later if external API is needed

---

### Option 4: Supabase Edge Functions

**Description:** Deploy API handlers as Supabase Edge Functions (serverless).

**Pros:**
- ✅ **Uses existing infrastructure** - Already using Supabase
- ✅ **Serverless** - No server management
- ✅ **Can be external API** - Public endpoints possible

**Cons:**
- ❌ **HTTP overhead** - Goes over network (even if optimized)
- ❌ **Deployment complexity** - Requires deploy step, versioning
- ❌ **Development overhead** - Deploy to test, slower iteration
- ❌ **Cost** - Edge function invocations cost money
- ❌ **Cold starts** - Potential latency
- ❌ **Overkill for internal API** - Unnecessary for monorepo
- ❌ **Type safety challenges** - Runtime validation, not compile-time

**Fits Architecture:**
- ❌ Overkill for internal monorepo application
- ❌ Adds unnecessary complexity and overhead
- ❌ Can be used later if external API is needed

---

### Option 5: Hybrid Approaches

**Description:** Combine patterns (e.g., direct calls for internal, HTTP for external).

**Pros:**
- ✅ **Flexibility** - Can optimize per use case

**Cons:**
- ❌ **Complexity** - Multiple patterns to maintain
- ❌ **Confusion** - When to use which pattern?
- ❌ **Premature optimization** - Not needed for internal API
- ❌ **Maintenance burden** - Two code paths, two test strategies

**Fits Architecture:**
- ❌ Adds unnecessary complexity
- ❌ YAGNI violation (You Aren't Gonna Need It)
- ❌ Can evolve to hybrid later if truly needed

---

## Chosen Transport Strategy

### Decision: **Direct Function Calls (RPC-Style Imports)**

**Rationale:**

1. **Simplicity First**
   - This is an internal application in a monorepo
   - No need for HTTP infrastructure
   - Direct function calls are the simplest, most direct approach

2. **Performance**
   - Zero overhead (no serialization, network, deserialization)
   - Instant execution
   - Better developer experience

3. **Type Safety**
   - Full TypeScript support
   - Compile-time type checking
   - IDE autocomplete and refactoring support

4. **Development Experience**
   - Easy debugging (stack traces, breakpoints)
   - Fast iteration (no build/deploy step)
   - Clear code paths

5. **Architectural Fit**
   - Maintains separation: UI → API → Services
   - Prevents UI from importing services (enforced by convention)
   - Preserves handler signatures (no wrappers needed)

6. **Future-Proof**
   - Can wrap handlers in HTTP layer later if external API is needed
   - No lock-in to transport mechanism
   - Handler signatures remain unchanged

### Why Other Options Are Not Chosen

- **Server Actions**: Not a Next.js app, adds unnecessary complexity
- **HTTP REST**: Overkill for internal API, adds overhead and complexity
- **Edge Functions**: Overkill for internal API, adds overhead and deployment complexity
- **Hybrid**: Premature optimization, adds maintenance burden

**Key Principle**: Choose the simplest solution that works. For an internal monorepo application, direct function calls are the simplest and most appropriate solution.

---

## Invocation Rules

### Rule 1: API Handler Location

API handlers live in `src/lib/api/` organized by domain:
- `src/lib/api/groups/groupsApi.ts`
- `src/lib/api/permissions/entityGrantsApi.ts`
- `src/lib/api/distribution/taskDistributionApi.ts`
- etc.

### Rule 2: UI Import Pattern

UI components/hooks import API handlers directly:

```typescript
// ✅ CORRECT: Import API handlers
import { createGroupApi } from '@/lib/api/groups/groupsApi';
import { grantEntityPermissionApi } from '@/lib/api/permissions/entityGrantsApi';

// ❌ WRONG: Import services directly
import { createGroup } from '@/lib/groups/teamGroupsService';
import { grantEntityPermission } from '@/lib/permissions/entityGrantsService';
```

### Rule 3: Auth Context Resolution

API handlers handle auth context extraction internally via `getAuthContext()`.

UI components do NOT need to:
- Extract user IDs
- Pass user IDs to API handlers
- Handle authentication state

UI components only pass business data (e.g., `teamId`, `groupId`, `entityId`).

### Rule 4: Response Handling

All API handlers return `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}
```

UI components MUST check `response.success` before accessing `response.data`:

```typescript
const response = await createGroupApi({ teamId, name });
if (response.success) {
  // Use response.data
  console.log(response.data);
} else {
  // Handle response.error
  console.error(response.error);
}
```

### Rule 5: Feature Flags

Feature flags are checked in two places (defense in depth):
1. **API handlers** - Early return with user-friendly error
2. **Services** - Also check internally

UI components do NOT need to check feature flags. If a feature is disabled, the API handler returns an error.

### Rule 6: Error Handling

UI components handle errors via the `error` field in `ApiResponse`:

```typescript
const response = await createGroupApi({ teamId, name });
if (!response.success) {
  // Error is already user-friendly
  showError(response.error);
  return;
}
// Success path
```

### Rule 7: Service Import Prevention

**Enforcement:** Code review and linting rules (if possible).

**Convention:** All UI code imports from `@/lib/api/*`, never from `@/lib/groups/*`, `@/lib/permissions/*`, `@/lib/distribution/*` directly.

---

## Example Implementation

### Complete End-to-End Example: Create Group

#### 1. UI Component/Hook

```typescript
// src/hooks/useGroups.ts
import { useState } from 'react';
import { createGroupApi, type TeamGroup } from '@/lib/api/groups/groupsApi';

export function useCreateGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = async (
    teamId: string,
    name: string,
    description?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await createGroupApi({
        teamId,
        name,
        description,
      });

      if (response.success) {
        setLoading(false);
        return response.data; // TeamGroup
      } else {
        setError(response.error || 'Failed to create group');
        setLoading(false);
        return null;
      }
    } catch (err) {
      // Unexpected error (should not happen, but defensive)
      setError('An unexpected error occurred');
      setLoading(false);
      return null;
    }
  };

  return { createGroup, loading, error };
}
```

#### 2. Component Usage

```typescript
// src/components/groups/CreateGroupForm.tsx
import { useState } from 'react';
import { useCreateGroup } from '@/hooks/useGroups';

export function CreateGroupForm({ teamId }: { teamId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { createGroup, loading, error } = useCreateGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newGroup = await createGroup(teamId, name, description);
    if (newGroup) {
      // Success - group created
      setName('');
      setDescription('');
      // Refresh groups list, show success message, etc.
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
      />
      
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        disabled={loading}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  );
}
```

#### 3. API Handler (Already Implemented in Phase 3)

```typescript
// src/lib/api/groups/groupsApi.ts
import { getAuthContext } from '../helpers/authContext';
import { ApiResponse } from '../helpers/responseTypes';
import { mapError } from '../helpers/errorMapper';
import { validateUUID, validateGroupName } from '../helpers/validators';
import { ENABLE_GROUPS } from '../../featureFlags';
import { createGroup as createGroupService, type TeamGroup } from '../../groups/teamGroupsService';

export async function createGroupApi(
  request: CreateGroupRequest
): Promise<ApiResponse<TeamGroup>> {
  // 1. Extract auth context
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'You must be logged in to create groups' };
  }

  // 2. Check feature flag
  if (!ENABLE_GROUPS) {
    return { success: false, error: 'Groups feature is not available' };
  }

  // 3. Validate input
  const teamIdValidation = validateUUID(request.teamId, 'Team ID');
  if (!teamIdValidation.valid) {
    return { success: false, error: teamIdValidation.error };
  }

  const nameValidation = validateGroupName(request.name);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  // 4. Call service
  try {
    const group = await createGroupService(
      request.teamId,
      request.name.trim(),
      request.description?.trim(),
      auth.userId // Passed automatically, UI doesn't know about it
    );

    return { success: true, data: group };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

#### 4. Service Layer (Already Implemented in Phase 2)

```typescript
// src/lib/groups/teamGroupsService.ts
// (Service implementation - UI never imports this)
```

### Key Points from Example

1. **UI imports API handler** - `useCreateGroup` imports `createGroupApi`
2. **No service imports** - UI never imports `teamGroupsService`
3. **Auth is automatic** - API handler extracts auth context
4. **Feature flags handled** - API handler checks flags
5. **Error handling** - Consistent `ApiResponse` pattern
6. **Type safety** - Full TypeScript support throughout

---

## Explicitly Rejected Alternatives

### HTTP REST Endpoints

**Rejected Because:**
- Adds unnecessary HTTP overhead for internal API
- Requires API server infrastructure
- More complex development workflow
- Overkill for monorepo application

**Future Consideration:** Can be added later if external API is needed (wraps existing handlers).

### Server Actions (Next.js)

**Rejected Because:**
- This is a Vite/React app, not Next.js
- Adds unnecessary server-side complexity
- Not applicable to current architecture

### Supabase Edge Functions

**Rejected Because:**
- Adds HTTP overhead and deployment complexity
- Slower development iteration
- Overkill for internal API
- Cost considerations

**Future Consideration:** Can be used if external API is needed (wraps existing handlers).

### Hybrid Approaches

**Rejected Because:**
- Premature optimization
- Adds maintenance burden
- Unnecessary complexity for internal API

**Future Consideration:** Can evolve to hybrid if truly needed (start simple, add complexity only when required).

---

## Summary

### Chosen Strategy

**Direct Function Calls (RPC-Style Imports)**

### Key Rules

1. UI imports from `@/lib/api/*` only
2. UI never imports from `@/lib/groups/*`, `@/lib/permissions/*`, `@/lib/distribution/*`
3. API handlers handle auth context extraction
4. All handlers return `ApiResponse<T>` with `success` flag
5. Feature flags checked in API handlers (defense in depth)
6. Errors are user-friendly (mapped in API handlers)

### Benefits

- ✅ Simplest approach (no infrastructure)
- ✅ Zero overhead (direct function calls)
- ✅ Type-safe (full TypeScript support)
- ✅ Easy debugging (clear stack traces)
- ✅ Fast iteration (no build/deploy)
- ✅ Future-proof (can wrap in HTTP later)

### Next Steps

1. Implement API handlers (Phase 3)
2. Update UI components to use API handlers (Phase 4)
3. Add linting rules to prevent service imports from UI (if possible)
4. Document API surface for UI developers

---

**End of Transport Strategy Document**
