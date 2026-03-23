# Guardrails Users & Permissions Architecture

## Overview

The Guardrails Users & Permissions Architecture establishes the foundational system for **authenticated user accounts** and **project-level permissions**, enabling collaborative editing with explicit role-based access control. This architecture maintains clear separation between Users (authenticated accounts) and People (project participants), while remaining fully compatible with existing Guardrails systems.

## Core Design Principles

### 1. Separation of Concerns

**People ≠ Users**

- **People** can exist without accounts (tracked in `global_people` and `project_people`)
- **Users** always have authenticated accounts (tracked in `auth.users`)
- A user may optionally link to a Global Person, but is not required
- People directory and assignments work independently of user accounts

### 2. Explicit Access Only

Only authenticated users with explicit project permissions can:
- Edit tracks
- Edit roadmap items
- Edit mind mesh content
- Manage people and assignments
- View project data

**No implicit access via:**
- Email addresses
- People records
- Assignments
- Household membership

### 3. Project-Scoped Permissions

- Permissions apply per project
- A user may have different roles across different projects
- No global admin permissions (household/system admin is separate)
- Each project has independent access control

### 4. Backward Compatibility

- Existing single-user workflows continue without modification
- Services accept optional `userId` parameter
- Permission checks only run when `userId` provided
- Gradual migration path from single-user to multi-user

## Permission Model

### Roles

Three clearly defined roles with increasing privileges:

#### Owner
**Capabilities:**
- ✅ Full edit rights on all project content
- ✅ Can manage project users (add, remove, change roles)
- ✅ Can transfer ownership to another user
- ✅ Cannot be removed from project (must transfer ownership first)

**Limitations:**
- Only one owner recommended (though multiple allowed)
- Must be present to manage team

#### Editor
**Capabilities:**
- ✅ Can view all project content
- ✅ Can edit tracks, roadmap items, mind mesh, assignments
- ✅ Can create and delete project content
- ✅ Full collaborative editing rights

**Limitations:**
- ❌ Cannot add or remove users
- ❌ Cannot change user roles
- ❌ Cannot transfer ownership

#### Viewer
**Capabilities:**
- ✅ Can view all project content
- ✅ Can read tracks, roadmap, assignments, mind mesh
- ✅ Can export or analyze project data

**Limitations:**
- ❌ Cannot edit anything
- ❌ Cannot add or remove users
- ❌ Read-only access

### Permission Matrix

| Operation | Owner | Editor | Viewer |
|-----------|-------|--------|--------|
| View project content | ✅ | ✅ | ✅ |
| Edit tracks | ✅ | ✅ | ❌ |
| Edit roadmap items | ✅ | ✅ | ❌ |
| Edit mind mesh | ✅ | ✅ | ❌ |
| Manage people/assignments | ✅ | ✅ | ❌ |
| Add users to project | ✅ | ❌ | ❌ |
| Remove users from project | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |

## Database Schema

### project_users Table

```sql
CREATE TABLE project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,

  role project_user_role NOT NULL DEFAULT 'editor',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,

  CONSTRAINT unique_active_project_user UNIQUE (user_id, master_project_id)
);
```

**Key Features:**
- Unique constraint prevents duplicate user memberships
- Soft deletion via `archived_at` (preserves history)
- Auto-updates `updated_at` on changes
- Cascades on user/project deletion

### Enums

```sql
CREATE TYPE project_user_role AS ENUM ('owner', 'editor', 'viewer');
```

### Indexes

```sql
CREATE INDEX idx_project_users_user_id ON project_users(user_id) WHERE archived_at IS NULL;
CREATE INDEX idx_project_users_project_id ON project_users(master_project_id) WHERE archived_at IS NULL;
CREATE INDEX idx_project_users_role ON project_users(role) WHERE archived_at IS NULL;
```

### Triggers

#### Auto-Create Owner on Project Creation

```sql
CREATE TRIGGER trigger_auto_add_project_owner
  AFTER INSERT ON master_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_project_owner();
```

When a new `master_project` is created, the creating user is automatically added as an owner in `project_users`.

#### Auto-Update updated_at

```sql
CREATE TRIGGER trigger_update_project_users_updated_at
  BEFORE UPDATE ON project_users
  FOR EACH ROW
  EXECUTE FUNCTION update_project_users_updated_at();
```

## Identity Linking

### global_people Enhancement

Added optional linking between `auth.users` and `global_people`:

```sql
ALTER TABLE global_people
ADD COLUMN linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE global_people
ADD CONSTRAINT unique_linked_user_id UNIQUE (linked_user_id);
```

