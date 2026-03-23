# Planner Mobile-First Redesign Plan (Phase 10A)

**Date:** 2024  
**Context:** Based on Phase 10 audit findings. This plan provides concrete, implementable changes to transform the Planner from a "shrunk desktop calendar" into a true mobile-first daily companion.

---

## 1. Mobile-First Mental Model

### What the Planner Should Feel Like on Mobile

**Primary Identity:** A calm daily planning companion, not a calendar application.

The mobile Planner should feel like:
- **Apple Calendar (mobile)** - Clean, focused, gesture-driven
- **Things / Todoist (mobile)** - Task-first, not grid-first
- **Notion Calendar (mobile)** - Progressive disclosure, not information overload

**Core Philosophy:**
- Mobile is for **checking** and **quick adding**, not comprehensive planning
- Desktop is for **detailed scheduling** and **complex manipulation**
- Mobile should optimize for **speed** and **clarity**, not feature completeness

### Core Jobs to Optimize For

1. **"Check Today"** (80% of mobile use)
   - See what's happening right now
   - See what's next
   - Quick status check

2. **"Quick Add"** (15% of mobile use)
   - Add something I just remembered
   - Schedule something someone just told me
   - Capture an idea before I forget

3. **"See What's Next"** (5% of mobile use)
   - Look ahead to tomorrow/this week
   - Check if I'm free at a specific time
   - Navigate to a specific date

### What NOT to Optimize For on Mobile

- **Complex scheduling** - Multi-day events, recurring patterns, time zone management
- **Bulk operations** - Moving multiple events, batch edits
- **Visual planning** - Drag-and-drop, resizing, overlapping event management
- **Data entry** - Long descriptions, tags, metadata
- **Analysis** - Weekly/monthly overviews, time tracking, productivity metrics

**Rule of Thumb:** If it requires precision, multiple steps, or desktop context, it should be deferred or simplified on mobile.

---

## 2. View-by-View Redesign Strategy

### A. Daily View (Primary - 80% of Mobile Use)

#### Current State (Problems)
- Dense time grid (30-min slots, 60px tall)
- Fixed 80px time column wastes space
- Events cramped, text truncated
- Current time indicator may be off-screen
- Inline quick add covered by keyboard

#### Mobile-First Redesign

**Layout: Vertical Timeline (Not Grid)**

**Structure:**
```
┌─────────────────────────┐
│ [Today] Wed, Jan 7      │ ← Sticky header
├─────────────────────────┤
│ [All-Day Events Strip]  │ ← Horizontal scroll if needed
├─────────────────────────┤
│ 6a  [Event Card]        │
│     [Event Card]        │
│ 9a  [Event Card]        │
│ 12p [Event Card]        │ ← Current time indicator (sticky)
│ 3p  [Event Card]        │
│ 6p  [Event Card]        │
│ 9p  [Event Card]        │
└─────────────────────────┘
│ [+ Quick Add] [Today]   │ ← Sticky bottom actions
└─────────────────────────┘
```

**Key Changes:**

1. **Time Labels: Condensed & Collapsible**
   - Show only hour labels (6a, 9a, 12p, 3p, 6p, 9p)
   - Hide 30-min labels by default
   - Tap to expand/collapse time detail
   - Time column: 48px (was 80px) - saves 32px width

2. **Events as Cards (Not Pills)**
   - Full-width cards with padding
   - Title always visible (no truncation)
   - Time range shown in card (e.g., "2:00 PM - 3:30 PM")
   - Tap card → Bottom sheet (not modal)
   - Minimum card height: 56px (thumb-friendly)

3. **Current Time Indicator: Always Visible**
   - Sticky indicator when scrolling
   - Or "Scroll to Now" floating button when off-screen
   - Auto-scroll to current time on load (if later in day)

4. **All-Day Events: Horizontal Strip**
   - Compact horizontal scrollable strip at top
   - Shows event titles (truncated if needed)
   - Tap to open in bottom sheet
   - "Show all" button if more than 3 events

