# Phase 2.5: Team Groups & Membership Services - Completion Summary

**Status:** ✅ Complete  
**Date:** January 2025  
**Files:** 
- `src/lib/groups/teamGroupsService.ts`
- `src/lib/groups/teamGroupMembersService.ts`

---

## Files Created

### Created
1. **`src/lib/groups/teamGroupsService.ts`**
   - Team groups management service (278 lines)
   - Five exported functions: `createGroup()`, `renameGroup()`, `archiveGroup()`, `listGroups()`, `getGroup()`

2. **`src/lib/groups/teamGroupMembersService.ts`**
   - Team group membership management service (240 lines)
   - Four exported functions: `addMember()`, `removeMember()`, `listMembers()`, `listUserGroups()`

---

## Exported Functions

### teamGroupsService.ts

#### 1. `createGroup()`
**Signature:**
```typescript
createGroup(
  teamId: string,
  name: string,
  description?: string,
  createdBy?: string // profiles.id
): Promise<TeamGroup>
```

**Behavior:**
- Validates `createdBy` is team owner or admin (if provided)
- Validates group name is unique per team (case-insensitive, active groups only)
- Creates group with `archived_at = NULL` (active)
- No implicit members added

#### 2. `renameGroup()`
**Signature:**
```typescript
renameGroup(
  groupId: string,
  name: string,
  renamedBy: string
): Promise<void>
```

**Behavior:**
- Validates `renamedBy` is team owner or admin
- Cannot rename archived groups (throws error)
- Validates new name is unique (case-insensitive, excluding current group)

#### 3. `archiveGroup()`
**Signature:**
```typescript
archiveGroup(
  groupId: string,
  archivedBy: string
): Promise<void>
```

**Behavior:**
- Validates `archivedBy` is team owner or admin
- Soft archive (sets `archived_at` timestamp)
- **Idempotent:** If already archived, does nothing
- Members remain (historical integrity)

#### 4. `listGroups()`
**Signature:**
```typescript
listGroups(teamId: string): Promise<TeamGroup[]>
```

**Behavior:**
- Returns active + archived groups
- RLS handles visibility
- Ordered by `created_at` descending

#### 5. `getGroup()`
**Signature:**
```typescript
getGroup(groupId: string): Promise<TeamGroup | null>
```

**Behavior:**
- Returns single group by ID
- RLS handles access control
- Returns `null` if not found

### teamGroupMembersService.ts

#### 1. `addMember()`
**Signature:**
```typescript
addMember(
  groupId: string,
  userId: string, // profiles.id
  addedBy: string // profiles.id
): Promise<void>
```

**Behavior:**
- Validates `addedBy` is team owner or admin
- Validates `userId` is team member (active status)
- Group must not be archived
- **Idempotent:** If user already a member, does nothing

#### 2. `removeMember()`
**Signature:**
```typescript
removeMember(
  groupId: string,
  userId: string, // profiles.id
  removedBy: string // profiles.id
): Promise<void>
```

**Behavior:**
- Validates `removedBy` is team owner or admin
- **Idempotent:** If user not a member, does nothing
- Hard delete (removes membership row)

#### 3. `listMembers()`
**Signature:**
```typescript
listMembers(groupId: string): Promise<GroupMember[]>
```

**Behavior:**
- Returns all members of a group
- RLS handles access control
- Ordered by `created_at` ascending

#### 4. `listUserGroups()`
**Signature:**
```typescript
listUserGroups(
  teamId: string,
  userId: string // profiles.id
): Promise<TeamGroup[]>
```

**Behavior:**
- Returns only active groups user belongs to
- Used by permission resolver and UI
- Filters out archived groups

---

## Validation Rules Enforced

### Team Admin/Owner Validation
- ✅ All mutation functions validate user is team owner or admin
- ✅ Helper function `canManageTeamGroups()` checks `team_members.role IN ('owner', 'admin')` and `status = 'active'`
- ✅ Used in: `createGroup()`, `renameGroup()`, `archiveGroup()`, `addMember()`, `removeMember()`

### Team Membership Validation
- ✅ `addMember()` validates `userId` is active team member
- ✅ Helper function `isTeamMember()` checks `team_members.status = 'active'`

### Group State Validation
- ✅ `renameGroup()`: Cannot rename archived groups
- ✅ `addMember()`: Cannot add members to archived groups
- ✅ `archiveGroup()`: Idempotent (already archived = no-op)

### Name Uniqueness Validation
- ✅ `createGroup()`: Group name must be unique per team (case-insensitive, active groups only)
- ✅ `renameGroup()`: New name must be unique (excluding current group)

### Entity Validation
- ✅ All functions validate group exists
- ✅ All functions validate team exists (via group lookup)

---

## Idempotency Guarantees

