# SharedMinds Architecture Extension: Groups + Permissions + Distribution

**Status:** Architectural Extension Design Document  
**Date:** January 2025  
**Purpose:** Minimal, incremental extension plan for adding team-scoped groups, entity-level permissions, creator default rights, and group-based distribution to the existing SharedMinds architecture.

**Based on:** `ARCHITECTURE_BASELINE_TEAMS_PERMISSIONS_COLLABORATION.md` (January 2025)

---

## Architectural Extension Overview

### Goals

Extend the existing SharedMinds architecture with:

1. **Team-Scoped Groups** - Groups that belong to teams, used for permission scoping and distribution
2. **Entity-Level Permissions** - Track and subtrack-level permission grants (beyond project-level)
3. **Creator Default Edit Rights** - Automatic edit permissions for entity creators (revocable by owners)
4. **Group-Based Distribution** - Tasks and calendar events distributed via groups using projection pattern

### Design Principles

- ✅ **Additive Only** - No breaking changes to existing systems
- ✅ **Reuse Existing Patterns** - Leverage calendar projection model for distribution
- ✅ **Backward Compatible** - Single-user workflows continue unchanged
- ✅ **Incremental Rollout** - Can ship features behind flags
- ✅ **Preserve Separation** - Teams ≠ Groups ≠ Contact Groups (distinct concepts)

### Scope Boundaries

**What This Extension Adds:**
- Team-scoped groups (new table)
- Entity-level permission grants table (tracks, subtracks)
- Creator provenance tracking (additive columns)
- Group-based distribution services (using projection pattern)

**What This Extension Does NOT Change:**
- `project_users` table (unchanged)
- `team_members` table (unchanged)
- `contact_groups` table (unchanged - different concept)
- Existing RLS policies (additive only)
- Existing permission helper functions (extended, not replaced)

---

## 1. Reuse Analysis

### Tables That Can Be Reused Without Modification ✅

**1. `project_users`**
- **Status:** ✅ **UNTOUCHED**
- **Reason:** Remains the authoritative source for project-level permissions
- **Usage:** Base layer for permission resolution; grants are checked **in addition to** project membership

**2. `team_members`**
- **Status:** ✅ **UNTOUCHED**
- **Reason:** Team membership model is complete
- **Usage:** Used to determine who can create/manage groups within a team

**3. `teams`**
- **Status:** ✅ **UNTOUCHED**
- **Reason:** Team structure is complete
- **Usage:** Groups will reference `teams.id` as parent scope

**4. `contact_groups`**
- **Status:** ✅ **UNTOUCHED**
- **Reason:** Different concept (user-owned vs team-scoped)
- **Usage:** Remains for personal contact management; not used for team permission groups

**5. `calendar_projections`**
- **Status:** ✅ **REUSED AS PATTERN**
- **Reason:** Proven model for distributing events to multiple users
- **Usage:** Extend pattern for task/event distribution via groups

**6. `guardrails_tracks`, `guardrails_subtracks`**
- **Status:** ✅ **ADDITIVE COLUMNS ONLY**
- **Reason:** Add `created_by` column; no structural changes
- **Usage:** Track creator for default edit rights

### Services That Can Be Reused With Small Extensions ⚠️

**1. `src/lib/guardrails/projectUserService.ts`**
- **Current:** Project-level permission checks
- **Extension Needed:** 
  - Add `resolveEntityPermissions()` function that combines project + entity grants + creator rights
  - Extend `canUserEditProject()` → `canUserEditEntity(entityType, entityId, userId)`
- **Backward Compatibility:** Existing functions unchanged; new functions added

**2. `src/lib/guardrails/ai/aiPermissions.ts`**
- **Current:** `canUserAccessProject()`, `canUserAccessTrack()`, `canUserAccessRoadmapItem()`
- **Extension Needed:**
  - `canUserAccessTrack()` checks entity grants in addition to project membership
  - `canUserEditTrack()` includes creator default rights
- **Backward Compatibility:** Existing functions return same results if no grants exist

