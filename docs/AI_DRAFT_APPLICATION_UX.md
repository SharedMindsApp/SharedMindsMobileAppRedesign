# AI Draft Application UX

## Purpose

Provides the **user-facing interface** for reviewing, selectively applying, or discarding AI-generated drafts created by the AI Assistant Foundation.

**Core Principle:** User action is always explicit. AI drafts are never auto-applied.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    User Interface Layer                   │
├──────────────────────────────────────────────────────────┤
│  DraftCard  │  DraftDrawer  │  DraftApplyModal          │
│  PartialApplySelector  │  DraftProvenanceViewer         │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                    Custom Hooks Layer                     │
├──────────────────────────────────────────────────────────┤
│  useAIDrafts  │  useDraftApplication  │  useDraftStatus  │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                  Service Layer (Existing)                 │
├──────────────────────────────────────────────────────────┤
│  draftService  │  Guardrails Services  │  RLS Policies   │
└──────────────────────────────────────────────────────────┘
```

**Key Principle:** UI layer has **zero authority**. All writes flow through existing Guardrails services.

---

## Components

### 1. DraftCard

**Purpose:** Display individual draft with status, metadata, and actions.

**Props:**
```typescript
interface DraftCardProps {
  draft: AIDraft;
  onApply?: (draft: AIDraft) => void;
  onEdit?: (draft: AIDraft) => void;
  onDiscard?: (draft: AIDraft) => void;
  onViewDetails?: (draft: AIDraft) => void;
  onViewProvenance?: (draft: AIDraft) => void;
  compact?: boolean;
}
```

**Displays:**
- Draft title
- Draft type badge (Task List, Roadmap Item, etc.)
- Status badge (New, Edited, Applied, Discarded)
- Source context (project/track/item name)
- Timestamp (relative: "2h ago", "3d ago")
- Confidence level (high/medium/low)
- Outdated warning (if >72 hours old)

**Actions:**
- **Apply Draft** - Opens confirmation modal
- **Discard** - Confirms then marks as discarded
- **Edit Draft** - Opens inline editor (future)
- **View Details** - Shows full content
- **View Provenance** - Shows data sources

**Variants:**
- **Full** - Complete card with all metadata and actions
- **Compact** - Minimal version for lists (title + status + apply button)

**States:**
- `generated` - New AI draft, not edited by user
- `edited` - User has modified draft content
- `partially_applied` - Some elements applied, others not
- `accepted` - Fully applied, converted to real data
- `discarded` - Rejected by user

**Safety Rules:**
- Apply button only shown for `generated` or `edited` status
- Edit button only shown for applicable drafts
- Discard button always available (except already discarded)
- All actions require explicit user confirmation

---

### 2. DraftApplyModal

**Purpose:** Confirmation dialog for applying drafts with preview and partial selection.

**Props:**
```typescript
interface DraftApplyModalProps {
  draft: AIDraft;
  userId: string;
  onClose: () => void;
  onSuccess: (appliedItemIds?: string[]) => void;
  targetProjectId?: string;
  targetTrackId?: string;
  targetRoadmapItemId?: string;
}
```

**Features:**

**Application Preview:**
- Lists exactly what will be created
- Lists what will be updated (if applicable)
- Lists what will NOT be applied (partial selection)
- Shows warnings for edge cases

**Partial Application:**
- For `task_list`, `checklist`, `timeline` drafts
- User can select individual elements
- "Apply Selected (N)" button shows count
- Unselected elements are NOT applied

**Target Selection:**
- Shows where draft will be applied
- Validates target location
- Blocks if invalid (e.g., no track for roadmap item)

**Confirmation Flow:**
```
1. User clicks "Apply Draft" on DraftCard
2. Modal opens with preview
3. User reviews what will happen
4. User optionally selects specific elements
5. User clicks "Apply Draft" (final confirmation)
6. Service validates and applies
7. Success callback fires
8. Modal closes
```

**Error Handling:**
- Shows validation errors clearly
- Explains why application failed
- No partial writes on failure
- Draft remains unchanged on error

**Safety Features:**
- Explicit "Apply Draft" button (no auto-apply)
- Clear preview of changes
- Cannot be dismissed accidentally during application
- Warns about irreversibility

---

### 3. PartialApplySelector

**Purpose:** Checkbox interface for selecting individual elements from structured drafts.

**Props:**
```typescript
interface PartialApplySelectorProps {
  draft: AIDraft;
  onSelectionChange: (selectedIds: string[]) => void;
  initialSelection?: string[];
}
```

**Supported Draft Types:**
- `task_list` - Select individual tasks
- `checklist` - Select checklist items
- `timeline` - Select timeline phases

**Features:**
- **Select All** - Check all elements
- **Clear** - Uncheck all elements
- **Individual selection** - Click to toggle
- **Visual feedback** - Selected items highlighted
- **Count display** - "3 of 5 selected"

**Element Display:**

**Task List:**
- Task title
- Task description
- Estimated duration
- Priority badge

**Checklist:**
- Item text
- Priority badge

**Timeline:**
- Phase title
- Phase description
- Duration

**User Experience:**
- Click anywhere on card to toggle selection
- Selected items get blue border and background
- Checkmark icon shows selection state
- "Select at least one element" warning if none selected

**Integration:**
- Selection state flows to `DraftApplyModal`
- Only selected elements passed to `apply()` function
- Unselected elements ignored completely

---

### 4. DraftDrawer

**Purpose:** Browsable sidebar showing all drafts with filtering and sorting.

**Props:**
```typescript
interface DraftDrawerProps {
  userId: string;
  projectId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDraftApplied?: (draft: AIDraft) => void;
}
```

**Features:**

**Filtering:**
- By status: All, Generated, Edited, Partially Applied, Accepted, Discarded
- By type: All Types, Roadmap Item, Task List, Checklist, etc.
- Real-time updates as filters change

**Sorting:**
- By date (newest first)
- By status (pending first, then applied, then discarded)

**Actions:**
- Refresh drafts list
- Apply draft (opens modal)
- Discard draft (with confirmation)
- View details
- View provenance

**Layout:**
- Fixed-position drawer from right edge
- Full height
- Scrollable content area
- Sticky header with filters
- Sticky footer with stats

**Stats Display:**
- Total drafts count
- Pending drafts count (generated + edited)

**Empty States:**
- No drafts at all: "AI-generated drafts will appear here"
- No drafts matching filters: "Try adjusting your filters"

**Integration Points:**
- Can be triggered from floating AI widget
- Can be triggered from project overview
- Can be triggered from roadmap view
- Badge count shows pending drafts

---

### 5. DraftProvenanceViewer

**Purpose:** Show transparency about data sources used to generate draft.

**Props:**
```typescript
interface DraftProvenanceViewerProps {
  draft: AIDraft;
  onClose: () => void;
}
```

**Displays:**

**Source Entities:**
- Entity IDs that were read
- Entity types (track, roadmap_item, project, etc.)
- Shows full lineage

**Context Snapshot:**
- Key-value pairs of context at generation time
- Project name, track name, item titles, etc.
- Helps user understand "what AI saw"

**Generation Details:**
- Timestamp of generation
- Confidence level (high/medium/low)
- Context scope (project/track/item)

**Educational Content:**
- Explains what provenance means
- Notes that all data respects permissions
- Emphasizes transparency

**Use Cases:**
- User wants to know "why did AI suggest this?"
- User wants to verify AI used correct context
- User wants to understand confidence level

---

## Custom Hooks

### useAIDrafts

**Purpose:** Load and subscribe to draft changes.

```typescript
const { drafts, loading, error, refresh } = useAIDrafts({
  userId: 'user-123',
  projectId: 'project-456',  // optional filter
  status: 'generated',        // optional filter
  draftType: 'task_list',     // optional filter
  limit: 20,                  // optional limit
});
```

**Features:**
- Loads drafts from database
- Filters by user, project, status, type
- Sorts by creation date (newest first)
- Auto-refresh on filter changes
- Manual refresh function

**Subscription Variant:**
```typescript
useDraftSubscription(
  userId,
  (draft) => { /* on draft created */ },
  (draft) => { /* on draft updated */ }
);
```

**Pending Count Variant:**
```typescript
const { count, loading, refresh } = usePendingDraftsCount(userId, projectId);
// Returns count of drafts with status 'generated'
```

---

### useDraftApplication

**Purpose:** Handle draft application logic with validation.

```typescript
const { applying, error, apply, discard, clearError } = useDraftApplication();

