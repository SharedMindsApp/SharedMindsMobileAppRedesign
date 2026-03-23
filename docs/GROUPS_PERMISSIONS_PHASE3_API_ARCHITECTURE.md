# Phase 3: API/Integration Layer Architecture

**Status:** Design Document  
**Date:** January 2025  
**Phase:** 3 of N (Schema → Services → **API Layer** → UI)

---

## Purpose

The API/Integration Layer provides a **thin orchestration boundary** between UI components and the service layer. It does NOT contain business logic, permission resolution, or data access—these remain in services.

### Why This Layer Exists

1. **Separation of Concerns**
   - UI components should not know about service layer details
   - Services remain framework-agnostic and testable
   - API layer handles framework-specific concerns (auth, errors, responses)

2. **Centralized Cross-Cutting Concerns**
   - Authentication context resolution (session → user ID)
   - Feature flag enforcement (consistent UX messaging)
   - Input validation (before service calls)
   - Error mapping (user-friendly error messages)
   - Response normalization (consistent shapes)

3. **Future Extensibility**
   - Auditing/logging hooks (without modifying services)
   - Rate limiting (at API boundary)
   - Request/response transformation
   - Analytics instrumentation
   - API versioning (if needed)

4. **Defensive Programming**
   - Services are safe (idempotent, authorized, feature-flagged)
   - API layer adds UX safety (clear errors, validation feedback)
   - Prevents UI from bypassing feature flags or making invalid calls

---

## Responsibilities

### ✅ What the API Layer DOES

1. **Authentication Extraction**
   - Extracts current user from session (profiles.id + auth.users.id)
   - Provides user context to services
   - Handles "not authenticated" cases

2. **Input Validation**
   - Validates request shape (required fields, types, ranges)
   - Validates business constraints (e.g., group name format)
   - Returns validation errors before service calls

3. **Feature Flag Checks**
   - Checks feature flags before service invocation
   - Returns user-friendly "feature disabled" messages
   - Note: Services also check flags internally (defense in depth)

4. **Service Orchestration**
   - Calls services with validated inputs
   - Composes multiple service calls (if needed)
   - Handles service response shapes

5. **Error Mapping**
   - Maps service errors to user-friendly messages
   - Hides internal errors (database, RLS) from UI
   - Returns consistent error shapes

6. **Response Normalization**
   - Returns consistent response shapes to UI
   - Transforms service responses (if needed)
   - Includes metadata (timestamps, counts, etc.)

### ❌ What the API Layer DOES NOT Do

1. **Business Logic**
   - Does NOT resolve permissions
   - Does NOT validate authorization (services do this)
   - Does NOT make business decisions

2. **Data Access**
   - Does NOT query database directly
   - Does NOT bypass services
   - Does NOT implement RLS policies

3. **Permission Resolution**
   - Does NOT calculate user permissions
   - Does NOT check project/team membership
   - Services and resolver handle this

4. **Feature Flag Logic**
   - Does NOT decide feature behavior
   - Does NOT implement feature logic
   - Services own feature behavior

---

## Design Principles

### 1. Thin Orchestration
- API handlers are thin wrappers around services
- No business logic in API layer
- Services remain the single source of truth

### 2. Fail Fast
- Validate inputs before service calls
- Check feature flags early
- Return clear validation errors

### 3. Consistent Shapes
- All handlers return consistent response types
- Errors always in the same format
- Success responses normalized

