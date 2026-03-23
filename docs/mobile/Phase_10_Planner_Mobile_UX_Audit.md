# Phase 10: Planner Mobile-First UX Audit & Redesign Recommendations

**Date:** 2024  
**Context:** SharedMinds is now a real mobile app (PWA). The Planner works on mobile but is fundamentally desktop-first. This audit identifies pain points and proposes concrete mobile-first changes.

---

## Executive Summary

The Planner currently functions on mobile but feels like a "shrunk desktop calendar" rather than a mobile planning companion. Key issues:

- **Dense layouts** designed for mouse precision
- **Small touch targets** requiring zoom
- **Desktop-first interactions** (drag/resize) disabled but not replaced
- **Cognitive overload** from showing too much at once
- **Navigation friction** - "Today" is not always one tap away
- **Calendar metaphors** that don't translate to thumb-friendly mobile use

**Recommendation:** Mobile-first redesign prioritizing daily use patterns (check today, quick add, mark done) over desktop feature parity.

---

## A. Problem List (Categorized by Severity)

### 🔴 CRITICAL - Blocks Core Mobile Use

#### 1. **Daily View: Time Grid Too Dense for Mobile**
- **Location:** `PlannerDailyV2.tsx` (lines 625-745)
- **Problem:** 
  - 30-minute time slots are 60px tall (`h-16` = 64px)
  - On mobile (375px width), time column (80px) + event column leaves ~295px for content
  - Events are cramped, text truncates aggressively
  - Time labels (6 AM - 11 PM) require vertical scrolling through 36 slots
  - Current time indicator may be off-screen
- **Impact:** Users can't easily see their day or add events at specific times
- **Evidence:** `maxHeight: 'calc(100vh - 320px)'` suggests viewport constraints, but no mobile-specific handling

#### 2. **Weekly View: 7-Column Grid Unusable on Mobile**
- **Location:** `PlannerWeekly.tsx` (lines 717-1027)
- **Problem:**
  - Horizontal scroll required to see all 7 days
  - Each day column is ~42px wide on 375px screen (7 columns + time column)
  - Event pills are truncated to single line or hidden
  - Left sidebar (Notes & Goals) takes 2/12 columns, leaving 10/12 for week grid
  - On mobile, sidebar stacks above grid, but grid still requires horizontal scroll
- **Impact:** Weekly view is essentially broken on mobile - users can't see their week
- **Evidence:** `overflow-x-auto` on line 784 indicates horizontal scroll is expected

#### 3. **Monthly View: Calendar Grid Too Small for Touch**
- **Location:** `PlannerMonthly.tsx` (lines 550-1025)
- **Problem:**
  - 7-column calendar grid with small date cells
  - Event pills shown as dots or truncated text
  - Tap targets for dates are too small (< 44px minimum)
  - Multiple events per day shown as "+3 more" - requires tap to expand
  - Horizontal scroll may be needed for month navigation
- **Impact:** Users can't quickly see what's happening or tap specific dates reliably
- **Evidence:** Mobile disclaimer exists (line 453) acknowledging limitations

#### 4. **Navigation: "Today" Not Always One Tap Away**
- **Location:** All planner views
- **Problem:**
  - "Today" button only appears when `!isToday` or `!isCurrentWeek`
  - On mobile, header navigation is crowded
  - No persistent "Today" button in bottom nav or floating action
  - Users must navigate through date pickers or prev/next buttons
- **Impact:** Core mobile use case (check today) requires multiple taps
- **Evidence:** "Today" button conditional rendering in Daily (line 561), Weekly (line 700)

#### 5. **Quick Add: Keyboard Covers Input on Mobile**
- **Location:** `PlannerDailyV2.tsx` (lines 674-689), `PlannerWeekly.tsx` (lines 760-778)
- **Problem:**
  - Quick add input appears inline in time slot
  - On mobile, keyboard appears and covers the input
  - No scroll-to-input behavior
  - Input may be off-screen when keyboard opens
- **Impact:** Users can't see what they're typing when adding events
- **Evidence:** `autoFocus` on inputs but no keyboard handling

---

### 🟠 HIGH - Significantly Degrades Experience

#### 6. **Event Detail Modal: Too Tall, Requires Scrolling**
- **Location:** `EventDetailModal.tsx` (lines 211-419)
- **Problem:**
  - Modal has `max-h-[90vh]` but content is dense
  - Multiple sections (date/time, description, tags, sharing, permissions)
  - On mobile, modal may require scrolling to see all actions
  - Close button is in header, may scroll out of view