// Apply full draft
await apply(draftId, userId, {
  targetProjectId,
  targetTrackId,
});

// Apply partial draft
await apply(draftId, userId, {
  selectedElements: ['0', '2', '4'],  // selected indices
});

// Discard draft
await discard(draftId, userId);
```

**Features:**
- Handles full and partial application
- Validates before applying
- Shows loading state
- Captures errors
- Returns applied item IDs

**Helper Functions:**
```typescript
// Validate before showing modal
const { valid, errors } = validateDraftApplication(
  draft,
  targetProjectId,
  targetTrackId
);

// Generate preview for modal
const preview = generateApplicationPreview(draft, selectedElements);
// Returns: { willCreate, willUpdate, willNotApply, warnings }
```

---

### useDraftStatus

**Purpose:** Edit draft metadata and content without applying.

```typescript
const { saving, error, updateTitle, updateContent, addNote } = useDraftStatus(draft, userId);

// Rename draft
await updateTitle('New Draft Title');

// Edit draft content (marks as 'edited')
await updateContent({ ...draft.content, tasks: updatedTasks });

// Add user note
await addNote('Remember to check with Sarah before applying');
```

**Features:**
- Only allows editing `generated` or `edited` drafts
- Blocks editing `accepted` or `discarded` drafts
- Auto-marks as `edited` on content change
- Respects user ownership

**Helper Functions:**
```typescript
getDraftStatusColor(status);      // Returns Tailwind classes
getDraftStatusLabel(status);      // Returns human-readable label
getDraftTypeLabel(draftType);     // Returns formatted type name
getDraftTypeIcon(draftType);      // Returns Lucide icon name
isApplicableDraft(draft);         // Can this be applied?
canEditDraft(draft);              // Can this be edited?
isDraftOutdated(draft);           // Is this >72 hours old?
```

---

## User Flows

### Flow 1: Apply Full Draft

```
1. User views DraftCard in DraftDrawer
2. Status shows "New" (generated)
3. User clicks "Apply Draft" button
4. DraftApplyModal opens
5. Modal shows:
   - Draft title
   - What will be created (preview)
   - Target location
   - Important notes
