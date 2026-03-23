# Tracker Studio ↔ Guardrails Integration
## Consent-Based Tracker Observation for Client & Relationship Management

**Document Type:** Architecture & Implementation Planning  
**Status:** Design Phase  
**Date:** January 2025  
**Scope:** Integration design only — no implementation

---

## Executive Summary

This document defines the architecture for integrating Tracker Studio with Guardrails projects, enabling users to selectively share trackers with project participants (coaches, therapists, teachers, managers) in a read-only, relationship-scoped, consent-based model.

**Core Principle:** Tracker Studio remains autonomous. Guardrails acts as a read-only observation lens, never owning or duplicating tracker data.

---

## 1. Conceptual Overview

### 1.1 Mental Model: "Tracker Observation via Relationship"

**The Problem:**
Users want to share specific trackers with specific people in specific contexts (e.g., a personal trainer viewing sleep + fitness trackers, a therapist viewing mood + sleep trackers).

**The Solution:**
A lightweight **Tracker Observation Link** connects:
- A tracker (owned by User A)
- An observer (User B, participant in a Guardrails project)
- A relationship context (the Guardrails project)
- Explicit consent (granted by User A, revocable)

**Key Characteristics:**
- **Contextual:** Access exists because of a Guardrails project relationship
- **Explicit:** User A must intentionally grant access
- **Scoped:** Access is limited to the project context
- **Read-only:** Observer cannot modify tracker data
- **Revocable:** User A can revoke access at any time

### 1.2 Relationship Flow

```
User A (Tracker Owner)
  ↓
Creates/owns Tracker X
  ↓
Joins Guardrails Project Y (with User B)
  ↓
Explicitly shares Tracker X to Project Y
  ↓
User B (Observer) can view Tracker X in Project Y context
  ↓
User A can revoke → User B loses access
```

**Important:** If User A leaves Project Y, all observation links for that project are automatically revoked.

---

## 2. Data Model Design

### 2.1 Option A: Reuse `entity_permission_grants`

**Current State:**
- `entity_permission_grants` already supports `entity_type = 'tracker'`
- Has `subject_type` and `subject_id` for grantee
- Supports `permission_role` (owner, editor, viewer)
- Has `revoked_at` for soft deletion

**Pros:**
- ✅ Reuses existing infrastructure
- ✅ Consistent permission model across domains
- ✅ Already has RLS policies
- ✅ Less new code to maintain

**Cons:**
- ❌ No explicit relationship context field
- ❌ Cannot distinguish "shared to project" from "shared directly to user"
- ❌ Harder to query "all trackers observable in project X"
- ❌ No clear audit trail of "why" access exists

**Implementation Approach:**
- Add `context_type` and `context_id` columns to `entity_permission_grants`
- Use `context_type = 'guardrails_project'`, `context_id = project_id`
- Extend permission resolver to check context

**Query Pattern:**
```sql
-- Find all trackers observable in a project
SELECT DISTINCT entity_id
FROM entity_permission_grants
WHERE entity_type = 'tracker'
  AND context_type = 'guardrails_project'
  AND context_id = :project_id
  AND subject_id = :observer_profile_id
  AND revoked_at IS NULL;
```

### 2.2 Option B: New `tracker_observation_links` Table

**Proposed Schema:**
```sql
CREATE TABLE tracker_observation_links (
  id uuid PRIMARY KEY,
  tracker_id uuid NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  observer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'guardrails_project',
  context_id uuid NOT NULL, -- project_id
  granted_by uuid NOT NULL REFERENCES auth.users(id), -- tracker owner
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  
  CONSTRAINT unique_active_observation UNIQUE (tracker_id, observer_user_id, context_id) 
    WHERE revoked_at IS NULL
);
```

**Pros:**
- ✅ Explicit relationship context built-in
- ✅ Clear separation: "observation" vs "direct sharing"
- ✅ Easier to query "trackers in project X"
- ✅ Better audit trail
- ✅ Can extend to other contexts (teams, households) later

**Cons:**
- ❌ New table to maintain
- ❌ Duplicate permission infrastructure
- ❌ Need new RLS policies
- ❌ Permission resolver must check two sources

**Query Pattern:**
```sql
-- Find all trackers observable in a project
SELECT tracker_id
FROM tracker_observation_links
WHERE context_type = 'guardrails_project'
  AND context_id = :project_id
  AND observer_user_id = :observer_user_id
  AND revoked_at IS NULL;
```