5. **Quick Add: Floating Button + Bottom Sheet**
   - Floating "+" button in bottom-right (above nav)
   - Tap → Bottom sheet slides up
   - Time picker + title input
   - Quick duration buttons (30min, 1hr, 2hr)
   - Save button at bottom (thumb-reachable)

6. **Swipe Navigation**
   - Swipe left → Next day
   - Swipe right → Previous day
   - Visual feedback during swipe (slight movement)
   - Haptic feedback on completion

**What Stays:**
- Event data model (no backend changes)
- Permission system
- Offline queue (Phase 7A)
- Event types and relationships

**What Goes:**
- Inline quick add input
- Fixed time grid layout
- Drag/resize interactions (already disabled)
- Dense information display

**What Changes:**
- Layout: Grid → Timeline
- Interaction: Tap → Bottom sheet (not modal)
- Navigation: Buttons → Swipes
- Quick add: Inline → Bottom sheet

**Files to Modify:**
- `src/components/planner/PlannerDailyV2.tsx` (major refactor)
- Create `src/components/planner/mobile/EventCard.tsx`
- Create `src/components/planner/mobile/TimeLabel.tsx`
- Create `src/components/shared/BottomSheet.tsx` (reusable)

---

### B. Weekly View (Secondary - 15% of Mobile Use)

#### Current State (Problems)
- 7-column horizontal grid unusable on mobile
- Requires horizontal scrolling
- Event pills truncated or hidden
- Sidebar (Notes & Goals) competes for space

#### Mobile-First Redesign

**Layout: Vertical Timeline with Expandable Days**

**Structure:**
```
┌─────────────────────────┐
│ [This Week] Jan 5-11    │ ← Sticky header
├─────────────────────────┤
│ ▼ Mon, Jan 5  (3 events)│ ← Expandable day card
│   • Meeting 9a          │
│   • Lunch 12p           │
│   • Call 3p             │
├─────────────────────────┤
│ ▶ Tue, Jan 6  (2 events)│ ← Collapsed (tap to expand)
├─────────────────────────┤
│ ▼ Wed, Jan 7  (5 events)│ ← Today (expanded by default)
│   • Standup 9a          │
│   • Review 11a          │
│   • Lunch 12p           │
│   • Design 2p           │
│   • Review 4p           │
├─────────────────────────┤
│ ▶ Thu, Jan 8  (1 event) │
└─────────────────────────┘
```

**Key Changes:**

1. **Days as Expandable Cards**
   - Each day is a card with date, day name, event count
   - Tap card to expand/collapse
   - Today always expanded by default
   - Expanded: Shows event list with times
   - Collapsed: Shows only event count

2. **Event List (Not Grid)**
   - Vertical list of events per day
   - Each event: Time + Title
   - Tap event → Navigate to Daily view for that day
   - Swipe left on event → Quick actions (delete, edit)

3. **Remove Sidebar on Mobile**
   - Notes & Goals hidden on mobile (< 1024px)
   - Or moved to collapsed section at top
   - Focus on calendar, not planning tools

4. **Swipe Navigation**
   - Swipe left → Next week
   - Swipe right → Previous week
   - Visual feedback during swipe

5. **Week Header**
   - Show week range (e.g., "Jan 5 - 11")
   - "Today" button always visible
   - Tap week header → Jump to today

**What Stays:**
- Weekly data model
- Notes & Goals (desktop only)
- Event relationships

**What Goes:**
- 7-column grid layout
- Horizontal scrolling
- Sidebar on mobile

**What Changes:**
- Layout: Grid → Vertical cards
- Interaction: Grid cells → Expandable cards
- Navigation: Buttons → Swipes

**Files to Modify:**
- `src/components/planner/PlannerWeekly.tsx` (major refactor)
- Create `src/components/planner/mobile/WeekDayCard.tsx`
- Create `src/components/planner/mobile/WeekEventList.tsx`