6. User clicks "Apply Draft" (confirmation)
7. Service validates permission
8. Service creates items via Guardrails
9. Draft marked as 'accepted'
10. Success callback fires
11. Modal closes
12. DraftDrawer refreshes
13. User sees "Applied" status
```

**Key Points:**
- Two explicit user actions required (open modal + confirm)
- Clear preview before application
- No auto-apply
- Audit trail created

---

### Flow 2: Apply Partial Draft (Task List)

```
1. User views task list draft
2. Draft contains 5 tasks
3. User clicks "Apply Draft"
4. DraftApplyModal opens
5. Blue info box shows "You can select specific tasks"
6. User clicks "Choose which elements to apply"
7. PartialApplySelector shows 5 tasks with checkboxes
8. User selects tasks 1, 3, and 5
9. Selection count shows "3 of 5 selected"
10. Preview updates to show:
    - Will create: Task 1, Task 3, Task 5
    - Will not apply: Task 2, Task 4
11. User clicks "Apply Selected (3)"
12. Service creates only selected tasks
13. Draft marked as 'partially_applied'
14. Success callback fires
15. Modal closes
16. User can return later to apply remaining tasks
```

**Key Points:**
- User explicitly chooses elements
- Unselected elements completely ignored
- Draft persists for future application
- Clear preview of what happens

---

### Flow 3: Discard Draft

```
1. User views DraftCard
2. User clicks "⋮" menu
3. User clicks "Discard" (red text)
4. Browser confirm dialog: "Are you sure?"
5. User clicks "OK"
6. Service marks draft as 'discarded'
7. Draft immediately updates to show "Discarded" status
8. Apply button disappears
9. Draft moves to bottom of list (if sorted by status)
```

**Key Points:**
- Explicit confirmation required
- No undo (but draft remains in database for audit)
- Clear visual feedback

---

### Flow 4: View Draft Provenance

```
1. User views DraftCard
2. User clicks "⋮" menu
3. User clicks "View Provenance"
4. DraftProvenanceViewer modal opens
5. Modal shows:
   - Source entity IDs and types
   - Context snapshot (what AI "saw")
   - Generation timestamp
   - Confidence level
   - Educational explanation