### 4. Service Ownership
- Services own authorization checks
- Services own feature flag logic
- API layer trusts services (doesn't re-check)

### 5. User-Friendly Errors
- Hide internal errors (database, RLS)
- Return actionable error messages
- Include context (which field, what rule)

---

## File Structure

```
src/lib/api/
├── groups/
│   ├── groupsApi.ts          # Group CRUD operations
│   └── groupMembersApi.ts    # Membership operations
├── permissions/
│   ├── entityGrantsApi.ts    # Entity permission grants
│   ├── creatorRightsApi.ts   # Creator rights revocation/restore
│   └── permissionResolverApi.ts  # Permission inspection (debug)
├── distribution/
│   ├── taskDistributionApi.ts    # Task distribution
│   └── eventDistributionApi.ts   # Event distribution
└── helpers/
    ├── authContext.ts        # Auth extraction utilities
    ├── errorMapper.ts        # Error mapping utilities
    ├── responseTypes.ts      # Common response types
    └── validators.ts         # Input validation utilities
```

---

## Standard API Handler Pattern

### Pattern Overview

```typescript
export async function apiHandler(
  request: RequestInput,
  options?: HandlerOptions
): Promise<ApiResponse<ResponseData>> {
  // 1. Extract auth context
  const auth = await getAuthContext();
  if (!auth) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Check feature flag (if applicable)
  if (!FEATURE_FLAG) {
    return { success: false, error: 'Feature is not available' };
  }

  // 3. Validate input
  const validation = validateInput(request);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 4. Call service(s)
  try {
    const result = await serviceFunction(auth.userId, validatedInput);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: mapError(error) };
  }
}
```

### Type Definitions

```typescript
// Response shape (consistent across all handlers)
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Auth context
export interface AuthContext {
  userId: string;        // profiles.id
  authUserId: string;    // auth.users.id (if needed)
}

// Handler options (for future extensibility)
export interface HandlerOptions {
  skipFeatureFlagCheck?: boolean;  // Internal use only
  includeMetadata?: boolean;
}
```

---

## Error Mapping Strategy

### Error Categories

1. **Authentication Errors**
   - "Not authenticated" → User-friendly message
   - "Session expired" → Actionable message

2. **Validation Errors**
   - Service validation errors → Pass through (already user-friendly)
   - Input validation errors → Field-level feedback

3. **Authorization Errors**
   - Service authorization errors → Pass through (already user-friendly)
   - "Not authorized" → Generic message (don't leak info)

4. **Feature Flag Errors**
   - "Feature disabled" → User-friendly message

5. **Internal Errors**
   - Database errors → "An error occurred" (hide internals)
   - RLS errors → "Access denied" (generic)
   - Unknown errors → "An unexpected error occurred"

### Error Mapping Function

```typescript
function mapError(error: unknown): string {
  if (error instanceof Error) {
    // Service errors (already user-friendly)
    if (error.message.includes('not authorized') || 
        error.message.includes('cannot') ||
        error.message.includes('must be')) {
      return error.message;
    }
    
    // Feature flag errors
    if (error.message.includes('feature is disabled')) {
      return 'This feature is not available';
    }
    
    // Internal errors (hide details)
    return 'An error occurred. Please try again.';
  }
  
  return 'An unexpected error occurred';
}
```

---

## Integration with Existing Services

### Service Contracts (Already Established)

**Services expect:**
- `profiles.id` for user identification
- Feature flags checked internally
- Authorization validated internally
- Idempotent operations
- Clear error messages

**API layer provides:**
- Auth context extraction
- Input validation
- Error mapping (UX layer)
- Response normalization

### No Service Modifications Required

- Services remain unchanged
- API layer calls services as-is
- Services continue to enforce authorization
- Services continue to check feature flags (defense in depth)

---

## Next Steps

After Phase 3 design approval:

1. **Implement API handlers** (one category at a time)
2. **Add unit tests** (mock services, test error paths)
3. **Add integration tests** (real services, auth context)
4. **Document API surface** (for UI developers)
5. **Phase 4: UI Integration** (components call API layer)

---

## Notes

- **Defense in Depth**: Services check feature flags internally, API layer also checks (early return for better UX)
- **Service Trust**: API layer trusts services for authorization (doesn't re-check)
- **Error Transparency**: Service errors that are user-friendly pass through; internal errors are hidden
- **Future-Proof**: API layer designed for extensibility (auditing, logging, rate limiting)

---

**End of Architecture Document**