**3. `src/lib/permissions/types.ts`**
- **Current:** Canonical permission types defined
- **Extension Needed:**
  - ✅ Types already support `subject_type: 'group'` (no change)
  - Add `PermissionGrant` table mapping to database schema
- **Backward Compatibility:** Type definitions unchanged; implementation added

**4. `src/lib/contextSovereign/projectionsService.ts`**
- **Current:** Calendar projection service
- **Extension Needed:**
  - `projectToGroup()` function - creates projections for all group members
  - Reuse `projectToAllMembers()` pattern but for groups instead of context members
- **Backward Compatibility:** Existing functions unchanged

### Functions That Must Remain Untouched 🔒

**1. `user_has_project_permission()` (database function)**
- **Status:** 🔒 **UNTOUCHED**
- **Reason:** Core project permission logic; used by RLS policies
- **Impact:** New permission resolution runs **in addition to** this check

**2. `has_team_permission()` (database function)**
- **Status:** 🔒 **UNTOUCHED**
- **Reason:** Team membership checks
- **Impact:** Used to verify group creation/management permissions

**3. `auto_add_project_owner()` (trigger)**
- **Status:** 🔒 **UNTOUCHED**
- **Reason:** Project creation workflow
- **Impact:** No changes needed

**4. RLS Policies on `project_users`, `team_members`, `teams`**
- **Status:** 🔒 **UNTOUCHED**
- **Reason:** Existing security model must remain intact
- **Impact:** New grants table has its own RLS policies

### Tables Requiring Small Extensions 🔧

**1. `guardrails_tracks` / `guardrails_tracks_v2`**
- **Extension:** Add `created_by uuid REFERENCES profiles(id)`
- **Migration:** Backfill from `master_projects.user_id` for existing tracks
- **Reason:** Track creator for default edit rights

**2. `guardrails_subtracks`**
- **Extension:** Add `created_by uuid REFERENCES profiles(id)`
- **Migration:** Backfill from parent track's `created_by` or project owner
- **Reason:** Subtrack creator for default edit rights

**3. `roadmap_items`**
- **Extension:** Add `created_by uuid REFERENCES profiles(id)` (optional, future)
- **Reason:** Creator attribution (not used for permissions initially)
- **Note:** Can be added later; not required for MVP

---

## 2. New Foundational Additions (Conceptual Model)

### A. Team-Scoped Groups

**Conceptual Model:**

Groups are **team-scoped collections of users** used for:
- Permission scoping (grant track access to a group)
- Task/event distribution (assign to group members)
- Visibility management (show track to specific group)

**Key Differences from Contact Groups:**

| Aspect | Contact Groups | Team-Scoped Groups |
|--------|---------------|-------------------|
| **Ownership** | User-owned (`owner_user_id`) | Team-owned (`team_id`) |
| **Scope** | Personal contact management | Team collaboration |
| **Membership** | Contacts (may not have accounts) | Team members only (`team_members.user_id`) |
| **Purpose** | Sharing personal contacts | Permission grants, distribution |
| **Lifecycle** | Independent of teams | Cannot exist without team |

**Database Model (Conceptual):**

```
table: team_groups
  - id: uuid (PK)
  - team_id: uuid (FK → teams.id, CASCADE DELETE)
  - name: text (NOT NULL)
  - description: text
  - created_by: uuid (FK → profiles.id)
  - created_at: timestamptz
  - updated_at: timestamptz
  - archived_at: timestamptz (soft delete)
  
  UNIQUE(team_id, name) -- Group names unique within team

table: team_group_members
  - id: uuid (PK)
  - group_id: uuid (FK → team_groups.id, CASCADE DELETE)
  - user_id: uuid (FK → profiles.id, via team_members.user_id)
  - added_by: uuid (FK → profiles.id)
  - created_at: timestamptz
  
  UNIQUE(group_id, user_id) -- User can only be in group once
  
  CONSTRAINT: user_id must be active member of team
```