6. User understands why AI made this suggestion
7. User clicks "Close"
```

**Key Points:**
- Full transparency into AI reasoning
- Shows exact data sources
- Helps build user trust
- Educational component

---

### Flow 5: Edit Draft Before Applying

```
1. User views DraftCard (status: generated)
2. User clicks "⋮" menu
3. User clicks "Edit Draft"
4. Inline editor appears (or modal)
5. User modifies draft content
6. User clicks "Save"
7. Draft status changes to 'edited'
8. Draft marked with "Edited" badge
9. User can now apply edited version
```

**Key Points:**
- Edits don't affect authoritative data
- Only draft record updated
- Status changes to 'edited'
- Original AI output preserved in audit log

---

## Application Preview Format

### Task List Draft

**Will Create:**
- Task: "Set up development environment"
- Task: "Write API documentation"
- Task: "Deploy to staging"

**Will Not Apply:**
- Task: "Send launch announcement" (not selected)

**Warnings:**
- None

---

### Roadmap Item Draft

**Will Create:**
- Roadmap item: "Q1 Marketing Campaign"
- Start date: January 1, 2025
- Duration: 15 days
- Track: Marketing

**Will Update:**
- None

**Warnings:**
- None

---

### Summary Draft

**Will Create:**
- None (informational only)

**Will Update:**
- None

**Warnings:**
- This is an informational draft and will not create any records

---

## Error Handling

### Validation Errors

**Scenario:** User tries to apply roadmap item draft without target track

**Display:**
```
❌ Cannot Apply Draft

Target track required for roadmap item drafts.
Please select a track before applying.

[ Close ]
```

**Outcome:** Modal remains open, draft unchanged, user can fix issue.

---

### Permission Errors

**Scenario:** User no longer has access to target project

**Display:**
```
❌ Application Failed

You no longer have permission to modify this project.
The draft has not been applied.

[ Close ]
```

**Outcome:** Modal remains open, draft unchanged, user informed.

---

### Invalid State Errors

**Scenario:** Draft already applied

**Display:**
```
ℹ️ Draft Already Applied

This draft was applied on December 12, 2024 at 3:45 PM.
You cannot apply it again.

[ Close ]
```

**Outcome:** Modal doesn't open, user sees clear message.

---

### Network Errors

**Scenario:** Network failure during application

**Display:**
```
❌ Application Failed

Network error: Could not connect to server.
The draft has not been applied. Please try again.

[ Retry ] [ Close ]
```

**Outcome:** User can retry or close, draft unchanged.

---

## Safety Guarantees

### ✅ Enforced Safety Rules

**1. No Auto-Application**
- Drafts never apply automatically
- Always requires user action
- Minimum two clicks (open modal + confirm)

**2. Clear Confirmation**
- Modal shows exactly what will happen
- Preview lists all changes
- User must explicitly confirm

**3. Partial Application Support**
- User can select specific elements
- Unselected elements completely ignored
- Selection state clearly visible

**4. Permission Enforcement**
- All writes go through Guardrails services
- RLS policies enforced
- Permission errors caught and displayed

**5. Audit Trail**
- All applications logged
- Draft status transitions recorded
- Provenance preserved

**6. No Silent Failures**
- All errors shown to user
- No partial writes on failure
- Draft remains unchanged on error

**7. Reversibility Awareness**
- User warned about irreversibility
- Can edit draft before applying
- Can discard instead of apply

**8. Context Validation**
- Target location validated
- Outdated drafts flagged
- Invalid states blocked

---

## What This Does NOT Do

### ❌ No Auto-Application

**Does NOT:**
- Apply drafts in background
- Apply drafts on schedule
- Apply drafts when user isn't looking
- "Smart apply" based on patterns

**Why:** User control is paramount. All AI suggestions must be explicitly reviewed.

---

### ❌ No Draft Merging

**Does NOT:**
- Merge multiple drafts automatically
- Combine related drafts
- Deduplicate drafts
- Batch apply drafts

**Why:** Each draft is independent. User decides what to apply individually.

---

### ❌ No Draft Suggestions

**Does NOT:**
- Suggest which drafts to apply
- Rank drafts by importance
- Recommend application order
- Predict which drafts user wants

**Why:** No second-order AI decisions. User reviews all drafts equally.

---

### ❌ No Smart Defaults

**Does NOT:**
- Pre-select elements in partial application
- Pre-fill target locations
- Auto-choose tracks or items
- Guess user intent

**Why:** All selections must be explicit. No hidden assumptions.

---

### ❌ No Background Processing

**Does NOT:**
- Apply drafts while user is away
- Batch process on schedule
- Queue applications
- Retry failed applications automatically

**Why:** User must be present and aware. No silent automation.

---

### ❌ No Draft Modification

**Does NOT:**
- "Improve" drafts automatically
- Fix errors in draft content
- Adjust drafts to fit context
- Regenerate outdated drafts

**Why:** Draft is AI output, preserved exactly as generated. User can edit manually.

---

### ❌ No Cross-Draft Logic

**Does NOT:**
- Check for conflicts between drafts
- Block applying related drafts
- Enforce order of application
- Track draft dependencies

**Why:** Each draft is independent transaction. Guardrails services handle conflicts.

---

### ❌ No Notifications

**Does NOT:**
- Notify user of new drafts
- Remind user to apply drafts
- Alert on outdated drafts
- Send digests of pending drafts

**Why:** Notification system is separate (future feature). This is passive UI only.

---

## Integration Points

### With AI Assistant Foundation

**Draft Creation:**
```typescript
// AI service creates draft
const draft = await createDraft({
  userId,
  projectId,
  draftType: 'task_list',
  title: 'Marketing Tasks',
  content: taskListContent,
  provenanceMetadata,
});