- **Impact:** Users can't easily edit events or see all options
- **Evidence:** `overflow-y-auto` on modal container (line 220)

#### 7. **No Swipe Gestures for Date Navigation**
- **Location:** All planner views
- **Problem:**
  - Date navigation requires tapping prev/next buttons
  - No swipe left/right to change days/weeks/months
  - No swipe down to refresh
  - Calendar apps (Apple Calendar, Google Calendar) use swipes extensively
- **Impact:** Navigation feels slow and requires precision tapping
- **Evidence:** Only button-based navigation exists

#### 8. **PlannerShell: Bottom Nav Crowded on Mobile**
- **Location:** `PlannerShell.tsx` (lines 660-724)
- **Problem:**
  - Bottom nav shows favorite tabs horizontally scrollable
  - Menu toggles for Time Views and Life Areas below tabs
  - FAB (Floating Action Button) positioned above nav
  - All competing for limited bottom screen space
  - Tabs may be too small to tap reliably
- **Impact:** Navigation is cluttered and hard to use
- **Evidence:** `min-h-[44px]` on buttons but tabs may be smaller

#### 9. **Empty States: Not Mobile-Optimized**
- **Location:** Various planner views
- **Problem:**
  - Empty states show generic messages
  - No quick-add CTAs optimized for thumb reach
  - No contextual suggestions (e.g., "Add your first event for today")
  - Loading states are simple spinners
- **Impact:** Users don't know what to do when views are empty
- **Evidence:** Basic loading/empty states exist but not mobile-first

#### 10. **Event Creation: Multi-Step Process on Mobile**
- **Location:** `EventDetailModal.tsx`, `QuickAddPopover.tsx`
- **Problem:**
  - Quick add requires: tap slot → type title → press Enter
  - Full event creation opens modal with many fields
  - No voice input or smart suggestions
  - No "Add to today" quick action
- **Impact:** Adding events is slower than it should be on mobile
- **Evidence:** Quick add exists but is basic (title only)

---

### 🟡 MEDIUM - Noticeable but Workable

#### 11. **Time Column: Fixed Width Wastes Space on Mobile**
- **Location:** `PlannerDailyV2.tsx` (lines 627-643)
- **Problem:**
  - Time column is 80px wide (`w-20`)
  - Shows "6 AM", "6:30 AM", etc. - text is small
  - On mobile, this is ~21% of screen width
  - Could be condensed or hidden when scrolling
- **Impact:** Less space for events, but not blocking
- **Evidence:** `w-20 flex-shrink-0` prevents responsive sizing

#### 12. **Container Events: Visual Hierarchy Unclear on Mobile**
- **Location:** `PlannerDailyV2.tsx` (lines 696-708)
- **Problem:**
  - Container events shown as background bands
  - Nested events shown as pills within containers
  - On mobile, containers may be too narrow to show nested items clearly
  - Visual distinction between container/nested/regular events may be lost
- **Impact:** Users may not understand event relationships
- **Evidence:** Container rendering logic exists but may not scale to mobile

#### 13. **All-Day Events: Lane May Be Hidden on Mobile**
- **Location:** `PlannerDailyV2.tsx` (lines 584-611), `PlannerWeekly.tsx` (lines 825-860)
- **Problem:**
  - All-day lane is at top of grid
  - On mobile, may scroll out of view
  - Events in all-day lane may be truncated
  - No indication if more all-day events exist
- **Impact:** All-day events may be missed
- **Evidence:** All-day lane exists but no mobile-specific handling

#### 14. **Current Time Indicator: May Be Off-Screen**
- **Location:** `PlannerDailyV2.tsx` (lines 648-658)
- **Problem:**
  - Current time indicator shows red line at current time
  - If current time is later in day, indicator may be below fold
  - No "Scroll to now" button on mobile
  - Indicator may be hidden when scrolling
- **Impact:** Users may not know where they are in the day
- **Evidence:** Indicator exists but no scroll-to behavior

#### 15. **Permission Errors: Toast May Be Missed**
- **Location:** Various planner views
- **Problem:**
  - Permission errors show as toasts (Phase 7A improvement)
  - On mobile, toasts may appear at top/bottom and be missed
  - No persistent error banner for critical failures
- **Impact:** Users may not understand why actions fail
- **Evidence:** Toast system exists but may not be mobile-optimized

---

### 🟢 LOW - Minor Polish Issues