---

### C. Monthly View (Reference - 5% of Mobile Use)

#### Current State (Problems)
- Calendar grid too small for touch
- Tap targets < 44px minimum
- Event pills truncated
- Multiple events shown as "+3 more"

#### Mobile-First Redesign

**Layout: Calendar Picker (Not Event Manager)**

**Structure:**
```
┌─────────────────────────┐
│ [January 2024]          │ ← Sticky header
├─────────────────────────┤
│ S  M  T  W  T  F  S     │
│    1  2  3  4  5  6     │
│ 7  8  9 10 11 12 13     │
│14 15 16 17 18 19 20     │
│21 [22] 23 24 25 26 27   │ ← Today highlighted
│28 29 30 31              │
└─────────────────────────┘
│ [22] has 3 events       │ ← Bottom sheet on date tap
│ • Meeting 9a            │
│ • Lunch 12p             │
│ • Review 3p             │
│ [View Full Day →]       │
└─────────────────────────┘
```

**Key Changes:**

1. **Large Date Cells**
   - Minimum 44px × 44px touch target
   - Date number prominent
   - Event count as badge (not full titles)
   - Today highlighted with blue background

2. **Event Representation: Counts Only**
   - Show event count badge (e.g., "3")
   - No event titles in month view
   - Color-coded by event type (optional)
   - Tap date → Bottom sheet with event list

3. **Bottom Sheet on Date Tap**
   - Shows events for that day
   - Event list with times
   - "View Full Day" button → Navigate to Daily view
   - Swipe down to dismiss

4. **Swipe Navigation**
   - Swipe left → Next month
   - Swipe right → Previous month
   - Visual feedback during swipe

5. **No Event Editing in Month View**
   - Month view is for **navigation**, not management
   - All editing happens in Daily view
   - Clear mental model: Month = Overview, Daily = Actions

**What Stays:**
- Calendar grid structure
- Month navigation
- Event data

**What Goes:**
- Event pills in cells
- Event editing in month view
- Complex event display

**What Changes:**
- Purpose: Event manager → Date picker
- Interaction: Edit events → Navigate to day
- Display: Full titles → Counts only

**Files to Modify:**
- `src/components/planner/PlannerMonthly.tsx` (moderate refactor)
- Create `src/components/planner/mobile/MonthDateCell.tsx`
- Create `src/components/planner/mobile/MonthEventSheet.tsx`

---

## 3. Interaction Model (Mobile-Native)

### Tap Interactions

| Action | Where | Result |
|--------|-------|--------|
| **Tap event card** | Daily/Weekly | Open bottom sheet with event details |
| **Tap time slot** | Daily | Open quick-add bottom sheet |
| **Tap date** | Monthly | Open bottom sheet with day's events |
| **Tap "Today" button** | Any view | Jump to today in current view |
| **Tap day card** | Weekly | Expand/collapse day |
| **Tap "View Full Day"** | Monthly bottom sheet | Navigate to Daily view |

### Swipe Interactions

| Gesture | Where | Result |
|---------|-------|--------|
| **Swipe left** | Daily | Next day |
| **Swipe right** | Daily | Previous day |
| **Swipe left** | Weekly | Next week |
| **Swipe right** | Weekly | Previous week |
| **Swipe left** | Monthly | Next month |
| **Swipe right** | Monthly | Previous month |
| **Swipe left on event** | Daily/Weekly | Reveal delete/edit actions (optional) |
| **Swipe down** | Bottom sheet | Dismiss sheet |
| **Pull down** | Any view | Refresh events (optional, Phase 10B) |

### Long-Press Interactions

| Action | Where | Result |
|--------|-------|--------|
| **Long-press time slot** | Daily | Quick-add bottom sheet (alternative to tap) |
| **Long-press event** | Daily/Weekly | Context menu (edit, delete, duplicate) |
| **Long-press date** | Monthly | Jump to Daily view for that day |