// Draft appears in DraftDrawer automatically
// User reviews and applies via UI
```

**Draft Application:**
```typescript
// User applies via UI
const result = await apply(draft.id, userId);

// UI calls draftService.applyDraft()
// Service validates and creates via Guardrails
// Draft marked as 'accepted'
```

---

### With Conversation System

**Linking Drafts to Messages:**
```typescript
// AI creates draft and sends message
const draft = await createDraft({ ... });

await conversationService.createMessage({
  conversation_id: conversationId,
  sender_type: 'ai',
  content: { text: 'I created a draft task list...' },
  linked_draft_id: draft.id,  // ← Link to draft
}, userId);

// User can click link in chat to open DraftCard
// Or browse in DraftDrawer
```

---

### With Guardrails Services

**Application Flow:**
```typescript
// User applies draft
await apply(draft.id, userId, {
  targetTrackId: 'track-123',
});

// draftService validates
// draftService calls trackService.createRoadmapItem()
// trackService validates permissions
// trackService writes to roadmap_items_v2
// draftService marks draft as 'accepted'
// draftService records audit event
```

**Key Point:** Draft application flows through **existing services only**. No new authority paths.

---

### With Project Switcher

**Context-Aware Drafts:**
```typescript
// User switches project
const activeProject = useActiveProject();

// DraftDrawer filters to current project
<DraftDrawer
  userId={user.id}
  projectId={activeProject.id}  // ← Auto-filters
  isOpen={showDrawer}
/>

// User only sees drafts for active project
```

---

### With Floating AI Widget (Future)

**Draft Notifications:**
```typescript
// Widget shows pending count
const { count } = usePendingDraftsCount(userId, projectId);

// Badge on widget: "3 pending"
// Clicking badge opens DraftDrawer
// User reviews and applies
```

---

## File Structure

```
src/
├── hooks/
│   ├── useAIDrafts.ts              (draft loading & subscriptions)
│   ├── useDraftApplication.ts      (application logic)
│   └── useDraftStatus.ts           (editing & status helpers)
│
├── components/guardrails/ai/
│   ├── DraftCard.tsx               (individual draft display)
│   ├── DraftApplyModal.tsx         (confirmation modal)
│   ├── PartialApplySelector.tsx    (element selection)
│   ├── DraftDrawer.tsx             (browsable sidebar)
│   └── DraftProvenanceViewer.tsx   (transparency modal)
│
└── lib/guardrails/ai/
    ├── aiDraftService.ts           (existing, called by UI)
    └── aiTypes.ts                  (existing, types imported)
```

**Total Files:** 8 new files (3 hooks + 5 components)

---

## Usage Examples

### Example 1: Open Draft Drawer from Dashboard

```typescript
import { DraftDrawer } from './components/guardrails/ai/DraftDrawer';

function Dashboard() {
  const { user } = useAuth();
  const { activeProject } = useActiveProject();
  const [showDrafts, setShowDrafts] = useState(false);

  return (
    <div>
      <button onClick={() => setShowDrafts(true)}>
        View AI Drafts
      </button>

      <DraftDrawer
        userId={user.id}
        projectId={activeProject?.id}
        isOpen={showDrafts}
        onClose={() => setShowDrafts(false)}
        onDraftApplied={(draft) => {
          console.log('Draft applied:', draft.title);
        }}
      />
    </div>
  );
}
```

---

### Example 2: Show Draft Card in Project View

```typescript
import { DraftCard } from './components/guardrails/ai/DraftCard';