### 2.3 Recommendation: **Option B (New Table)**

**Justification:**

1. **Semantic Clarity:** "Observation" is conceptually different from "permission grant." Observation is contextual, relationship-scoped, and purpose-built for read-only viewing. Permission grants are more general-purpose.

2. **Query Simplicity:** Guardrails needs to answer "What trackers can I see in this project?" frequently. A dedicated table makes this a single, fast query.

3. **Future Extensibility:** The `context_type` field allows future contexts (teams, households, custom groups) without schema changes.

4. **Audit Trail:** Clear separation makes it easier to answer "Why does User B see this tracker?" — it's because of Project X, not a direct share.

5. **Revocation Clarity:** When a user leaves a project, all observation links for that project can be revoked in one operation. This is harder to express with permission grants.

6. **No Coupling:** Tracker Studio doesn't need to know about Guardrails projects. The observation link table can live in a shared schema or be managed by Guardrails, with Tracker Studio services checking it.

**Hybrid Approach (Alternative):**
If we want to reuse permission infrastructure but add context, we could:
- Add `context_type` and `context_id` to `entity_permission_grants`
- Create a view `tracker_observation_links` that queries permission grants with context
- Use the view for Guardrails queries, permission grants for direct sharing

**Final Recommendation:** New `tracker_observation_links` table for clarity and simplicity.

---

## 3. Permission Resolution Flow

### 3.1 Tracker Studio Service Layer Changes

**Current Flow:**
```
getTracker(trackerId)
  → resolveTrackerPermissions(trackerId)
    → Check: Is user owner?
    → Check: Does user have entity_permission_grants?
    → Return: { canView, canEdit, canManage }
```

**New Flow:**
```
getTracker(trackerId, observerContext?)
  → resolveTrackerPermissions(trackerId, observerContext?)
    → Check: Is user owner? → Full access
    → Check: Does user have entity_permission_grants? → Direct share access
    → Check: Does user have tracker_observation_links? → Read-only observation access
    → Return: { canView, canEdit, canManage, accessSource }
```

### 3.2 Resolution Precedence

**Order of Checks:**
1. **Owner** (highest priority)
   - If `tracker.owner_id === user.id` → Full access
   - Overrides all other grants

2. **Direct Permission Grant**
   - If `entity_permission_grants` exists with `entity_type = 'tracker'` → Access per role
   - `editor` → canEdit, `viewer` → canView only

3. **Observation Link** (lowest priority, read-only)
   - If `tracker_observation_links` exists with matching context → Read-only access
   - Always `canView = true`, `canEdit = false`, `canManage = false`
   - Context must match (e.g., `context_type = 'guardrails_project'`, `context_id = project_id`)

**Important:** If a user has both a direct grant and an observation link, the direct grant takes precedence (they can edit if granted editor role).

### 3.3 Revocation Behavior

**When User A revokes observation link:**
- `tracker_observation_links.revoked_at = now()`
- User B immediately loses access (RLS enforces)
- No cascade to tracker data
- No notification required (but could be added)

**When User A leaves Guardrails Project:**
- All observation links where `context_id = project_id` are revoked
- This is a Guardrails responsibility (project membership change)
- Tracker Studio services will naturally deny access due to revoked links

**When Tracker is archived:**
- Observation links remain but RLS prevents access
- Links can be cleaned up later or left for audit

### 3.4 Permission Resolver Pseudocode

```
function resolveTrackerPermissions(trackerId, userId, context?):
  // 1. Check ownership
  if tracker.owner_id === userId:
    return { canView: true, canEdit: true, canManage: true, role: 'owner' }
  
  // 2. Check direct permission grants
  directGrant = findEntityPermissionGrant('tracker', trackerId, userId)
  if directGrant and not directGrant.revoked_at:
    return {
      canView: true,
      canEdit: directGrant.role === 'editor',
      canManage: false, // Only owner can manage
      role: directGrant.role
    }
  
  // 3. Check observation links (if context provided)
  if context:
    observationLink = findObservationLink(trackerId, userId, context.type, context.id)
    if observationLink and not observationLink.revoked_at:
      return {
        canView: true,
        canEdit: false,
        canManage: false,
        role: 'observer',
        accessSource: 'observation'
      }
  
  // 4. No access
  return { canView: false, canEdit: false, canManage: false, role: null }
```