### Explicitly Disabled Interactions

- ❌ **Drag & drop** - Already disabled (Phase 7A), keep disabled
- ❌ **Resize** - Already disabled (Phase 7A), keep disabled
- ❌ **Multi-select** - Not needed on mobile
- ❌ **Hover states** - Not applicable to touch
- ❌ **Right-click** - Not applicable to touch

**Implementation Notes:**
- Use `onTouchStart`, `onTouchMove`, `onTouchEnd` for swipe detection
- Minimum swipe distance: 50px
- Maximum swipe time: 300ms
- Add visual feedback during swipe (slight movement, opacity change)
- Add haptic feedback on completion (Phase 10B)

---

## 4. Event Creation & Editing Flow

### Quick Add Flow (Most Common)

**Current:** Tap slot → Inline input → Keyboard covers input → Can't see what typing

**New Flow:**
1. **Tap time slot** (or floating "+" button)
2. **Bottom sheet slides up** from bottom
3. **Time pre-filled** from tapped slot (or current time if using "+" button)
4. **Title input** at top (keyboard-friendly, scrolls into view)
5. **Quick duration buttons** (30min, 1hr, 2hr) - tap to set
6. **Save button** at bottom (thumb-reachable)
7. **Swipe down or tap outside** to cancel

**Benefits:**
- Keyboard never covers input (sheet adjusts)
- More space for options
- Consistent with event detail pattern
- Thumb-friendly save button

**Files:**
- Create `src/components/planner/mobile/QuickAddBottomSheet.tsx`
- Modify `PlannerDailyV2.tsx` to use bottom sheet instead of inline input

### Full Edit Flow

**Current:** Tap event → Modal opens → Scroll to see all options → Close button may scroll away

**New Flow:**
1. **Tap event card**
2. **Bottom sheet slides up** with event details
3. **Title & time** at top (sticky)
4. **Content scrolls** in middle (description, tags, etc.)
5. **Actions at bottom** (Edit, Delete, Share) - always visible
6. **Tap "Edit"** → Sheet expands to full height, shows form
7. **Save/Cancel** buttons at bottom (thumb-reachable)
8. **Swipe down** to dismiss

**Benefits:**
- Actions always visible (thumb-reachable)
- Better keyboard handling
- Easier to dismiss
- More mobile-native feel

**Files:**
- Modify `src/components/calendar/EventDetailModal.tsx` to support bottom sheet mode
- Or create `src/components/calendar/EventDetailBottomSheet.tsx`

### Error Handling Visibility

**Current:** Toast may be missed, no persistent feedback

**New Approach:**
- **Success:** Toast at bottom (thumb-visible)
- **Error:** Toast + inline error in bottom sheet (if open)
- **Offline:** Toast + badge on save button ("Will sync when online")
- **Permission error:** Toast + disabled state on action button

**Files:**
- Modify toast system to be mobile-aware
- Add error states to bottom sheets

---

## 5. Navigation & Orientation Improvements

### Persistent "Today" Button

**Current:** Only visible when not on today, requires multiple taps to access

**New Approach:**
- **Always visible** in header (or floating button)
- **Highlighted/disabled** when already on today
- **One tap** to jump to today in current view
- **Haptic feedback** on tap (Phase 10B)

**Implementation:**
```tsx
// In header (all views)
<button
  onClick={goToToday}
  disabled={isToday}
  className={`
    px-4 py-2 rounded-lg font-medium
    ${isToday 
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
      : 'bg-blue-600 text-white hover:bg-blue-700'
    }
  `}
>
  Today
</button>
```

**Files:**
- `PlannerDailyV2.tsx`
- `PlannerWeekly.tsx`
- `PlannerMonthly.tsx`
- `PlannerShell.tsx` (if needed for global access)

### Swipe Navigation Between Dates