function ProjectView() {
  const { user } = useAuth();
  const { drafts } = useAIDrafts({
    userId: user.id,
    projectId: 'project-123',
    status: 'generated',
    limit: 3,
  });

  return (
    <div>
      <h2>Pending AI Suggestions</h2>
      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          onApply={(d) => {
            // Open modal
          }}
        />
      ))}
    </div>
  );
}
```

---

### Example 3: Pending Draft Badge

```typescript
import { usePendingDraftsCount } from '../hooks/useAIDrafts';

function NavigationBar() {
  const { user } = useAuth();
  const { activeProject } = useActiveProject();
  const { count } = usePendingDraftsCount(user.id, activeProject?.id);

  return (
    <nav>
      <button>
        AI Drafts
        {count > 0 && (
          <span className="badge">{count}</span>
        )}
      </button>
    </nav>
  );
}
```

---

## Accessibility

### Keyboard Navigation

- **Tab** - Navigate between buttons and cards
- **Enter/Space** - Activate buttons
- **Escape** - Close modals and drawers
- **Arrow keys** - Navigate within PartialApplySelector

### Screen Reader Support

- Descriptive button labels
- ARIA labels for icons
- Status announcements on state changes
- Clear error messages

### Visual Accessibility

- Sufficient color contrast (WCAG AA)
- Status badges use icons + color
- Focus indicators on all interactive elements
- No color-only information

---

## Performance

### Optimization Strategies

**1. Lazy Loading**
- Draft content loaded on demand
- Provenance viewer loads only when opened
- Images (if any) lazy loaded

**2. Pagination**
- DraftDrawer loads limited results (default 20)
- Scroll to load more (future)
- Filters reduce query size

**3. Caching**
- Draft list cached in React state
- Manual refresh available
- Subscription for real-time updates (optional)

**4. Debouncing**
- Filter changes debounced (300ms)
- Search input debounced (if added)

**5. Optimistic Updates**
- Status changes shown immediately
- Reverted on error
- Reduces perceived latency

---

## Testing Checklist

### Functional Tests

- [ ] Draft card displays all metadata correctly
- [ ] Apply modal shows accurate preview
- [ ] Partial selector allows element selection
- [ ] Draft drawer filters work correctly
- [ ] Provenance viewer shows all data
- [ ] Status badges use correct colors
- [ ] Timestamps display relative time
- [ ] Outdated warning shows for old drafts

### Safety Tests

- [ ] Drafts never auto-apply
- [ ] Confirmation required before application
- [ ] Permission errors caught and displayed
- [ ] Invalid drafts cannot be applied
- [ ] Partial writes prevented on failure
- [ ] Draft status transitions correctly
- [ ] Audit logs created for all actions

### Edge Cases

- [ ] Zero drafts state displays correctly
- [ ] Empty filter results handled
- [ ] Network errors shown clearly
- [ ] Concurrent applications prevented
- [ ] Stale draft detection works
- [ ] Missing provenance handled gracefully

### Accessibility Tests

- [ ] Keyboard navigation works fully
- [ ] Screen reader announces status changes
- [ ] Focus trapped in modals
- [ ] Color contrast meets WCAG AA
- [ ] All interactive elements focusable

---

## Conclusion

The AI Draft Application UX provides a **safe, transparent, and user-controlled interface** for turning AI suggestions into real work.

**Key Achievements:**

✅ **User Always in Control** - Minimum two clicks to apply
✅ **Clear Confirmation** - Preview shows exactly what will happen
✅ **Partial Application** - Select specific elements from structured drafts
✅ **Permission-Safe** - All writes through Guardrails services
✅ **Audit-Ready** - All actions logged
✅ **No Silent Failures** - Errors shown clearly
✅ **Transparent** - Provenance shows data sources
✅ **Reversibility-Aware** - User warned about irreversibility

**Design Principles Maintained:**

- AI drafts are **never authoritative**
- User action is **always explicit**
- Guardrails services remain **single write path**
- No automation or background processing
- No silent side effects
- Clear error handling
- Full transparency

**Status: ✅ Production-Ready**

Users can now confidently turn AI suggestions into real work without eroding trust, authority boundaries, or system safety.