---

## 4. Guardrails Integration Strategy

### 4.1 How Guardrails Renders Tracker Data

**Principle:** Guardrails never duplicates Tracker Studio logic. It calls Tracker Studio services.

**Flow:**
```
Guardrails Project Page
  ↓
Query: "What trackers are observable in this project?"
  → SELECT tracker_id FROM tracker_observation_links 
    WHERE context_id = project_id AND observer_user_id = current_user
  ↓
For each tracker_id:
  → Call Tracker Studio service: getTracker(trackerId, { type: 'guardrails_project', id: project_id })
  → Service resolves permissions (including observation link check)
  → Returns tracker data if access granted
  ↓
Guardrails renders read-only tracker blocks
```

### 4.2 Tracker Block Component in Guardrails

**Component:** `GuardrailsTrackerBlock.tsx` (new)

**Responsibilities:**
- Fetch tracker via Tracker Studio service
- Display tracker name, description, recent entries
- Show "View in Tracker Studio" link
- Never show edit controls
- Never show reminder settings
- Never show sharing controls

**Data Fetching:**
```typescript
// In Guardrails component
const { tracker, entries } = useObservableTracker(trackerId, projectId);

// Hook implementation
function useObservableTracker(trackerId: string, projectId: string) {
  // Calls Tracker Studio service with context
  return useTracker(trackerId, { 
    context: { type: 'guardrails_project', id: projectId } 
  });
}
```

### 4.3 Avoiding Logic Duplication

**What Guardrails Must NOT Do:**
- ❌ Implement its own permission checks
- ❌ Cache tracker data in Guardrails tables
- ❌ Create tracker entries
- ❌ Modify tracker metadata
- ❌ Generate insights or analytics

**What Guardrails CAN Do:**
- ✅ Query observation links (its own table)
- ✅ Call Tracker Studio services
- ✅ Render read-only UI
- ✅ Link to full Tracker Studio for detailed views

**Service Boundary:**
```
Guardrails Domain          Tracker Studio Domain
─────────────────          ───────────────────
tracker_observation_links  trackers
(relationship layer)        tracker_entries
                           tracker_templates
                           context_events
                           (all data + logic)
```

Guardrails owns the relationship. Tracker Studio owns the data.

---

## 5. Consent & Revocation UX

### 5.1 Where Sharing is Initiated

**Location:** Tracker Studio (Tracker Detail Page)

**Flow:**
1. User opens tracker detail page
2. Clicks "Share to Project" button (new)
3. Modal shows:
   - List of Guardrails projects user is in
   - Checkboxes for each project
   - Warning: "Project participants will be able to view this tracker read-only"
4. User selects projects and confirms
5. System creates `tracker_observation_links` for each selected project
6. Confirmation: "Tracker shared to [Project Name]"

**UI Component:** `ShareTrackerToProjectModal.tsx` (new in Tracker Studio)

**Guardrails Integration:**
- Guardrails provides API endpoint: `GET /api/guardrails/projects?user_id=:userId`
- Tracker Studio calls this to list available projects
- No direct database access from Tracker Studio to Guardrails

### 5.2 Where Access is Revoked

**Option A: From Tracker Studio**
- Tracker Detail Page → "Shared to Projects" section
- List of projects with observation links
- "Revoke" button per project
- Confirmation: "Remove access for all project participants?"

**Option B: From Guardrails**
- Project Settings → "Observable Trackers" section
- Tracker owner can revoke from here
- Other participants see list but cannot revoke

**Recommendation:** Both locations, but Tracker Studio is primary.

**Revocation Flow:**
1. User clicks "Revoke" in either location
2. System sets `tracker_observation_links.revoked_at = now()`
3. RLS immediately denies access
4. Observers see "Tracker no longer available" message
5. No data is deleted, only access is revoked

### 5.3 What Happens After Revocation

**Immediate:**
- RLS policies prevent further access
- Guardrails tracker blocks show "Access revoked" or disappear
- No notification sent (could be added later)

**Data:**
- Tracker data remains unchanged
- Observation link record remains (for audit)
- Can be restored by setting `revoked_at = NULL`

**User Experience:**
- Observer sees empty state or "Tracker no longer shared"
- No error messages or broken UI
- Graceful degradation

