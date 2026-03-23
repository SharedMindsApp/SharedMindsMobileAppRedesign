# Phase 2.1: Entity Permission Resolver - Completion Summary

**Status:** ✅ Complete  
**Date:** January 2025  
**File:** `src/lib/permissions/entityPermissionResolver.ts`

---

## Files Created/Modified

### Created
1. **`src/lib/permissions/entityPermissionResolver.ts`**
   - Main resolver implementation (407 lines)
   - Exports: `resolveEntityPermissions()`, types

### Modified
- None (resolver is standalone)

---

## Implementation Summary

### Core Function
```typescript
resolveEntityPermissions({
  userId: string,      // profiles.id
  entityType: 'track' | 'subtrack',
  entityId: string
}): Promise<ResolvedPermissions>
```

### Resolution Logic

**Step 0: Feature Flag Gate**
- If both `ENABLE_ENTITY_GRANTS` and `ENABLE_CREATOR_RIGHTS` are false:
  - Returns project role only (if accessible)
  - Returns null if no project access
  - Does not throw errors

**Step 1: Get Entity → Project ID**
- Helper: `getProjectIdForEntity()`
- For tracks: Query `guardrails_tracks.master_project_id`
- For subtracks: Query `guardrails_subtracks.track_id` → `guardrails_tracks.master_project_id`
- Returns null if entity not found

**Step 2: Project Permission Gate**
- Uses `getUserProjectRole(userId, projectId)` from `projectUserService`
- If no project access → returns null (all flags false)
- If has access → `projectRole` becomes ceiling

**Step 3: Creator Rights** (if `ENABLE_CREATOR_RIGHTS`)
- Queries `created_by` from entity table
- If `created_by === userId`:
  - Checks `creator_rights_revocations` table for active revocation
  - If not revoked: creator "would grant" `editor` role
  - If revoked: no creator contribution
- **Ceiling Rule:** Creator rights are capped at `projectRole`

**Step 4: Entity Grants** (if `ENABLE_ENTITY_GRANTS`)
- Direct user grant: Query `entity_permission_grants` where `subject_type='user'` and `subject_id=userId`
- Group grants:
  - Get all user's group memberships from `team_group_members`
  - Query `entity_permission_grants` where `subject_type='group'` and `subject_id IN (groupIds)`
  - Only considers grants where `revoked_at IS NULL`
- Calculate highest grant role using role hierarchy
- **Ceiling Rule:** Grants are capped at `projectRole`

**Step 5: Final Role Calculation**
- Candidates: `[projectRole, creatorRole, grantRole]` (filter nulls)
- `finalRole = max(candidates)` capped at `projectRole`
- Convert role to permission flags

---

## Query Plan

### Tables Queried

1. **`guardrails_tracks`**
   - Query: `SELECT master_project_id WHERE id = ?`
   - Also: `SELECT created_by WHERE id = ?` (if creator rights enabled)

2. **`guardrails_subtracks`**
   - Query: `SELECT track_id WHERE id = ?`
   - Also: `SELECT created_by WHERE id = ?` (if creator rights enabled)

3. **`project_users`** (via `getUserProjectRole`)
   - Query: Project user role lookup

4. **`creator_rights_revocations`** (if `ENABLE_CREATOR_RIGHTS`)
   - Query: `SELECT id WHERE entity_type=? AND entity_id=? AND creator_user_id=? AND revoked_at IS NULL`

5. **`team_group_members`** (if `ENABLE_ENTITY_GRANTS`)
   - Query: `SELECT group_id WHERE user_id = ?`

6. **`entity_permission_grants`** (if `ENABLE_ENTITY_GRANTS`)
   - Query 1: `SELECT permission_role WHERE entity_type=? AND entity_id=? AND subject_type='user' AND subject_id=? AND revoked_at IS NULL`
   - Query 2: `SELECT subject_id, permission_role WHERE entity_type=? AND entity_id=? AND subject_type='group' AND subject_id IN (...) AND revoked_at IS NULL`

### Query Optimization

- **N+1 Prevention:** Group grants query uses `IN` clause (batched)
- **Early Exit:** Returns null immediately if no project access (gate)
- **Conditional Queries:** Creator and grant queries only run if feature flags enabled

---

## Ceiling Rule Implementation

**✅ Confirmed: Project role is the ceiling**

Implementation:
```typescript
function capRoleAtCeiling(
  role: EntityPermissionRole | null,
  ceiling: EntityPermissionRole | null
): EntityPermissionRole | null {
  if (!role || !ceiling) return role;
  return compareRoles(role, ceiling) > 0 ? ceiling : role;
}
```

**Applied to:**
1. Creator rights: `creatorWouldGrantRole` is capped at `projectRole` in final calculation
2. Entity grants: `highestGrantRole` is capped at `projectRole` in final calculation
3. Final role: `finalRole = capRoleAtCeiling(uncappedFinalRole, projectRole)`

