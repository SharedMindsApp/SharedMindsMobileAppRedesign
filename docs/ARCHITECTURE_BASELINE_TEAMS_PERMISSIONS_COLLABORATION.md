# SharedMinds Architecture Baseline: Teams, Permissions & Collaboration

**Status:** Architecture Discovery Document  
**Date:** January 2025  
**Purpose:** Factual baseline of existing collaboration primitives, permission models, and gaps relative to a group-based hierarchical permission system.

---

## High-Level Architecture Overview

SharedMinds is a multi-tenant collaboration platform with several distinct collaboration models:

1. **Guardrails Projects** - Work project management with tracks, roadmap items, and mind mesh
2. **Teams** - General-purpose team entities (work teams, clubs, hobby groups)
3. **Households** - Life management collaboration for shared spaces and calendars
4. **Personal Spaces** - Individual user spaces and calendars
5. **Trips** - Travel planning and collaboration contexts
6. **Contact Groups** - User-owned contact collections for sharing

Each system has its own membership and permission models, with limited cross-system integration.

**Key Architectural Pattern:** Services accept optional `userId` parameters for permission checks, maintaining backward compatibility with single-user workflows.

---

## 1. Core Identity & Collaboration Concepts

### Teams

**Status:** ✅ **EXISTS**

**Database Tables:**
- `teams` (```18:26:supabase/migrations/20260109151401_create_teams_tables.sql```)
  - `id`, `name`, `description`
  - `created_by` (references `profiles.id`, migrated from `auth.users.id`)
  - `archived_at` (soft delete, migrated from `is_archived`)
  - `created_at`, `updated_at`

- `team_members` (```29:36:supabase/migrations/20260109151401_create_teams_tables.sql```)
  - `id`, `team_id`, `user_id` (references `profiles.id`, migrated from `auth.users.id`)
  - `role` (enum: `'owner'`, `'admin'`, `'member'`, `'viewer'`)
  - `status` (enum: `'pending'`, `'active'`, `'left'`)
  - `invited_by` (references `profiles.id`)
  - `created_at`, `updated_at`
  - Constraint: Only one active owner per team (enforced via unique partial index)

**Services:**
- `src/lib/teams.ts` - Basic CRUD operations
- `src/lib/spaceCreation.ts` - Team creation with invites

**Team Ownership vs Admin Roles:**

✅ **EXISTS** - Clear role hierarchy:
- **Owner**: Full control, can update teams, manage members, change roles, delete team
- **Admin**: Can update team content, manage member status (but not roles), cannot change team settings
- **Member**: Standard member permissions
- **Viewer**: Read-only access

Role hierarchy enforced in `has_team_permission()` function: `owner > admin > member > viewer` (```427:468:supabase/migrations/20260109151753_enhance_teams_permissions.sql```)

**Team as Long-Lived Identity Container:**

✅ **PARTIALLY IMPLEMENTED**
- Teams can be archived (soft delete via `archived_at`)
- Team members have status lifecycle (`pending` → `active` → `left`)
- **Gap:** Teams are not currently referenced by other systems (projects, guardrails, calendar) as permission sources
- **Gap:** Teams exist in isolation - no integration with Guardrails projects or other collaboration primitives

**Where Teams are Defined:**
- Database: `teams`, `team_members` tables
- Types: `src/lib/teamTypes.ts`
- Services: `src/lib/teams.ts`, `src/lib/spaceCreation.ts`
- Policies: RLS on both tables (```260:421:supabase/migrations/20260109151753_enhance_teams_permissions.sql```)

---

## 2. Groups (or Group-like Concepts)

### Contact Groups

**Status:** ✅ **EXISTS** (but limited scope)

**Database Tables:**
- `contacts` (```19:36:supabase/migrations/20260103000010_create_contacts_and_groups.sql```)
  - User-owned contacts
  - Can optionally link to `auth.users` via `linked_user_id`
  
- `contact_groups` (```39:53:supabase/migrations/20260103000010_create_contacts_and_groups.sql```)
  - User-owned groups of contacts
  - Used for bulk sharing in permissions system

- `contact_group_members` (```56:66:supabase/migrations/20260103000010_create_contacts_and_groups.sql```)
  - Many-to-many relationship between groups and contacts

**Scope:** Contact groups are **user-owned** and designed for sharing permissions. They are **NOT**:
- Team sub-groups
- Project role-based subsets
- Scoped visibility collections within Guardrails
- Cross-system groups

