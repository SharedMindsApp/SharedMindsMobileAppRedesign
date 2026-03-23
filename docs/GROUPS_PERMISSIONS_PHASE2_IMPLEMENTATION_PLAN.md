# Phase 2: Service Layer Implementation Plan

**Status:** Implementation Plan  
**Date:** January 2025  
**Based on:** `GROUPS_PERMISSIONS_PHASE0_LOCKIN.md` and `GROUPS_PERMISSIONS_PHASE1_SCHEMA_PLAN.md`

---

## Overview

This document outlines the service layer implementation for Phase 2 of the Groups + Permissions + Distribution extension.

**Scope:** Service layer only. No UI. All features gated behind feature flags.

---

## RLS Strategy

**Decision: Option A - RLS Policies with SECURITY DEFINER Helper Functions**

**Rationale:**
- Consistent with existing codebase patterns (see `PROJECT_USERS_RLS_FIX.md`)
- Avoids recursion issues (functions bypass RLS)
- Maintains security (policies still enforce access)
- No service role key required

**Implementation:**
- Create SECURITY DEFINER helper functions for permission checks
- Create RLS policies that use these functions
- Policies allow:
  - **Groups:** Active team members can read, owners/admins can mutate
  - **Grants:** Project owners can create/revoke
  - **Creator Revocations:** Project owners can create/revoke
  - **Projections:** Users can read their own, creators can create when allowed

---

## Files to Create/Modify

### New Files

1. **RLS Migration**
   - `supabase/migrations/20250130000006_add_groups_permissions_rls.sql`

2. **Group Services**
   - `src/lib/groups/teamGroupsService.ts`
   - `src/lib/groups/teamGroupMembersService.ts`

3. **Permission Services**
   - `src/lib/permissions/entityGrantsService.ts`
   - `src/lib/permissions/creatorRightsService.ts`
   - `src/lib/permissions/entityPermissionResolver.ts`

4. **Distribution Services**
   - `src/lib/distribution/taskDistributionService.ts`
   - `src/lib/distribution/eventDistributionService.ts`

### Modified Files

1. **Feature Flags**
   - `src/lib/featureFlags.ts` (✅ Already updated)

2. **Existing Permission Services**
   - `src/lib/guardrails/ai/aiPermissions.ts` (extend with resolver)

---

## Implementation Details

### 1. RLS Policies

**Helper Functions to Create:**
- `is_team_group_member(team_id, user_id)` - Check if user can access group
- `can_manage_team_groups(team_id, user_id)` - Check if user can mutate groups
- `is_project_owner_for_entity(entity_type, entity_id, user_id)` - Check project ownership

**Policies:**
- `team_groups`: SELECT (active members), INSERT/UPDATE/DELETE (owners/admins)
- `team_group_members`: SELECT (active members), INSERT/UPDATE/DELETE (owners/admins)
- `entity_permission_grants`: SELECT (project members), INSERT/UPDATE/DELETE (project owners)
- `creator_rights_revocations`: SELECT (project members), INSERT/DELETE (project owners)
- `task_projections`: SELECT (target user), INSERT (with validation)
- `calendar_projections`: UPDATE (add source_group_id support)

### 2. Service Implementation Patterns

**Common Patterns:**
- Get current user: `supabase.auth.getUser()` → get profile.id
- Feature flag checks at start of functions
- Validation before mutations
- Error handling with descriptive messages
- Type safety with TypeScript interfaces

**Validation Rules:**
- Group membership: User must be active team member
- Group mutations: Only team owner/admin
- Grant creation: Only project owner
- Creator revocation: Only project owner
- Distribution: Creator must have permission

---

## Feature Flag Integration

All services check feature flags at function entry:

```typescript
if (!ENABLE_GROUPS) {
  throw new Error('Groups feature is disabled');
}
```

When flags are OFF:
- Services throw errors or return empty results
- Existing behavior remains unchanged
- No permission logic active

---

## Permission Resolver Logic

**Resolution Order (from Phase 0):**
1. Project base permissions (gate - if null, return no access)
2. Creator default rights (capped at project permission)
3. Entity-level grants (capped at project permission)
4. Final role = max(base, creator, grant) capped at base

**Implementation:**
- Service-layer function (not SQL)
- Returns rich debug object with sources
- Used by existing permission check functions when flags ON

---

## Distribution Behavior

**Locked In: Option A** (from Phase 0 Correction #2)
- Projections are snapshots at distribution time
- Removing user from group does NOT delete existing projections
- New distributions respect current group membership

---

## Testing Strategy

**Unit Tests:**
- Service functions with mocked Supabase
- Permission resolver logic
- Validation rules

**Integration Tests:**
- RLS policy enforcement
- Feature flag behavior
- Distribution duplicate handling

---

## Next Steps

1. ✅ Add feature flags
2. Create RLS migration
3. Implement core services
4. Implement distribution services
5. Update existing services
6. Add tests

---

**End of Implementation Plan**
