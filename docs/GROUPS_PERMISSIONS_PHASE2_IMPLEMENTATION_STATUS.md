# Phase 2: Service Layer Implementation Status

**Status:** Implementation In Progress  
**Date:** January 2025  

---

## Summary

Phase 2 service layer implementation for Groups + Permissions + Distribution is in progress. This document tracks what has been implemented and what remains.

---

## Completed ✅

### 1. Feature Flags
**File:** `src/lib/featureFlags.ts`
- ✅ Added `ENABLE_GROUPS`
- ✅ Added `ENABLE_ENTITY_GRANTS`
- ✅ Added `ENABLE_CREATOR_RIGHTS`
- ✅ Added `ENABLE_GROUP_DISTRIBUTION`
- All flags default to `false` (safe default)

### 2. RLS Migration
**File:** `supabase/migrations/20250130000006_add_groups_permissions_rls.sql`
- ✅ Created SECURITY DEFINER helper functions
- ✅ Created RLS policies for all Phase 1 tables
- ✅ Uses Option A strategy (RLS policies with helper functions)

---

## Remaining Implementation

Due to the large scope of this phase, the following services need to be implemented:

### 1. Group Services
**Files to create:**
- `src/lib/groups/teamGroupsService.ts`
- `src/lib/groups/teamGroupMembersService.ts`

**Functions needed:**
- `createGroup(teamId, name, description?, createdBy)`
- `renameGroup(groupId, name)`
- `archiveGroup(groupId)`
- `listGroups(teamId)`
- `getGroup(groupId)`
- `addMember(groupId, userId, addedBy)`
- `removeMember(groupId, userId)`
- `listMembers(groupId)`
- `listUserGroups(teamId, userId)`

### 2. Permission Services
**Files to create:**
- `src/lib/permissions/entityGrantsService.ts`
- `src/lib/permissions/creatorRightsService.ts`
- `src/lib/permissions/entityPermissionResolver.ts`

**Functions needed:**
- `grant(entityType, entityId, subjectType, subjectId, role, grantedBy)`
- `revoke(grantId, revokedBy)`
- `listGrants(entityType, entityId)`
- `revokeCreatorRights(entityType, entityId, creatorUserId, revokedBy)`
- `restoreCreatorRights(entityType, entityId, creatorUserId, restoredBy)`
- `resolveEntityPermissions({ userId, entityType, entityId })`

### 3. Distribution Services
**Files to create:**
- `src/lib/distribution/taskDistributionService.ts`
- `src/lib/distribution/eventDistributionService.ts`

**Functions needed:**
- `distributeTaskToGroup(taskId, groupId, options)`
- `distributeCalendarEventToGroup(eventId, groupId, options)`

### 4. Update Existing Services
**Files to modify:**
- `src/lib/guardrails/ai/aiPermissions.ts`
  - Update `canUserAccessTrack()` to use resolver when flags ON
  - Update `canUserEditTrack()` to use resolver when flags ON

---

## Implementation Patterns

### Service Structure Pattern

```typescript
import { supabase } from '../supabase';
import { ENABLE_GROUPS } from '../featureFlags';

// Get current user's profile ID helper
async function getCurrentUserProfileId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
    
  return profile?.id || null;
}

// Service function example
export async function createGroup(
  teamId: string,
  name: string,
  description?: string
): Promise<TeamGroup> {
  if (!ENABLE_GROUPS) {
    throw new Error('Groups feature is disabled');
  }
  
  const profileId = await getCurrentUserProfileId();
  if (!profileId) throw new Error('Not authenticated');
  
  // Validation and creation logic...
}
```

### Permission Resolver Pattern

```typescript
interface PermissionResolutionContext {
  userId: string;
  entityType: 'track' | 'subtrack';
  entityId: string;
}

interface ResolvedPermissions {
  role: 'owner' | 'editor' | 'commenter' | 'viewer' | null;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  source: {
    projectRole?: string;
    creatorRights?: boolean;
    creatorRevoked?: boolean;
    entityGrants?: Array<{ subjectType: string; role: string }>;
  };
}

export async function resolveEntityPermissions(
  context: PermissionResolutionContext
): Promise<ResolvedPermissions> {
  // 1. Get project ID from entity
  // 2. Check project permissions (gate)
  // 3. Check creator rights (capped)
  // 4. Check entity grants (capped)
  // 5. Return final role (capped at project permission)
}
```

---

## RLS Strategy Summary

**Strategy:** Option A - RLS Policies with SECURITY DEFINER Helper Functions

**Rationale:**
- Consistent with existing codebase patterns
- Avoids recursion issues
- Maintains security
- No service role key required

**Helper Functions:**
- `is_team_group_member(team_id, user_id)` - Check team membership
- `can_manage_team_groups(team_id, user_id)` - Check admin permissions
- `is_project_owner_for_entity(entity_type, entity_id, user_id)` - Check project ownership

**Policies:**
- Groups: Active members can read, owners/admins can mutate
- Grants: Project members can read, owners can mutate
- Creator Revocations: Project members can read, owners can mutate
- Task Projections: Users can read/update their own

---

## Testing Requirements

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

1. Implement group services
2. Implement permission services
3. Implement permission resolver
4. Implement distribution services
5. Update existing services
6. Add tests

---

**End of Implementation Status**
