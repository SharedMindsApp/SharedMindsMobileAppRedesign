# Phase 2.3: Entity Grants Service - Completion Summary

**Status:** ✅ Complete  
**Date:** January 2025  
**File:** `src/lib/permissions/entityGrantsService.ts`

---

## Files Created

### Created
1. **`src/lib/permissions/entityGrantsService.ts`**
   - Entity permission grants authoring service (326 lines)
   - Three exported functions: `grantEntityPermission()`, `revokeEntityPermission()`, `listEntityPermissions()`

---

## Exported Functions

### 1. `grantEntityPermission()`
**Signature:**
```typescript
grantEntityPermission(
  entityType: 'track' | 'subtrack',
  entityId: string,
  subjectType: 'user' | 'group',
  subjectId: string,
  role: 'owner' | 'editor' | 'commenter' | 'viewer',
  grantedBy: string // profiles.id
): Promise<EntityPermissionGrant>
```

**Behavior:**
- Validates `grantedBy` is project owner for the entity
- **Enforces:** Cannot grant `'owner'` role (ownership is project-level only)
- Validates subject:
  - **User:** Must be project member (checks `project_users`)
  - **Group:** Must exist and not be archived (checks `team_groups`)
- **Idempotent:** If active grant exists, returns it
- **Restoration:** If revoked grant exists, restores it (sets `revoked_at = NULL`)
- Creates new grant if none exists

### 2. `revokeEntityPermission()`
**Signature:**
```typescript
revokeEntityPermission(
  grantId: string,
  revokedBy: string // profiles.id
): Promise<void>
```

**Behavior:**
- Validates `revokedBy` is project owner
- **Soft delete:** Sets `revoked_at` timestamp (does not delete row)
- **Idempotent:** Revoking twice is allowed (no error)

### 3. `listEntityPermissions()`
**Signature:**
```typescript
listEntityPermissions(
  entityType: 'track' | 'subtrack',
  entityId: string
): Promise<EntityPermissionGrant[]>
```

**Behavior:**
- Read-only function
- Relies on RLS for access control
- Returns both active and revoked grants
- No filtering logic (caller can filter)

---

## Validation Rules Enforced

### Project Ownership Validation
- ✅ `grantEntityPermission()`: Only project owners can grant
- ✅ `revokeEntityPermission()`: Only project owners can revoke
- Uses `isProjectOwner()` from `projectUserService`

### Role Constraints
- ✅ **Cannot grant ownership:** Explicit check `if (role === 'owner')` throws error
- ✅ Ownership is project-level only (enforced at service layer)

### Subject Validation
- ✅ **User subjects:** Must be project member (validated via `getUserProjectRole()`)
- ✅ **Group subjects:** 
  - Group must exist (query `team_groups`)
  - Group must not be archived (`archived_at IS NULL`)
  - **Note:** Teams and projects are independent entities. The resolver enforces the permission ceiling, so even if a group's team is not directly "associated" with the project, the project permission ceiling will prevent escalation.

### Entity Validation
- ✅ Entity must exist (resolves entity → projectId)
- ✅ Supports tracks and subtracks

### Idempotency
- ✅ Granting same permission twice returns existing grant (no error)
- ✅ Revoking twice is allowed (no error)
- ✅ Restoring revoked grant updates `revoked_at = NULL`

---

## Hard Constraints Confirmed

### ✅ This Service Does NOT:
- ❌ Resolve permissions (resolver handles that)
- ❌ Call `resolveEntityPermissions()` (authoring-only)
- ❌ Modify RLS (RLS exists from Phase 2)
- ❌ Touch other entities (only modifies `entity_permission_grants`)
- ❌ Grant ownership (explicitly blocked)
- ❌ Assume group membership implies permission (validates explicitly)
- ❌ Bypass feature flags (all functions check `ENABLE_ENTITY_GRANTS`)
- ❌ Throw on "already exists" cases (idempotent)