**Rules:**
- **Optional**: People can exist without linked users
- **One-to-One**: One user can link to at most one global person
- **Future-Proof**: Enables account invitations and identity merging later

**Use Cases:**
- Link existing person records to new user accounts
- Merge guest/placeholder data with authenticated accounts
- Pre-populate user profiles from people directory
- Enable smooth onboarding flow

## Type System

### Core Types

```typescript
export type ProjectUserRole = 'owner' | 'editor' | 'viewer';

export interface ProjectUser {
  id: string;
  userId: string;
  masterProjectId: string;
  role: ProjectUserRole;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateProjectUserInput {
  userId: string;
  masterProjectId: string;
  role: ProjectUserRole;
}

export interface UpdateProjectUserInput {
  role?: ProjectUserRole;
}

export interface UserProjectPermission {
  userId: string;
  projectId: string;
  canView: boolean;
  canEdit: boolean;
  canManageUsers: boolean;
  role: ProjectUserRole;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  role?: ProjectUserRole;
}

export const PROJECT_USER_ROLE_CAPABILITIES = {
  owner: {
    canView: true,
    canEdit: true,
    canManageUsers: true,
  },
  editor: {
    canView: true,
    canEdit: true,
    canManageUsers: false,
  },
  viewer: {
    canView: true,
    canEdit: false,
    canManageUsers: false,
  },
} as const;
```

## Service Layer

### projectUserService.ts

Complete service for managing project users and checking permissions.

#### User Management

```typescript
addUserToProject(input: CreateProjectUserInput): Promise<ProjectUser>
```
Add an authenticated user to a project with specified role. Reactivates if user was previously archived.

```typescript
removeUserFromProject(userId: string, masterProjectId: string): Promise<ProjectUser>
```
Soft-delete user from project (sets `archived_at`). Preserves history.

```typescript
permanentlyRemoveUserFromProject(userId: string, masterProjectId: string): Promise<void>
```
Permanently delete user from project. Use sparingly.

```typescript
updateUserRole(userId: string, masterProjectId: string, input: UpdateProjectUserInput): Promise<ProjectUser>
```
Change user's role on a project.

```typescript
transferProjectOwnership(currentOwnerId: string, newOwnerId: string, masterProjectId: string): Promise<{oldOwner: ProjectUser, newOwner: ProjectUser}>
```
Transfer ownership from current owner to new owner. Current owner becomes editor.

#### Queries

```typescript
getProjectUsers(masterProjectId: string, includeArchived?: boolean): Promise<ProjectUser[]>
```
Get all users for a project.

```typescript
getUserProjects(userId: string, includeArchived?: boolean): Promise<ProjectUser[]>
```
Get all projects for a user.

```typescript
getProjectUser(userId: string, masterProjectId: string): Promise<ProjectUser | null>
```
Get single user's membership record.

```typescript
getUserProjectRole(userId: string, masterProjectId: string): Promise<ProjectUserRole | null>
```
Get user's role on a project. Returns null if not a member or archived.

```typescript
getUserWithProjects(userId: string): Promise<UserWithProjects>
```
Get user with all their projects and roles.

```typescript
getProjectWithUsers(masterProjectId: string): Promise<ProjectWithUsers>
```
Get project with all its users and roles.

#### Permission Checks

```typescript
hasProjectPermission(userId: string, masterProjectId: string, requiredRole: ProjectUserRole): Promise<boolean>
```
Check if user has required permission level. Returns boolean.

```typescript
checkProjectPermission(userId: string, masterProjectId: string, requiredRole: ProjectUserRole): Promise<PermissionCheckResult>
```
Check permission and get detailed result with reason if denied.

```typescript
getUserProjectPermissions(userId: string, masterProjectId: string): Promise<UserProjectPermission | null>
```
Get all permissions for user on project.

```typescript
canUserViewProject(userId: string, masterProjectId: string): Promise<boolean>
```
Shorthand: Can user view project?

```typescript
canUserEditProject(userId: string, masterProjectId: string): Promise<boolean>
```
Shorthand: Can user edit project content?

```typescript
canUserManageProjectUsers(userId: string, masterProjectId: string): Promise<boolean>
```
Shorthand: Can user manage team?

```typescript
isProjectOwner(userId: string, masterProjectId: string): Promise<boolean>
```
Shorthand: Is user the project owner?

#### Statistics

```typescript
countProjectMembers(masterProjectId: string): Promise<number>
```
Count active members on project.

```typescript
countUserProjects(userId: string): Promise<number>
```
Count active projects for user.

