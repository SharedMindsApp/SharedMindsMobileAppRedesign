# Tracker Studio ↔ Guardrails Integration
## Phase 5, Prompt 2: Guardrails Tracker Observation Rendering Layer

**Document Type:** Architecture & Implementation Planning  
**Status:** Design Phase  
**Date:** January 2025  
**Scope:** Guardrails-side rendering design only — no implementation

---

## Executive Summary

This document defines the architecture for rendering read-only Tracker Studio trackers within Guardrails projects. Guardrails acts as a projection layer that displays observable trackers without owning, duplicating, or mutating tracker data.

**Core Principle:** Tracker Studio is the single source of truth. Guardrails is a read-only lens.

---

## 1. Observable Tracker Discovery

### 1.1 Query Strategy

**Location:** Guardrails service layer

**Function:** `getObservableTrackerIds(projectId: string, userId: string): Promise<string[]>`

**Implementation Approach:**
- Call Tracker Studio service: `listObservableTrackersForContext()`
- Service queries `tracker_observation_links` table
- Filters by:
  - `context_type = 'guardrails_project'`
  - `context_id = projectId`
  - `observer_user_id = userId`
  - `revoked_at IS NULL`

**Why This Approach:**
- ✅ Tracker Studio owns the observation link table
- ✅ Permission logic stays in Tracker Studio
- ✅ Guardrails doesn't need direct database access
- ✅ Single source of truth maintained

**Alternative (Rejected):**
- Direct Guardrails query to `tracker_observation_links`
- ❌ Violates service boundary
- ❌ Duplicates permission logic
- ❌ Creates coupling

### 1.2 Data Flow

```
Guardrails Project Page
  ↓
Calls: getObservableTrackerIds(projectId, userId)
  ↓
Tracker Studio Service: listObservableTrackersForContext()
  ↓
Queries: tracker_observation_links (via RLS)
  ↓
Returns: string[] (tracker IDs)
  ↓
Guardrails receives: Observable tracker IDs
```

**Important:** Guardrails receives only tracker IDs, not tracker data. Data fetching happens separately.

---

## 2. Tracker Data Fetching via Tracker Studio

### 2.1 Service Call Pattern

**Function Signature:**
```typescript
getTracker(trackerId: string, context: ObservationContext): Promise<Tracker | null>
```

**Context Injection:**
```typescript
const context: ObservationContext = {
  type: 'guardrails_project',
  id: projectId
};
```

**Why Context is Required:**
- Observation links are context-scoped
- Without context, permission resolver won't check observation links
- Context ensures access is limited to the project relationship

### 2.2 Permission Resolution Flow

```
Guardrails calls: getTracker(trackerId, { type: 'guardrails_project', id: projectId })
  ↓
Tracker Studio: resolveTrackerPermissions(trackerId, userId, context)
  ↓
Checks:
  1. Is owner? → No
  2. Has direct grant? → No
  3. Has observation link with matching context? → Yes
  ↓
Returns: { canView: true, canEdit: false, role: 'observer' }
  ↓
Tracker Studio: Returns tracker data (RLS allows)
  ↓
Guardrails: Receives tracker data
```

### 2.3 Failure State Handling

**Scenario 1: Access Revoked**
- Observation link revoked → `revoked_at IS NOT NULL`
- Permission resolver returns `canView: false`
- `getTracker()` returns `null`
- **Guardrails Behavior:** Hide tracker or show "Unavailable"

**Scenario 2: Tracker Archived**
- Tracker `archived_at IS NOT NULL`
- RLS prevents access (even with observation link)
- `getTracker()` returns `null`
- **Guardrails Behavior:** Hide tracker or show "Archived"

**Scenario 3: Tracker Deleted**
- Tracker doesn't exist
- `getTracker()` returns `null`
- **Guardrails Behavior:** Remove from list, no error shown

**Scenario 4: Tracker Studio Service Unavailable**
- Network error or service down
- `getTracker()` throws error
- **Guardrails Behavior:** Show "Tracker data unavailable" message, retry on user action

