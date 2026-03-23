# Phase 6.2: Guardrails Permission Controls (Declarative Layer)

**Status:** Architecture Lock-In + Implementation  
**Date:** January 2025  
**Purpose:** Make permissions visible, understandable, and manageable inside Guardrails, without changing the permission system itself.

**This is the last blocker before testing.**

---

## What Phase 6.2 Is (and Is Not)

### ✅ It IS

- A UI-only phase (no schema/service changes)
- Declarative (visibility + control)
- Guardrails-scoped
- Reuses existing permission APIs and hooks
- MVP-level (minimal but complete)

### ❌ It is NOT

- A new permission system
- A new role model
- A replacement for `/tracks/:id/permissions`
- A schema or service change
- A team UX phase

---

## Scope: Access & Permissions Section

### Location

Appears in **WorkspaceOverview** tab, alongside:
- Objective
- Definition of Done
- Time Intent

### Levels

- ✅ **Track** (main tracks)
- ✅ **Sub-track** (subtracks)

**Note:** Project-level permissions section is deferred (no project workspace overview exists).

### Visual Pattern

Follows the existing section pattern:
- White card with border (`bg-white rounded-lg border border-gray-200 p-6`)
- Icon + Title header (Shield icon, "Access & Permissions")
- Content area (read-first summary)
- Optional action buttons (when permitted)

---

## UX Pattern: Read-First, Control-Second

### Default State (Read-Only Summary)

Displays:
- **Who can view**: Project role or explicit grants
- **Who can edit**: Project role or explicit grants
- **Access source**: Inherited (from project) or Overridden (entity-level grants)
- **Creator rights**: Active or Revoked (if applicable)
- **Entity grants count**: "X explicit grants" (if any)

### Actions (When Permitted)

**For users with edit permission:**
- "Grant Access" button → Opens inline form (minimal)
- "Manage Advanced Permissions" link → Navigates to `/projects/:projectId/tracks/:trackId/permissions`

**For users with view-only permission:**
- No actions shown
- Summary only

---

## Implementation Details

### Component Structure

**New Component:** `src/components/guardrails/workspace/overview/WorkspacePermissionsSection.tsx`

**Props:**
```typescript
interface WorkspacePermissionsSectionProps {
  projectId: string;
  trackId: string;
  isSubtrack?: boolean; // For subtrack context
}
```

**Integration Point:** `WorkspaceOverview.tsx`
- Add section after "Time Intent Summary" section
- Feature flag gated: `ENABLE_ENTITY_GRANTS`

### Data Sources (Hooks Only)

**Permission Status:**
- `useCanAccessTrack(trackId)` - Current user's access
- `useCanEditTrack(trackId)` - Current user's edit permission

**Permission Grants:**
- `useEntityPermissions({ entityType: 'track' | 'subtrack', entityId: trackId })` - List explicit grants
- `useCreatorRights({ entityType: 'track' | 'subtrack', entityId: trackId, creatorUserId })` - Creator rights status

**Project Context:**
- `useTrackCreator(trackId)` - Get creator ID (if needed for creator rights display)

### Display Logic

**Access Source Determination:**
- If `useEntityPermissions` returns grants: "Overridden" (has explicit grants)
- Else: "Inherited" (from project)

**Role Display:**
- Use project role as baseline
- Show if explicit grants modify permissions
- Creator rights shown separately if applicable

**Creator Rights:**
- Only shown if entity has a creator (`created_by` is set)
- Status: "Active" or "Revoked"
- Only displayed if `ENABLE_CREATOR_RIGHTS` is enabled

### Actions

**"Grant Access" (Inline, Minimal):**
- Simple form: User/Group selector + Role selector
- Uses `useGrantEntityPermission` hook
- On success: Refresh grants list
- Collapses after grant or cancel

**"Manage Advanced Permissions":**
- Navigation link to `/projects/:projectId/tracks/:trackId/permissions`
- Uses `useNavigate()` from react-router-dom
- Opens in same window (or new tab on modifier key)

---

## Architectural Rules (Phase 3.3/3.4 Compliance)

### ✅ MUST Follow