---

## 6. Security & Privacy Safeguards

### 6.1 RLS Strategy

**Tracker Studio RLS (Existing):**
```sql
-- Users can view their own trackers
CREATE POLICY "Users can view their own trackers"
  ON trackers FOR SELECT
  USING (owner_id = auth.uid());

-- Shared users can view trackers (via entity_permission_grants)
CREATE POLICY "Shared users can view trackers"
  ON trackers FOR SELECT
  USING (
    owner_id = auth.uid() OR
    user_has_tracker_access(id, 'viewer')
  );
```

**New RLS for Observation Links:**
```sql
-- Observers can view trackers via observation links
CREATE POLICY "Observers can view trackers via links"
  ON trackers FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tracker_observation_links
      WHERE tracker_id = trackers.id
        AND observer_user_id = auth.uid()
        AND revoked_at IS NULL
    )
  );
```

**Tracker Entries RLS:**
- Same pattern: check observation links in addition to ownership/grants
- Always read-only for observers

### 6.2 Edge Cases

**Case 1: User leaves project while viewing tracker**
- Guardrails revokes observation links
- Next service call will fail permission check
- UI shows "Access revoked" message
- No data leak (RLS prevents access)

**Case 2: Tracker owner archives tracker**
- Observation links remain
- RLS prevents access (archived trackers not visible)
- Links can be cleaned up later

**Case 3: Observer tries to edit via API**
- Service layer checks `canEdit` → false for observers
- Returns 403 Forbidden
- No data modification possible

**Case 4: Multiple observation links for same tracker**
- User A shares to Project X and Project Y
- User B is in both projects
- User B sees tracker in both project contexts
- Revoking from Project X doesn't affect Project Y access

**Case 5: Observer becomes project owner**
- Observation link still applies
- But if they also get direct permission grant, that takes precedence
- No privilege escalation risk

### 6.3 Failure Modes

**Service Unavailable:**
- Guardrails cannot fetch tracker data
- Shows "Tracker data unavailable" message
- No partial data shown
- Retry mechanism in UI

**Permission Check Failure:**
- Default to no access
- Log error for debugging
- User sees "Access denied" message

**Data Inconsistency:**
- Observation link exists but tracker deleted
- RLS foreign key constraint prevents orphaned links
- Guardrails handles gracefully (tracker not found)

---

## 7. Future Extensions

### 7.1 Group-Based Observation

**Teams / Households:**
- Extend `context_type` to support `'team'`, `'household'`
- Same observation link table
- Same permission resolution logic
- Guardrails queries filter by context type

**Implementation:**
- No schema changes needed
- Add new context types to enum
- Update queries to filter by context type

### 7.2 Multiple Trackers per Relationship

**Current:** One observation link per tracker per project

**Future:** Bulk operations
- "Share all fitness trackers to this project"
- "Share trackers matching tag X"
- UI convenience, not new data model

### 7.3 Context-Aware Insights in Guardrails

**Concept:** Show cross-tracker insights within Guardrails project context

**Implementation:**
- Guardrails calls Tracker Studio insight service
- Passes project context
- Insights filtered to observable trackers only
- Read-only display

**Example:**
- Therapist views "Mood and Sleep Patterns" insight
- Only includes trackers shared to therapy project
- Cannot see other trackers user has

---

## 8. Explicit Non-Goals

### 8.1 What This System Will NOT Do

**❌ Editing tracker data from Guardrails**
- **Why:** Tracker Studio owns all data mutations. Guardrails is observation-only.

**❌ Automatic tracker sharing**
- **Why:** Explicit consent is required. No "share all trackers" by default.

**❌ Performance scoring or KPIs**
- **Why:** Tracker Studio is non-judgmental. No scores, rankings, or performance metrics.

**❌ Health diagnosis or inference**
- **Why:** Tracker Studio does not provide medical advice. Observers cannot infer health outcomes.

**❌ Mandatory tracking**
- **Why:** Users choose what to track and what to share. No enforcement.

**❌ Managerial enforcement tools**
- **Why:** This is observation for support, not surveillance or performance management.

**❌ Alerts based on tracker values**
- **Why:** No automated alerts or notifications triggered by tracker data. Reminders are user-controlled.

