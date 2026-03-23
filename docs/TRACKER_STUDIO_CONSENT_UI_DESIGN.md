# Tracker Studio ↔ Guardrails Integration
## Phase 5, Prompt 3: Tracker Observation Consent UI (Share to Guardrails Projects)

**Document Type:** Architecture & Implementation Planning  
**Status:** Design Phase  
**Date:** January 2025  
**Scope:** Tracker Studio UI for sharing trackers to Guardrails projects — no Guardrails changes

---

## Executive Summary

This document defines the UI design and implementation plan for the Tracker Observation Consent layer. This allows tracker owners to explicitly share their trackers to Guardrails projects with read-only access, view where trackers are shared, and revoke access at any time.

**Core Principle:** Explicit consent, context-scoped, read-only, reversible.

---

## 1. Share Entry Point

### 1.1 Location: Tracker Detail Page

**File:** `src/components/tracker-studio/TrackerDetailPage.tsx`

**New UI Element:**
- Button: "Share to Project"
- Placement: Next to existing "Share" button (for direct permission sharing)
- Icon: `Share2` or `Users` from lucide-react

**Visibility Rules:**
- ✅ Visible if: User is tracker owner (`user.id === tracker.owner_id`)
- ✅ Visible if: Tracker is not archived (`tracker.archived_at === null`)
- ❌ Hidden if: User is not owner
- ❌ Hidden if: Tracker is archived
- ❌ Hidden if: User is observer (read-only access)

**Button State:**
- Enabled: Normal state
- Disabled: Tracker archived, loading, or service unavailable

### 1.2 Button Design

**Visual:**
```
[Share] [Share to Project]
```

**Or if space is limited:**
```
[Share] [Share to Project ▼]
```

**Accessibility:**
- `aria-label="Share tracker to Guardrails project"`
- `aria-describedby="share-to-project-description"` (tooltip or help text)

---

## 2. Share to Project Modal

### 2.1 Component: ShareTrackerToProjectModal.tsx

**Location:** `src/components/tracker-studio/ShareTrackerToProjectModal.tsx`

**Props:**
```typescript
interface ShareTrackerToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker;
  onShared: () => void; // Callback after successful share/revoke
}
```

**Responsibilities:**
1. Fetch user's Guardrails projects (via `getUserProjects()`)
2. Fetch existing observation links (via `listObservationsForTracker()`)
3. Display project list with share state
4. Handle sharing to selected projects
5. Handle revocation inline
6. Show consent language
7. Handle loading and error states

### 2.2 Modal Structure

```
┌─────────────────────────────────────────────────────┐
│ Share "Sleep Tracker" to Projects          [X]      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Sharing a tracker allows project participants to    │
│ view your entries in read-only mode. They cannot    │
│ edit data, add entries, or see trackers you haven't │
│ shared.                                              │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Share to projects:                                   │
│                                                      │
│ [ ] Personal Training (John Smith)                   │
│      Your role: Editor                               │
│      [Share]                                         │
│                                                      │
│ [✓] Therapy Sessions (Dr. Patel)                     │
│      Your role: Viewer                               │
│      Shared (read-only)                              │
│      [Revoke]                                        │
│                                                      │
│ [ ] Family Support Group                             │
│      Your role: Owner                                │
│      [Share]                                         │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [Cancel]                                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2.3 Project List Item Component

**Component:** `ProjectShareItem.tsx` (internal to modal)

**Props:**
```typescript
interface ProjectShareItemProps {
  project: {
    id: string;
    name: string;
    userRole: ProjectUserRole; // 'owner' | 'editor' | 'viewer'
  };
  isShared: boolean; // Has active observation link
  observationLinkId: string | null; // Link ID if shared
  onShare: () => void;
  onRevoke: () => void;
  sharing: boolean; // Loading state
  revoking: boolean; // Loading state
}
```

**Display Logic:**
- **Not Shared:**
  - Checkbox: Unchecked
  - Status: None
  - Action: "Share" button
- **Shared:**
  - Checkbox: Checked
  - Status: "Shared (read-only)" badge
  - Action: "Revoke" button

**User Role Display:**
- Optional: Show user's role in project
- Format: "Your role: {role}" (small, muted text)
- Purpose: Context for why they can share

### 2.4 Consent Language (Critical)

**Required Copy (Top of Modal):**

```
Sharing a tracker allows project participants to view your entries in read-only mode. They cannot edit data, add entries, or see trackers you haven't shared.
```

**Alternative (More Detailed):**

```
When you share a tracker to a Guardrails project, all participants in that project can view your tracker entries in read-only mode. They cannot:
• Edit your entries
• Add new entries
• Modify tracker settings
• See other trackers you haven't shared

