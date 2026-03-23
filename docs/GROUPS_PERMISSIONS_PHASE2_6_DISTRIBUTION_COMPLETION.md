# Phase 2.6: Group Distribution Services - Completion Summary

**Status:** ✅ Complete  
**Date:** January 2025  
**Files:** 
- `src/lib/distribution/taskDistributionService.ts`
- `src/lib/distribution/eventDistributionService.ts`

---

## Files Created

### Created
1. **`src/lib/distribution/taskDistributionService.ts`**
   - Task distribution service (284 lines)
   - Three exported functions: `distributeTaskToGroup()`, `revokeTaskProjection()`, `listTaskProjections()`

2. **`src/lib/distribution/eventDistributionService.ts`**
   - Calendar event distribution service (277 lines)
   - Three exported functions: `distributeCalendarEventToGroup()`, `revokeCalendarProjection()`, `listCalendarProjectionsForEvent()`

---

## Exported Functions

### taskDistributionService.ts

#### 1. `distributeTaskToGroup()`
**Signature:**
```typescript
distributeTaskToGroup(
  taskId: string,
  groupId: string,
  distributedBy: string, // profiles.id
  options?: {
    canEdit?: boolean;
    canComplete?: boolean;
    status?: 'pending' | 'accepted' | 'declined' | 'revoked';
  }
): Promise<{ created: number; skipped: number }>
```

**Behavior:**
- Validates group exists and not archived
- Validates `distributedBy` can distribute task (task owner only - via `event_tasks.event_id → calendar_events.user_id`)
- Resolves group members (active team members only)
- Creates one `task_projections` row per member
- **Idempotent:** If `(task_id, target_user_id)` already exists, counts as skipped
- Bulk insert for performance
- Returns counts of created and skipped projections

#### 2. `revokeTaskProjection()`
**Signature:**
```typescript
revokeTaskProjection(
  taskId: string,
  targetUserId: string, // auth.users.id
  revokedBy: string // profiles.id
): Promise<void>
```

**Behavior:**
- Validates `revokedBy` can revoke (task owner only)
- Soft revoke: sets `status='revoked'` and `revoked_at=now()`
- **Idempotent:** If already revoked, does nothing
- If no projection exists, does nothing (idempotent)

#### 3. `listTaskProjections()`
**Signature:**
```typescript
listTaskProjections(taskId: string): Promise<TaskProjection[]>
```

**Behavior:**
- Returns all projections for a task (all statuses)
- RLS handles access control
- Ordered by `created_at` descending

### eventDistributionService.ts

#### 1. `distributeCalendarEventToGroup()`
**Signature:**
```typescript
distributeCalendarEventToGroup(
  eventId: string,
  groupId: string,
  distributedBy: string, // profiles.id
  options?: {
    scope?: ProjectionScope;
    canEdit?: boolean;
    status?: ProjectionStatus;
  }
): Promise<{ created: number; skipped: number }>
```

**Behavior:**
- Validates group exists and not archived
- Validates `distributedBy` can distribute event (event owner only - via `context_events.created_by`)
- Resolves group members (active team members only)
- Creates one `calendar_projections` row per member
- Targets personal calendar (`target_space_id = null`)
- **Idempotent:** If `(event_id, target_user_id, target_space_id)` already exists, counts as skipped
- Bulk insert for performance
- Returns counts of created and skipped projections

#### 2. `revokeCalendarProjection()`
**Signature:**
```typescript
revokeCalendarProjection(
  eventId: string,
  targetUserId: string, // auth.users.id
  revokedBy: string, // profiles.id
  targetSpaceId?: string | null
): Promise<void>
```

**Behavior:**
- Validates `revokedBy` can revoke (event owner only)
- Soft revoke: sets `status='revoked'` and `revoked_at=now()`
- Supports optional `targetSpaceId` (defaults to personal calendar if not provided)
- **Idempotent:** If already revoked, does nothing
- If no projection exists, does nothing (idempotent)

#### 3. `listCalendarProjectionsForEvent()`
**Signature:**
```typescript
listCalendarProjectionsForEvent(eventId: string): Promise<CalendarProjection[]>
```

**Behavior:**
- Returns all projections for an event (all statuses, including group-sourced)
- RLS handles access control
- Ordered by `created_at` descending

---

## Validation Rules Enforced

### Group Validation
- ✅ Group must exist
- ✅ Group must not be archived

### Distribution Authorization
- ✅ **Tasks:** Only task owner can distribute (via `event_tasks.user_id` or `event_tasks.event_id → calendar_events.user_id`)
- ✅ **Events:** Only event owner can distribute (via `context_events.created_by`)
- ✅ Authorization checked before distribution and revocation

### Team Membership Validation
- ✅ Only active team members receive projections
- ✅ Group members validated against `team_members` table with `status = 'active'`
- ✅ Profile IDs converted to `auth.users.id` for projection target

### Projection Uniqueness
- ✅ **Tasks:** One projection per `(task_id, target_user_id)`
- ✅ **Events:** One projection per `(event_id, target_user_id, target_space_id)`
- ✅ Existing projections are skipped (idempotent)

---

## Idempotency Guarantees

### distributeTaskToGroup() / distributeCalendarEventToGroup()
- ✅ If projection already exists for user, counts as skipped (no error)
- ✅ Returns counts: `{ created, skipped }`
- ✅ No duplicate projections created

### revokeTaskProjection() / revokeCalendarProjection()
- ✅ If projection doesn't exist, does nothing (no error)
- ✅ If projection already revoked, does nothing (no error)
- ✅ Safe to call multiple times