1. **Layout owns permission checks**
   - WorkspaceOverview (parent) checks `ENABLE_ENTITY_GRANTS` feature flag
   - WorkspacePermissionsSection assumes feature flag is enabled if rendered

2. **Section assumes permission granted**
   - Section renders if feature flag is ON
   - Section does not check route-level permissions (assumes WorkspaceShell/RouteGuard handled it)

3. **Actions use hooks only**
   - All API calls via hooks (`useEntityPermissions`, `useGrantEntityPermission`, etc.)
   - No direct service imports
   - No Supabase imports

4. **No resolver calls in UI**
   - Do not call `resolveEntityPermissions` directly
   - Use permission hooks only (`useCanAccessTrack`, `useCanEditTrack`)

5. **Feature flags respected**
   - `ENABLE_ENTITY_GRANTS` gates entire section
   - `ENABLE_CREATOR_RIGHTS` gates creator rights display only

6. **Flicker-free**
   - Section shows skeleton while permissions load
   - Actions hidden until permission state resolved
   - `PermissionState = boolean | null` pattern

### ❌ MUST NOT Do

- ❌ Call resolver functions directly
- ❌ Import services or Supabase
- ❌ Check permissions in render bodies
- ❌ Duplicate permission checks (rely on hooks)
- ❌ Create new permission logic
- ❌ Modify existing permission services/APIs
- ❌ Add schema changes
- ❌ Create new routes (use existing `/permissions` route)

---

## Implementation Plan

### Step 1: Create WorkspacePermissionsSection Component

**File:** `src/components/guardrails/workspace/overview/WorkspacePermissionsSection.tsx`

**Responsibilities:**
- Display permission summary (read-only by default)
- Show "Grant Access" inline form (when edit permission granted)
- Show "Manage Advanced Permissions" link (when edit permission granted)
- Handle loading states
- Handle error states

**Dependencies:**
- `useEntityPermissions` hook
- `useCanEditTrack` hook
- `useGrantEntityPermission` hook (for inline grant)
- `useCreatorRights` hook (if creator rights enabled)
- `useTrackCreator` hook (to get creator ID)

### Step 2: Integrate into WorkspaceOverview

**File:** `src/components/guardrails/workspace/overview/WorkspaceOverview.tsx`

**Changes:**
- Import `WorkspacePermissionsSection`
- Import `ENABLE_ENTITY_GRANTS` feature flag
- Add section after "Time Intent Summary" section
- Gate with feature flag check

### Step 3: Handle Subtrack Context

**Note:** Subtrack permissions use same component, with `entityType: 'subtrack'` and `entityId: subtrackId`.

**Integration:** WorkspaceOverview already receives `isSubtrack` prop, pass to section component.

---

## Success Criteria

Phase 6.2 is complete when:

- ✅ Permission section appears in Track WorkspaceOverview (when feature flag ON)
- ✅ Permission section appears in Subtrack WorkspaceOverview (when feature flag ON)
- ✅ Summary displays access source (inherited/overridden)
- ✅ Summary displays creator rights status (if applicable)
- ✅ "Grant Access" inline form works (for users with edit permission)
- ✅ "Manage Advanced Permissions" link navigates correctly
- ✅ All data sourced from hooks only (no services/Supabase)
- ✅ Feature flags respected
- ✅ Flicker-free rendering
- ✅ No architectural rule violations

---

## Testing Checklist

- [ ] Section appears when `ENABLE_ENTITY_GRANTS` is true
- [ ] Section hidden when `ENABLE_ENTITY_GRANTS` is false
- [ ] Summary displays inherited permissions correctly
- [ ] Summary displays overridden permissions correctly
- [ ] Creator rights displayed when `ENABLE_CREATOR_RIGHTS` is true
- [ ] Creator rights hidden when `ENABLE_CREATOR_RIGHTS` is false
- [ ] "Grant Access" button appears only for users with edit permission
- [ ] "Grant Access" form successfully grants permissions
- [ ] "Manage Advanced Permissions" link navigates to correct route
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] No permission flicker
- [ ] No console errors
- [ ] No architectural violations (no services/Supabase in UI)

---

**Document Status**: Architecture Lock-In Complete  
**Next Step**: Implementation  
**Last Updated**: January 2025