**Services:**
- `src/lib/contacts/contactsService.ts` - Contact CRUD
- `src/lib/contacts/groupsService.ts` - Group CRUD

### Group Abstraction for Teams/Projects

**Status:** ❌ **DOES NOT EXIST**

There is **NO** existing concept of:
- Groups within teams
- Sub-teams
- Role-based subsets within projects
- Scoped visibility collections for Guardrails tracks/subtracks
- Project-level groups that can be assigned permissions

**Unified Permission Types Reference Groups:**

The canonical permission system (`src/lib/permissions/types.ts`) includes `PermissionSubjectType: 'user' | 'contact' | 'group' | 'space' | 'link'` (```56:56:src/lib/permissions/types.ts```), indicating **intended** support for groups, but:

- ❌ No database table for general-purpose groups
- ❌ No group membership system beyond contact groups
- ❌ No integration of groups with Guardrails permissions
- ❌ No track/subtrack visibility groups

**Other "Group" References:**

- `fridge_groups` - UI layout groups for fridge board widgets (not a permission concept)
- Conversation `group` type in messaging system (chat groups, not permission groups)
- Mind Mesh `node_type: 'group'` - conceptual grouping, not permission-related

---

## 3. Permission Architecture (Current State)

### Guardrails Projects - Project-Level Permissions

**Status:** ✅ **EXISTS** (project-scoped only)

**Database Tables:**
- `project_users` (```47:60:supabase/migrations/20251212122541_create_project_users_and_permissions.sql```)
  - `user_id` (references `auth.users.id`)
  - `master_project_id` (references `master_projects.id`)
  - `role` (enum: `'owner'`, `'editor'`, `'viewer'`)
  - `archived_at` (soft delete)

**Permission Roles:**
- **Owner**: Full edit rights, can manage project users, cannot be removed without transfer
- **Editor**: Can edit project content, cannot manage users
- **Viewer**: Read-only access

**Where Permission Checks Live:**

1. **Database Functions:**
   - `user_has_project_permission(p_user_id, p_project_id, p_required_role)` (```199:237:supabase/migrations/20251212122541_create_project_users_and_permissions.sql```)
   - `user_can_edit_project()`, `user_can_view_project()`, `user_is_project_owner()` - Shorthand helpers

2. **Service Layer:**
   - `src/lib/guardrails/projectUserService.ts` - Complete permission service
   - `src/lib/guardrails/ai/aiPermissions.ts` - AI context access checks
   - `canUserAccessProject()`, `canUserAccessTrack()`, `canUserAccessRoadmapItem()` (```3:59:src/lib/guardrails/ai/aiPermissions.ts```)

3. **RLS Policies:**
   - Project-level RLS on `project_users` table
   - Guardrails tables check project ownership via `master_projects.user_id` OR `project_users` membership

**Permission Hierarchy:**

✅ **CLEAR HIERARCHY EXISTS** at project level:
- `owner > editor > viewer`
- Implemented in `user_has_project_permission()` with role comparison logic
- Owners have all permissions, editors have editor+viewer, viewers have viewer only

### Guardrails Tracks & Subtracks - Permission Model

**Status:** ⚠️ **PROJECT-INHERITED ONLY**

**Database Tables:**
- `guardrails_tracks` / `guardrails_tracks_v2` - Project ownership via `master_project_id`
- `guardrails_subtracks` - Track ownership via `track_id`, which inherits project ownership

**Permission Checks:**

Track access is determined by **project membership only**:

```27:42:src/lib/guardrails/ai/aiPermissions.ts
export async function canUserAccessTrack(
  userId: string,
  trackId: string
): Promise<boolean> {
  const { data: track } = await supabase
    .from('guardrails_tracks_v2')
    .select('master_project_id')
    .eq('id', trackId)
    .maybeSingle();

  if (!track) {
    return false;
  }

  return canUserAccessProject(userId, track.master_project_id);
}
```

Subtrack access checks parent track's project (```57:70:supabase/migrations/20251211131925_create_guardrails_subtracks.sql```):

```sql
USING (
  EXISTS (
    SELECT 1 FROM guardrails_tracks
    WHERE guardrails_tracks.id = guardrails_subtracks.track_id
    AND guardrails_tracks.master_project_id IN (
      SELECT id FROM master_projects WHERE user_id = auth.uid()
    )
  )
);
```