#### 16. **Header: Date Display Could Be More Prominent**
- **Location:** All planner views
- **Problem:**
  - Date shown in header but may be small on mobile
  - "Today" badge exists but could be more prominent
  - Week/month names may be truncated
- **Impact:** Minor - users can usually figure out what day it is
- **Evidence:** Headers exist but could be more mobile-optimized

#### 17. **Loading States: Generic Spinners**
- **Location:** All planner views
- **Problem:**
  - Loading states show simple spinners
  - No skeleton screens or progressive loading
  - No indication of what's loading (events, goals, etc.)
- **Impact:** Minor - loading is usually fast
- **Evidence:** Basic loading states exist

#### 18. **Haptic Feedback: Not Implemented**
- **Location:** All planner views
- **Problem:**
  - No haptic feedback on event creation, completion, or navigation
  - Modern mobile apps use haptics for confirmation
- **Impact:** Minor - nice-to-have for app-like feel
- **Evidence:** No haptic feedback code exists

---

## B. Structural Recommendations

### What Views Should Exist on Mobile?

#### ✅ **Keep (with modifications):**
1. **Daily View** - Primary mobile view
   - Should be the default view on mobile
   - Optimize for single-day focus
   - Remove or collapse time grid when not needed
   - Make "Today" always accessible

2. **Weekly View** - Secondary view
   - Redesign as vertical timeline, not horizontal grid
   - Show one day at a time with swipe navigation
   - Or show compact week overview with tap-to-expand days

3. **Monthly View** - Reference view
   - Keep as overview/calendar picker
   - Optimize for date selection, not event management
   - Show event counts, not full event details

#### ❌ **Remove or Hide on Mobile:**
1. **Quarterly View** - Desktop-only
   - Too complex for mobile
   - Not a daily-use view

2. **Life Area Tabs** - Consolidate or hide
   - Too many navigation options
   - Could be filters within Daily view instead

#### 🔄 **Merge or Redesign:**
1. **Quick Add + Event Detail** - Merge into bottom sheet
   - Quick add should open bottom sheet, not inline input
   - Event detail should be bottom sheet, not modal
   - Bottom sheets are more mobile-friendly than modals

2. **Notes & Goals (Weekly)** - Move to Daily view
   - Weekly notes/goals could be daily notes
   - Or show in collapsed section in Daily view

---

### Suggested Hierarchy of Importance (Mobile)

1. **Today View** (Daily, focused on today)
   - Default landing view
   - One-tap access from anywhere
   - Quick add always visible
   - Current time always in view

2. **This Week** (Weekly, vertical timeline)
   - Swipe between days
   - Compact event list per day
   - Tap day to open full Daily view

3. **This Month** (Monthly, calendar picker)
   - Overview of month
   - Event counts per day
   - Tap date to jump to Daily view
   - Not for event management

4. **Settings & Filters** (Collapsed)
   - Hidden in menu
   - Not primary navigation

---

## C. Interaction Changes

### Which Interactions Should Be Tap / Swipe / Long-Press?

#### **Tap:**
- ✅ **Primary action** - Open event, add event, navigate to day
- ✅ **Date selection** - Tap date to view that day
- ✅ **Quick actions** - Mark done, delete, edit (from event card)
- ✅ **Navigation** - Today button, prev/next, view switcher

#### **Swipe:**
- ✅ **Date navigation** - Swipe left/right to change days (Daily)
- ✅ **Week navigation** - Swipe left/right to change weeks (Weekly)
- ✅ **Month navigation** - Swipe left/right to change months (Monthly)
- ✅ **Event actions** - Swipe left on event to reveal delete/edit (optional)
- ✅ **Refresh** - Pull down to refresh (if implemented)

#### **Long-Press:**
- ✅ **Quick add** - Long-press time slot to add event (alternative to tap)
- ✅ **Event context menu** - Long-press event to show actions
- ✅ **Date jump** - Long-press date in month view to jump to day

#### **Disabled on Mobile:**
- ❌ **Drag & drop** - Already disabled (Phase 7A), keep disabled
- ❌ **Resize** - Already disabled (Phase 7A), keep disabled
- ❌ **Multi-select** - Not needed on mobile
- ❌ **Hover states** - Not applicable to touch

---

## D. UI Patterns

### Proposed Layouts (Described, Not Designed)

#### 1. **Daily View - Vertical Timeline (Mobile-First)**

**Current:** Horizontal time grid with fixed time column  
**Proposed:** Vertical timeline with collapsible time labels