**Scenario 5: User Removed from Project**
- Observation links remain but user no longer in project
- Guardrails should not show project to user
- **Guardrails Behavior:** Project not accessible, trackers not shown

---

## 3. Guardrails UI Components

### 3.1 Component: GuardrailsTrackerBlock.tsx

**Location:** `src/components/guardrails/trackers/GuardrailsTrackerBlock.tsx`

**Props:**
```typescript
interface GuardrailsTrackerBlockProps {
  trackerId: string;
  projectId: string;
  viewMode?: 'compact' | 'detailed'; // Default: 'compact'
}
```

**Responsibilities:**
- Fetch tracker data via Tracker Studio service (with context)
- Display tracker name and description
- Display recent entries (last 3-5 entries, summary view)
- Show "Shared by [Owner Name]" badge
- Provide "View in Tracker Studio" link
- Handle loading and error states
- Handle revoked/unavailable states gracefully

**Display Structure:**
```
┌─────────────────────────────────────┐
│ Tracker Name              [Badge]   │
│ Description text...                 │
│                                     │
│ Recent Entries:                     │
│ • Date: Value1, Value2              │
│ • Date: Value1, Value2              │
│ • Date: Value1, Value2              │
│                                     │
│ [View in Tracker Studio →]         │
└─────────────────────────────────────┘
```

**Must NOT Include:**
- ❌ Edit controls
- ❌ Reminder settings
- ❌ Sharing controls
- ❌ Analytics or insights
- ❌ Entry creation forms
- ❌ Entry editing forms

### 3.2 Component: GuardrailsTrackersSection.tsx

**Location:** `src/components/guardrails/trackers/GuardrailsTrackersSection.tsx`

**Props:**
```typescript
interface GuardrailsTrackersSectionProps {
  projectId: string;
  masterProjectId?: string; // If nested in a project
}
```

**Responsibilities:**
- Query observable tracker IDs for project
- Fetch tracker data for each ID
- Render `GuardrailsTrackerBlock` for each tracker
- Handle empty state (no trackers shared)
- Handle loading state
- Handle partial failures (some trackers unavailable)

**Display Structure:**
```
┌─────────────────────────────────────┐
│ Trackers                            │
│                                     │
│ [Tracker Block 1]                   │
│ [Tracker Block 2]                   │
│ [Tracker Block 3]                   │
│                                     │
│ Empty State:                        │
│ "No trackers shared to this project"│
└─────────────────────────────────────┘
```

### 3.3 Component Tree

```
GuardrailsProjectPage
  └─ GuardrailsProjectLayout
      └─ GuardrailsProjectTabs (or similar)
          └─ GuardrailsTrackersSection
              ├─ useObservableTrackers(projectId)
              └─ GuardrailsTrackerBlock (for each tracker)
                  ├─ useObservableTracker(trackerId, projectId)
                  └─ useObservableTrackerEntries(trackerId, projectId)
```

---

## 4. Project Page Integration

### 4.1 Recommended Approach: Dedicated "Trackers" Tab

**Rationale:**
- Clear separation of concerns
- Doesn't clutter main project view
- Easy to find and navigate
- Can be hidden if no trackers shared

**Implementation:**
- Add "Trackers" tab to existing project tab navigation
- Tab shows count: "Trackers (3)" or "Trackers" if empty
- Tab disabled/hidden if no trackers observable

**Alternative Approaches Considered:**

**Option A: Sidebar Panel**
- ❌ Can be hidden/collapsed, easy to miss
- ❌ Limited space for multiple trackers
- ❌ Not discoverable

**Option B: Inline Section on Overview**
- ❌ Clutters overview page
- ❌ Hard to find if many trackers
- ❌ Mixed concerns

**Option C: Dedicated Tab (Recommended)**
- ✅ Clear separation
- ✅ Discoverable
- ✅ Scalable
- ✅ Can show count badge

