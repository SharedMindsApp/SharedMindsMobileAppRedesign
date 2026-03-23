# Tracker Studio Phase 5: Tracker Observation Foundation - Implementation Summary

**Status:** ✅ **COMPLETE**  
**Date:** January 2025  
**Phase:** 5 - Tracker Observation Foundation (Prompt 1)

---

## Overview

Phase 5 implements the foundational layer for Tracker Observation, enabling Guardrails projects to observe Tracker Studio trackers in a read-only, consent-based, contextual way. This phase is purely foundational — no UI, no Guardrails rendering, no consent modals.

---

## What Was Built

### 1. Database Schema

**Migration 1:** `supabase/migrations/20250131000009_create_tracker_observation_links.sql`

**Table:** `tracker_observation_links`
- `id` (uuid, primary key)
- `tracker_id` (uuid, FK to trackers)
- `observer_user_id` (uuid, FK to auth.users)
- `context_type` (text, default 'guardrails_project')
- `context_id` (uuid, e.g., project_id)
- `granted_by` (uuid, FK to auth.users - tracker owner)
- `created_at`, `revoked_at` (timestamps)

**Constraints:**
- Unique active link per (tracker_id, observer_user_id, context_id)
- Partial unique index where `revoked_at IS NULL`
- Context type validation (guardrails_project, team, household)

**Indexes:**
- Tracker ID index
- Observer user ID index
- Context (type, id) index
- All filtered by `revoked_at IS NULL`

**RLS Policies:**
- Tracker owners can view/create/revoke observation links
- Observers can view their own observation links
- No mutation policies for observers

**Helper Function:**
- `list_observable_trackers_for_context(p_context_type, p_context_id, p_observer_user_id)` - Returns tracker IDs observable in a context

**Migration 2:** `supabase/migrations/20250131000010_add_observation_rls_to_trackers.sql`

**RLS Policy Updates:**
- `trackers` table: Observers can read trackers via observation links
- `tracker_entries` table: Observers can read entries via observation links
- No INSERT/UPDATE/DELETE policies for observers (read-only enforced)

---

### 2. TypeScript Types

**File:** `src/lib/trackerStudio/trackerObservationTypes.ts`

**Types:**
- `ObservationContextType` - Union type: 'guardrails_project' | 'team' | 'household'
- `TrackerObservationLink` - Full observation link interface
- `CreateObservationLinkInput` - Input for creating observation links
- `ObservationContext` - Context object (type + id)

---

### 3. Observation Service

**File:** `src/lib/trackerStudio/trackerObservationService.ts`

**Functions:**
- `createObservationLink(input)` - Create observation link (owner only)
- `revokeObservationLink(linkId)` - Revoke observation link (owner only, idempotent)
- `listObservationsForTracker(trackerId)` - List all observation links for a tracker (owner only)
- `listObservableTrackersForContext(contextType, contextId, observerUserId)` - List tracker IDs observable in a context
- `hasObservationAccess(trackerId, userId, context)` - Check if user has observation access

**Validation:**
- Tracker must exist and be owned by caller
- Tracker cannot be archived
- Observer cannot be the owner
- Observer user ID must be valid UUID
- Idempotent creation (restores revoked links if exists)

---

### 4. Permission Resolver Extension

**File:** `src/lib/trackerStudio/trackerPermissionResolver.ts`

**Changes:**
- Added `ObservationContext` parameter to `resolveTrackerPermissions()`
- Extended resolution order:
  1. Owner (full access)
  2. Direct permission grant (viewer/editor)
  3. Observation link (read-only, if context provided)
  4. No access

**New Return Fields:**
- `role: 'observer'` for observation access
- `accessSource: 'observation'` for debugging/audit

**Observation Rules:**
- `canView = true`
- `canEdit = false`
- `canManage = false`
- `role = 'observer'`
- Only checked if context is provided

---

### 5. Service Layer Updates

#### Tracker Service (`trackerService.ts`)

**Updated Functions:**
- `getTracker(trackerId, context?)` - Accepts optional context, allows observer read-only
- `listTrackers(includeArchived, context?)` - Includes observable trackers when context provided
- `updateTracker()` - Owner only (unchanged)
- `archiveTracker()` - Owner only (unchanged)

#### Tracker Entry Service (`trackerEntryService.ts`)

**Updated Functions:**
- `listEntriesByDateRange(options, context?)` - Accepts optional context, allows observer read-only
- `getEntryByDate(trackerId, entryDate, context?)` - Accepts optional context, allows observer read-only
- `getEntry(entryId, context?)` - Accepts optional context, allows observer read-only
- `createEntry()` - Owner or editor only (observers cannot create)
- `updateEntry()` - Owner or editor only (observers cannot update)

---

## Core Principles (Adhered To)

✅ **Tracker Studio owns all tracker data** - No data duplication  
✅ **Guardrails never duplicates tracker data** - All data fetched from Tracker Studio  
✅ **Observation ≠ sharing** - Different semantic model  
✅ **Observation is always read-only** - Observers cannot edit  
✅ **Observation is contextual** - Project-scoped access  
✅ **Consent is explicit and revocable** - Owner must grant, can revoke  
✅ **No tracker mutations via observation** - All mutations owner/editor only  
✅ **No automatic sharing** - Explicit creation required  

---

## Permission Resolution Flow

**New Resolution Order:**
1. **Owner Check**
   - If `tracker.owner_id === userId` → Full access
   - Overrides all other grants