- **Time labels on left** (condensed, e.g., "9a", "12p", "3p")
- **Events as cards** (not pills) with full title visible
- **Current time indicator** always visible (sticky or scroll-to)
- **Quick add button** floating at bottom or in header
- **All-day events** as horizontal scrollable strip at top
- **Swipe left/right** to change days
- **Tap event** to open bottom sheet (not modal)

**Benefits:**
- More space for event content
- Easier to scan day
- Thumb-friendly tap targets
- Native mobile feel

---

#### 2. **Weekly View - Vertical Timeline (Not Grid)**

**Current:** 7-column horizontal grid  
**Proposed:** Vertical list of days with expandable sections

- **Each day as card** with date, day name, event count
- **Tap day to expand** and see full event list
- **Swipe left/right** to change weeks
- **Compact mode** shows only event counts
- **Expanded mode** shows event titles and times
- **Today** always highlighted and expanded by default

**Alternative:** Show 3-4 days at a time with horizontal scroll (but vertical event lists)

**Benefits:**
- No horizontal scrolling for events
- Easier to see full week at a glance
- Mobile-native card pattern
- Progressive disclosure (expand to see details)

---

#### 3. **Monthly View - Calendar Picker (Not Event Manager)**

**Current:** Full calendar grid with event pills  
**Proposed:** Clean calendar with event counts, tap to jump to Daily

- **Large date cells** (minimum 44px touch target)
- **Event counts** as badges (not full event titles)
- **Tap date** to jump to Daily view for that day
- **Swipe left/right** to change months
- **Today** always highlighted
- **No event editing** in month view (only viewing)

**Benefits:**
- Fast date navigation
- Clear visual hierarchy
- Thumb-friendly
- Focused purpose (date selection, not event management)

---

#### 4. **Event Detail - Bottom Sheet (Not Modal)**

**Current:** Centered modal with scrolling  
**Proposed:** Bottom sheet that slides up from bottom

- **Swipe down to dismiss** (or tap outside)
- **Actions at bottom** (thumb-reachable)
- **Title and time** at top (sticky)
- **Content scrolls** in middle section
- **Delete/Edit** as prominent buttons at bottom
- **No keyboard covering** content (sheet adjusts)

**Benefits:**
- More mobile-native
- Thumb-friendly actions
- Better keyboard handling
- Easier to dismiss

---

#### 5. **Quick Add - Bottom Sheet (Not Inline Input)**

**Current:** Inline input in time slot  
**Proposed:** Bottom sheet with time picker and title input

- **Tap time slot** → Bottom sheet slides up
- **Time pre-filled** from tapped slot
- **Title input** at top (keyboard-friendly)
- **Quick actions** (30min, 1hr, 2hr duration buttons)
- **Save button** at bottom (thumb-reachable)
- **Swipe down to cancel**

**Benefits:**
- No keyboard covering input
- More space for options
- Consistent with event detail pattern
- Thumb-friendly

---

#### 6. **Navigation - Persistent "Today" Button**

**Current:** "Today" button only when not on today  
**Proposed:** Always-visible "Today" button

- **Floating button** in bottom-right (above bottom nav)
- **Or persistent** in header (always visible)
- **Tap to jump** to today in current view
- **Visual indicator** when on today (button highlighted or disabled)
- **Haptic feedback** on tap

**Benefits:**
- One-tap access to today (core use case)
- Always know where you are
- Fast navigation

---

## E. Clear Next Steps

### 🚀 "Do Now" Changes (Phase 10A - Quick Wins)