### teamGroupsService.ts
- ✅ `archiveGroup()`: Archiving twice does nothing (no error)
- ✅ `createGroup()`: Throws error if name exists (not idempotent by design - use unique names)

### teamGroupMembersService.ts
- ✅ `addMember()`: Adding same member twice does nothing (no error)
- ✅ `removeMember()`: Removing non-member does nothing (no error)

---

## Hard Constraints Confirmed

### ✅ These Services Do NOT:
- ❌ Resolve permissions (resolver handles that)
- ❌ Reference projects (team-scoped only)
- ❌ Call permission resolver (no permission logic)
- ❌ Distribute tasks or events (separate service)
- ❌ Grant permissions (separate service)
- ❌ Modify RLS (RLS exists from Phase 2)
- ❌ Cascade deletes (membership deletion is explicit)
- ❌ Auto-add creators as members (explicit add required)
- ❌ Allow non-admins to mutate groups (validates admin/owner role)

### ✅ These Services DO:
- ✅ Create/manage groups (team-scoped)
- ✅ Manage group membership
- ✅ Validate team membership
- ✅ Validate admin/owner role
- ✅ Enforce group name uniqueness
- ✅ Soft archive groups
- ✅ Rely on RLS for access control

---

## Feature Flag Integration

**All functions start with:**
```typescript
if (!ENABLE_GROUPS) {
  throw new Error('Groups feature is disabled');
}
```

- ✅ No silent fallback
- ✅ Throws explicit error when feature is disabled

---

## Data Model Usage

### team_groups Table
**Columns Used:**
- `id`, `team_id`, `name`, `description`, `created_by`, `created_at`, `updated_at`, `archived_at`

**Operations:**
- `INSERT`: Create group
- `UPDATE`: Rename group, archive group
- `SELECT`: List groups, get group

### team_group_members Table
**Columns Used:**
- `id`, `group_id`, `user_id`, `added_by`, `created_at`

**Operations:**
- `INSERT`: Add member
- `DELETE`: Remove member (hard delete - membership, not revocation)
- `SELECT`: List members, list user groups

---

## Assumptions Made

### Minimal Assumptions:

1. **Team Membership Status:**
   - Uses `team_members.status = 'active'` to validate membership
   - Assumes status enum includes 'active' (per schema)

2. **Team Member Roles:**
   - Uses `team_members.role IN ('owner', 'admin')` for admin validation
   - Assumes role enum includes 'owner' and 'admin' (per schema)

3. **Group Name Uniqueness:**
   - Case-insensitive comparison using `ilike` for name uniqueness
   - Only checks active groups (archived groups can have duplicate names)
   - This aligns with the unique index which is partial (WHERE archived_at IS NULL)

4. **Membership Deletion:**
   - Uses hard DELETE for membership (not soft delete)
   - Membership is not a revocation - it's a simple join table
   - Removing a member is a straightforward delete operation

5. **Team Existence:**
   - Validates team exists before creating group
   - Foreign key constraint will also enforce this, but explicit check provides better error message

---

## Integration Points

These services are designed to be used by:
- UI components (group management, membership management)
- Permission resolver (Phase 2.1 - uses `listUserGroups()`)
- Distribution services (future - will use groups for distribution)
- API endpoints (group and membership management)

**Not used by:**
- Permission resolution (resolver uses groups, but doesn't call these services directly - it queries the tables)
- Project services (team-scoped only)
- Entity grants (separate concept)

---

## Testing Recommendations

**Unit Tests:**
- Create group (valid input)
- Create group (duplicate name - should error)
- Rename group (valid input)
- Rename archived group (should error)
- Archive group (valid input)
- Archive group idempotency (archiving twice)
- Add member (valid input)
- Add member idempotency (adding twice)
- Add member to archived group (should error)
- Add non-team-member (should error)
- Remove member (valid input)
- Remove member idempotency (removing non-member)
- List groups (RLS enforcement)
- List members (RLS enforcement)
- List user groups (only active groups)

**Integration Tests:**
- RLS enforcement (non-admins cannot mutate)
- Team membership validation
- Group name uniqueness enforcement

---

## Next Steps

1. ✅ Team Groups & Membership Services complete
2. ⏳ Test with feature flag OFF (should throw errors)
3. ⏳ Test with feature flag ON (CRUD operations)
4. ⏳ Integrate into UI/API (future phase)
5. ⏳ Use in permission resolver (already queries tables directly)

---

## Notes

- **Team-Scoped Only:** These services operate strictly at the team level
- **No Permission Logic:** Services manage groups/membership, not permissions
- **RLS Reliance:** Services assume RLS enforces access - they validate business rules
- **Backward Compatible:** Services are new, no existing code depends on them
- **Feature Flag Gated:** All functions check feature flag before proceeding
- **Idempotent Operations:** Add/remove operations are idempotent for safety

---

**End of Completion Summary**