```typescript
getProjectUserStats(masterProjectId: string): Promise<ProjectUserStats>
```
Get detailed statistics:
- Total members
- Count by role (owners, editors, viewers)
- Archived members

#### Identity Linking

```typescript
linkUserToGlobalPerson(userId: string, globalPersonId: string): Promise<void>
```
Link authenticated user to a global person record.

```typescript
unlinkUserFromGlobalPerson(globalPersonId: string): Promise<void>
```
Remove link between user and global person.

```typescript
getGlobalPersonForUser(userId: string): Promise<{id: string, name: string} | null>
```
Get linked global person for user.

```typescript
getUserForGlobalPerson(globalPersonId: string): Promise<string | null>
```
Get linked user ID for global person.

#### Helper Utilities

```typescript
assertCanEdit(permissionCheck: PermissionCheckResult): void
assertCanView(permissionCheck: PermissionCheckResult): void
assertCanManageUsers(permissionCheck: PermissionCheckResult): void
```
Throw error if permission denied.

```typescript
withPermissionCheck<T>(
  context: ServicePermissionContext,
  requiredRole: ProjectUserRole,
  operation: () => Promise<T>
): Promise<T>
```
Wrap operation with permission check.

## Row Level Security (RLS)

### Policy: Users can view members of their projects

```sql
CREATE POLICY "Users can view members of their projects"
  ON project_users FOR SELECT
  TO authenticated
  USING (
    archived_at IS NULL AND
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.archived_at IS NULL
    )
  );
```

Users can see the member list for any project they belong to.

### Policy: Owners can add users to projects

```sql
CREATE POLICY "Owners can add users to projects"
  ON project_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.master_project_id = project_users.master_project_id
      AND pu.user_id = auth.uid()
      AND pu.role = 'owner'
      AND pu.archived_at IS NULL
    )
  );
```

Only project owners can add new members.

### Policy: Owners can update user roles

```sql
CREATE POLICY "Owners can update user roles"
  ON project_users FOR UPDATE
  TO authenticated
  USING (...owner check...)
  WITH CHECK (...owner check...);
```

Only project owners can change member roles.

### Policy: Owners can remove users from projects

```sql
CREATE POLICY "Owners can remove users from projects"
  ON project_users FOR DELETE
  TO authenticated
  USING (...owner check...);
```

Only project owners can remove members (soft or hard delete).

## Database Helper Functions

### user_has_project_permission()

```sql
CREATE FUNCTION user_has_project_permission(
  p_user_id uuid,
  p_project_id uuid,
  p_required_role project_user_role
) RETURNS boolean
```

**Role Hierarchy Logic:**
- Owner has all permissions
- Editor has editor + viewer permissions
- Viewer has viewer permissions only

### user_can_edit_project()

```sql
CREATE FUNCTION user_can_edit_project(
  p_user_id uuid,
  p_project_id uuid
) RETURNS boolean
```

Shorthand for checking editor permission.

### user_can_view_project()

```sql
CREATE FUNCTION user_can_view_project(
  p_user_id uuid,
  p_project_id uuid
) RETURNS boolean
```

Shorthand for checking viewer permission.

### user_is_project_owner()

```sql
CREATE FUNCTION user_is_project_owner(
  p_user_id uuid,
  p_project_id uuid
) RETURNS boolean
```

Shorthand for checking owner role.

## Permission Enforcement Pattern

### Gradual Migration Strategy

Services accept optional `userId` parameter. Permission checks only run when provided.

**Phase 1: Optional Checks (Current)**
```typescript
export async function updateTrack(
  trackId: string,
  input: UpdateTrackInput,
  userId?: string  // Optional
): Promise<Track> {
  const track = await getTrack(trackId);
  if (!track) throw new Error('Track not found');

  // Only check if userId provided
  if (userId) {
    const permissionCheck = await checkProjectPermission(
      userId,
      track.masterProjectId,
      'editor'
    );

    if (!permissionCheck.allowed) {
      throw new Error(`Permission denied: ${permissionCheck.reason}`);
    }
  }

  // Continue with update
  // ...
}
```

**Phase 2: Frontend Integration (Future)**
- UI components pass `userId` from auth context
- Show/hide actions based on permissions
- Display helpful error messages

**Phase 3: Required Checks (Future)**
- Make `userId` required
- Remove fallback paths
- Complete enforcement

### Required Role by Operation Type

| Operation Type | Required Role | Examples |
|----------------|---------------|----------|
| Read | `viewer` | get*, list*, query* |
| Write | `editor` | create*, update*, delete* |
| User Management | `owner` | addUser*, removeUser*, changeRole* |

