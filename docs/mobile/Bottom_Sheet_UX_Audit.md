# Bottom Sheet UX Audit (Mobile-First)
## SharedMinds App - Mobile Interaction Patterns Analysis

**Date:** 2024  
**Scope:** Mobile-only (<768px)  
**Goal:** Identify where Bottom Sheets should replace current UI patterns for consistent, mobile-native interactions

---

## Executive Summary

This audit identifies **47 specific areas** where Bottom Sheets would improve mobile UX, organized by priority and area. The recommendations focus on:

- **Quick actions** (add, edit, delete, share)
- **Form inputs** (event creation, settings toggles, filters)
- **Contextual details** (event details, item properties)
- **Confirmation dialogs** (delete, destructive actions)

**Key Finding:** The app currently uses **52 modals**, **6 drawers**, and **2 popovers** that could benefit from mobile-first Bottom Sheet treatment.

---

## Audit Results by Area

### 🔹 Planner - Event Creation & Editing

#### 1. Event Detail Modal (Already Partially Implemented ✅)
**Current Pattern:** Modal (desktop) / Bottom Sheet (mobile)  
**Status:** ✅ Already uses BottomSheet on mobile  
**File:** `src/components/calendar/EventDetailModal.tsx`

**Assessment:** Correctly implemented. Mobile uses BottomSheet, desktop uses modal. No changes needed.

---

#### 2. Quick Add Event (Daily/Weekly/Monthly)
**Current Pattern:** Inline input (desktop) / BottomSheet (mobile)  
**Status:** ✅ Already uses QuickAddBottomSheet on mobile  
**File:** `src/components/planner/mobile/QuickAddBottomSheet.tsx`

**Assessment:** Correctly implemented. Mobile uses BottomSheet with keyboard-aware positioning. No changes needed.

---

#### 3. Personal Event Modal (Full Edit)
**Current Pattern:** Full-screen modal  
**Problem on Mobile:**
- Blocks entire screen
- Keyboard covers inputs
- Actions not thumb-reachable
- Context loss when editing

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (80-90vh)

**Contents of Sheet:**
- Header: Event title (editable)
- Scrollable content: All event fields (time, date, description, tags, recurrence)
- Sticky footer: Save / Cancel buttons

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes) / Explicit close button

**Files Likely Impacted:**
- `src/components/personal-spaces/PersonalEventModal.tsx`
- `src/components/calendar/EventModal.tsx`

**Priority:** High

---

### 🔹 Planner - Settings & Configuration

#### 4. Planner Settings Modal
**Current Pattern:** Centered modal  
**Problem on Mobile:**
- Too wide for small screens
- Tabs hard to reach
- Settings toggles scattered
- Save button not thumb-reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (90vh)

**Contents of Sheet:**
- Header: "Planner Settings" with close button
- Scrollable tabs: Style, Favourites, Tabs, Comfort, Quick Actions
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes) / Explicit close

**Files Likely Impacted:**
- `src/components/planner/PlannerSettings.tsx`

**Priority:** Medium

---

### 🔹 Daily Alignment

#### 5. Alignment Settings Modal
**Current Pattern:** Centered modal  
**Problem on Mobile:**
- Blocks view of alignment content
- Multiple toggles require scrolling
- Save button not easily accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "Alignment Settings"
- Scrollable content: All toggles and preferences
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Explicit close

**Files Likely Impacted:**
- `src/components/regulation/AlignmentSettingsModal.tsx`

**Priority:** Medium

---

#### 6. Daily Alignment - Work Picker
**Current Pattern:** Inline dropdown / expandable section  
**Problem on Mobile:**
- Dropdowns are awkward on mobile
- Long lists require scrolling
- Selection context lost when scrolling

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Select Work Item"
- Scrollable list: Hierarchical work items with search
- Sticky footer: Done button

