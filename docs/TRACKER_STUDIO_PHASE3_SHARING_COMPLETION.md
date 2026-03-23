# Tracker Studio: Phase 3 - Sharing & Access Control

## Completion Summary

This document summarizes the completion of Phase 3 Prompt 1: Tracker Sharing & Access Control for Tracker Studio.

## Objectives Achieved

✅ **Permission Model Extension**: Extended `entity_permission_grants` to support `'tracker'` entity type  
✅ **Service-Level Enforcement**: All tracker services check permissions before operations  
✅ **Tracker Sharing UI**: Share drawer with invite, revoke, and access level management  
✅ **UI Behavior Changes**: Forms disabled for read-only users, permission badges shown  
✅ **RLS & Security**: Database-level policies enforce shared access  

## Implementation Details

### 1. Database Schema Extension

**File**: `supabase/migrations/20250131000002_extend_entity_grants_for_trackers.sql`
- Extended `entity_permission_grants.entity_type` constraint to include `'tracker'`
- Reuses existing permission grants table (no duplication)
- Trackers are independent entities (not tied to projects)

### 2. Permission Services

**File**: `src/lib/trackerStudio/trackerPermissionService.ts`
- `grantTrackerPermission`: Grant viewer/editor access to users
- `revokeTrackerPermission`: Revoke access (owner only)
- `listTrackerPermissions`: List all active grants for a tracker
- Owner-based validation (not project-based)
- Cannot grant 'owner' role (ownership is immutable via `tracker.owner_id`)

**File**: `src/lib/trackerStudio/trackerPermissionResolver.ts`
- `resolveTrackerPermissions`: Resolves permissions for current user
- Resolution order:
  1. Owner check (`tracker.owner_id`) → full access
  2. Active grants → viewer or editor
  3. No access
- Returns: `canView`, `canEdit`, `canManage`, `isOwner`, `role`

### 3. Service-Level Permission Enforcement

**File**: `src/lib/trackerStudio/trackerService.ts`
- `getTracker`: Checks `canView` before returning tracker
- `listTrackers`: Includes owned + shared trackers
- `updateTracker`: Only owner can update
- `archiveTracker`: Only owner can archive

**File**: `src/lib/trackerStudio/trackerEntryService.ts`
- `createEntry`: Checks `canEdit` before creating
- `updateEntry`: Checks `canEdit` before updating
- `listEntriesByDateRange`: Checks `canView` before listing
- `getEntryByDate`: Checks `canView` before returning

**Design Principle**: All permission checks happen in services, not UI. UI reflects permissions but doesn't enforce them.

### 4. Sharing UI Component

**File**: `src/components/tracker-studio/TrackerSharingDrawer.tsx`
- Slide-over drawer (mobile-friendly)
- Lists current access:
  - Owner (always shown, cannot be removed)
  - Editors (write access)
  - Viewers (read-only access)
- Invite user by email
- Choose access level: Viewer or Editor
- Revoke access (owner only)
- Shows user email and full name

### 5. UI Updates

**File**: `src/components/tracker-studio/TrackerDetailPage.tsx`
- Added "Share" button (owner only)
- Shows permission badge for non-owners ("Read-only" or "Editor")
- Loads and displays permissions
- Integrates sharing drawer

**File**: `src/components/tracker-studio/TrackerEntryForm.tsx`
- Added `readOnly` prop
- Disables all inputs when `readOnly={true}`
- Shows message: "You have read-only access to this tracker"
- All field types respect read-only state:
  - Text (textarea)
  - Number (input)
  - Boolean (checkbox)
  - Rating (buttons)
  - Date (date picker)

### 6. RLS Policies

**File**: `supabase/migrations/20250131000003_add_tracker_sharing_rls.sql`
- Created `user_has_tracker_access()` helper function
- Policies added:
  - `Shared users can read trackers`: Viewers and editors can read
  - `Shared users can read entries`: Viewers and editors can read entries
  - `Editors can create entries`: Editors can create entries
  - `Editors can update entries`: Editors can update entries