**❌ Data duplication**
- **Why:** Single source of truth is Tracker Studio. Guardrails never caches or duplicates tracker data.

**❌ Cross-project aggregation**
- **Why:** Observation is scoped to individual projects. No "all trackers across all projects" views.

**❌ Tracker creation from Guardrails**
- **Why:** Trackers are created in Tracker Studio only. Guardrails cannot create trackers.

---

## 9. Implementation Phases

### Phase 1: Foundation
- Create `tracker_observation_links` table
- Add RLS policies
- Extend permission resolver to check observation links
- Basic service functions (create, revoke, list)

### Phase 2: Guardrails Integration
- Guardrails queries observation links
- Guardrails renders read-only tracker blocks
- Link to Tracker Studio for full views

### Phase 3: Consent UI
- "Share to Project" modal in Tracker Studio
- "Shared to Projects" section in tracker detail
- Revocation UI in both systems

### Phase 4: Polish
- Error handling
- Loading states
- Empty states
- Audit logging

---

## 10. Success Criteria

The design is successful if:

✅ **Tracker Studio remains fully standalone**
- No Guardrails dependencies in Tracker Studio core
- Tracker Studio can function without Guardrails

✅ **Guardrails acts as a lens, not a data owner**
- No tracker data stored in Guardrails
- All data fetched from Tracker Studio services

✅ **Users feel safe sharing sensitive data**
- Explicit consent required
- Clear revocation
- No surveillance patterns

✅ **Works equally well for all relationship types**
- Personal trainers
- Therapists
- Teachers
- Parents
- Managers

✅ **Architecture is understandable 6–12 months later**
- Clear separation of concerns
- Well-documented service boundaries
- Boringly correct, not clever

---

## 11. Open Questions & Decisions Needed

1. **Where should `tracker_observation_links` table live?**
   - Option A: Tracker Studio schema (Tracker Studio owns the relationship)
   - Option B: Shared schema (both systems can access)
   - Option C: Guardrails schema (Guardrails owns the relationship)
   - **Recommendation:** Option B (shared schema) for clarity

2. **Should observation links be visible to observers?**
   - Option A: Yes, observers see "This tracker is shared to this project"
   - Option B: No, observers just see the tracker
   - **Recommendation:** Option A for transparency

3. **Notification on revocation?**
   - Option A: Yes, notify observers when access is revoked
   - Option B: No, silent revocation
   - **Recommendation:** Option B initially, add notifications later if needed

4. **Bulk operations?**
   - Should users be able to share multiple trackers at once?
   - **Recommendation:** Phase 2 feature, not Phase 1

5. **Audit logging?**
   - Should we log when observation links are created/revoked?
   - **Recommendation:** Yes, add to audit log table (if exists) or create simple log

---

## 12. Appendix: Text Diagrams

### 12.1 System Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Tracker Studio    │         │      Guardrails     │
│                     │         │                     │
│  - trackers         │         │  - projects         │
│  - entries          │         │  - participants     │
│  - templates        │         │  - observation_links│
│  - context_events   │         │                     │
│  - services         │◄────────┤  queries links     │
│  - RLS policies     │         │  calls services     │
└─────────────────────┘         └─────────────────────┘
         ▲                                │
         │                                │
         └────────────────────────────────┘
              tracker_observation_links
              (shared relationship layer)
```

### 12.2 Permission Resolution Flow

```
User requests tracker
         │
         ▼
Is user owner?
    │ Yes → Full access
    │ No
    ▼
Has direct permission grant?
    │ Yes → Access per role
    │ No
    ▼
Has observation link (with context)?
    │ Yes → Read-only access
    │ No
    ▼
No access
```

### 12.3 Sharing Flow

```
User A (Owner)
    │
    ├─ Opens Tracker Detail Page
    │
    ├─ Clicks "Share to Project"
    │
    ├─ Selects Project(s)
    │
    ├─ Confirms
    │
    └─ System creates observation_links
         │
         ▼
User B (Observer in Project)
    │
    ├─ Opens Guardrails Project
    │
    ├─ Sees Tracker Block
    │
    ├─ Views read-only tracker data
    │
    └─ Can click "View in Tracker Studio" for full view
```

---

## Document Status

This document is complete and ready for implementation planning. All architectural decisions are documented, edge cases are considered, and non-goals are explicit.

**Next Step:** Review and approval before Phase 1 implementation begins.