**Critical Findings:**

❌ **NO track-level permissions** - All tracks inherit project permissions  
❌ **NO subtrack-level permissions** - All subtracks inherit via track → project  
❌ **NO scoped visibility** - Cannot restrict access to specific tracks/subtracks within a project  
❌ **NO group-based track access** - Cannot assign track access to groups of users

**Shared Track Permissions:**

For shared tracks (tracks that exist across multiple projects), edit permissions are determined by `authority_mode` and `primary_owner_project_id` (```199:241:src/lib/guardrails/sharedTrackValidation.ts```):

- `shared_editing`: Any linked project can edit
- `primary_project_only`: Only primary owner project can edit

But this is still **project-level**, not track-level or group-level.

### Permission Enforcement Pattern

**Status:** ⚠️ **OPTIONAL / GRADUAL MIGRATION**

Services accept **optional** `userId` parameter for permission checks (```9:48:docs/PERMISSION_ENFORCEMENT_PATTERN.md```):

```typescript
export async function updateTrack(
  trackId: string,
  input: UpdateTrackInput,
  userId?: string  // Optional - permission check only if provided
): Promise<Track> {
  if (userId) {
    // Check permissions
  }
  // Continue with update
}
```

This means:
- ✅ Backward compatible (works without userId)
- ⚠️ Permission checks are **not universally enforced**
- ⚠️ Many services may still rely on RLS-only checks
- ⚠️ No consistent enforcement pattern across all services

### Permission Type: Explicit vs Implicit

**Current State:**
- **Explicit:** `project_users` table explicitly defines user-project-role relationships
- **Implicit:** Track/subtrack access inferred from project membership
- **Implicit:** Legacy single-user projects use `master_projects.user_id` as implicit owner

**Gap:** No explicit permission grants for:
- Tracks
- Subtracks
- Roadmap items
- Specific entities within projects

---

## 4. Guardrails-Specific Permissions

### Project Access

**Status:** ✅ **PROJECT-WIDE ONLY**

Access is controlled via `project_users` table. Users either:
- Own the project (`master_projects.user_id = user_id`)
- Have explicit membership (`project_users.user_id = user_id AND master_project_id = project_id`)

**Permission Checks:**
- Read operations: Check `viewer` role or higher
- Write operations: Check `editor` role or higher
- User management: Check `owner` role

### Track Access

**Status:** ❌ **PROJECT-INHERITED ONLY**

**Findings:**
- Track access is **always** determined by project membership
- No track-specific permission table
- No way to restrict access to specific tracks within a project
- RLS policies check: `guardrails_tracks.master_project_id IN (user's projects)`

**RLS Policy Example:**
```100:109:supabase/migrations/20251211130131_create_guardrails_tracks_system.sql
CREATE POLICY "Users can view tracks for their master projects"
  ON guardrails_tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects mp
      WHERE mp.id = guardrails_tracks.master_project_id
      AND mp.user_id = auth.uid()
    )
  );
```

**Note:** This policy only checks `master_projects.user_id`, not `project_users`. The enhanced policy that checks `project_users` may exist in later migrations, but the pattern is project-scoped.

### Subtrack Access

**Status:** ❌ **TRACK-INHERITED (which inherits project)**

Subtrack access is determined by:
1. Check if user has access to parent track
2. Which is determined by project membership

**RLS Policy:**
```58:70:supabase/migrations/20251211131925_create_guardrails_subtracks.sql
CREATE POLICY "Users can view subtracks of their tracks"
  ON guardrails_subtracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guardrails_tracks
      WHERE guardrails_tracks.id = guardrails_subtracks.track_id
      AND guardrails_tracks.master_project_id IN (
        SELECT id FROM master_projects WHERE user_id = auth.uid()
      )
    )
  );
```

**Critical Gap:** No way to grant subtrack access independent of track/project access.

### Scoped Visibility Inside Projects

**Status:** ❌ **DOES NOT EXIST**

There is **NO** existing mechanism for:
- Restricting visibility of specific tracks to specific users/groups
- Creating "private" tracks within a shared project
- Track-level or subtrack-level permission grants
- Group-based visibility scoping

**Unified Permissions System Intent:**

The unified permissions system (`src/lib/permissions/types.ts`) defines concepts that **could** support this:
- `PermissionFlags` with `can_view`, `can_edit`, `can_manage`
- `ShareScope: 'this_only' | 'include_children'` - suggests intent for scoped permissions
- `PermissionSubjectType: 'group'` - suggests intent for group-based grants