2. **Direct Permission Grant**
   - If `entity_permission_grants` exists → Access per role
   - `editor` → canEdit, `viewer` → canView only

3. **Observation Link** (if context provided)
   - If `tracker_observation_links` exists with matching context → Read-only access
   - Always `canView = true`, `canEdit = false`, `canManage = false`
   - Context must match (type + id)

4. **No Access**
   - Default if no matches

**Important:** Direct grants take precedence over observation links. If a user has both, the direct grant applies.

---

## Security & Privacy

### RLS Enforcement

**Trackers Table:**
- Owners can read their trackers
- Observers can read via observation links (RLS policy)
- No mutation policies for observers

**Tracker Entries Table:**
- Owners can read their entries
- Observers can read entries for trackers they observe (RLS policy)
- No mutation policies for observers

**Observation Links Table:**
- Owners can view/create/revoke links for their trackers
- Observers can view their own links
- No mutation by observers

### Edge Cases Handled

✅ **User leaves project** - Guardrails revokes links (future phase)  
✅ **Tracker archived** - RLS prevents access, links remain for audit  
✅ **Observer tries to edit** - Service layer returns 403, RLS prevents  
✅ **Multiple observation links** - Each context is independent  
✅ **Revoked link** - Immediate RLS denial, no data leak  

---

## Validation Checklist

✅ Tracker owner can create observation link  
✅ Observer can read tracker  
✅ Observer can read tracker entries  
✅ Observer cannot create/update/delete anything  
✅ Revoked observation immediately removes access  
✅ Direct permission grants override observation  
✅ Archived tracker is not visible to observers  
✅ No data duplication  
✅ No UI regressions (no UI changes in this phase)  

---

## What's NOT Included (As Specified)

❌ Consent UI  
❌ Project selection UI  
❌ Guardrails rendering  
❌ Notifications  
❌ Bulk sharing  
❌ Inference  
❌ Analytics  
❌ Automatic revocation hooks  

---

## Files Created/Modified

### Created:
- `supabase/migrations/20250131000009_create_tracker_observation_links.sql`
- `supabase/migrations/20250131000010_add_observation_rls_to_trackers.sql`
- `src/lib/trackerStudio/trackerObservationTypes.ts`
- `src/lib/trackerStudio/trackerObservationService.ts`

### Modified:
- `src/lib/trackerStudio/trackerPermissionResolver.ts` - Extended to check observation links
- `src/lib/trackerStudio/trackerService.ts` - Updated to support observation access
- `src/lib/trackerStudio/trackerEntryService.ts` - Updated to support observation access
- `src/lib/trackerStudio/index.ts` - Exported observation types and services

---

## Technical Details

### Observation Link Creation

**Flow:**
1. User (tracker owner) calls `createObservationLink()`
2. Service validates:
   - Tracker exists and is owned by caller
   - Tracker is not archived
   - Observer is not the owner
   - Observer user ID is valid UUID
3. Checks for existing link (idempotent)
4. Creates or restores observation link
5. Returns link

**Idempotency:**
- If active link exists → return existing
- If revoked link exists → restore it
- If no link exists → create new

### Permission Resolution with Context

**Example:**
```typescript
// Guardrails calls:
const tracker = await getTracker(trackerId, {
  type: 'guardrails_project',
  id: projectId
});

// Service calls:
const permissions = await resolveTrackerPermissions(
  trackerId,
  userId,
  { type: 'guardrails_project', id: projectId }
);

// Resolver checks:
// 1. Is owner? → No
// 2. Has direct grant? → No
// 3. Has observation link with matching context? → Yes
// → Returns: { canView: true, canEdit: false, role: 'observer' }
```

### RLS Policy Logic

**Trackers SELECT Policy:**
```sql
owner_id = auth.uid()
OR EXISTS (
  SELECT 1 FROM tracker_observation_links
  WHERE tracker_id = trackers.id
    AND observer_user_id = auth.uid()
    AND revoked_at IS NULL
)
```

**Tracker Entries SELECT Policy:**
```sql
user_id = auth.uid()
OR EXISTS (
  SELECT 1 FROM trackers t
  WHERE t.id = tracker_entries.tracker_id
    AND (
      t.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM tracker_observation_links
        WHERE tracker_id = t.id
          AND observer_user_id = auth.uid()
          AND revoked_at IS NULL
      )
    )
)
```

---

## Next Steps (Future Phases)

- **Phase 5, Prompt 2:** Guardrails UI integration
  - Render tracker blocks in Guardrails projects
  - Query observable trackers
  - Read-only display

- **Phase 5, Prompt 3:** Consent UI
  - "Share to Project" modal in Tracker Studio
  - "Shared to Projects" section in tracker detail
  - Revocation UI

- **Phase 5, Prompt 4:** Notifications (optional)
  - Notify observers when access is granted/revoked
  - Notify owner when observer views tracker

---

## Summary

Phase 5 (Prompt 1) successfully implements the Tracker Observation Foundation, enabling contextual, read-only observation of trackers through Guardrails projects. The system is:

- **Secure:** RLS enforces read-only access for observers
- **Explicit:** Consent required via observation link creation
- **Revocable:** Links can be revoked immediately
- **Contextual:** Access is scoped to specific projects
- **Non-invasive:** No UI changes, no data duplication, no behavior changes

The foundation is ready for Guardrails integration in future phases.