**Evidence in code:**
- Line 390: `finalRole = capRoleAtCeiling(uncappedFinalRole, projectRole);`
- Line 392-394: `ceilingApplied` flag set when cap is applied
- Returned in `source.ceilingApplied` for debugging

---

## Role Hierarchy Implementation

**✅ Confirmed: `owner > editor > commenter > viewer`**

Implementation:
```typescript
function compareRoles(role1: EntityPermissionRole, role2: EntityPermissionRole): number {
  const hierarchy: Record<EntityPermissionRole, number> = {
    owner: 4,
    editor: 3,
    commenter: 2,
    viewer: 1,
  };
  return hierarchy[role1] - hierarchy[role2];
}
```

**Used for:**
- Finding maximum role from candidates
- Capping roles at ceiling
- Role comparison logic

**Evidence in code:**
- Line 101-110: `compareRoles()` function
- Line 115-124: `maxRole()` function uses `compareRoles()`
- Line 129-136: `capRoleAtCeiling()` uses `compareRoles()`

---

## Return Type: Rich Debug Payload

The resolver returns a `ResolvedPermissions` object with:

```typescript
{
  role: EntityPermissionRole | null,
  canView: boolean,
  canEdit: boolean,
  canComment: boolean,
  canManage: boolean,
  source: {
    projectId?: string,
    projectRole?: EntityPermissionRole,
    ceilingApplied?: boolean,
    creator?: {
      isCreator: boolean,
      revoked: boolean,
      wouldGrantRole: EntityPermissionRole | null,
    },
    grants?: {
      directUserRole: EntityPermissionRole | null,
      groupRoles: Array<{ groupId: string; role: EntityPermissionRole }>,
      highestGrantRole: EntityPermissionRole | null,
    },
  },
}
```

This allows debugging of permission resolution decisions.

---

## Error Handling

- **Entity not found:** Returns `role: null`, all flags `false` (does not throw)
- **No project access:** Returns `role: null`, all flags `false` (does not throw)
- **Feature flags OFF:** Returns project role only (graceful degradation)
- **Database errors:** Logged to console, returns safe defaults
- **Invalid arguments:** Would throw (TypeScript type safety)

---

## Testing Requirements

**Note:** No test framework is currently set up in the codebase. The following tests should be added when a testing framework is configured:

### Unit Tests Required

1. **No project access → null**
   - User has no project membership
   - Returns `role: null`, all flags `false`

2. **Project viewer, creator = true → still viewer (ceiling cap)**
   - User is project viewer
   - User is creator
   - Creator rights would grant `editor`
   - Final role should be `viewer` (ceiling applied)

3. **Project editor, creator = true → editor**
   - User is project editor
   - User is creator
   - Creator rights would grant `editor`
   - Final role should be `editor` (no cap needed)

4. **Grant editor via user grant → editor**
   - User has project viewer role
   - User has direct entity grant for `editor`
   - Final role should be `editor`

5. **Grant owner via group grant, project editor → editor (cap)**
   - User is project editor
   - User has group grant for `owner`
   - Final role should be `editor` (capped at project role)
   - `ceilingApplied` should be `true`

6. **commenter role maps correctly**
   - User has entity grant for `commenter`
   - `canComment` should be `true`, `canEdit` should be `false`

7. **Revoked creator rights removes creator contribution**
   - User is creator
   - Creator rights are revoked
   - Creator should not contribute to final role

8. **Revoked grant ignored**
   - User has entity grant with `revoked_at IS NOT NULL`
   - Grant should not contribute to final role

9. **Feature flags OFF returns project-only result**
   - Both flags are `false`
   - Should return project role only
   - Creator and grant information should not be in source

---

## Schema Compatibility

✅ **No schema changes required**

The resolver uses:
- Existing `guardrails_tracks` table (with `created_by` column from Phase 1)
- Existing `guardrails_subtracks` table (with `created_by` column from Phase 1)
- Existing `project_users` table (via `getUserProjectRole`)
- Phase 1 tables: `creator_rights_revocations`, `entity_permission_grants`, `team_group_members`

All tables exist from Phase 1 schema.

---

## Integration Points

This resolver is designed to be used by:
- `canUserAccessTrack()` (to be updated in Phase 2.2)
- `canUserEditTrack()` (to be updated in Phase 2.2)
- Future permission check functions

**Usage pattern:**
```typescript
import { resolveEntityPermissions } from '../permissions/entityPermissionResolver';

const resolved = await resolveEntityPermissions({
  userId: profileId,
  entityType: 'track',
  entityId: trackId,
});

if (!resolved.canView) {
  return false; // or throw error
}
```

---

## Next Steps

1. ✅ Resolver implementation complete
2. ⏳ Add tests (when test framework is configured)
3. ⏳ Update `canUserAccessTrack()` to use resolver (Phase 2.2)
4. ⏳ Update `canUserEditTrack()` to use resolver (Phase 2.2)

---

**End of Completion Summary**