But these are **not implemented** for Guardrails tracks/subtracks yet.

---

## 5. Creator / Ownership / Provenance

### Entities Tracking created_by

**Status:** ⚠️ **INCONSISTENT**

Many entities track `created_by`, but with **inconsistent references**:

**References `profiles.id`:**
- `teams.created_by` (migrated from `auth.users.id`)
- `calendar_events.created_by` (```290:290:src/lib/personalSpaces/calendarService.ts```)
- `spaces.created_by` (via `spaceCreation.ts`)

**References `auth.users.id`:**
- `master_projects.user_id` (implicit owner, not `created_by` column)
- `project_users.user_id` (membership, not creator)
- Many legacy tables

**Missing `created_by`:**
- `guardrails_tracks` - No creator tracking
- `guardrails_subtracks` - No creator tracking
- `roadmap_items` - No creator tracking (assignment tracked separately)

**Code Evidence:**
```476:476:src/lib/personalSpaces/calendarService.ts
* created_by column references profiles(id), not auth.users(id)
```

And migration fixing RLS policies:
```2:5:supabase/migrations/20260122000000_fix_calendar_events_created_by_rls.sql
  # Fix Calendar Events created_by RLS Policy
  
  The `created_by` column references `profiles(id)`, but the RLS policy 
  was checking `created_by = auth.uid()` which is incorrect.
```

### Does Creator Imply Permissions?

**Status:** ⚠️ **PARTIAL**

**Creator Ownership:**
- ✅ Project creator automatically becomes owner (`auto_add_project_owner` trigger) (```86:101:supabase/migrations/20251212122541_create_project_users_and_permissions.sql```)
- ✅ Team creator becomes owner (via team creation flow)
- ❌ Track creator - **NO automatic ownership** (tracks inherit project permissions only)
- ❌ Roadmap item creator - **NO automatic ownership** (items inherit project permissions)

**Gap:** Creator tracking exists but does **not** grant special permissions for:
- Tracks
- Subtracks
- Roadmap items
- Most Guardrails entities

### Provenance / Attribution

**Status:** ❌ **NOT MODELED**

There is **NO** systematic tracking of:
- Entity attribution (who created what)
- Ownership history
- Permission grant history
- Entity provenance chains

**Existing:**
- `created_at` timestamps on most entities
- `created_by` on some entities (inconsistent)
- `updated_at` on most entities

**Missing:**
- Ownership transfer history
- Permission change audit logs
- Entity creation attribution chain
- Provenance metadata

---

## 6. Calendar & Task Assignment Model

### Calendar Events - Creation & Sharing

**Status:** ✅ **USER/HOUSEHOLD OWNERSHIP MODEL**

**Database Table:**
- `calendar_events` (```22:37:supabase/migrations/20260120000000_phase8_personal_calendar_sharing.sql```)
  - `user_id` - For personal events (references `auth.users.id`)
  - `household_id` - For household events
  - `created_by` - References `profiles.id` (not `auth.users.id`)
  - Event belongs to **either** user OR household, not both

**Sharing Model:**

1. **Personal Calendar Sharing:**
   - `calendar_shares` table (```102:102:supabase/migrations/20260120000000_phase8_personal_calendar_sharing.sql```)
   - Full-calendar sharing relationships
   - Access levels: `read`, `write`
   - Visibility controls: `visible` vs `busy` (busy hides details)

2. **Projection Model:**
   - `calendar_projections` table - Context events projected to personal calendars
   - Permission-based sharing via projections
   - `target_space_id` indicates shared space
   - Requires explicit acceptance for context projections

3. **Guardrails Sync:**
   - One-way sync from Guardrails roadmap events to calendar
   - User-controlled via `calendar_sync_settings`
   - Creates `calendar_events` with `sourceType: 'guardrails'`

**Assignment Model:**

❌ **NO direct assignment** of calendar events to users/teams
- Events belong to `user_id` or `household_id`
- Sharing via `calendar_shares` or `calendar_projections`
- No "assigned_to" field on calendar events

### Tasks - Assignment Model

**Status:** ⚠️ **MIXED MODELS**

#### Guardrails Tasks (Roadmap Items)