**Membership Rules:**
- Only active team members can be added to team groups
- Group membership is validated against `team_members` (user must be in team first)
- When user leaves team, they are automatically removed from all team groups (cascade via RLS or trigger)

**Permission Model:**
- Team owners/admins can create groups
- Team owners/admins can manage group membership
- Team members can view groups in their teams
- Groups cannot grant permissions that exceed team member's project permissions

**Service Layer:**
- `src/lib/groups/teamGroupsService.ts` - CRUD for team groups
- `src/lib/groups/groupMembersService.ts` - Group membership management
- `src/lib/groups/groupPermissionService.ts` - Permission resolution via groups

### B. Entity-Level Permission Grants

**Conceptual Model:**

Permission grants allow **fine-grained access control** at the entity level (tracks, subtracks) **in addition to** project-level permissions.

**Key Principles:**
- Grants are **additive** to project permissions (cannot restrict below project level)
- Grants are **checked after** project membership (if user has no project access, grants don't apply)
- Grants can be made to **users** or **groups** (group membership resolved at query time)

**Database Model (Conceptual):**

```
table: entity_permission_grants
  - id: uuid (PK)
  - entity_type: text (NOT NULL) -- 'track', 'subtrack', 'roadmap_item'
  - entity_id: uuid (NOT NULL)
  - subject_type: text (NOT NULL) -- 'user', 'group', 'team'
  - subject_id: uuid (NOT NULL) -- references profiles.id, team_groups.id, or teams.id
  - permission_role: text (NOT NULL) -- 'viewer', 'editor', 'owner' (maps to PermissionRole)
  - granted_by: uuid (FK → profiles.id)
  - granted_at: timestamptz
  - revoked_at: timestamptz (soft delete)
  
  UNIQUE(entity_type, entity_id, subject_type, subject_id) WHERE revoked_at IS NULL
  
  INDEX(entity_type, entity_id) -- Fast lookup by entity
  INDEX(subject_type, subject_id) -- Fast lookup by subject
```

**Grant Resolution Rules:**
1. Project membership is checked first (base layer)
2. Entity grants are checked second (refinement layer)
3. Highest permission level wins (if user has project `viewer` but track grant `editor`, they get `editor`)
4. Group grants resolve to individual user grants at query time

**Entity Types Supported:**
- `'track'` - Guardrails tracks
- `'subtrack'` - Guardrails subtracks
- Future: `'roadmap_item'`, `'mind_mesh_node'` (not in MVP)

**Subject Types Supported:**
- `'user'` - Individual user (references `profiles.id`)
- `'group'` - Team group (references `team_groups.id`)
- Future: `'team'` - Entire team (references `teams.id`, not in MVP)

**Permission Roles:**
- Maps to canonical `PermissionRole`: `'viewer'`, `'editor'`, `'owner'`
- Roles are converted to `PermissionFlags` using `roleToFlags()`
- Role hierarchy: `owner > editor > viewer`

**Service Layer:**
- `src/lib/permissions/entityGrantsService.ts` - CRUD for entity grants
- `src/lib/permissions/grantResolutionService.ts` - Resolve grants to effective permissions
- Integration with `projectUserService.ts` for combined resolution

### C. Creator Default Edit Rights

**Conceptual Model:**

When a user creates a track or subtrack, they **automatically receive edit permissions** for that entity, even if their project role is `viewer`. This is a **default right** that can be **revoked by project owners**.

**Key Principles:**
- Creator rights are **implicit** (not stored as explicit grants)
- Creator rights are **evaluated at resolution time** (checked after project permissions, before entity grants)
- Creator rights can be **revoked** by project owners (stored as exclusion list)
- Creator rights are **additive** (cannot restrict below project level)

**Database Model (Conceptual):**

```
table: creator_rights_revocations
  - id: uuid (PK)
  - entity_type: text (NOT NULL) -- 'track', 'subtrack'
  - entity_id: uuid (NOT NULL)
  - creator_user_id: uuid (FK → profiles.id) -- Creator whose rights were revoked
  - revoked_by: uuid (FK → profiles.id) -- Project owner who revoked
  - revoked_at: timestamptz
  
  UNIQUE(entity_type, entity_id, creator_user_id) -- Can only revoke once
  
  INDEX(entity_type, entity_id) -- Fast lookup by entity
```

**Resolution Logic:**
1. Check if user is creator (`entity.created_by = user_id`)
2. Check if creator rights were revoked (`creator_rights_revocations` table)
3. If creator AND not revoked: Grant `editor` role (regardless of project role)
4. If revoked: Fall back to project permissions + entity grants

**Revocation Rules:**
- Only project `owner` can revoke creator rights
- Revocation is **permanent** (no undo - must re-grant via entity grant if needed)
- Revocation affects **only** the creator's automatic rights (they can still get permissions via grants)

**Service Layer:**
- `revokeCreatorRights(entityType, entityId, creatorUserId, revokedBy)` - Revoke creator default rights
- Integration in `grantResolutionService.ts` - Creator rights checked during resolution

**Provenance Tracking:**

Add `created_by` column to:
- `guardrails_tracks` / `guardrails_tracks_v2`
- `guardrails_subtracks`

Migration strategy:
- For existing tracks: Backfill from `master_projects.user_id` (project creator becomes track creator)
- For existing subtracks: Backfill from parent track's `created_by`
- For new tracks: Set during creation from `userId` parameter

---

## 3. Permission Resolution Model

### Resolution Order (Deterministic)

Permission resolution follows a **strict priority order** where later checks can **increase** permissions but never **decrease** them below the base project level.

**Step 1: Project Base Permissions**
```
Check: project_users.role WHERE user_id = ? AND master_project_id = ?
Result: 'owner' | 'editor' | 'viewer' | null (no access)
```

**Step 2: Creator Default Rights** (if applicable)
```
Check: entity.created_by = user_id AND NOT EXISTS (creator_rights_revocations)
Result: If true, grant 'editor' role (if project permission allows)
Note: Creator rights cannot exceed project permission (if project = 'viewer', creator still = 'viewer')
```

**Step 3: Entity-Level Grants** (explicit grants)
```
Check: entity_permission_grants WHERE entity_type = ? AND entity_id = ?
  - Direct user grants: subject_type = 'user' AND subject_id = user_id
  - Group grants: subject_type = 'group' AND subject_id IN (user's group memberships)
Result: Highest role found ('owner' > 'editor' > 'viewer')
```

**Step 4: Final Permission Calculation**
```
base_role = project_users.role (Step 1)
creator_role = 'editor' if creator AND not revoked (Step 2)
grant_role = highest from entity grants (Step 3)

final_role = max(base_role, creator_role, grant_role)
Where: 'owner' > 'editor' > 'viewer'
```

### Resolution Function Signature

```typescript
interface PermissionResolutionContext {
  userId: string;
  projectId: string;
  entityType: 'track' | 'subtrack';
  entityId: string;
}

interface ResolvedPermissions {
  role: 'owner' | 'editor' | 'viewer' | null;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  source: {
    projectRole?: 'owner' | 'editor' | 'viewer';
    creatorRights?: boolean;
    creatorRevoked?: boolean;
    entityGrants?: Array<{ subjectType: string; role: string }>;
  };
}

async function resolveEntityPermissions(
  context: PermissionResolutionContext
): Promise<ResolvedPermissions>
```

### Integration Points

**1. Existing `canUserAccessProject()` Function:**
- **Status:** ✅ **UNCHANGED**
- **Usage:** Called first in resolution chain
- **Return:** Project role or null (no access)

**2. New `canUserEditEntity()` Function:**
```typescript
async function canUserEditEntity(
  userId: string,
  entityType: 'track' | 'subtrack',
  entityId: string
): Promise<boolean> {
  const resolved = await resolveEntityPermissions({
    userId,
    projectId: await getEntityProjectId(entityType, entityId),
    entityType,
    entityId,
  });
  
  return resolved.role === 'owner' || resolved.role === 'editor';
}
```

**3. Existing `canUserAccessTrack()` Function:**
- **Status:** ⚠️ **EXTENDED** (backward compatible)
- **Current:** Only checks project membership
- **Extension:** Also checks entity grants and creator rights
- **Backward Compatibility:** Returns same result if no grants exist

**4. RLS Policy Updates:**
- **Status:** ⚠️ **ADDITIVE ONLY**
- **Strategy:** Add new RLS function that calls `resolveEntityPermissions()`
- **Existing Policies:** Remain unchanged; new policies added for grant tables

**Example RLS Function:**
```sql
CREATE FUNCTION user_can_edit_track(p_user_id uuid, p_track_id uuid)
RETURNS boolean AS $$
  -- Calls resolveEntityPermissions() logic
  -- Checks: project_users + creator rights + entity_permission_grants
$$;
```

**5. Service Layer Integration:**
- **Status:** ⚠️ **EXTENDED**
- **Pattern:** Existing services call `resolveEntityPermissions()` when `userId` provided
- **Fallback:** If `userId` not provided, use existing RLS-only checks (backward compatible)

---

## 4. Distribution Model (Tasks & Calendar Events)

### Conceptual Model

Tasks and calendar events are **authored once** and **distributed to multiple users via groups** using the **projection pattern** (same as calendar projections).

**Key Principles:**
- **Single Source of Truth** - Event/task exists once, referenced by projections
- **Explicit Distribution** - No automatic distribution; must explicitly project to groups
- **Group Membership Resolution** - Projections created for all group members at distribution time
- **Independent Lifecycle** - Event/task can be deleted without affecting projections (cascade handled)

### Task Distribution Model

**Conceptual Flow:**

1. **Author Creates Task:**
   ```
   task = createTask({ title, description, due_date, ... })
   task.owner_user_id = creator
   ```

2. **Author Distributes to Group:**
   ```
   distributeTaskToGroup(taskId, groupId, permissions)
   → Resolves group membership
   → Creates task_projections for each group member
   → Sets permissions per projection
   ```

3. **Group Members See Task:**
   ```
   getUserTasks(userId)
   → Queries: tasks WHERE owner_user_id = userId (owned)
   → UNION: task_projections WHERE target_user_id = userId AND status = 'accepted' (projected)
   ```

**Database Model (Conceptual):**

```
table: task_projections
  - id: uuid (PK)
  - task_id: uuid (FK → tasks.id, CASCADE DELETE)
  - target_user_id: uuid (FK → profiles.id)
  - source_group_id: uuid (FK → team_groups.id) -- Which group this came from
  - can_edit: boolean (default: false)
  - can_complete: boolean (default: true)
  - status: 'pending' | 'accepted' | 'declined' | 'revoked'
  - created_by: uuid (FK → profiles.id)
  - created_at: timestamptz
  - accepted_at: timestamptz
  - revoked_at: timestamptz
  
  UNIQUE(task_id, target_user_id) -- One projection per user per task
  INDEX(target_user_id, status) -- Fast lookup for user's tasks
```

**Distribution Service:**
```typescript
async function distributeTaskToGroup(
  taskId: string,
  groupId: string,
  options: {
    canEdit?: boolean;
    canComplete?: boolean;
  }
): Promise<{ created: number; skipped: number }> {
  // 1. Get all active group members
  const members = await getGroupMembers(groupId);
  
  // 2. Get existing projections to avoid duplicates
  const existing = await getTaskProjections(taskId);
  
  // 3. Create projections for new members
  const projections = members
    .filter(m => !existing.has(m.user_id))
    .map(m => ({
      task_id: taskId,
      target_user_id: m.user_id,
      source_group_id: groupId,
      can_edit: options.canEdit ?? false,
      can_complete: options.canComplete ?? true,
      status: 'pending',
      created_by: currentUserId,
    }));
  
  // 4. Insert projections
  await createTaskProjections(projections);
  
  return { created: projections.length, skipped: existing.size };
}
```

**Group Membership Changes:**

When a user is **added to a group**:
- ✅ Existing task projections remain (they were created at distribution time)
- ✅ New distributions will include the user

When a user is **removed from a group**:
- ⚠️ **Option A (Recommended):** Keep projections, mark as `revoked`
  - User keeps tasks they already accepted
  - New tasks won't be distributed to them
- ⚠️ **Option B (Strict):** Revoke all projections from that group
  - User loses all tasks from that group immediately
  - More disruptive but cleaner separation

**Recommendation:** Option A (keep existing, revoke future) - balances user experience with group semantics.

### Calendar Event Distribution Model

**Conceptual Flow:**

Reuse existing `calendar_projections` pattern but extend for group distribution:

1. **Author Creates Event:**
   ```
   event = createCalendarEvent({ title, start_at, end_at, ... })
   event.user_id = creator (personal event)
   ```

2. **Author Distributes to Group:**
   ```
   distributeEventToGroup(eventId, groupId, permissions)
   → Resolves group membership
   → Creates calendar_projections for each group member
   → Uses existing calendar_projections table
   ```

**Database Model:**

**Reuse existing `calendar_projections` table:**
- Add `source_group_id uuid REFERENCES team_groups(id)` column (nullable)
- If `source_group_id IS NOT NULL`, this projection came from group distribution
- Existing projection fields remain unchanged:
  - `target_user_id`, `target_space_id`, `scope`, `status`, `can_edit`, etc.

**Distribution Service:**
```typescript
async function distributeEventToGroup(
  eventId: string,
  groupId: string,
  options: {
    scope?: 'date_only' | 'title' | 'full';
    canEdit?: boolean;
    status?: 'pending' | 'suggested';
  }
): Promise<{ created: number; skipped: number }> {
  // Reuse projectToAllMembers() pattern but for groups
  const members = await getGroupMembers(groupId);
  const existing = await getCalendarProjections(eventId);
  
  const projections = members
    .filter(m => !existing.has(m.user_id))
    .map(m => ({
      event_id: eventId,
      target_user_id: m.user_id,
      target_space_id: null, // Personal calendar
      source_group_id: groupId, // NEW: Track source group
      scope: options.scope ?? 'full',
      status: options.status ?? 'pending',
      can_edit: options.canEdit ?? false,
      created_by: currentUserId,
    }));
  
  await createCalendarProjections(projections);
  return { created: projections.length, skipped: existing.size };
}
```

**Ownership vs Projection:**

- **Ownership:** Event `user_id` = creator (source of truth)
- **Projection:** `calendar_projections` entries reference the event (read references)
- **Edit Conflicts:** Projected events with `can_edit = true` can be modified, but changes sync back to source event
- **Deletion:** Deleting source event cascades to projections (via FK constraint)

**Distribution Pattern Reuse:**

The existing `projectToAllMembers()` function (```357:426:src/lib/contextSovereign/projectionsService.ts```) already demonstrates the pattern:
- Get all members
- Filter existing projections
- Create new projections
- Return count

This pattern is **reused** for group distribution, replacing `context_members` with `team_group_members`.

### Avoiding Shared-Edit Conflicts

**Strategy: Optimistic Locking with Last-Writer-Wins (with conflict detection):**

1. **Event Updates:**
   - All edits update the **source event** (`calendar_events` table)
   - Projections are **read-only references** (no separate copies)
   - `updated_at` timestamp on source event used for conflict detection

2. **Task Updates:**
   - All edits update the **source task** (`tasks` table)
   - Projections track completion status per user (`task_projections.completed_by_user_id`)
   - Completion is per-user (each user can mark their own completion)
   - Title/description edits sync to all projections (single source)

3. **Conflict Resolution:**
   - If two users edit simultaneously: Last write wins (check `updated_at`)
   - UI shows "This task was updated by [user] [time]" notification
   - No merge logic (too complex for MVP)

**Future Enhancement:**
- Per-field conflict resolution
- Merge suggestions
- Edit history/versioning

---

## 5. Migration Strategy

### Phase 1: Schema Foundation (Week 1)

**Goal:** Add database tables and columns without breaking existing functionality.

**Schema Changes:**
1. ✅ Add `created_by` to `guardrails_tracks` / `guardrails_tracks_v2`
2. ✅ Add `created_by` to `guardrails_subtracks`
3. ✅ Create `team_groups` table
4. ✅ Create `team_group_members` table
5. ✅ Create `entity_permission_grants` table
6. ✅ Create `creator_rights_revocations` table
7. ✅ Add `source_group_id` to `calendar_projections` (nullable)

**Migration Safety:**
- All new columns are **nullable** or have **defaults**
- All new tables have **RLS enabled** with **restrictive policies** (no access by default)
- **No data backfills** in this phase (existing entities get `created_by = NULL`)

**Rollback Plan:**
- Drop new tables
- Remove new columns
- No data loss (no existing data modified)

**Feature Flag:** `ENABLE_GROUPS_PERMISSIONS = false` (tables exist but unused)

### Phase 2: Service Layer Foundation (Week 2)

**Goal:** Implement service functions behind feature flag.

**Service Implementations:**
1. ✅ `src/lib/groups/teamGroupsService.ts` - Group CRUD
2. ✅ `src/lib/groups/groupMembersService.ts` - Membership management
3. ✅ `src/lib/permissions/entityGrantsService.ts` - Grant CRUD
4. ✅ `src/lib/permissions/grantResolutionService.ts` - Permission resolution
5. ✅ `src/lib/permissions/creatorRightsService.ts` - Creator rights management

**Integration Points:**
- Extend `canUserAccessTrack()` to call `grantResolutionService.resolveEntityPermissions()`
- Add feature flag check: `if (ENABLE_GROUPS_PERMISSIONS) { check grants } else { use existing logic }`

**Testing:**
- Unit tests for all new services
- Integration tests with feature flag ON and OFF
- Verify backward compatibility (no grants = existing behavior)

**Feature Flag:** `ENABLE_GROUPS_PERMISSIONS = false` (code exists but not used)

### Phase 3: Data Backfill (Week 3)

**Goal:** Backfill `created_by` for existing entities.

**Backfill Strategy:**
1. **Tracks:** Set `created_by = master_projects.user_id` (project creator)
2. **Subtracks:** Set `created_by = parent_track.created_by` (or project creator if NULL)

**Migration Script:**
```sql
-- Backfill tracks
UPDATE guardrails_tracks_v2
SET created_by = (
  SELECT profiles.id
  FROM master_projects
  JOIN profiles ON profiles.user_id = master_projects.user_id
  WHERE master_projects.id = guardrails_tracks_v2.master_project_id
)
WHERE created_by IS NULL;

-- Backfill subtracks
UPDATE guardrails_subtracks
SET created_by = (
  SELECT guardrails_tracks_v2.created_by
  FROM guardrails_tracks_v2
  WHERE guardrails_tracks_v2.id = guardrails_subtracks.track_id
)
WHERE created_by IS NULL;
```

**Safety:**
- Run during **maintenance window**
- Verify data before committing
- Rollback: Set `created_by = NULL` if needed

**Feature Flag:** `ENABLE_GROUPS_PERMISSIONS = false` (data ready but not used)

### Phase 4: Permission Enforcement (Week 4)

**Goal:** Enable permission resolution with backward compatibility.

**Changes:**
1. ✅ Update `canUserAccessTrack()` to check grants (when feature flag ON)
2. ✅ Update `canUserEditTrack()` to include creator rights
3. ✅ Add RLS helper functions for grant checks
4. ✅ Update service layer to pass `userId` consistently

**Enforcement Strategy:**
- **Optional Checks:** Services accept `userId?` parameter (backward compatible)
- **When Provided:** Full permission resolution (project + creator + grants)
- **When Not Provided:** Fall back to RLS-only checks (existing behavior)

**Testing:**
- Test with feature flag ON: New permission model works
- Test with feature flag OFF: Existing behavior unchanged
- Test mixed: Some services use new model, others use old

**Feature Flag:** `ENABLE_GROUPS_PERMISSIONS = false` (enforcement code exists but not active)

### Phase 5: Distribution Services (Week 5)

**Goal:** Implement task and event distribution via groups.

**Service Implementations:**
1. ✅ `src/lib/distribution/taskDistributionService.ts` - Task distribution
2. ✅ `src/lib/distribution/eventDistributionService.ts` - Event distribution
3. ✅ Create `task_projections` table
4. ✅ Extend `calendar_projections` with `source_group_id`

**Integration:**
- Reuse `projectToAllMembers()` pattern for group distribution
- Integrate with existing task/event services

**Feature Flag:** `ENABLE_GROUP_DISTRIBUTION = false`

### Phase 6: UI Enablement (Week 6-7)

**Goal:** Add UI for groups, grants, and distribution.

**UI Components:**
1. ✅ Group management UI (create, edit, manage members)
2. ✅ Permission grants UI (grant track/subtrack access to groups/users)
3. ✅ Distribution UI (distribute task/event to group)
4. ✅ Creator rights revocation UI (project owners)

**Feature Flags:**
- `ENABLE_GROUPS_PERMISSIONS = true` (permission features)
- `ENABLE_GROUP_DISTRIBUTION = true` (distribution features)
- Can enable independently

### Phase 7: Gradual Rollout (Week 8+)

**Goal:** Enable features for subset of users, then all.

**Rollout Strategy:**
1. **Alpha:** Enable for internal team only
2. **Beta:** Enable for specific projects/teams (opt-in)
3. **General:** Enable for all users

**Monitoring:**
- Track permission resolution performance
- Monitor grant table growth
- Watch for RLS policy performance issues

**Rollback:**
- Feature flags can be toggled OFF at any time
- No data migration needed (tables remain, just unused)

### Atomic vs Optional

**Must Be Atomic:**
- ✅ Schema migrations (all-or-nothing)
- ✅ RLS policy updates (security-critical)
- ✅ Permission resolution logic (must be consistent)

**Can Be Optional:**
- ✅ Permission checks in services (`userId?` parameter)
- ✅ UI features (behind feature flags)
- ✅ Distribution features (opt-in per team)
- ✅ Creator rights (can be disabled via flag)

**Can Remain Optional Initially:**
- ⚠️ `roadmap_items.created_by` (not required for MVP)
- ⚠️ Team-wide grants (not in MVP, groups only)
- ⚠️ Permission audit trail (future enhancement)

---

## Summary of Architectural Decisions

### What We're Adding

1. **Team-Scoped Groups** - New concept, distinct from contact groups
2. **Entity Permission Grants** - Fine-grained permissions for tracks/subtracks
3. **Creator Default Rights** - Automatic edit permissions (revocable)
4. **Group Distribution** - Tasks and events via projection pattern

### What We're Reusing

1. **Project Permissions** - Base layer (`project_users` unchanged)
2. **Team Membership** - Group membership validation (`team_members` unchanged)
3. **Calendar Projections** - Distribution pattern (extended, not replaced)
4. **Permission Types** - Canonical types already defined

### What We're Preserving

1. **Backward Compatibility** - Single-user workflows unchanged
2. **Existing RLS** - Policies remain, new ones added
3. **Optional Checks** - `userId?` parameter pattern maintained
4. **Separation of Concerns** - Teams ≠ Groups ≠ Contact Groups

### Tradeoffs

**Pros:**
- ✅ Incremental rollout possible
- ✅ No breaking changes
- ✅ Reuses proven patterns (projections)
- ✅ Feature flags enable safe deployment

**Cons:**
- ⚠️ Permission resolution becomes more complex (multiple sources)
- ⚠️ Group membership changes require projection updates (eventual consistency)
- ⚠️ Creator rights add complexity to resolution logic
- ⚠️ More tables to maintain (but isolated from existing)

**Mitigations:**
- Clear resolution order (deterministic)
- Optional checks (backward compatible)
- Feature flags (can disable if issues)
- Comprehensive testing (unit + integration)

---

**End of Extension Plan Document**