1. **Add Swipe Gestures for Date Navigation**
   - Implement swipe left/right on Daily/Weekly/Monthly views
   - Use touch event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`)
   - Add visual feedback during swipe (e.g., slight movement)
   - **Files:** `PlannerDailyV2.tsx`, `PlannerWeekly.tsx`, `PlannerMonthly.tsx`

2. **Make "Today" Button Always Visible**
   - Add persistent "Today" button to header or floating action
   - Show as disabled/highlighted when already on today
   - Add haptic feedback on tap
   - **Files:** All planner views, `PlannerShell.tsx`

3. **Convert Event Detail Modal to Bottom Sheet**
   - Replace modal with bottom sheet component
   - Add swipe-down to dismiss
   - Ensure actions are thumb-reachable
   - **Files:** `EventDetailModal.tsx`, create `BottomSheet.tsx` component

4. **Convert Quick Add to Bottom Sheet**
   - Replace inline input with bottom sheet
   - Pre-fill time from tapped slot
   - Add quick duration buttons
   - **Files:** `PlannerDailyV2.tsx`, `PlannerWeekly.tsx`, `PlannerMonthly.tsx`

5. **Add "Scroll to Now" Button (Daily View)**
   - Show button when current time is off-screen
   - Smooth scroll to current time indicator
   - Auto-scroll on load if current time is later in day
   - **Files:** `PlannerDailyV2.tsx`

6. **Optimize Weekly View for Mobile**
   - Convert 7-column grid to vertical timeline
   - Show days as expandable cards
   - Remove or collapse sidebar on mobile
   - **Files:** `PlannerWeekly.tsx`

---

### 📋 "Nice to Have Later" (Phase 10B - Enhanced Experience)

1. **Redesign Daily View as Vertical Timeline**
   - Replace time grid with vertical timeline
   - Collapsible time labels
   - Event cards instead of pills
   - **Files:** `PlannerDailyV2.tsx` (major refactor)

2. **Add Swipe Actions on Events**
   - Swipe left to reveal delete/edit
   - Swipe right to mark complete (if applicable)
   - **Files:** All planner views

3. **Add Pull-to-Refresh**
   - Pull down to refresh events
   - Show loading indicator
   - **Files:** All planner views

4. **Optimize Monthly View as Calendar Picker**
   - Large touch targets (44px minimum)
   - Event counts only (not full titles)
   - Tap to jump to Daily view
   - **Files:** `PlannerMonthly.tsx`

5. **Add Haptic Feedback**
   - On event creation
   - On navigation
   - On actions (delete, edit, etc.)
   - **Files:** All planner views, create `useHapticFeedback.ts` hook

6. **Add Voice Input for Quick Add**
   - "Add event" voice command
   - Speech-to-text for event title
   - **Files:** Create `VoiceInput.tsx` component

7. **Add Smart Suggestions**
   - Suggest event times based on existing events
   - Suggest event titles based on history
   - **Files:** Create `EventSuggestions.tsx` component

8. **Progressive Loading & Skeleton Screens**
   - Show skeleton screens while loading
   - Progressive loading (today first, then rest of week)
   - **Files:** All planner views

---

### 🚫 Explicitly Call Out What NOT to Fix

1. **Desktop Behavior** - Do not change desktop Planner
2. **Feature Parity** - Do not try to match all desktop features on mobile
3. **Complex Gestures** - Do not add multi-touch or complex gesture systems
4. **Full Calendar Redesign** - Do not redesign entire calendar system
5. **Backend Changes** - Do not change data models or APIs
6. **Offline Functionality** - Already handled in Phase 7A, do not change
7. **Permission System** - Already working, do not change
8. **Event Types** - Do not add new event types in this phase

---

## Success Criteria

After implementing Phase 10A recommendations:

✅ **Planner feels like something you'd casually open on your phone**
- Native mobile patterns (bottom sheets, swipes)
- Thumb-friendly interactions
- Fast, responsive feel

✅ **Adding an item takes seconds**
- Quick add via bottom sheet
- Pre-filled time from tap
- One-tap save

✅ **Today is always one tap away**
- Persistent "Today" button
- Always visible and accessible
- Haptic feedback confirms action

✅ **The UI feels calm and intentional**
- No horizontal scrolling for events
- Clear visual hierarchy
- Progressive disclosure
- No cognitive overload

✅ **Mobile experience is clearly first-class, not an afterthought**
- Mobile-specific patterns (not just responsive)
- Gestures feel natural
- Bottom sheets instead of modals
- Swipe navigation feels native

---

## Implementation Priority

### Phase 10A (Quick Wins) - 2-3 days
1. Swipe gestures for navigation
2. Always-visible "Today" button
3. Event detail as bottom sheet
4. Quick add as bottom sheet
5. Scroll to now button
6. Weekly view mobile optimization

### Phase 10B (Enhanced Experience) - 1-2 weeks
1. Daily view vertical timeline redesign
2. Swipe actions on events
3. Pull-to-refresh
4. Monthly view calendar picker
5. Haptic feedback
6. Voice input (optional)
7. Smart suggestions (optional)

---

## Notes

- This audit focuses on **mobile-first** patterns, not responsive design
- Recommendations prioritize **daily use** over feature completeness
- Desktop behavior should remain unchanged
- All changes should maintain existing offline functionality (Phase 7A)
- Test on real mobile devices, not just browser dev tools

---

**End of Audit**