**Assignment via People (not Users):**
- `roadmap_item_assignees` table (```51:52:supabase/migrations/20251212110525_create_people_and_assignment_system.sql```)
- Links `roadmap_items` to `project_people` (project-scoped people directory)
- **Critical:** Assignments reference **People**, not Users
- People can exist without user accounts

**Service:**
```23:58:src/lib/guardrails/assignmentService.ts
export async function assignPersonToRoadmapItem(
  roadmapItemId: string,
  personId: string
): Promise<RoadmapItemAssignment> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) {
    throw new Error('Roadmap item not found');
  }

  const person = await getPerson(personId);
  if (!person) {
    throw new Error('Person not found');
  }

  if (person.archived) {
    throw new Error('Cannot assign archived person to roadmap item');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      roadmap_item_id: roadmapItemId,
      person_id: personId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Person is already assigned to this roadmap item');
    }
    throw error;
  }

  return transformKeysFromDb(data);
}
```

**Gap:** No assignment to:
- Teams
- Groups
- Multiple users simultaneously (only people, which may not have accounts)

#### Personal Tasks

**Multiple Task Systems:**

1. **Event Tasks** (`event_tasks` table):
   - Linked to `calendar_events` via `event_id`
   - No user assignment field
   - Date derived from event

2. **Standalone Tasks** (`standalone_tasks` table):
   - Have `user_id` (owner)
   - No `assigned_to` field
   - User-owned only

3. **TaskFlow Tasks** (`taskflow_tasks`):
   - Project-scoped
   - No assignment field
   - Derived from roadmap items

4. **Household Tasks** (`household_chores`, `cleaning_tasks`):
   - Have `assigned_to` field (references `household_members.id`)
   - Household-scoped only

**Task Delegation UI:**

Delegation UI exists but is **incomplete**:
```310:342:src/components/tasks/TaskCreationModal.tsx
{/* Delegate Section - inside scrollable content */}
{showDelegate && (
  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <label className="block text-sm font-medium text-gray-700">
        Delegate To (Optional)
      </label>
      ...
    </div>
    <select
      value={delegatedTo || ''}
      onChange={(e) => setDelegatedTo(e.target.value || null)}
      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
    >
      <option value="">No delegation</option>
      {/* TODO: Load household members or team members for delegation */}
      <option value="placeholder">Household Member 1</option>
      <option value="placeholder2">Household Member 2</option>
    </select>
```

**Gap:** Task delegation UI exists but backend support is incomplete.

### Task Assignment to Multiple Users/Teams

**Status:** ❌ **DOES NOT EXIST**

**Current Limitations:**
- Roadmap items can be assigned to multiple **People** (not users)
- No assignment to Teams
- No assignment to Groups
- No bulk assignment mechanisms
- Household tasks can be assigned to one household member only

**Assignment Arrays in Other Systems:**
- `reminders.assigned_to` - UUID array (```22:22:supabase/migrations/20251210223428_create_reminders_table.sql```)
- `habits.assigned_to` - UUID array
- `behaviour_engine.assigned_to` - UUID array

But these are **not** used for Guardrails tasks or calendar events.

---

## 7. Gaps Relative to a Group-Based, Hierarchical Permission System

### Missing Abstractions

1. **❌ Groups Abstraction**
   - No general-purpose groups table
   - No group membership system (beyond contact groups)
   - No integration of groups with Guardrails
   - No team sub-groups
   - No project-level groups

2. **❌ Hierarchical Permissions**
   - No track-level permissions (project-only)
   - No subtrack-level permissions (inherited only)
   - No nested permission inheritance
   - No permission override mechanism

3. **❌ Scoped Visibility**
   - Cannot restrict track visibility within a project
   - Cannot create private tracks in shared projects
   - No group-based visibility scoping
   - No "team can see this track" concept

### Missing Integration Points

4. **❌ Teams ↔ Guardrails Integration**
   - Teams exist in isolation
   - Cannot assign team to project
   - Cannot grant project access to entire team
   - Teams not used as permission sources

5. **❌ Groups ↔ Permissions Integration**
   - Contact groups exist but not used for Guardrails permissions
   - No group-based permission grants
   - No "assign track to group" concept

6. **❌ Task Assignment Gaps**
   - No assignment to teams
   - No assignment to groups
   - Limited assignment to users (only via people, which may not have accounts)
   - No bulk assignment mechanisms

### Incomplete Permission Models