**Implementation:**
```tsx
const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  setSwipeStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (!swipeStart) return;
  
  const deltaX = e.changedTouches[0].clientX - swipeStart.x;
  const deltaY = e.changedTouches[0].clientY - swipeStart.y;
  
  // Only horizontal swipes
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      navigateDay('prev'); // Swipe right = previous
    } else {
      navigateDay('next'); // Swipe left = next
    }
  }
  
  setSwipeStart(null);
};
```

**Files:**
- `PlannerDailyV2.tsx` - Add swipe handlers to main container
- `PlannerWeekly.tsx` - Add swipe handlers for week navigation
- `PlannerMonthly.tsx` - Add swipe handlers for month navigation

### Reducing Header Clutter

**Current:** Header has date, prev/next buttons, "Today" button (conditional), view switcher

**New Approach:**
- **Mobile header:** Date + "Today" button (always) + Settings icon
- **Prev/Next:** Swipe gestures (no buttons needed)
- **View switcher:** In bottom nav (PlannerShell)
- **Desktop:** Keep existing header (no changes)

**Files:**
- `PlannerDailyV2.tsx` - Simplify header on mobile
- `PlannerWeekly.tsx` - Simplify header on mobile
- `PlannerMonthly.tsx` - Simplify header on mobile

### Clear Sense of Where User Is in Time

**Indicators:**
- **Today badge** on current date (all views)
- **Current time indicator** always visible or scrollable to (Daily)
- **Week/month range** in header (Weekly/Monthly)
- **"Today" button** state (highlighted when on today)

**Files:**
- All planner views - Ensure today indicators are prominent

---

## 6. Empty, Loading & Error States (Mobile)

### Empty States

**Current:** Generic "No events" message

**New Approach:**

**Daily View Empty State:**
```
┌─────────────────────────┐
│                         │
│    [Calendar Icon]      │
│                         │
│   No events today       │
│                         │
│   Tap + to add your     │
│   first event           │
│                         │
│   [Quick Add Button]    │
│                         │
└─────────────────────────┘
```

**Weekly View Empty State:**
```
┌─────────────────────────┐
│                         │
│    [Calendar Icon]      │
│                         │
│   No events this week   │
│                         │
│   Swipe to see other    │
│   weeks or tap + to add │
│                         │
└─────────────────────────┘
```

**Key Principles:**
- **Clear CTA** - What to do next
- **Thumb-friendly** - Button in reach zone
- **Contextual** - Different message per view
- **Not intimidating** - Calm, helpful tone

**Files:**
- Create `src/components/planner/mobile/EmptyState.tsx`
- Use in all planner views

### Loading States

**Current:** Generic spinner

**New Approach: Skeleton Screens**

**Daily View Loading:**
```
┌─────────────────────────┐
│ [Skeleton Header]       │
├─────────────────────────┤
│ [Skeleton Time Label]   │
│ [Skeleton Event Card]   │
│ [Skeleton Event Card]   │
│ [Skeleton Time Label]   │
│ [Skeleton Event Card]   │
└─────────────────────────┘
```

**Benefits:**
- Shows structure while loading
- Feels faster (perceived performance)
- Less jarring than spinner

**Files:**
- Create `src/components/planner/mobile/SkeletonLoader.tsx`
- Use in all planner views

### Error States

**Current:** Toast may be missed, no persistent feedback

**New Approach:**
- **Network error:** Toast + retry button in empty state
- **Permission error:** Toast + disabled action button
- **Validation error:** Inline in bottom sheet form
- **Offline:** Toast + badge on affected actions

**Files:**
- Modify toast system
- Add error states to components

---

## 7. Phased Implementation Plan

### Phase 10A — Quick Wins (Low Risk, High Impact)

**Goal:** Improve mobile UX immediately with minimal refactoring.

**Timeline:** 2-3 days

#### 1. Add Swipe Gestures for Date Navigation ⭐ HIGH PRIORITY

**What:** Implement swipe left/right to change days/weeks/months

**Why:** Core mobile interaction, feels native, reduces button clutter