### Example Integration

See [PERMISSION_ENFORCEMENT_PATTERN.md](./src/lib/guardrails/PERMISSION_ENFORCEMENT_PATTERN.md) for detailed integration examples.

## Usage Examples

### Adding Users to a Project

```typescript
import { addUserToProject } from '@/lib/guardrails';

// Add user as editor
await addUserToProject({
  userId: newUserId,
  masterProjectId: projectId,
  role: 'editor',
});
```

### Checking Permissions

```typescript
import { checkProjectPermission } from '@/lib/guardrails';

const permissionCheck = await checkProjectPermission(
  userId,
  projectId,
  'editor'
);

if (!permissionCheck.allowed) {
  console.error(`Cannot edit: ${permissionCheck.reason}`);
  return;
}

// Proceed with edit
```

### Getting Project Team

```typescript
import { getProjectUsers } from '@/lib/guardrails';

const users = await getProjectUsers(projectId);

console.log('Team:');
users.forEach(user => {
  console.log(`- ${user.userId}: ${user.role}`);
});
```

### Transferring Ownership

```typescript
import { transferProjectOwnership } from '@/lib/guardrails';

const { oldOwner, newOwner } = await transferProjectOwnership(
  currentOwnerId,
  newOwnerId,
  projectId
);

console.log(`${newOwner.userId} is now the owner`);
```

### Linking User to Global Person

```typescript
import { linkUserToGlobalPerson, getGlobalPersonForUser } from '@/lib/guardrails';

// Link user to person record
await linkUserToGlobalPerson(userId, globalPersonId);

// Retrieve link
const person = await getGlobalPersonForUser(userId);
console.log(`Linked to: ${person?.name}`);
```

### Permission-Aware Service Calls

```typescript
import { updateRoadmapItem, checkProjectPermission } from '@/lib/guardrails';

// Get current user from auth context
const { user } = useAuth();

try {
  await updateRoadmapItem(
    itemId,
    { title: 'New Title' },
    user.id  // Pass userId for permission check
  );
} catch (error) {
  if (error.message.includes('Permission denied')) {
    alert('You do not have permission to edit this item');
  }
}
```

## Compatibility with Existing Systems

### Global People Directory
- ✅ **Fully Compatible**: People can exist without user accounts
- ✅ **Optional Linking**: Users can link to people records via `linked_user_id`
- ✅ **Independent**: People operations don't require authentication

### Project-Scoped People
- ✅ **Fully Compatible**: Project people remain independent of users
- ✅ **Permission-Aware**: Editing people requires editor permission (when `userId` provided)
- ✅ **Assignments Work**: Assignments reference people, not users

### Assignments
- ✅ **Fully Compatible**: Assignments reference `project_people`, not users
- ✅ **Permission-Aware**: Creating/editing assignments requires editor permission
- ✅ **No Breaking Changes**: Existing assignment logic unchanged

### Personal Spaces Bridge
- ✅ **Fully Compatible**: Personal links are user-scoped
- ✅ **No Conflicts**: Users control their own personal space links
- ✅ **Independent**: Bridge doesn't affect project permissions

### Active Data Context (ADC)
- ✅ **Analytics-Ready**: Permission checks don't interfere with ADC
- ✅ **User-Aware**: Can filter ADC data by user permissions
- ✅ **Future Enhancement**: ADC can show collaborative activity

### Existing Guardrails Architecture
- ✅ **Non-Breaking**: All existing single-user workflows continue
- ✅ **Opt-In**: Permission checks only run when `userId` provided
- ✅ **Gradual Migration**: Services maintain backward compatibility

## Explicit Non-Goals

The following are **intentionally NOT implemented**:

### ❌ UI Components
- No team management interface
- No permission selection dropdowns
- No user search/selection
- Pure architecture only

### ❌ Invitation System
- No email invitations
- No invite links
- No pending invites table
- No invite acceptance flow

### ❌ Notifications
- No permission change notifications
- No "user added to project" emails
- No real-time alerts

### ❌ Billing/Subscriptions
- No per-user pricing
- No team size limits
- No payment integration
- Future consideration

### ❌ Household/Spaces Permissions
- No household collaboration (separate system)
- No shared spaces permissions
- No cross-system access control

### ❌ External Sharing
- No public links
- No guest access
- No anonymous viewers
- Authenticated users only

### ❌ Granular Permissions
- No per-track permissions
- No per-item permissions
- No custom role creation
- Three roles only

## Future Enhancements (Not Implemented)

### Invitation Flow
```typescript
interface ProjectInvite {
  id: string;
  projectId: string;
  invitedEmail: string;
  role: ProjectUserRole;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
}
```