7. **⚠️ Optional Permission Checks**
   - Permission checks are optional (`userId?` parameter)
   - Not universally enforced
   - Mixed enforcement patterns (RLS-only vs service-layer checks)

8. **❌ No Permission Grants Table**
   - Project permissions via `project_users` (membership model)
   - No general `permission_grants` table for entity-level permissions
   - No way to grant permissions to groups
   - No way to grant track/subtrack permissions

9. **❌ No Permission Inheritance**
   - No explicit inheritance model
   - Tracks inherit project permissions implicitly (via RLS)
   - No configurable inheritance rules
   - No permission override capabilities

### Inconsistent Patterns

10. **⚠️ Inconsistent created_by References**
    - Some entities use `profiles.id`
    - Some entities use `auth.users.id`
    - Some entities have no creator tracking
    - No systematic provenance model

11. **⚠️ Mixed Ownership Models**
    - Projects: `user_id` + `project_users` membership
    - Teams: `created_by` + `team_members` membership
    - Households: `billing_owner_id` + `household_members` membership
    - Calendar events: `user_id` OR `household_id`
    - No unified ownership abstraction

### Missing Features

12. **❌ No Permission Audit Trail**
    - No history of permission changes
    - No ownership transfer history
    - No grant/revoke audit logs

13. **❌ No Bulk Permission Operations**
    - Cannot grant project access to entire team
    - Cannot assign track to multiple groups at once
    - No permission templates

14. **❌ No Cross-System Permission Bridges**
    - Teams cannot grant Guardrails access
    - Household membership doesn't grant project access
    - No unified permission model across systems

---

## Summary of Findings

### What Exists ✅

1. **Teams system** with roles (owner/admin/member/viewer) and status lifecycle
2. **Project-level permissions** via `project_users` with clear role hierarchy
3. **Contact groups** for user-owned contact collections
4. **Calendar sharing** via `calendar_shares` and projections
5. **People assignment** system for Guardrails roadmap items
6. **Unified permission types** defined (but not fully implemented)

### What is Missing ❌

1. **Groups abstraction** for teams/projects/scoped visibility
2. **Track/subtrack-level permissions** (project-only currently)
3. **Team ↔ Guardrails integration** (teams isolated)
4. **Group-based permission grants** (contact groups exist but unused)
5. **Task assignment to teams/groups** (people-only currently)
6. **Permission grants table** (membership models only)
7. **Permission inheritance system** (implicit only)
8. **Scoped visibility** within projects
9. **Bulk permission operations**
10. **Permission audit trail**

### What is Incomplete ⚠️

1. **Permission enforcement** - Optional checks, not universally enforced
2. **Creator tracking** - Inconsistent references (`profiles.id` vs `auth.users.id`)
3. **Task delegation** - UI exists but backend incomplete
4. **Ownership models** - Mixed patterns across systems
5. **Provenance** - No systematic attribution tracking

---

## Code References

### Key Files

- **Teams:** `supabase/migrations/20260109151401_create_teams_tables.sql`, `supabase/migrations/20260109151753_enhance_teams_permissions.sql`
- **Project Permissions:** `supabase/migrations/20251212122541_create_project_users_and_permissions.sql`, `src/lib/guardrails/projectUserService.ts`
- **Guardrails Access:** `src/lib/guardrails/ai/aiPermissions.ts`
- **Track RLS:** `supabase/migrations/20251211130131_create_guardrails_tracks_system.sql`, `supabase/migrations/20251211131925_create_guardrails_subtracks.sql`
- **Unified Permissions:** `src/lib/permissions/types.ts`, `docs/UNIFIED_PERMISSIONS_IMPLEMENTATION.md`
- **Contact Groups:** `supabase/migrations/20260103000010_create_contacts_and_groups.sql`
- **Task Assignment:** `src/lib/guardrails/assignmentService.ts`, `supabase/migrations/20251212110525_create_people_and_assignment_system.sql`
- **Calendar Sharing:** `supabase/migrations/20260120000000_phase8_personal_calendar_sharing.sql`

### Documentation

- `docs/GUARDRAILS_USERS_PERMISSIONS_ARCHITECTURE.md` - Detailed project permissions
- `docs/UNIFIED_PERMISSIONS_IMPLEMENTATION.md` - Permission system design (partial implementation)
- `docs/PERMISSION_ENFORCEMENT_PATTERN.md` - Enforcement patterns (optional checks)

---

**End of Baseline Document**