### 4.2 Tab Integration Points

**File:** `src/components/guardrails/GuardrailsProjectPage.tsx` (or similar)

**Changes:**
- Add "Trackers" to tab list
- Add route: `/guardrails/project/:projectId/trackers`
- Render `GuardrailsTrackersSection` in tab content

**Tab State:**
- Show tab if user has any observable trackers in project
- Hide tab if no trackers observable
- Show count badge: number of observable trackers

---

## 5. Data Fetching Hooks

### 5.1 Hook: useObservableTrackers

**Location:** `src/hooks/guardrails/useObservableTrackers.ts`

**Signature:**
```typescript
function useObservableTrackers(
  projectId: string
): {
  trackers: Tracker[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Implementation:**
1. Call `listObservableTrackersForContext('guardrails_project', projectId, userId)`
2. For each tracker ID, call `getTracker(trackerId, { type: 'guardrails_project', id: projectId })`
3. Filter out null results (revoked/archived trackers)
4. Return array of trackers

**Error Handling:**
- If service unavailable → set error, return empty array
- If individual tracker fails → log, continue with others
- If all fail → show error state

**Loading State:**
- Show loading until all trackers fetched or error occurs
- Partial results OK (show what's available)

### 5.2 Hook: useObservableTracker

**Location:** `src/hooks/guardrails/useObservableTracker.ts`

**Signature:**
```typescript
function useObservableTracker(
  trackerId: string,
  projectId: string
): {
  tracker: Tracker | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Implementation:**
1. Call `getTracker(trackerId, { type: 'guardrails_project', id: projectId })`
2. Handle null return (revoked/archived)
3. Return tracker or null

**Error Handling:**
- If `getTracker()` returns null → tracker unavailable (not an error)
- If service throws → set error state
- If access denied → return null (not an error)

### 5.3 Hook: useObservableTrackerEntries

**Location:** `src/hooks/guardrails/useObservableTrackerEntries.ts`

**Signature:**
```typescript
function useObservableTrackerEntries(
  trackerId: string,
  projectId: string,
  options?: {
    limit?: number; // Default: 5
    startDate?: string;
    endDate?: string;
  }
): {
  entries: TrackerEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Implementation:**
1. Call `listEntriesByDateRange({ tracker_id: trackerId, ...options }, { type: 'guardrails_project', id: projectId })`
2. Limit results to `limit` (default 5)
3. Return entries

**Error Handling:**
- If access denied → return empty array (not an error)
- If service throws → set error state

### 5.4 Service Wrapper (Optional)

**Location:** `src/lib/guardrails/trackerObservationService.ts` (new)

**Purpose:** Thin wrapper around Tracker Studio services that always injects Guardrails context

**Functions:**
```typescript
// Always injects Guardrails project context
export async function getObservableTracker(
  trackerId: string,
  projectId: string
): Promise<Tracker | null> {
  return getTracker(trackerId, {
    type: 'guardrails_project',
    id: projectId
  });
}

export async function listObservableTrackerEntries(
  trackerId: string,
  projectId: string,
  options?: ListTrackerEntriesOptions
): Promise<TrackerEntry[]> {
  return listEntriesByDateRange(
    { tracker_id: trackerId, ...options },
    { type: 'guardrails_project', id: projectId }
  );
}
```

**Why:** Ensures context is never forgotten, reduces boilerplate.

---

## 6. Failure & Edge Case Handling

### 6.1 Edge Case Matrix

| Situation | Detection | Expected Behavior | UX |
|-----------|-----------|-------------------|-----|
| **Access revoked while viewing** | `getTracker()` returns null on refetch | Remove tracker from list | Tracker block disappears, no error shown |
| **Tracker archived by owner** | `getTracker()` returns null | Remove tracker from list | Tracker block disappears, no error shown |
| **User removed from project** | Project not accessible | Project page redirects | User cannot see project or trackers |
| **Observation link revoked** | `getTracker()` returns null | Remove tracker from list | Tracker block disappears, no error shown |
| **Tracker Studio service unavailable** | Service throws error | Show error state | "Tracker data unavailable" message, retry button |
| **Partial failure (some trackers fail)** | Some `getTracker()` calls return null | Show available trackers | Available trackers render, failed ones hidden |
| **All trackers fail** | All `getTracker()` calls return null | Show empty state | "No trackers available" message |
| **Tracker deleted** | `getTracker()` returns null | Remove from list | Tracker block disappears, no error shown |
| **Network timeout** | Service throws timeout error | Show error state | "Connection timeout" message, retry button |
| **Invalid project ID** | Project not found | Redirect or error | "Project not found" error page |

### 6.2 State Management

**Component State:**
```typescript
interface TrackersSectionState {
  trackerIds: string[]; // Observable tracker IDs
  trackers: Map<string, Tracker>; // trackerId -> Tracker
  loading: boolean;
  error: string | null;
  unavailable: Set<string>; // trackerIds that are unavailable
}
```

**State Transitions:**
- **Loading:** Fetching tracker IDs → Fetching tracker data
- **Success:** All trackers loaded → Display trackers
- **Partial Success:** Some trackers loaded → Display available, hide unavailable
- **Error:** Service error → Show error message
- **Empty:** No trackers observable → Show empty state

### 6.3 Error Recovery

**Automatic Retry:**
- ❌ No automatic retries (can be annoying)
- ✅ Manual retry button only

**Stale Data Prevention:**
- Never cache tracker data in Guardrails
- Always fetch fresh data on mount
- Refetch on visibility change (if tab becomes visible)

**Graceful Degradation:**
- If some trackers fail → show available ones
- If all fail → show empty/error state
- Never show partial or corrupted data

---

## 7. Service Boundaries

### 7.1 What Guardrails CAN Do

✅ Query observation links (via Tracker Studio service)  
✅ Call Tracker Studio services with context  
✅ Render read-only tracker UI  
✅ Link to Tracker Studio for full views  
✅ Handle loading/error/empty states  

### 7.2 What Guardrails MUST NOT Do

❌ Query tracker data directly from database  
❌ Cache tracker data in Guardrails tables  
❌ Implement permission checks  
❌ Create or modify tracker data  
❌ Create or modify observation links  
❌ Generate insights or analytics  
❌ Show edit controls  
❌ Show reminder settings  

### 7.3 Service Boundary Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Guardrails Domain                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Guardrails UI Components                         │  │
│  │  - GuardrailsTrackerBlock                         │  │
│  │  - GuardrailsTrackersSection                      │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Guardrails Hooks                                 │  │
│  │  - useObservableTrackers(projectId)               │  │
│  │  - useObservableTracker(trackerId, projectId)     │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Guardrails Service Wrapper                       │  │
│  │  - getObservableTracker()                         │  │
│  │  - listObservableTrackerEntries()                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Service Calls (with context)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Tracker Studio Domain                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Tracker Studio Services                         │  │
│  │  - getTracker(trackerId, context)                │  │
│  │  - listEntriesByDateRange(options, context)      │  │
│  │  - listObservableTrackersForContext()            │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Permission Resolver                              │  │
│  │  - Checks observation links                      │  │
│  │  - Returns read-only access                      │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Database (RLS Enforced)                         │  │
│  │  - trackers                                       │  │
│  │  - tracker_entries                                │  │
│  │  - tracker_observation_links                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Component API Design

### 8.1 GuardrailsTrackerBlock

**Props:**
```typescript
interface GuardrailsTrackerBlockProps {
  trackerId: string;
  projectId: string;
  viewMode?: 'compact' | 'detailed';
  maxEntries?: number; // Default: 5
}
```

**Internal State:**
```typescript
{
  tracker: Tracker | null;
  entries: TrackerEntry[];
  loading: boolean;
  error: string | null;
  unavailable: boolean; // true if tracker not accessible
}
```

**Rendered Output:**
- Tracker name and description
- Recent entries (limited by `maxEntries`)
- "Shared by [Owner]" badge
- "View in Tracker Studio" link
- Loading skeleton
- Error state
- Unavailable state

### 8.2 GuardrailsTrackersSection

**Props:**
```typescript
interface GuardrailsTrackersSectionProps {
  projectId: string;
  masterProjectId?: string;
}
```

**Internal State:**
```typescript
{
  trackerIds: string[];
  trackers: Map<string, Tracker>;
  loading: boolean;
  error: string | null;
  unavailable: Set<string>;
}
```

**Rendered Output:**
- List of `GuardrailsTrackerBlock` components
- Empty state (no trackers)
- Loading state
- Error state
- Partial failure handling

---

## 9. Implementation Checklist

### Phase 1: Service Layer
- [ ] Create `src/lib/guardrails/trackerObservationService.ts`
  - [ ] `getObservableTracker(trackerId, projectId)`
  - [ ] `listObservableTrackerEntries(trackerId, projectId, options)`
  - [ ] `getObservableTrackerIds(projectId)`
- [ ] Ensure all functions inject Guardrails context
- [ ] Add error handling for service unavailability

### Phase 2: Hooks
- [ ] Create `src/hooks/guardrails/useObservableTrackers.ts`
  - [ ] Query observable tracker IDs
  - [ ] Fetch tracker data for each ID
  - [ ] Handle loading/error states
  - [ ] Filter unavailable trackers
- [ ] Create `src/hooks/guardrails/useObservableTracker.ts`
  - [ ] Fetch single tracker with context
  - [ ] Handle null returns gracefully
- [ ] Create `src/hooks/guardrails/useObservableTrackerEntries.ts`
  - [ ] Fetch entries with context
  - [ ] Limit results
  - [ ] Handle errors

### Phase 3: UI Components
- [ ] Create `src/components/guardrails/trackers/GuardrailsTrackerBlock.tsx`
  - [ ] Display tracker info
  - [ ] Display recent entries
  - [ ] Show "Shared by" badge
  - [ ] Link to Tracker Studio
  - [ ] Handle loading/error/unavailable states
- [ ] Create `src/components/guardrails/trackers/GuardrailsTrackersSection.tsx`
  - [ ] Query and display all observable trackers
  - [ ] Handle empty state
  - [ ] Handle partial failures
  - [ ] Render tracker blocks

### Phase 4: Project Integration
- [ ] Add "Trackers" tab to Guardrails project page
- [ ] Add route: `/guardrails/project/:projectId/trackers`
- [ ] Integrate `GuardrailsTrackersSection` in tab
- [ ] Show/hide tab based on observable trackers
- [ ] Add count badge to tab

### Phase 5: Error Handling
- [ ] Implement edge case handling matrix
- [ ] Add retry mechanisms (manual only)
- [ ] Add stale data prevention
- [ ] Test all failure scenarios

### Phase 6: Polish
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error messages
- [ ] Add accessibility attributes
- [ ] Test with multiple trackers
- [ ] Test with revoked trackers
- [ ] Test with archived trackers

---

## 10. Data Flow Diagrams

### 10.1 Initial Load Flow

```
User opens Guardrails Project
  ↓
GuardrailsTrackersSection mounts
  ↓
useObservableTrackers(projectId) called
  ↓
Hook calls: listObservableTrackersForContext('guardrails_project', projectId, userId)
  ↓
Tracker Studio returns: ['tracker-id-1', 'tracker-id-2']
  ↓
Hook calls: getTracker('tracker-id-1', { type: 'guardrails_project', id: projectId })
Hook calls: getTracker('tracker-id-2', { type: 'guardrails_project', id: projectId })
  ↓
Tracker Studio returns: [Tracker1, Tracker2]
  ↓
Hook returns: { trackers: [Tracker1, Tracker2], loading: false }
  ↓
GuardrailsTrackersSection renders GuardrailsTrackerBlock for each
  ↓
Each block calls: useObservableTrackerEntries(trackerId, projectId)
  ↓
Entries fetched and displayed
```

### 10.2 Access Revoked Flow

```
User viewing tracker in Guardrails
  ↓
Owner revokes observation link
  ↓
User refreshes or component refetches
  ↓
getTracker(trackerId, context) called
  ↓
Permission resolver checks observation link → revoked_at IS NOT NULL
  ↓
Permission resolver returns: { canView: false }
  ↓
getTracker() returns: null
  ↓
Hook receives: null
  ↓
Component state: unavailable = true
  ↓
Component hides tracker block (or shows "Unavailable")
```

---

## 11. Security Considerations

### 11.1 Permission Enforcement

**Critical:** All permission checks happen in Tracker Studio services. Guardrails never bypasses these checks.

**Enforcement Points:**
1. `listObservableTrackersForContext()` - RLS filters by observation links
2. `getTracker()` - Permission resolver checks observation links
3. `listEntriesByDateRange()` - Permission resolver checks observation links
4. RLS policies - Database-level enforcement

**Guardrails Responsibility:**
- Always pass context when calling Tracker Studio services
- Never call services without context
- Never cache permission results
- Always respect null returns (no access)

### 11.2 Data Leakage Prevention

**Prevented Scenarios:**
- ✅ User cannot see trackers from other projects (context scoped)
- ✅ User cannot see trackers after link revoked (RLS enforces)
- ✅ User cannot see archived trackers (RLS enforces)
- ✅ User cannot edit tracker data (service layer enforces)
- ✅ No stale data shown (always fresh fetch)

**Validation:**
- Test: User in Project A cannot see trackers from Project B
- Test: Revoked link immediately hides tracker
- Test: Archived tracker not visible
- Test: Edit attempts return 403

---

## 12. Performance Considerations

### 12.1 Fetching Strategy

**Option A: Sequential Fetching**
- Fetch tracker IDs first
- Then fetch each tracker sequentially
- **Pros:** Simple, predictable
- **Cons:** Slow for many trackers

**Option B: Parallel Fetching**
- Fetch tracker IDs first
- Then fetch all trackers in parallel
- **Pros:** Faster
- **Cons:** More complex error handling

**Recommendation:** Option B (parallel) with Promise.allSettled()

**Implementation:**
```typescript
const trackerPromises = trackerIds.map(id => 
  getTracker(id, context).catch(() => null)
);
const results = await Promise.allSettled(trackerPromises);
const trackers = results
  .filter(r => r.status === 'fulfilled' && r.value !== null)
  .map(r => r.value);
```

### 12.2 Caching Strategy

**Recommendation:** No caching in Guardrails

**Rationale:**
- Tracker data can change frequently
- Observation links can be revoked
- Stale data is worse than slow data
- Tracker Studio may implement caching later

**Alternative (Future):**
- Short-lived cache (5-10 seconds)
- Invalidate on visibility change
- Invalidate on manual refresh

### 12.3 Entry Limiting

**Default:** Show last 5 entries per tracker

**Rationale:**
- Keeps UI compact
- Reduces data transfer
- Most recent entries are most relevant

**User Action:** "View in Tracker Studio" for full history

---

## 13. Accessibility Considerations

### 13.1 ARIA Labels

**Tracker Block:**
- `aria-label="Tracker: {name}, shared by {owner}"`
- `role="article"` or `role="region"`

**Link to Tracker Studio:**
- `aria-label="View {tracker name} in Tracker Studio"`
- Clear link text

**Empty State:**
- `aria-live="polite"` for dynamic content
- Clear message: "No trackers shared to this project"

### 13.2 Keyboard Navigation

- Tab order: Tracker blocks → "View in Tracker Studio" links
- Enter/Space on tracker block → Opens Tracker Studio
- Focus management on load/error states

---

## 14. Testing Strategy

### 14.1 Unit Tests

**Hooks:**
- `useObservableTrackers` - Returns correct tracker IDs
- `useObservableTracker` - Handles null returns
- `useObservableTrackerEntries` - Limits entries correctly

**Components:**
- `GuardrailsTrackerBlock` - Renders tracker data
- `GuardrailsTrackerBlock` - Hides unavailable trackers
- `GuardrailsTrackersSection` - Shows empty state

### 14.2 Integration Tests

**Scenarios:**
- User views project with observable trackers
- User views project with no trackers
- Tracker access revoked while viewing
- Tracker archived while viewing
- Service unavailable

### 14.3 Manual Testing Checklist

- [ ] Open project with shared trackers → Trackers visible
- [ ] Open project with no trackers → Empty state shown
- [ ] Revoke observation link → Tracker disappears
- [ ] Archive tracker → Tracker disappears
- [ ] Click "View in Tracker Studio" → Opens correct tracker
- [ ] Service unavailable → Error message shown
- [ ] Multiple trackers → All render correctly
- [ ] Partial failure → Available trackers still show

---

## 15. Explicit Non-Goals

### 15.1 What This Phase Will NOT Implement

**❌ Consent UI**
- Creating observation links
- Revoking observation links
- **Why:** Handled in Phase 5, Prompt 3

**❌ Tracker Creation**
- Creating trackers from Guardrails
- **Why:** Trackers created in Tracker Studio only

**❌ Tracker Editing**
- Editing tracker metadata
- Editing entries
- **Why:** Observation is read-only

**❌ Analytics or Insights**
- Cross-tracker insights in Guardrails
- Performance metrics
- **Why:** Analytics belong in Tracker Studio

**❌ Notifications**
- Notify when tracker shared
- Notify when access revoked
- **Why:** Out of scope for this phase

**❌ Bulk Sharing**
- Share multiple trackers at once
- **Why:** Handled in consent UI phase

**❌ Performance Scoring**
- KPIs or metrics
- Rankings or comparisons
- **Why:** Tracker Studio is non-judgmental

---

## 16. Success Criteria

This phase is successful if:

✅ **Guardrails can render read-only trackers**
- Trackers observable in project are displayed
- Tracker data is accurate and up-to-date

✅ **Tracker Studio remains fully autonomous**
- No Guardrails dependencies in Tracker Studio
- Tracker Studio can function without Guardrails

✅ **Permission enforcement remains centralized**
- All checks in Tracker Studio services
- RLS enforces at database level
- Guardrails never bypasses checks

✅ **Users feel safe sharing sensitive data**
- Clear "Shared by" indicators
- Read-only enforced
- Revocation works immediately

✅ **Design is understandable and maintainable**
- Clear service boundaries
- Explicit data flow
- Well-documented components
- Boringly correct implementation

---

## 17. Open Questions & Decisions Needed

1. **Tab vs Section:**
   - Decision: Dedicated "Trackers" tab (recommended)
   - Alternative: Inline section on overview
   - **Status:** Document recommends tab, final decision needed

2. **Entry Display Limit:**
   - Decision: Default 5 entries, configurable
   - Alternative: Fixed 3 entries
   - **Status:** Document recommends 5, final decision needed

3. **Loading Strategy:**
   - Decision: Show loading until all trackers fetched
   - Alternative: Show trackers as they load
   - **Status:** Document recommends "all at once", final decision needed

4. **Error Recovery:**
   - Decision: Manual retry only
   - Alternative: Automatic retry with backoff
   - **Status:** Document recommends manual, final decision needed

5. **Empty State Message:**
   - Decision: "No trackers shared to this project"
   - Alternative: "Ask project owner to share trackers"
   - **Status:** Document recommends neutral message, final decision needed

---

## Document Status

This document is complete and ready for implementation. All architectural decisions are documented, component responsibilities are clear, and edge cases are considered.

**Next Step:** Review and approval before Phase 5, Prompt 2 implementation begins.