You can revoke access at any time.
```

**Language to Avoid:**
- ❌ "Monitor your progress"
- ❌ "Track your compliance"
- ❌ "Evaluate performance"
- ❌ "Accountability"
- ❌ "Surveillance"
- ❌ "Oversight"
- ❌ "Review your data"

**Tone:**
- ✅ Neutral, factual
- ✅ Clear about limitations
- ✅ Empowering (you control access)
- ❌ No judgment or evaluation language

---

## 3. Data Fetching & State Management

### 3.1 Projects Fetching

**Service Call:**
```typescript
import { getUserProjects } from '../../lib/guardrails/projectUserService';
import { getMasterProject } from '../../lib/guardrails/masterProjectService'; // If needed

// In modal component
const loadProjects = async () => {
  const projectUsers = await getUserProjects(userId, false); // Exclude archived
  
  // Fetch project names (if not included in ProjectUser)
  const projectsWithNames = await Promise.all(
    projectUsers.map(async (pu) => {
      const project = await getMasterProject(pu.masterProjectId);
      return {
        id: pu.masterProjectId,
        name: project?.name || 'Unknown Project',
        userRole: pu.role,
      };
    })
  );
  
  return projectsWithNames;
};
```

**Alternative (If ProjectUser includes name):**
```typescript
// If getUserProjects() returns project names via join
const projectUsers = await getUserProjects(userId, false);
const projects = projectUsers.map(pu => ({
  id: pu.masterProjectId,
  name: pu.projectName, // If available
  userRole: pu.role,
}));
```

### 3.2 Observation Links Fetching

**Service Call:**
```typescript
import { listObservationsForTracker } from '../../lib/trackerStudio/trackerObservationService';

// In modal component
const loadObservationLinks = async () => {
  const links = await listObservationsForTracker(tracker.id);
  
  // Filter to Guardrails projects only
  const guardrailsLinks = links.filter(
    link => link.context_type === 'guardrails_project' && link.revoked_at === null
  );
  
  // Create map: projectId -> linkId
  const linkMap = new Map<string, string>();
  guardrailsLinks.forEach(link => {
    linkMap.set(link.context_id, link.id);
  });
  
  return linkMap;
};
```

### 3.3 State Structure

**Modal Component State:**
```typescript
interface ModalState {
  projects: Array<{
    id: string;
    name: string;
    userRole: ProjectUserRole;
  }>;
  observationLinks: Map<string, string>; // projectId -> linkId
  loading: boolean;
  error: string | null;
  sharing: Set<string>; // projectIds being shared
  revoking: Set<string>; // linkIds being revoked
}
```

**Derived State:**
```typescript
// For each project, determine if shared
const isProjectShared = (projectId: string): boolean => {
  return observationLinks.has(projectId);
};

// Get link ID for project
const getLinkIdForProject = (projectId: string): string | null => {
  return observationLinks.get(projectId) || null;
};
```

---

## 4. Share Action Flow

### 4.1 Share to Project

**User Action:** Click "Share" button for a project

**Flow:**
```
1. User clicks "Share" for project
   ↓