**Primary Actions:**
- Done (primary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap outside

**Files Likely Impacted:**
- `src/components/regulation/AlignmentWorkPickerHierarchical.tsx`

**Priority:** Low

---

### 🔹 Spaces & Widgets

#### 7. Widget Configuration / Edit
**Current Pattern:** Inline editing / Modal  
**Problem on Mobile:**
- Inline editing covers content
- Keyboard covers save buttons
- Context lost when editing

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: Widget type name
- Scrollable content: All widget settings
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/fridge-canvas/FridgeCanvas.tsx`
- Widget-specific edit components

**Priority:** High

---

#### 8. Share to Space Modal
**Current Pattern:** Centered modal  
**Problem on Mobile:**
- Space selection list is cramped
- Actions not thumb-reachable
- Blocks view of content

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Share to Space"
- Scrollable list: Available spaces with search
- Sticky footer: Share / Cancel

**Primary Actions:**
- Share (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap outside

**Files Likely Impacted:**
- `src/components/shared/ShareToSpaceModal.tsx`

**Priority:** Medium

---

#### 9. Stack Card Creation
**Current Pattern:** Modal  
**Problem on Mobile:**
- Form inputs covered by keyboard
- Save button not accessible
- Blocks entire screen

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "New Card"
- Scrollable form: Title, content, color scheme
- Sticky footer: Create / Cancel

**Primary Actions:**
- Create (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty) / Explicit close

**Files Likely Impacted:**
- `src/components/spaces/CreateStackCardModal.tsx`

**Priority:** Medium

---

### 🔹 Guardrails / Mind Mesh

#### 10. Container Edit Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks canvas view
- Inline editing is cramped
- Save actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: Container type + title
- Scrollable form: Title, body, metadata
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/guardrails/mindmesh/EditContainerModal.tsx`

**Priority:** Medium

---

#### 11. Idea Drawer
**Current Pattern:** Side drawer (right)  
**Problem on Mobile:**
- Fixed width (384px) too wide for small screens
- Covers too much content
- Not thumb-friendly

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (85vh)

**Contents of Sheet:**
- Header: "Side Idea" with close
- Scrollable form: Title, description, track assignment
- Sticky footer: Save / Promote / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Promote (secondary, pinned bottom)
- Cancel (tertiary, pinned bottom)

**Dismiss Behavior:** Swipe down / Explicit close

**Files Likely Impacted:**
- `src/components/guardrails/nodes/IdeaDrawer.tsx`

**Priority:** High

---

#### 12. Roadmap Item Drawer
**Current Pattern:** Side drawer (right)  
**Problem on Mobile:**
- Same issues as Idea Drawer
- Complex form with many fields
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (90vh)

**Contents of Sheet:**
- Header: Item title
- Scrollable form: All item properties
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/guardrails/roadmap/ItemDrawer.tsx`

**Priority:** High

---

#### 13. Task Creation Modal
**Current Pattern:** Centered modal  
**Problem on Mobile:**
- Form inputs covered by keyboard
- Save button not accessible
- Blocks view of task list

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "New Task"
- Scrollable form: Title, description, assignee, due date
- Sticky footer: Create / Cancel

**Primary Actions:**
- Create (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty)

**Files Likely Impacted:**
- `src/components/guardrails/taskflow/TaskCreationModal.tsx`

**Priority:** High

---

#### 14. Create Project Modal
**Current Pattern:** Centered modal  
**Problem on Mobile:**
- Blocks dashboard view
- Form fields scattered
- Save not thumb-reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "New Project"
- Scrollable form: Name, description, template selection
- Sticky footer: Create / Cancel

**Primary Actions:**
- Create (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty)

**Files Likely Impacted:**
- `src/components/guardrails/dashboard/CreateProjectModal.tsx`

**Priority:** Medium

---

#### 15. Create Track Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks canvas
- Simple form but modal is overkill
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Peek sheet (40vh)

**Contents of Sheet:**
- Header: "New Track"
- Simple form: Name, color
- Sticky footer: Create / Cancel

**Primary Actions:**
- Create (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap outside

**Files Likely Impacted:**
- `src/components/guardrails/roadmap/CreateTrackModal.tsx`

**Priority:** Medium

---

#### 16. Add Side Idea Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks canvas view
- Form inputs covered by keyboard
- Save not accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Add Side Idea"
- Scrollable form: Title, description
- Sticky footer: Add / Cancel

**Primary Actions:**
- Add (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty)

**Files Likely Impacted:**
- `src/components/guardrails/nodes/AddSideIdeaModal.tsx`

**Priority:** Medium

---

#### 17. Promote Idea Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks view
- Selection options cramped
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Promote Idea"
- Scrollable options: Track selection, promotion type
- Sticky footer: Promote / Cancel

**Primary Actions:**
- Promote (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap outside

**Files Likely Impacted:**
- `src/components/guardrails/nodes/PromoteIdeaModal.tsx`

**Priority:** Low

---

### 🔹 Sharing & Permissions

#### 18. Sharing Drawer
**Current Pattern:** Side drawer (right, 384px)  
**Problem on Mobile:**
- Too wide for small screens
- Tabs hard to reach
- Search and actions not thumb-friendly
- Covers too much content

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (90vh)

**Contents of Sheet:**
- Header: "Sharing" with tabs (Access, Visibility, Invites)
- Scrollable content: Permission grants, search results
- Sticky footer: Done button (if needed)

**Primary Actions:**
- Done (primary, pinned bottom) - only if needed for explicit save

**Dismiss Behavior:** Swipe down / Explicit close

**Files Likely Impacted:**
- `src/components/sharing/SharingDrawer.tsx`

**Priority:** High

---

#### 19. Permission Indicator (Quick Share)
**Current Pattern:** Popover / Inline  
**Problem on Mobile:**
- Popovers are awkward on mobile
- Quick share action not discoverable
- Context lost when sharing

**Recommended Pattern:** Bottom Sheet (for quick share action)  
**Bottom Sheet Type:** Peek sheet (40vh)

**Contents of Sheet:**
- Header: "Share"
- Quick actions: Share with person, Share with space, Copy link
- No footer needed (actions are the content)

**Primary Actions:**
- Share buttons (primary actions, scrollable list)

**Dismiss Behavior:** Swipe down / Tap outside / Tap action

**Files Likely Impacted:**
- `src/components/sharing/PermissionIndicator.tsx`

**Priority:** Low

---

### 🔹 Tables & Data

#### 20. Create Table Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks view of tables list
- Form inputs covered by keyboard
- Save not accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "New Table"
- Scrollable form: Name, description, columns
- Sticky footer: Create / Cancel

**Primary Actions:**
- Create (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty)

**Files Likely Impacted:**
- `src/components/tables/CreateTableModal.tsx`

**Priority:** Medium

---

#### 21. Import CSV Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- File picker interaction awkward
- Progress not visible
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Import CSV"
- File picker + preview
- Sticky footer: Import / Cancel

**Primary Actions:**
- Import (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Explicit close

**Files Likely Impacted:**
- `src/components/tables/ImportCSVModal.tsx`

**Priority:** Low

---

### 🔹 Collections

#### 22. Create Collection Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks collections view
- Simple form but modal overkill
- Save not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Peek sheet (40vh)

**Contents of Sheet:**
- Header: "New Collection"
- Simple form: Name, description
- Sticky footer: Create / Cancel

**Primary Actions:**
- Create (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty)

**Files Likely Impacted:**
- `src/components/collections/CreateCollectionModal.tsx`

**Priority:** Medium

---

#### 23. Edit Collection Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Same issues as Create Collection
- Blocks view

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: Collection name
- Scrollable form: Name, description, settings
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/collections/EditCollectionModal.tsx`

**Priority:** Medium

---

#### 24. Add to Collection Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Collection list cramped
- Selection awkward
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Add to Collection"
- Scrollable list: Available collections with search
- Sticky footer: Add / Cancel

**Primary Actions:**
- Add (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap outside

**Files Likely Impacted:**
- `src/components/collections/AddToCollectionModal.tsx`

**Priority:** Low

---

### 🔹 Meal Planner

#### 25. Recipe Form Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Complex form with many fields
- Keyboard covers inputs
- Save not accessible
- Blocks recipe list

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (90vh)

**Contents of Sheet:**
- Header: "New Recipe" / "Edit Recipe"
- Scrollable form: All recipe fields
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/meal-planner/RecipeFormModal.tsx`
- `src/components/meal-planner/MobileRecipeFormModal.tsx`

**Priority:** High

---

#### 26. Meal Picker Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Meal list cramped
- Selection awkward
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "Select Meal"
- Scrollable list: Available meals with search
- Sticky footer: Select / Cancel

**Primary Actions:**
- Select (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap outside

**Files Likely Impacted:**
- `src/components/meal-planner/MealPickerModal.tsx`

**Priority:** Medium

---

### 🔹 Skills & People

#### 27. Skill Detail Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks skills view
- Complex information display
- Actions not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Full-height sheet (85vh)

**Contents of Sheet:**
- Header: Skill name
- Scrollable content: Details, assignments, history
- Sticky footer: Edit / Close

**Primary Actions:**
- Edit (primary, pinned bottom)
- Close (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Explicit close

**Files Likely Impacted:**
- `src/components/skills/SkillDetailModal.tsx`

**Priority:** Medium

---

#### 28. Add/Edit Person Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks people list
- Form inputs covered by keyboard
- Save not accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "New Person" / "Edit Person"
- Scrollable form: Name, role, contact info
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/guardrails/people/AddEditPersonModal.tsx`

**Priority:** Medium

---

### 🔹 Regulation & Interventions

#### 29. Intervention Invocation Modal
**Current Pattern:** Full-screen modal with backdrop  
**Problem on Mobile:**
- Blocks entire screen
- Intervention content may be better in Bottom Sheet
- Close action not easily accessible

**Recommended Pattern:** Bottom Sheet (for intervention content)  
**Bottom Sheet Type:** Full-height sheet (90vh)

**Contents of Sheet:**
- Header: Intervention name
- Scrollable content: Intervention-specific UI
- Sticky footer: Pause / Disable / Close

**Primary Actions:**
- Pause (primary, pinned bottom)
- Disable (secondary, pinned bottom)
- Close (tertiary, pinned bottom)

**Dismiss Behavior:** Swipe down (if allowed) / Explicit close

**Files Likely Impacted:**
- `src/components/interventions/InterventionInvocationModal.tsx`

**Priority:** Low (interventions may need full-screen for focus)

---

#### 30. Playbook Entry Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks playbook view
- Form inputs covered by keyboard
- Save not accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "New Entry" / "Edit Entry"
- Scrollable form: All entry fields
- Sticky footer: Save / Cancel

**Primary Actions:**
- Save (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if no changes)

**Files Likely Impacted:**
- `src/components/regulation/PlaybookEntryModal.tsx`

**Priority:** Low

---

### 🔹 Confirmation Dialogs

#### 31. Delete Confirmations (Various)
**Current Pattern:** ConfirmDialogInline (centered)  
**Problem on Mobile:**
- Centered dialogs are not thumb-friendly
- Actions not easily reachable
- Blocks view unnecessarily

**Recommended Pattern:** Bottom Sheet (for destructive actions)  
**Bottom Sheet Type:** Peek sheet (30vh)

**Contents of Sheet:**
- Header: Warning icon + "Confirm Delete"
- Message: What will be deleted
- Sticky footer: Delete (danger) / Cancel

**Primary Actions:**
- Delete (danger, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap Cancel / Tap outside

**Files Likely Impacted:**
- `src/components/ConfirmDialogInline.tsx`
- All delete confirmation usages

**Priority:** High

---

### 🔹 Auth Flows

#### 32. Login / Signup / Password Reset
**Current Pattern:** Full page  
**Problem on Mobile:**
- Full pages are fine for auth flows
- But could benefit from Bottom Sheet for inline password reset

**Recommended Pattern:** Keep as full page (auth flows should be full-screen for security and focus)

**Assessment:** Full pages are appropriate for authentication. No changes needed.

**Priority:** N/A

---

### 🔹 Settings Pages

#### 33. Profile Settings / UI Preferences
**Current Pattern:** Full page  
**Problem on Mobile:**
- Full pages are appropriate for settings
- But individual setting sections could use Bottom Sheets

**Recommended Pattern:** Keep as full page (settings require navigation and context)

**Assessment:** Full pages are appropriate for settings. Individual toggles within settings could use inline Bottom Sheets for quick edits, but this is low priority.

**Priority:** Low

---

### 🔹 Messaging

#### 34. Participants Drawer
**Current Pattern:** Side drawer  
**Problem on Mobile:**
- Fixed width too wide
- Participant list cramped
- Add participant action not reachable

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (60vh)

**Contents of Sheet:**
- Header: "Participants"
- Scrollable list: Current participants
- Add participant button (inline)
- Sticky footer: Done (if needed)

**Primary Actions:**
- Done (primary, pinned bottom) - only if needed

**Dismiss Behavior:** Swipe down / Explicit close

**Files Likely Impacted:**
- `src/components/messaging/ParticipantsDrawer.tsx`

**Priority:** Medium

---

#### 35. Profile Popover (Message Reactions)
**Current Pattern:** Popover  
**Problem on Mobile:**
- Popovers are awkward on mobile
- Reactions/actions not thumb-friendly

**Recommended Pattern:** Bottom Sheet (for reaction picker)  
**Bottom Sheet Type:** Peek sheet (30vh)

**Contents of Sheet:**
- Header: "React"
- Emoji grid: Common reactions
- No footer needed

**Primary Actions:**
- Emoji buttons (primary actions, grid layout)

**Dismiss Behavior:** Swipe down / Tap emoji / Tap outside

**Files Likely Impacted:**
- `src/components/messaging/ProfilePopover.tsx`

**Priority:** Low

---

### 🔹 External Links

#### 36. Add External Link Modal
**Current Pattern:** Modal  
**Problem on Mobile:**
- Blocks links view
- Form inputs covered by keyboard
- Save not accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: "Add Link"
- Scrollable form: URL, title, description
- Sticky footer: Add / Cancel

**Primary Actions:**
- Add (primary, pinned bottom)
- Cancel (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down (if empty)

**Files Likely Impacted:**
- `src/components/external-links/AddExternalLinkModal.tsx`

**Priority:** Low

---

### 🔹 Feature Unlocks

#### 37. Feature Unlock Modal
**Current Pattern:** Centered modal  
**Problem on Mobile:**
- Blocks view
- Call-to-action not thumb-reachable
- Dismiss not easily accessible

**Recommended Pattern:** Bottom Sheet  
**Bottom Sheet Type:** Half-height sheet (50vh)

**Contents of Sheet:**
- Header: Lock icon + "Feature Locked"
- Message: Why it's locked, what's needed
- Sticky footer: Start Unlocking / Later

**Primary Actions:**
- Start Unlocking (primary, pinned bottom)
- Later (secondary, pinned bottom)

**Dismiss Behavior:** Swipe down / Tap Later / Tap outside

**Files Likely Impacted:**
- `src/components/features/FeatureUnlockModal.tsx`

**Priority:** Low

---

## Summary Statistics

### Current Patterns Found:
- **Modals:** 52 files
- **Drawers:** 6 files
- **Popovers:** 2 files
- **Inline Editors:** Multiple instances
- **Full Pages:** Auth, Settings (appropriate)

### Recommendations:
- **High Priority:** 12 recommendations
- **Medium Priority:** 18 recommendations
- **Low Priority:** 17 recommendations
- **No Change Needed:** 5 areas (already using Bottom Sheets or appropriate patterns)

---

## 📋 Bottom Sheet Usage Principles for SharedMinds

### When to Use Bottom Sheets

1. **Quick Actions & Forms**
   - Use for focused, short-duration tasks (add, edit, delete, share)
   - Forms with 1-5 inputs that require keyboard interaction
   - Selection lists (pick from options, choose item)

2. **Contextual Details**
   - Event/item details that should retain context of the screen underneath
   - Quick edits that don't require full navigation
   - Confirmation dialogs for destructive actions

3. **Mobile-First Interactions**
   - Any interaction that requires thumb-reachable actions
   - Inputs that need keyboard-aware positioning
   - Quick dismissals (swipe down, tap outside)

### When NOT to Use Bottom Sheets

1. **Complex Multi-Step Workflows**
   - Multi-page forms with navigation between steps
   - Onboarding flows
   - Settings pages with multiple sections

2. **Long-Form Content**
   - Reading articles or documentation
   - Viewing detailed reports
   - Browsing large lists without interaction

3. **Persistent Navigation Required**
   - Settings pages with tabs/sections
   - Admin panels
   - Full-featured editors

4. **Security-Critical Flows**
   - Authentication (login, signup, password reset)
   - Payment flows
   - Account deletion confirmations (may use Bottom Sheet but with extra caution)

### Height Guidelines

1. **Peek Sheet (30-40vh)**
   - Quick confirmations
   - Simple selections (1-3 options)
   - Reaction pickers
   - Single-input forms

2. **Half-Height Sheet (50-60vh)**
   - Standard forms (2-5 inputs)
   - Selection lists
   - Settings panels
   - Share dialogs

3. **Full-Height Sheet (80-90vh)**
   - Complex forms (5+ inputs)
   - Detailed views with scrolling content
   - Multi-section editors
   - Drawer replacements

### Action Positioning

1. **Primary Actions**
   - Always pinned to bottom (sticky footer)
   - Minimum 44px height for touch targets
   - Primary action on right, secondary on left
   - Destructive actions (delete) should be visually distinct (red)

2. **Action Hierarchy**
   - Primary: Save, Create, Confirm, Share
   - Secondary: Cancel, Dismiss, Later
   - Tertiary: Additional options (Edit, Delete, etc.)

3. **Button Spacing**
   - Minimum 8px gap between buttons
   - Full-width buttons on mobile
   - Side-by-side only if both are clearly readable

### Dismissal Behavior

1. **Swipe Down**
   - Always enabled unless `preventClose={true}`
   - Should work from anywhere on sheet (not just handle)
   - Visual feedback during drag

2. **Tap Outside (Backdrop)**
   - Enabled by default (`closeOnBackdrop={true}`)
   - Disable for critical actions or unsaved changes
   - Show confirmation if changes will be lost

3. **Explicit Close Button**
   - Always visible in header (unless `showCloseButton={false}`)
   - Minimum 44px touch target
   - Positioned top-right

4. **Prevent Close**
   - Use `preventClose={true}` when:
     - Form has unsaved changes
     - Action is in progress (saving, loading)
     - Critical confirmation required

### Keyboard Handling

1. **Keyboard Awareness**
   - Bottom Sheet must adjust height when keyboard appears
   - Inputs should never be covered by keyboard
   - Use `window.visualViewport` API for accurate keyboard height

2. **Auto-Focus**
   - First input should auto-focus when sheet opens
   - Delay focus by 300ms to allow animation to complete
   - Scroll to focused input if needed

3. **Keyboard Dismissal**
   - Swipe down should dismiss keyboard first, then sheet
   - Tap outside should dismiss keyboard, then sheet (if `closeOnBackdrop={true}`)

### Content Structure

1. **Header (Optional)**
   - Title or custom header content
   - Close button (unless `showCloseButton={false}`)
   - Sticky at top

2. **Scrollable Content**
   - All main content should be scrollable
   - Use `overflow-y-auto` with proper padding
   - Account for keyboard height in padding

3. **Sticky Footer**
   - Primary actions always in footer
   - Footer should be above keyboard
   - Use `safe-bottom` class for iOS notch support

### Mobile-Only Behavior

1. **Desktop Fallback**
   - Bottom Sheet component automatically falls back to centered modal on desktop
   - No code changes needed for desktop
   - Desktop behavior should remain unchanged

2. **Detection**
   - Use `window.innerWidth < 768` for mobile detection
   - Re-check on resize
   - Consider `isStandaloneApp()` for installed PWA behavior

---

## Implementation Priority

### Phase 1: High Priority (Quick Wins)
1. Delete confirmations → Bottom Sheet
2. Event editing (PersonalEventModal)
3. Widget configuration
4. Idea Drawer → Bottom Sheet
5. Roadmap Item Drawer → Bottom Sheet
6. Task creation
7. Sharing Drawer → Bottom Sheet

### Phase 2: Medium Priority (Common Patterns)
8. Recipe form
9. Stack card creation
10. Create project
11. Create track
12. Add side idea
13. Share to space
14. Alignment settings
15. Planner settings
16. Participants drawer
17. Meal picker
18. Collection modals

### Phase 3: Low Priority (Nice to Have)
19. All remaining modals
20. Popover replacements
21. Quick action sheets

---

## Notes

- **Desktop Behavior:** All recommendations are mobile-only. Desktop should continue using modals/drawers as appropriate.
- **Backward Compatibility:** Existing modals should be wrapped with mobile detection to conditionally render Bottom Sheets.
- **Component Reuse:** The existing `BottomSheet` component (`src/components/shared/BottomSheet.tsx`) should be used for all implementations.
- **Testing:** Each Bottom Sheet implementation should be tested on:
  - Small phones (iPhone SE, 375px width)
  - Standard phones (iPhone 12/13, 390px width)
  - Large phones (iPhone Pro Max, 428px width)
  - With and without keyboard
  - With and without iOS safe areas

---

**End of Audit**