---

## Hard Constraints Confirmed

### ✅ These Services Do NOT:
- ❌ Dynamically update projections when group membership changes (Option A semantics - snapshot at distribution time)
- ❌ Create assignment fields on tasks/events (projections are separate)
- ❌ Duplicate the source task/event (projections reference source entities)
- ❌ Implement UI (service layer only)
- ❌ Modify schema or RLS (uses existing schema)
- ❌ Implement complex conflict resolution (last writer wins is fine)

### ✅ These Services DO:
- ✅ Create projections to users via groups
- ✅ Validate distribution authorization
- ✅ Validate team membership
- ✅ Bulk insert for performance
- ✅ Rely on RLS for access control
- ✅ Support snapshot semantics (Option A)

---

## Feature Flag Integration

**All functions start with:**
```typescript
if (!ENABLE_GROUP_DISTRIBUTION) {
  throw new Error('Group distribution feature is disabled');
}
```

- ✅ No silent fallback
- ✅ Throws explicit error when feature is disabled

---

## Data Model Usage

### task_projections Table
**Columns Used:**
- `task_id`, `target_user_id`, `source_group_id`, `can_edit`, `can_complete`, `status`, `created_by`, `created_at`, `accepted_at`, `revoked_at`

**Operations:**
- `INSERT`: Create projections (bulk)
- `UPDATE`: Revoke projections (soft delete)
- `SELECT`: List projections, check existing

### calendar_projections Table
**Columns Used:**
- `event_id`, `target_user_id`, `target_space_id`, `source_group_id`, `scope`, `status`, `can_edit`, `created_by`, `created_at`, `accepted_at`, `declined_at`, `revoked_at`

**Operations:**
- `INSERT`: Create projections (bulk, personal calendar only: `target_space_id = null`)
- `UPDATE`: Revoke projections (soft delete)
- `SELECT`: List projections, check existing

---

## Assumptions Made

### Minimal Assumptions:

1. **Task Ownership:**
   - Standalone tasks: ownership via `event_tasks.user_id`
   - Event-linked tasks: ownership via `event_tasks.event_id → calendar_events.user_id`
   - Assumes this ownership model is correct (simplified for MVP)

2. **Event Ownership:**
   - Ownership via `context_events.created_by` (references `auth.users.id`)
   - Assumes event creator is the owner who can distribute

3. **Profile/User ID Conversion:**
   - Group memberships store `profiles.id` in `team_group_members.user_id`
   - Projections require `auth.users.id` for `target_user_id` and `created_by`
   - Service converts between the two via `profiles.user_id` mapping
   - Assumes all active team members have valid profile → user mappings

4. **Personal Calendar Distribution:**
   - Events distributed to personal calendars only (`target_space_id = null`)
   - Shared space distribution not implemented in this phase
   - Follows existing calendar projection patterns

5. **Team Membership Validation:**
   - Only active team members receive projections
   - Validates `team_members.status = 'active'` for each group member
   - Assumes group members must also be team members (enforced by service logic)

6. **Bulk Insert Performance:**
   - Uses bulk insert for creating multiple projections
   - Pre-fetches existing projections to compute delta (idempotency)
   - Assumes PostgREST supports bulk inserts (confirmed)

---

## Performance Considerations

### Optimizations:
- ✅ **Pre-fetch existing projections:** Single query to get all existing projections before insert
- ✅ **Bulk insert:** Creates all projections in one query
- ✅ **Team membership validation:** Single query to validate all group members
- ✅ **Profile → User ID conversion:** Single query to convert all profile IDs

### Query Patterns:
- Avoids N+1 queries by batching operations
- Uses Set-based lookups for idempotency checks
- Filters active members before creating projections

---

## Integration Points

These services are designed to be used by:
- UI components (distribution workflows, projection management)
- API endpoints (distribute tasks/events to groups)
- Workflow automation (bulk distribution)

**Not used by:**
- Permission resolution (separate concern)
- Group management (separate service)
- Entity grants (separate service)

---

## Testing Recommendations

**Unit Tests:**
- Distribute task to group (valid input)
- Distribute event to group (valid input)
- Distribute to archived group (should error)
- Distribute without authorization (should error)
- Distribute idempotency (distributing twice)
- Revoke projection (valid input)
- Revoke non-existent projection (idempotent)
- Revoke already revoked projection (idempotent)
- List projections (RLS enforcement)

**Integration Tests:**
- RLS enforcement (non-owners cannot distribute/revoke)
- Team membership validation
- Bulk insert performance
- Profile → User ID conversion

---

## Next Steps

1. ✅ Task & Event Distribution Services complete
2. ⏳ Test with feature flag OFF (should throw errors)
3. ⏳ Test with feature flag ON (distribution operations)
4. ⏳ Integrate into UI/API (future phase)
5. ⏳ Add distribution workflows (future phase)

---

## Notes

- **Snapshot Semantics (Option A):** Projections are created at distribution time and do not automatically update when group membership changes
- **No Dynamic Updates:** Removing someone from a group does NOT revoke existing projections (by design)
- **Performance Optimized:** Uses bulk inserts and batch queries to avoid N+1 issues
- **Backward Compatible:** Services are new, no existing code depends on them
- **Feature Flag Gated:** All functions check feature flag before proceeding
- **Idempotent Operations:** Distribution and revocation operations are idempotent for safety

---

**End of Completion Summary**