2. Set sharing state: sharing.add(projectId)
   ↓
3. Determine observer_user_id:
   - For Guardrails projects, observer = all project participants
   - But observation links are per-user
   - Need to create link for each participant
   ↓
4. Call createObservationLink() for each participant
   ↓
5. On success:
   - Update observationLinks map
   - Remove from sharing set
   - Call onShared() callback
   ↓
6. On error:
   - Show error message
   - Remove from sharing set
```

**Critical Question: Observer User ID**

**Option A: Share to All Participants**
- Create observation link for each project participant
- Requires fetching project participants first
- More complex, but matches "project participants can view"

**Option B: Share to Project Context Only**
- Create single link with `observer_user_id = current_user` (temporary)
- Guardrails resolves participants via project membership
- Simpler, but requires Guardrails to handle participant resolution

**Recommendation: Option A (Explicit per-participant links)**

**Rationale:**
- Clearer consent model
- Each participant has explicit link
- Easier to audit
- Matches RLS structure

**Implementation:**
```typescript
const handleShare = async (projectId: string) => {
  setSharing(prev => new Set(prev).add(projectId));
  
  try {
    // Fetch project participants
    const participants = await getProjectUsers(projectId, false);
    
    // Create observation link for each participant (except owner)
    const linkPromises = participants
      .filter(p => p.userId !== user.id) // Don't create link for self
      .map(participant =>
        createObservationLink({
          tracker_id: tracker.id,
          observer_user_id: participant.userId,
          context_type: 'guardrails_project',
          context_id: projectId,
        })
      );
    
    await Promise.allSettled(linkPromises);
    
    // Reload observation links
    await loadObservationLinks();
    
    onShared(); // Notify parent
  } catch (error) {
    showToast('error', `Failed to share tracker: ${error.message}`);
  } finally {
    setSharing(prev => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
  }
};
```

**Idempotency:**
- `createObservationLink()` is idempotent
- If link exists, returns existing link
- If link revoked, restores it
- No duplicate links created

### 4.2 Revoke Action Flow

**User Action:** Click "Revoke" button for a shared project

**Flow:**
```
1. User clicks "Revoke" for project
   ↓
2. Show confirmation dialog:
   "Stop sharing this tracker to {projectName}? Project participants will no longer be able to view your entries."
   ↓
3. User confirms
   ↓
4. Set revoking state: revoking.add(linkId)
   ↓
5. Call revokeObservationLink(linkId)
   ↓
6. On success:
   - Remove from observationLinks map
   - Remove from revoking set
   - Call onShared() callback
   ↓
7. On error:
   - Show error message
   - Remove from revoking set
```

**Implementation:**
```typescript
const handleRevoke = async (projectId: string) => {
  const linkId = observationLinks.get(projectId);
  if (!linkId) return;
  
  const project = projects.find(p => p.id === projectId);
  const projectName = project?.name || 'this project';
  
  if (!window.confirm(
    `Stop sharing this tracker to ${projectName}? Project participants will no longer be able to view your entries.`
  )) {
    return;
  }
  
  setRevoking(prev => new Set(prev).add(linkId));
  
  try {
    await revokeObservationLink(linkId);
    
    // Reload observation links
    await loadObservationLinks();
    
    onShared(); // Notify parent
    showToast('success', `Stopped sharing to ${projectName}`);
  } catch (error) {
    showToast('error', `Failed to revoke access: ${error.message}`);
  } finally {
    setRevoking(prev => {
      const next = new Set(prev);
      next.delete(linkId);
      return next;
    });
  }
};
```

**Confirmation Dialog:**
- Required for revocation
- Clear language about consequences
- No undo (but can re-share)

---

## 5. "Shared To" Visibility Section

### 5.1 Component: TrackerObservationList.tsx

**Location:** `src/components/tracker-studio/TrackerObservationList.tsx`

**Props:**
```typescript
interface TrackerObservationListProps {
  tracker: Tracker;
  onRevoked: () => void; // Callback after revocation
}
```

**Responsibilities:**
1. Fetch observation links for tracker
2. Filter to Guardrails projects only
3. Fetch project names
4. Display list of shared projects
5. Provide revoke action per project
6. Handle empty state (no shares)

### 5.2 Display Structure

**Location:** Tracker Detail Page, below "Entry History" section

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│ Shared Access                                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ This tracker is shared to the following Guardrails  │
│ projects. Project participants can view your entries │
│ in read-only mode.                                   │
│                                                      │
│ • Therapy Sessions (read-only)              [Revoke] │
│   Shared via Guardrails project                      │
│                                                      │
│ • Personal Training (read-only)            [Revoke]  │
│   Shared via Guardrails project                      │
│                                                      │
│ [Share to Another Project]                           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Empty State:**
```
┌─────────────────────────────────────────────────────┐
│ Shared Access                                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ This tracker is not shared to any Guardrails         │
│ projects.                                           │
│                                                      │
│ [Share to Project]                                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 5.3 List Item Component

**Component:** `ObservationListItem.tsx` (internal)

**Props:**
```typescript
interface ObservationListItemProps {
  projectName: string;
  projectId: string;
  linkId: string;
  onRevoke: (linkId: string, projectName: string) => void;
  revoking: boolean;
}
```

**Display:**
- Project name
- "read-only" badge
- "Shared via Guardrails project" context label
- "Revoke" button

**Revoke Flow:**
- Same confirmation dialog as modal
- Same service call
- Updates parent component on success

---

## 6. Integration with Tracker Detail Page

### 6.1 Updated TrackerDetailPage.tsx

**New Sections:**
1. **Header Actions:**
   - Existing "Share" button (direct permissions)
   - New "Share to Project" button (Guardrails projects)

2. **New Section: "Shared Access"**
   - Below "Entry History" section
   - Shows `TrackerObservationList` component
   - Only visible to owner

**State Management:**
```typescript
const [showShareToProjectModal, setShowShareToProjectModal] = useState(false);
const [observationRefreshKey, setObservationRefreshKey] = useState(0);

const handleObservationChanged = () => {
  setObservationRefreshKey(prev => prev + 1); // Trigger refresh
};
```

**Button Handler:**
```typescript
const handleShareToProject = () => {
  setShowShareToProjectModal(true);
};
```

**Modal Integration:**
```typescript
{showShareToProjectModal && tracker && (
  <ShareTrackerToProjectModal
    isOpen={showShareToProjectModal}
    onClose={() => setShowShareToProjectModal(false)}
    tracker={tracker}
    onShared={handleObservationChanged}
  />
)}
```

**Observation List Integration:**
```typescript
{userPermissions.isOwner && (
  <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
    <TrackerObservationList
      key={observationRefreshKey}
      tracker={tracker}
      onRevoked={handleObservationChanged}
    />
  </div>
)}
```

---

## 7. Service Integration

### 7.1 Service Calls Mapping

| Action | Service Function | Input | Output |
|--------|-----------------|-------|--------|
| **List Projects** | `getUserProjects(userId)` | `userId: string` | `ProjectUser[]` |
| **Get Project Name** | `getMasterProject(projectId)` | `projectId: string` | `MasterProject \| null` |
| **List Observation Links** | `listObservationsForTracker(trackerId)` | `trackerId: string` | `TrackerObservationLink[]` |
| **Get Project Participants** | `getProjectUsers(projectId)` | `projectId: string` | `ProjectUser[]` |
| **Create Observation Link** | `createObservationLink(input)` | `CreateObservationLinkInput` | `TrackerObservationLink` |
| **Revoke Observation Link** | `revokeObservationLink(linkId)` | `linkId: string` | `void` |

### 7.2 Service Call Flow Diagrams

**Share Flow:**
```
User clicks "Share" for project
  ↓
Fetch project participants: getProjectUsers(projectId)
  ↓
For each participant (except owner):
  createObservationLink({
    tracker_id: trackerId,
    observer_user_id: participant.userId,
    context_type: 'guardrails_project',
    context_id: projectId
  })
  ↓
All links created (or restored)
  ↓
Reload observation links: listObservationsForTracker(trackerId)
  ↓
Update UI
```

**Revoke Flow:**
```
User clicks "Revoke" for project
  ↓
Confirmation dialog
  ↓
User confirms
  ↓
revokeObservationLink(linkId)
  ↓
Link revoked (revoked_at set)
  ↓
Reload observation links
  ↓
Update UI
```

---

## 8. Permission & Validation Rules

### 8.1 Who Can Share

✅ **Tracker Owner:**
- Can share to any Guardrails project they're in
- Can revoke any observation link
- Can see all observation links

❌ **Tracker Editor:**
- Cannot share (not owner)
- Cannot revoke
- Cannot see observation links

❌ **Tracker Viewer:**
- Cannot share (not owner)
- Cannot revoke
- Cannot see observation links

### 8.2 What Can Be Shared

✅ **Active Trackers:**
- Can be shared
- `archived_at IS NULL`

❌ **Archived Trackers:**
- Cannot be shared
- UI disabled if archived
- Error if share attempted

### 8.3 Validation Rules

**Service-Level (Already Implemented):**
- ✅ Tracker must exist
- ✅ User must own tracker
- ✅ Tracker cannot be archived
- ✅ Observer cannot be owner
- ✅ Idempotent creation (no duplicates)

**UI-Level (To Implement):**
- ✅ Disable share button if tracker archived
- ✅ Hide share UI if user not owner
- ✅ Show error if project fetch fails
- ✅ Show error if share fails
- ✅ Confirm before revoke

### 8.4 Idempotency Handling

**Scenario: Share to Already-Shared Project**
- User clicks "Share" for project that already has active link
- `createObservationLink()` returns existing link (idempotent)
- UI updates to show "Shared" state
- No error, no duplicate

**Scenario: Restore Revoked Link**
- User clicks "Share" for project with revoked link
- `createObservationLink()` restores link (sets `revoked_at = NULL`)
- UI updates to show "Shared" state
- Treated as new share

---

## 9. Failure & Edge Case Handling

### 9.1 Edge Case Matrix

| Situation | Detection | Expected Behavior | UX |
|-----------|-----------|-------------------|-----|
| **User not in any projects** | `getUserProjects()` returns empty array | Show empty state | "You're not in any Guardrails projects. Create a project first." |
| **Project list fails to load** | Service throws error | Show error state | Error message + retry button |
| **Share already exists** | `createObservationLink()` returns existing link | Treat as success | Update UI to "Shared" state |
| **Revoked link restored** | `createObservationLink()` restores link | Treat as new share | Update UI to "Shared" state |
| **Tracker archived** | `tracker.archived_at IS NOT NULL` | Disable sharing UI | Disabled button, tooltip: "Cannot share archived tracker" |
| **Service unavailable** | Service throws network error | Block action, show error | Error toast, disable buttons |
| **User leaves project later** | Project no longer in `getUserProjects()` | Project disappears from list | Project removed from UI (Guardrails handles access) |
| **Project deleted** | `getMasterProject()` returns null | Show "Unknown Project" | Display "Unknown Project" or hide |
| **Partial share failure** | Some `createObservationLink()` calls fail | Show partial success | Success for successful, error for failed |
| **Observer user deleted** | Observer user doesn't exist | RLS prevents access | Link exists but observer can't access (acceptable) |

### 9.2 Error Messages

**User-Friendly Messages:**
- "Failed to load projects. Please try again."
- "Failed to share tracker. Please try again."
- "Failed to revoke access. Please try again."
- "Cannot share archived tracker."
- "You're not in any Guardrails projects."

**Technical Errors (Console Only):**
- Full error stack traces
- Service call details
- Network errors

### 9.3 Loading States

**Modal Loading:**
- Initial load: Show skeleton or spinner
- Projects loading: "Loading projects..."
- Observation links loading: "Loading sharing status..."

**Action Loading:**
- Share action: Disable button, show "Sharing..."
- Revoke action: Disable button, show "Revoking..."

**Optimistic Updates:**
- ❌ No optimistic updates (can be confusing)
- ✅ Wait for service confirmation
- ✅ Update UI after success

---

## 10. Component API Design

### 10.1 ShareTrackerToProjectModal

**Props:**
```typescript
interface ShareTrackerToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracker: Tracker;
  onShared: () => void;
}
```

**Internal State:**
```typescript
{
  projects: ProjectWithRole[];
  observationLinks: Map<string, string>; // projectId -> linkId
  loading: boolean;
  error: string | null;
  sharing: Set<string>; // projectIds
  revoking: Set<string>; // linkIds
}
```

**Methods:**
- `loadProjects()`: Fetch user's projects
- `loadObservationLinks()`: Fetch observation links
- `handleShare(projectId)`: Share to project
- `handleRevoke(projectId)`: Revoke share

### 10.2 TrackerObservationList

**Props:**
```typescript
interface TrackerObservationListProps {
  tracker: Tracker;
  onRevoked: () => void;
}
```

**Internal State:**
```typescript
{
  observationLinks: TrackerObservationLink[];
  projectNames: Map<string, string>; // projectId -> name
  loading: boolean;
  error: string | null;
  revoking: Set<string>; // linkIds
}
```

**Methods:**
- `loadObservationLinks()`: Fetch links
- `loadProjectNames()`: Fetch project names
- `handleRevoke(linkId, projectName)`: Revoke access

---

## 11. Copy & Language Review

### 11.1 Required Copy

**Modal Title:**
```
Share "{Tracker Name}" to Projects
```

**Consent Language (Top of Modal):**
```
Sharing a tracker allows project participants to view your entries in read-only mode. They cannot edit data, add entries, or see trackers you haven't shared.
```

**Button Labels:**
- "Share to Project" (entry point)
- "Share" (action for unshared project)
- "Revoke" (action for shared project)
- "Cancel" (close modal)

**Status Labels:**
- "Shared (read-only)" (badge)
- "Your role: {role}" (context)

**Empty States:**
- "You're not in any Guardrails projects."
- "This tracker is not shared to any Guardrails projects."

**Confirmation Dialog:**
```
Stop sharing this tracker to {projectName}? Project participants will no longer be able to view your entries.
```

**Success Messages:**
- "Tracker shared to {projectName}"
- "Stopped sharing to {projectName}"

**Error Messages:**
- "Failed to share tracker. Please try again."
- "Failed to revoke access. Please try again."
- "Cannot share archived tracker."

### 11.2 Language to Avoid

❌ "Monitor"  
❌ "Track progress"  
❌ "Compliance"  
❌ "Accountability"  
❌ "Surveillance"  
❌ "Oversight"  
❌ "Review" (in evaluative sense)  
❌ "Evaluate"  
❌ "Assess"  
❌ "Check up on"  

### 11.3 Tone Guidelines

✅ **Neutral & Factual:**
- "Project participants can view your entries"
- "They cannot edit data"

✅ **Empowering:**
- "You can revoke access at any time"
- "You control who can see your data"

✅ **Clear & Direct:**
- "Shared (read-only)"
- "Stop sharing this tracker"

❌ **Avoid Judgment:**
- No "good" or "bad" language
- No performance implications
- No compliance framing

---

## 12. Implementation Checklist

### Phase 1: Service Integration
- [ ] Verify `getUserProjects()` returns project names (or add join)
- [ ] Verify `getMasterProject()` exists (or create)
- [ ] Verify `getProjectUsers()` exists for participant fetching
- [ ] Test `createObservationLink()` with multiple participants
- [ ] Test `revokeObservationLink()` idempotency
- [ ] Test `listObservationsForTracker()` filtering

### Phase 2: Modal Component
- [ ] Create `ShareTrackerToProjectModal.tsx`
- [ ] Implement project fetching
- [ ] Implement observation link fetching
- [ ] Implement project list rendering
- [ ] Implement share action (multi-participant)
- [ ] Implement revoke action
- [ ] Add consent language
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states

### Phase 3: Observation List Component
- [ ] Create `TrackerObservationList.tsx`
- [ ] Implement observation link fetching
- [ ] Implement project name fetching
- [ ] Implement list rendering
- [ ] Implement revoke action
- [ ] Add empty state
- [ ] Add loading states
- [ ] Add error handling

### Phase 4: Tracker Detail Page Integration
- [ ] Add "Share to Project" button
- [ ] Add visibility rules (owner only, not archived)
- [ ] Integrate `ShareTrackerToProjectModal`
- [ ] Add "Shared Access" section
- [ ] Integrate `TrackerObservationList`
- [ ] Add refresh mechanism
- [ ] Test with multiple projects
- [ ] Test with no projects

### Phase 5: Edge Cases & Polish
- [ ] Test archived tracker (UI disabled)
- [ ] Test user not in projects (empty state)
- [ ] Test project fetch failure (error state)
- [ ] Test share failure (error message)
- [ ] Test revoke failure (error message)
- [ ] Test idempotent share (already shared)
- [ ] Test revoked link restore
- [ ] Add accessibility attributes
- [ ] Add keyboard navigation
- [ ] Test confirmation dialogs

---

## 13. Data Flow Diagrams

### 13.1 Initial Modal Load

```
User clicks "Share to Project"
  ↓
ShareTrackerToProjectModal opens
  ↓
useEffect triggers loadData()
  ↓
Parallel fetch:
  - getUserProjects(userId) → projects
  - listObservationsForTracker(trackerId) → links
  ↓
For each project, fetch name:
  - getMasterProject(projectId) → name
  ↓
Map links to projects:
  - Filter links: context_type === 'guardrails_project'
  - Create map: projectId → linkId
  ↓
Render project list with share state
```

### 13.2 Share Action

```
User clicks "Share" for project
  ↓
handleShare(projectId) called
  ↓
Set loading: sharing.add(projectId)
  ↓
Fetch participants: getProjectUsers(projectId)
  ↓
Filter: participants.filter(p => p.userId !== ownerId)
  ↓
For each participant:
  createObservationLink({
    tracker_id: trackerId,
    observer_user_id: participant.userId,
    context_type: 'guardrails_project',
    context_id: projectId
  })
  ↓
Promise.allSettled() waits for all
  ↓
Reload links: listObservationsForTracker(trackerId)
  ↓
Update observationLinks map
  ↓
Remove from sharing set
  ↓
Call onShared() callback
  ↓
UI updates to "Shared" state
```

### 13.3 Revoke Action

```
User clicks "Revoke" for project
  ↓
handleRevoke(projectId) called
  ↓
Get linkId from observationLinks map
  ↓
Show confirmation dialog
  ↓
User confirms
  ↓
Set loading: revoking.add(linkId)
  ↓
revokeObservationLink(linkId)
  ↓
Link revoked (revoked_at set)
  ↓
Reload links: listObservationsForTracker(trackerId)
  ↓
Update observationLinks map (remove projectId)
  ↓
Remove from revoking set
  ↓
Call onShared() callback
  ↓
UI updates to "Not Shared" state
```

---

## 14. Security Considerations

### 14.1 Permission Enforcement

**UI-Level:**
- ✅ Only show share UI to owner
- ✅ Disable share if tracker archived
- ✅ Hide observation links from non-owners

**Service-Level (Already Enforced):**
- ✅ `createObservationLink()` checks ownership
- ✅ `revokeObservationLink()` checks ownership
- ✅ `listObservationsForTracker()` checks ownership
- ✅ RLS prevents unauthorized access

**Validation:**
- Test: Non-owner cannot see share button
- Test: Non-owner cannot call share service
- Test: Archived tracker cannot be shared

### 14.2 Data Privacy

**What Users See:**
- ✅ Only their own projects
- ✅ Only observation links for their trackers
- ✅ Project names (not sensitive)

**What Users Don't See:**
- ❌ Other users' projects
- ❌ Observation links for others' trackers
- ❌ Participant details (unless needed for context)

**Audit Trail:**
- Observation links retain `granted_by` and `created_at`
- Revoked links retain `revoked_at` (soft delete)
- Full history available to owner

---

## 15. Accessibility Considerations

### 15.1 ARIA Labels

**Modal:**
- `aria-label="Share tracker to Guardrails projects"`
- `aria-describedby="consent-description"`

**Project Items:**
- `aria-label="Project: {name}, {shared/not shared}"`
- `aria-checked={isShared}` for checkbox

**Buttons:**
- `aria-label="Share tracker to {projectName}"`
- `aria-label="Revoke access for {projectName}"`
- `aria-busy={sharing || revoking}`

### 15.2 Keyboard Navigation

- Tab order: Projects → Share/Revoke buttons → Cancel
- Enter/Space on project item → Toggle share
- Escape → Close modal
- Focus management on open/close

### 15.3 Screen Reader Support

- Announce modal open/close
- Announce share/revoke actions
- Announce loading states
- Announce errors

---

## 16. Success Criteria

This phase is successful if:

✅ **Users clearly understand what sharing does**
- Consent language is clear and neutral
- No surveillance or judgment language
- Limitations are explicit

✅ **Sharing is explicit and reversible**
- User must click "Share" for each project
- Revocation is one click away
- Confirmation prevents accidental revoke

✅ **Observers only ever get read-only access**
- No edit controls in Guardrails
- Service layer enforces read-only
- RLS prevents mutations

✅ **Revocation is immediate**
- Link revoked instantly
- Guardrails loses access via RLS
- UI updates immediately

✅ **No ambiguity about scope or visibility**
- Clear which projects have access
- Clear who can see what
- Clear context (Guardrails project)

✅ **Tracker Studio remains fully autonomous**
- No Guardrails dependencies in Tracker Studio
- Tracker Studio can function without Guardrails
- Services are self-contained

✅ **The system feels safe for sensitive data**
- Neutral, non-judgmental language
- User in control
- Clear boundaries
- Reversible actions

---

## 17. Open Questions & Decisions Needed

1. **Observer User ID Strategy:**
   - Decision: Create link per participant (Option A)
   - Alternative: Single link with project context (Option B)
   - **Status:** Document recommends Option A, final decision needed

2. **Project Name Fetching:**
   - Decision: Fetch via `getMasterProject()` for each project
   - Alternative: Join in `getUserProjects()` to include names
   - **Status:** Document assumes separate fetch, optimize if needed

3. **Confirmation Dialog Style:**
   - Decision: Browser `window.confirm()`
   - Alternative: Custom modal component
   - **Status:** Document uses `window.confirm()`, can upgrade later

4. **Empty State for No Projects:**
   - Decision: Show message + link to create project (if possible)
   - Alternative: Just show message
   - **Status:** Document shows message only, can add link later

5. **User Role Display:**
   - Decision: Show user's role in project (optional context)
   - Alternative: Hide role (not relevant)
   - **Status:** Document includes role, can hide if not useful

---

## Document Status

This document is complete and ready for implementation. All UI components are designed, service integrations are mapped, edge cases are considered, and language is reviewed.

**Next Step:** Review and approval before Phase 5, Prompt 3 implementation begins.