### ✅ This Service DOES:
- ✅ Create/restore grants (authoring)
- ✅ Revoke grants (soft delete)
- ✅ List grants (read-only)
- ✅ Validate project ownership
- ✅ Validate subjects
- ✅ Enforce role constraints

---

## Feature Flag Integration

**All functions start with:**
```typescript
if (!ENABLE_ENTITY_GRANTS) {
  throw new Error('Entity grants feature is disabled');
}
```

- ✅ No silent fallback
- ✅ Throws explicit error when feature is disabled

---

## Soft Revoke Implementation

**Confirmed:** All revocations are soft (no deletes)

- `revokeEntityPermission()` sets `revoked_at` timestamp
- Grants with `revoked_at IS NOT NULL` are considered revoked
- Restoration sets `revoked_at = NULL`
- No `DELETE` statements in code

---

## Escalation Prevention

**Important Note:** This service does NOT enforce the permission ceiling. The resolver enforces the ceiling.

**Why:** This service is authoring-only. It creates/revokes grants, but does not determine final permissions. The resolver (Phase 2.1) enforces that grants cannot exceed project permission level.

**Security:** Even if this service were to allow a grant that "exceeds" project permission, the resolver would cap it at the project permission level. This is by design - the service creates grants, the resolver applies them.

---

## Assumptions Made

### Minimal Assumptions:

1. **Teams and Projects Independence:**
   - Teams and projects are independent entities (no direct foreign key relationship)
   - Groups belong to teams, not projects
   - The requirement states "group must belong to a team associated with the project" but there's no direct association in the schema
   - **Decision:** Validate that group exists and is active. The resolver enforces the permission ceiling, preventing any security issues.

2. **Grant Restoration:**
   - When restoring a revoked grant, we update both `revoked_at = NULL` and `granted_by`/`granted_at` to reflect the restoration
   - This maintains audit trail (who restored, when)

3. **Error Handling:**
   - Supabase error code `PGRST116` means "no rows returned" (not an error for `maybeSingle()`)
   - Other errors are propagated with descriptive messages

---

## Data Model Usage

**Table:** `entity_permission_grants`

**Columns Used:**
- `id`, `entity_type`, `entity_id`, `subject_type`, `subject_id`, `permission_role`
- `granted_by`, `granted_at`, `revoked_at`

**Operations:**
- `INSERT`: Create new grant
- `UPDATE`: Restore revoked grant (`revoked_at = NULL`) or revoke active grant (`revoked_at = timestamp`)
- `SELECT`: Check existing grants, list grants

**No DELETE operations** (soft revoke only)

---

## Integration Points

This service is designed to be used by:
- UI components (grant/revoke permissions)
- API endpoints (permission management)
- Admin tools (permission inspection)

**Not used by:**
- Permission resolution (resolver handles that)
- Access checks (resolver handles that)
- RLS policies (RLS handles that)

---

## Testing Recommendations

**Unit Tests:**
- Grant creation (new grant)
- Grant restoration (revoked grant)
- Idempotency (granting twice)
- Project owner validation
- Subject validation (user must be member, group must exist)
- Role constraint (cannot grant owner)
- Soft revoke (sets revoked_at, doesn't delete)
- Revoke idempotency (revoking twice)

**Integration Tests:**
- RLS enforcement (non-owners cannot grant/revoke)
- List permissions (RLS access control)

---

## Next Steps

1. ✅ Entity Grants Service complete
2. ⏳ Test with feature flag OFF (should throw errors)
3. ⏳ Test with feature flag ON (grant/revoke/list operations)
4. ⏳ Integrate into UI/API (future phase)

---

## Notes

- **Authoring-Only:** This service creates/manages grants, but does not resolve permissions
- **No Resolver Logic:** Resolver is separate (Phase 2.1)
- **No Escalation Logic:** Resolver enforces ceiling, not this service
- **Backward Compatible:** Service is new, no existing code depends on it
- **Feature Flag Gated:** All functions check feature flag before proceeding

---

**End of Completion Summary**