**Files:**
- `PlannerDailyV2.tsx` - Add swipe handlers
- `PlannerWeekly.tsx` - Add swipe handlers
- `PlannerMonthly.tsx` - Add swipe handlers

**Implementation:**
- Use touch event handlers
- Minimum swipe distance: 50px
- Visual feedback during swipe
- Haptic feedback on completion (optional)

**Risk:** Low - Additive change, doesn't break existing behavior

---

#### 2. Make "Today" Button Always Visible ⭐ HIGH PRIORITY

**What:** Persistent "Today" button in header (all views)

**Why:** Core mobile use case (check today) should be one tap

**Files:**
- `PlannerDailyV2.tsx` - Always show button, disable when on today
- `PlannerWeekly.tsx` - Always show button
- `PlannerMonthly.tsx` - Always show button

**Implementation:**
- Remove conditional rendering
- Add disabled state when on today
- Style disabled state clearly

**Risk:** Low - Simple conditional change

---

#### 3. Convert Event Detail Modal to Bottom Sheet ⭐ HIGH PRIORITY

**What:** Replace modal with bottom sheet component

**Why:** More mobile-native, thumb-friendly actions, better keyboard handling

**Files:**
- Create `src/components/shared/BottomSheet.tsx` (reusable)
- Modify `src/components/calendar/EventDetailModal.tsx` to support bottom sheet mode
- Or create `src/components/calendar/EventDetailBottomSheet.tsx`

**Implementation:**
- Create reusable BottomSheet component
- Add swipe-down to dismiss
- Ensure actions at bottom (thumb-reachable)
- Handle keyboard properly (sheet adjusts)

**Risk:** Medium - Requires new component, but isolated change

---

#### 4. Convert Quick Add to Bottom Sheet ⭐ HIGH PRIORITY

**What:** Replace inline input with bottom sheet

**Why:** Keyboard covers input currently, bottom sheet fixes this

**Files:**
- Create `src/components/planner/mobile/QuickAddBottomSheet.tsx`
- Modify `PlannerDailyV2.tsx` - Replace inline input
- Modify `PlannerWeekly.tsx` - Replace inline input
- Modify `PlannerMonthly.tsx` - Replace inline input

**Implementation:**
- Pre-fill time from tapped slot
- Add quick duration buttons (30min, 1hr, 2hr)
- Save button at bottom
- Swipe down to cancel

**Risk:** Medium - Requires new component, but isolated change

---

#### 5. Add "Scroll to Now" Button (Daily View) ⭐ MEDIUM PRIORITY

**What:** Button to scroll to current time when off-screen

**Why:** Current time indicator may be below fold, users need to find it

**Files:**
- `PlannerDailyV2.tsx` - Add floating button, scroll logic

**Implementation:**
- Show button when current time is off-screen
- Smooth scroll to current time indicator
- Auto-scroll on load if current time is later in day

**Risk:** Low - Additive change

---

#### 6. Optimize Weekly View for Mobile ⭐ MEDIUM PRIORITY

**What:** Convert 7-column grid to vertical timeline with expandable days

**Why:** Current grid is unusable on mobile, requires horizontal scroll

**Files:**
- `PlannerWeekly.tsx` - Major refactor
- Create `src/components/planner/mobile/WeekDayCard.tsx`
- Create `src/components/planner/mobile/WeekEventList.tsx`

**Implementation:**
- Days as expandable cards
- Today expanded by default
- Remove sidebar on mobile
- Swipe navigation between weeks

**Risk:** Medium-High - Requires layout refactor, but isolated to one view

---

### Phase 10B — Structural Improvements (Enhanced Experience)

**Goal:** Long-term quality improvements, may require refactors.

**Timeline:** 1-2 weeks (after Phase 10A validation)

#### 1. Redesign Daily View as Vertical Timeline

**What:** Replace time grid with vertical timeline, events as cards

**Why:** More space for content, easier to scan, native mobile feel