### Activity Log
```typescript
interface ProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}
```

### Permission History
```typescript
interface PermissionAudit {
  id: string;
  projectId: string;
  userId: string;
  previousRole: ProjectUserRole;
  newRole: ProjectUserRole;
  changedBy: string;
  timestamp: string;
}
```

### Custom Roles
```typescript
interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
  projectId: string;
}
```

## Security Considerations

### RLS Enforcement
- All `project_users` queries filtered by RLS
- Users can only see projects they belong to
- Owners have exclusive user management rights

### Permission Validation
- All write operations check permissions when `userId` provided
- Validation happens in service layer (not just UI)
- Clear error messages guide users

### Ownership Protection
- Owners cannot be removed without transfer
- At least one owner must exist per project
- Ownership transfer requires current owner

### Audit Trail
- Soft deletion preserves history
- `created_at` and `updated_at` track changes
- Future: Complete audit log system

## Testing Checklist

- [x] Create project automatically adds owner
- [x] Add user to project with editor role
- [x] Add user to project with viewer role
- [x] Prevent duplicate active memberships
- [x] Remove user (soft delete) preserves record
- [x] Update user role
- [x] Transfer ownership demotes old owner to editor
- [x] Owner can add users
- [x] Editor cannot add users
- [x] Viewer cannot add users
- [x] Editor can edit content (when enforced)
- [x] Viewer cannot edit content (when enforced)
- [x] Users can only see projects they belong to
- [x] RLS prevents cross-project access
- [x] Link user to global person
- [x] Unlink user from global person
- [x] Get user's projects
- [x] Get project's users
- [x] Count members and projects
- [x] Get permission statistics
- [x] Build passes with zero errors

## Analytics Readiness

### Available Queries

#### User Engagement
```typescript
const userProjects = await getUserProjects(userId);
const projectCount = await countUserProjects(userId);
```

#### Project Collaboration
```typescript
const projectUsers = await getProjectUsers(projectId);
const memberCount = await countProjectMembers(projectId);
const stats = await getProjectUserStats(projectId);
```

#### Permission Distribution
```typescript
const stats = await getProjectUserStats(projectId);
console.log(`Owners: ${stats.owners}, Editors: ${stats.editors}, Viewers: ${stats.viewers}`);
```

#### Identity Linking Rate
```sql
SELECT COUNT(*) as linked_count
FROM global_people
WHERE linked_user_id IS NOT NULL;
```

## Migration Path

### From Single-User to Multi-User

1. **Existing projects automatically get owner**
   - Trigger creates owner record on project creation
   - No migration needed for new projects

2. **Existing projects need backfill (Future)**
   - One-time script to create owner records
   - Match `master_projects.user_id` to `project_users`

3. **Services gradually adopt permission checks**
   - Add optional `userId` parameter
   - Check permissions when provided
   - Eventually make required

4. **Frontend integration**
   - Pass userId from auth context
   - Display permission errors
   - Hide unauthorized actions

## Related Documentation

- [GUARDRAILS_UNIFIED_ARCHITECTURE.md](./GUARDRAILS_UNIFIED_ARCHITECTURE.md) - Overall Guardrails design
- [PERMISSION_ENFORCEMENT_PATTERN.md](./src/lib/guardrails/PERMISSION_ENFORCEMENT_PATTERN.md) - Integration guide
- [GLOBAL_PEOPLE_ARCHITECTURE.md](./GLOBAL_PEOPLE_ARCHITECTURE.md) - People directory system
- [Project User Service](./src/lib/guardrails/projectUserService.ts) - Service implementation
- [Core Types](./src/lib/guardrails/coreTypes.ts) - Type definitions

## Summary

The Guardrails Users & Permissions Architecture establishes **authenticated collaboration** with **role-based access control** while maintaining **strict separation** between Users and People. It enables multiple users to work on projects with explicit permissions, remains fully backward compatible, and provides a clear migration path from single-user to multi-user workflows.

**Key Achievements:**
- Three-role permission model (owner, editor, viewer)
- Project-scoped access control
- Optional identity linking to global people
- Comprehensive service layer with 30+ functions
- RLS enforcement at database level
- Helper functions for permission checking
- Gradual migration strategy preserving backward compatibility
- Zero breaking changes to existing systems
- Analytics-ready data structures

**Philosophy:**
Users have authenticated accounts. People are project participants. The two concepts remain separate but can be linked. Permissions are explicit, project-scoped, and role-based. Collaboration is controlled, auditable, and secure.