- Owner always has full access
- Archived trackers: Only owner can view (checked in resolver)

## Permission Model

### Roles

- **Owner**: Full control (via `tracker.owner_id`)
  - Can view, edit, manage sharing, archive
  - Cannot be granted via permissions (immutable)
  
- **Editor**: Read + Write access (via grants)
  - Can view tracker and entries
  - Can create and edit entries
  - Cannot delete tracker or manage sharing
  
- **Viewer**: Read-only access (via grants)
  - Can view tracker and entries
  - Cannot create or edit entries
  - Cannot delete tracker or manage sharing

### Access Rules

1. **Owner always has write access** (enforced in services)
2. **Read-only users**:
   - Can view tracker
   - Can view entries
   - Cannot create or edit entries (enforced in services + UI)
3. **Write users**:
   - Can create and edit entries
   - Cannot delete tracker (owner only)
   - Cannot reshare tracker (owner only)
4. **Archived trackers**: Only owner can view (checked in resolver)

## Architecture Principles Maintained

✅ **Reused existing permissions system** (no new tables)  
✅ **No duplication of permission logic** (shared table, tracker-specific services)  
✅ **Trackers are independent** (not tied to projects or households)  
✅ **Service-level enforcement** (all checks in services, not UI)  
✅ **RLS at database level** (defense in depth)  
✅ **Owner-based permissions** (not project-based)  

## Quality Checks

✅ **A tracker can be shared with read-only access**  
✅ **A tracker can be shared with write access**  
✅ **Read-only users cannot create/edit entries** (service + UI enforcement)  
✅ **Write users can create/edit entries**  
✅ **Owner can revoke access**  
✅ **Planner & Spaces still work unchanged** (read-only views unaffected)  
✅ **All enforcement is in services** (no UI-only checks)  
✅ **No duplication of permission logic** (reuses entity_permission_grants)  

## Files Created

1. `supabase/migrations/20250131000002_extend_entity_grants_for_trackers.sql`
2. `supabase/migrations/20250131000003_add_tracker_sharing_rls.sql`
3. `src/lib/trackerStudio/trackerPermissionService.ts`
4. `src/lib/trackerStudio/trackerPermissionResolver.ts`
5. `src/components/tracker-studio/TrackerSharingDrawer.tsx`
6. `docs/TRACKER_STUDIO_PHASE3_SHARING_COMPLETION.md` (this file)

## Files Modified

1. `src/lib/trackerStudio/trackerService.ts` - Added permission checks
2. `src/lib/trackerStudio/trackerEntryService.ts` - Added permission checks
3. `src/components/tracker-studio/TrackerDetailPage.tsx` - Added sharing UI and permission display
4. `src/components/tracker-studio/TrackerEntryForm.tsx` - Added read-only support

## Usage

### Sharing a Tracker

1. Open tracker detail page
2. Click "Share" button (owner only)
3. Enter user email in sharing drawer
4. Select access level: Viewer or Editor
5. Click "Invite User"
6. User receives access immediately

### Revoking Access

1. Open sharing drawer
2. Click trash icon next to user
3. Confirm revocation
4. User loses access immediately

### Viewing as Shared User

1. Shared trackers appear in "My Trackers" list
2. Permission badge shows "Read-only" or "Editor"
3. Entry form is disabled for viewers
4. "Share" button hidden for non-owners

## Next Steps (Out of Scope for Phase 3)

The following are explicitly deferred:
- Template sharing
- Template permissions
- Reminder permissions
- Analytics permissions
- Group-based sharing (individual users only)
- Public links
- Entry editing from Planner/Spaces

## Notes

- All permission checks happen in services before database operations
- RLS policies provide defense-in-depth at database level
- UI reflects permissions but doesn't enforce them
- Owner cannot be changed (immutable via `tracker.owner_id`)
- Archived trackers are only visible to owner
- Permission grants are soft-deleted (via `revoked_at`)