**Files:**
- `PlannerDailyV2.tsx` - Major refactor
- Create `src/components/planner/mobile/EventCard.tsx`
- Create `src/components/planner/mobile/TimeLabel.tsx`

**Risk:** High - Major refactor, test thoroughly

---

#### 2. Add Swipe Actions on Events

**What:** Swipe left on event to reveal delete/edit

**Why:** Quick actions without opening detail sheet

**Files:**
- All planner views - Add swipe handlers to event cards

**Risk:** Medium - Additive, but requires gesture handling

---

#### 3. Add Pull-to-Refresh

**What:** Pull down to refresh events

**Why:** Native mobile pattern, feels responsive

**Files:**
- All planner views - Add pull-to-refresh logic

**Risk:** Low - Additive change

---

#### 4. Optimize Monthly View as Calendar Picker

**What:** Large touch targets, event counts only, tap to jump to Daily

**Why:** Current view is too small, not thumb-friendly

**Files:**
- `PlannerMonthly.tsx` - Refactor calendar grid
- Create `src/components/planner/mobile/MonthDateCell.tsx`
- Create `src/components/planner/mobile/MonthEventSheet.tsx`

**Risk:** Medium - Layout refactor

---

#### 5. Add Haptic Feedback

**What:** Haptic feedback on actions (create, delete, navigate)

**Why:** App-like feel, confirms actions

**Files:**
- Create `src/hooks/useHapticFeedback.ts`
- Use in all planner views

**Risk:** Low - Additive, progressive enhancement

---

#### 6. Add Voice Input for Quick Add (Optional)

**What:** Speech-to-text for event title

**Why:** Faster input on mobile

**Files:**
- Create `src/components/planner/mobile/VoiceInput.tsx`

**Risk:** Medium - Requires browser API, may not be supported everywhere

---

#### 7. Add Smart Suggestions (Optional)

**What:** Suggest event times/titles based on history

**Why:** Faster event creation

**Files:**
- Create `src/components/planner/mobile/EventSuggestions.tsx`

**Risk:** Medium - Requires data analysis, may be complex

---

#### 8. Progressive Loading & Skeleton Screens

**What:** Skeleton screens while loading, progressive loading

**Why:** Feels faster, less jarring

**Files:**
- Create `src/components/planner/mobile/SkeletonLoader.tsx`
- Use in all planner views

**Risk:** Low - Additive change

---

## Success Metrics

After Phase 10A:

✅ **"Today" is always one tap away**
- Persistent button visible
- Works in all views
- Haptic feedback confirms action

✅ **Quick add takes < 5 seconds**
- Bottom sheet opens instantly
- Time pre-filled
- One tap to save

✅ **Navigation feels native**
- Swipe gestures work smoothly
- Visual feedback during swipe
- No reliance on buttons

✅ **No keyboard covering inputs**
- Bottom sheets adjust for keyboard
- Inputs always visible
- Save button always reachable

✅ **Mobile feels first-class**
- Bottom sheets instead of modals
- Thumb-friendly interactions
- No horizontal scrolling for events

---

## Implementation Notes

### Testing Requirements

- **Test on real devices** (not just browser dev tools)
- **Test with keyboard** (iOS/Android virtual keyboards)
- **Test offline** (ensure Phase 7A offline queue still works)
- **Test with slow network** (skeleton screens, loading states)

### Desktop Behavior

- **No changes to desktop** - All mobile improvements are conditional
- **Use `isMobile` check** - `window.innerWidth < 768`
- **Desktop keeps existing behavior** - Grid layouts, modals, etc.

### Backward Compatibility

- **Data model unchanged** - No backend changes
- **Permissions unchanged** - Existing system works
- **Offline queue unchanged** - Phase 7A integration maintained

### Progressive Enhancement

- **Swipe gestures** - Fallback to buttons if not supported
- **Bottom sheets** - Fallback to modals if needed
- **Haptic feedback** - Graceful degradation if not available

---

**End of Plan**


