# Phase 7: Planner Mobile UX Audit

**Date:** 2025-01-XX  
**Context:** Post Phase 5A (Trust & Error Unification), Phase 6 (Spaces Audit)  
**Focus:** Planner UI mobile usability (Daily/Weekly/Monthly views)  
**Goal:** Ensure Planner feels calm, fast, and reliable in a mobile app context

---

## Executive Summary

**Verdict:** **Minor Mobile Adjustments Recommended**

The Planner is functional on mobile but retains desktop-first interaction patterns. Core issues:
- **High:** Drag & drop is mouse-only (no touch support)
- **High:** Resize is mouse-only
- **High:** Event creation not wrapped with offline queue
- **Medium:** Permission errors use browser `alert()`
- **Medium:** Weekly/Monthly views may feel cramped on small screens
- **Low:** Some navigation could be clearer

**Recommendation:** Apply targeted mobile fixes. No architectural changes needed.

---

## 1. Entry & Orientation Audit

### 1.1 Planner Entry Points

**Entry Routes:**
- `/planner` → `PlannerIndex` (index page)
- `/planner/daily` → `PlannerDailyV2` (daily view)
- `/planner/weekly` → `PlannerWeekly` (weekly view)
- `/planner/monthly` → `PlannerMonthly` (monthly view)

**File:** `src/App.tsx` (line 1022-1064)

**Findings:**
- ✅ **Good:** Clear route structure
- ✅ **Good:** Phase 4A remembers last planner view on mobile (line 94-96 in `AppRouteGuard.tsx`)
- ⚠️ **Medium:** Index page (`/planner`) shows complex grid - may be overwhelming on mobile
- ⚠️ **Low:** No direct "Today" button on index page

**Mobile Experience:**
- App remembers last view (daily/weekly/monthly) and redirects there
- Index page is complex but navigable
- Daily view is most actionable (good default)

**Severity:** Low

---

### 1.2 Current View Clarity

**Daily View Header:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 498-524)
- Shows: Day name, date, navigation arrows, "Week View" button
- ✅ **Good:** Clear day name and date
- ✅ **Good:** "Today" badge shown when viewing today (line 564-566)
- ⚠️ **Medium:** Header buttons are small on mobile (p-1 md:p-2)
- ⚠️ **Low:** No "Go to Today" quick action

**Weekly View Header:**
- **File:** `src/components/planner/PlannerWeekly.tsx`
- Shows: Week range (e.g., "Jan 1 - Jan 7, 2025"), navigation arrows
- ✅ **Good:** Week range is clear
- ⚠️ **Medium:** No "This Week" button
- ⚠️ **Low:** Current day not highlighted in header

**Monthly View Header:**
- **File:** `src/components/planner/PlannerMonthly.tsx` (line 330-331)
- Shows: Month name and year, navigation arrows
- ✅ **Good:** Month/year is clear
- ⚠️ **Medium:** No "This Month" button
- ⚠️ **Low:** Today not highlighted in header

**Severity:** Medium

---

### 1.3 "Today" vs Other Dates

**Findings:**
- ✅ **Good:** Daily view shows "Today" badge (line 564-566 in `PlannerDailyV2.tsx`)
- ✅ **Good:** Current time indicator shown on today (line 593-599)
- ⚠️ **Medium:** No quick "Go to Today" button in daily/weekly/monthly headers
- ⚠️ **Low:** Weekly/Monthly views don't highlight today prominently

**Questions Answered:**
- ✅ "What day am I looking at?" - Clear in daily view
- ⚠️ "Is this today?" - Only clear in daily view with badge
- ⚠️ "How do I get back to today?" - Requires navigation arrows

**Severity:** Medium

---

### Summary: Entry & Orientation

**Critical Issues:** None  
**High Issues:** None  
**Medium Issues:** 3 (no "Today" buttons, header button size, view clarity)  
**Low Issues:** 2 (index complexity, today highlighting)

**Overall Assessment:** Context is generally clear, but "Go to Today" actions are missing.

---

## 2. Daily Planner Flow Audit

### 2.1 Viewing Today

**File:** `src/components/planner/PlannerDailyV2.tsx`

**Findings:**
- ✅ **Good:** Time grid is scrollable (line 570)
- ✅ **Good:** Current time indicator visible (line 593-599)
- ✅ **Good:** All-day events shown at top (line 529-556)
- ⚠️ **Medium:** Time grid max-height may be too tall on mobile (`calc(100vh - 320px)`)
- ⚠️ **Low:** No "Scroll to current time" button

**Severity:** Low

---

### 2.2 Adding a Task/Event

**Quick Add Flow:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 410-439)
- Click time slot → Quick add input appears
- ✅ **Good:** Quick add is simple (title only)
- ⚠️ **High:** Event creation not wrapped with offline queue (line 425)
- ⚠️ **Medium:** No error feedback if creation fails
- ⚠️ **Low:** Quick add input may be covered by keyboard on mobile

**Code Evidence:**
```typescript
// Line 425: Direct API call, no offline wrapper
await createPersonalCalendarEvent(user.id, {
  title: quickAddTitle,
  startAt: startAt.toISOString(),
  endAt: endAt.toISOString(),
  // ...
});
```

**Severity:** High (offline queue missing)

---

### 2.3 Editing an Item

**Edit Flow:**
- Click event → `EventDetailModal` opens
- **File:** `src/components/calendar/EventDetailModal.tsx`
- ✅ **Good:** Modal is mobile-friendly
- ✅ **Good:** Permission checks enforced
- ⚠️ **Medium:** Permission errors use `alert()` (Phase 5A issue)
- ⚠️ **Low:** Modal may be tall on mobile (lots of fields)

**Severity:** Medium

---

### 2.4 Marking Items Complete

**Findings:**
- Events don't have "complete" state (they're calendar events)
- Todos have completion (but not in daily view)
- ⚠️ **Low:** No quick "mark done" action for events

**Severity:** Low (not applicable to calendar events)

---

### 2.5 Quick Adjustments

**Drag & Drop:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 200-285)
- ⚠️ **High:** Drag uses mouse events only (`onMouseDown`, `mousemove`, `mouseup`)
- ⚠️ **High:** No touch event handlers
- ⚠️ **High:** Mobile users cannot drag events to reschedule

**Resize:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 287-385)
- ⚠️ **High:** Resize uses mouse events only
- ⚠️ **High:** No touch support for resizing events

**Code Evidence:**
```typescript
// Line 201: Mouse-only drag start
const handleDragStart = (e: React.MouseEvent, event: PersonalCalendarEvent) => {
  // ...
};

// Line 388-395: Mouse event listeners only
useEffect(() => {
  if (dragging) {
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    // No touchmove/touchend
  }
}, [dragging, handleDrag, handleDragEnd]);
```

**Severity:** High

---

### Summary: Daily Planner Flow

**Critical Issues:** None  
**High Issues:** 3 (drag/resize mouse-only, offline queue missing)  
**Medium Issues:** 2 (error feedback, permission alerts)  
**Low Issues:** 3 (keyboard covering, scroll to time, completion)

**Overall Assessment:** Daily flow works but drag/resize are desktop-only. Offline support missing.

---

## 3. Weekly & Monthly Views Audit

### 3.1 Weekly View

**File:** `src/components/planner/PlannerWeekly.tsx`

**Layout:**
- 7 columns (one per day)
- Time grid (6 AM - 11 PM)
- Events positioned by time

**Findings:**
- ✅ **Good:** Horizontal scrolling works
- ⚠️ **Medium:** 7 columns may be cramped on mobile
- ⚠️ **Medium:** Day columns are narrow (hard to tap events)
- ⚠️ **High:** Drag & drop is mouse-only (same as daily)
- ⚠️ **High:** Resize is mouse-only
- ⚠️ **Low:** No "This Week" button

**Touch Target Concerns:**
- Day columns: Width depends on screen size (may be < 44px)
- Events: Height depends on duration (may be small)
- Navigation arrows: Small (p-1 md:p-2)

**Severity:** Medium (layout), High (interactions)

---

### 3.2 Monthly View

**File:** `src/components/planner/PlannerMonthly.tsx`

**Layout:**
- Calendar grid (7 days × ~5 weeks)
- Events shown as pills/badges in day cells
- Containers shown as background blocks

**Findings:**
- ✅ **Good:** Grid is scrollable
- ✅ **Good:** Day cells are tappable
- ⚠️ **Medium:** Event pills may be small (hard to tap)
- ⚠️ **Medium:** Many events per day may overflow
- ⚠️ **High:** Drag & drop is mouse-only (line 66-79)
- ⚠️ **Low:** No "This Month" button

**Touch Target Concerns:**
- Day cells: Reasonable size
- Event pills: May be small if many events
- Container blocks: Large enough

**Severity:** Medium

---

### 3.3 Switching Between Views

**Navigation:**
- **File:** `src/components/planner/PlannerShell.tsx` (line 246-268)
- Favourite tabs in header
- ✅ **Good:** Tabs are scrollable on mobile
- ✅ **Good:** Tabs meet 44px minimum height (line 260)
- ⚠️ **Medium:** Active tab indicator may be subtle
- ⚠️ **Low:** No visual distinction between Daily/Weekly/Monthly in tabs

**Severity:** Low

---

### Summary: Weekly & Monthly Views

**Critical Issues:** None  
**High Issues:** 2 (drag/resize mouse-only in weekly)  
**Medium Issues:** 4 (cramped layout, small touch targets, no "This Week/Month")  
**Low Issues:** 2 (tab clarity, event overflow)

**Overall Assessment:** Views are functional but interactions are desktop-only.

---

## 4. Interaction Model Audit (Touch vs Desktop)

### 4.1 Drag & Drop

**Daily View:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 200-285)
- Mouse-only: `onMouseDown`, `mousemove`, `mouseup`
- No touch handlers

**Weekly View:**
- **File:** `src/components/planner/PlannerWeekly.tsx` (line 327-419)
- Mouse-only: Same pattern
- No touch handlers

**Monthly View:**
- **File:** `src/components/planner/PlannerMonthly.tsx` (line 66-79)
- Mouse-only: Drag state exists but handlers not shown in audit scope
- No touch handlers

**Impact:**
- Mobile users cannot drag events to reschedule
- Must use edit modal to change times
- Extra taps required

**Severity:** High

---

### 4.2 Resize

**Daily View:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 287-408)
- Mouse-only: `onMouseDown` on resize handle, `mousemove`, `mouseup`
- No touch handlers

**Weekly View:**
- **File:** `src/components/planner/PlannerWeekly.tsx` (line 44-49, similar pattern)
- Mouse-only: Same pattern
- No touch handlers

**Impact:**
- Mobile users cannot resize events
- Must use edit modal to change duration
- Extra taps required

**Severity:** High

---

### 4.3 Hover States

**Findings:**
- ✅ **Good:** No hover-only interactions found
- ✅ **Good:** All actions are tap-accessible
- ⚠️ **Low:** Some hover effects may not work on touch (cosmetic only)

**Severity:** Low

---

### 4.4 Context Menus

**Findings:**
- ✅ **Good:** No context menus found
- ✅ **Good:** Actions are in modal or inline
- No issues

**Severity:** None

---

### 4.5 Multi-Select

**Findings:**
- ✅ **Good:** No multi-select found
- ✅ **Good:** Single-item interactions only
- No issues

**Severity:** None

---

### Summary: Interaction Model

**Critical Issues:** None  
**High Issues:** 2 (drag mouse-only, resize mouse-only)  
**Medium Issues:** None  
**Low Issues:** 1 (hover effects)

**Overall Assessment:** Core interactions (drag/resize) are desktop-only. Mobile users must use modals.

---

## 5. Navigation & Escape Routes Audit

### 5.1 Moving Between Days

**Daily View:**
- **File:** `src/components/planner/PlannerDailyV2.tsx` (line 507-516)
- Previous/Next arrows
- ✅ **Good:** Arrows are visible
- ⚠️ **Medium:** Arrows are small on mobile (p-1 md:p-2)
- ⚠️ **Medium:** No swipe gesture support
- ⚠️ **Low:** No "Go to Today" button

**Severity:** Medium

---

### 5.2 Switching Planner Views

**Navigation:**
- **File:** `src/components/planner/PlannerShell.tsx` (line 246-268)
- Favourite tabs in header
- ✅ **Good:** Tabs are scrollable
- ✅ **Good:** Tabs meet touch target size
- ⚠️ **Low:** Active tab indicator may be subtle

**Severity:** Low

---

### 5.3 Entering and Exiting Planner Sub-Views

**Findings:**
- ✅ **Good:** All views use `PlannerShell` (consistent navigation)
- ✅ **Good:** Back button in daily view (line 500-506)
- ⚠️ **Medium:** Back button is small on mobile
- ⚠️ **Low:** No breadcrumbs

**Severity:** Low

---

### 5.4 Returning "Up" or "Back"

**Findings:**
- ✅ **Good:** Daily view has back button (line 500-506)
- ✅ **Good:** PlannerShell header has Home button (line 275-288)
- ⚠️ **Medium:** Home button behavior differs on mobile (goes to daily, not index)
- ⚠️ **Low:** No browser back button reliance (good)

**Code Evidence:**
```typescript
// Line 276-282: Mobile goes to daily, desktop goes to index
onClick={() => {
  if (window.innerWidth < 1024) {
    navigate('/planner/daily');
  } else {
    navigate('/planner');
  }
}}
```

**Severity:** Low

---

### Summary: Navigation & Escape Routes

**Critical Issues:** None  
**High Issues:** None  
**Medium Issues:** 2 (small navigation buttons, no swipe)  
**Low Issues:** 3 (no "Today" button, subtle indicators, breadcrumbs)

**Overall Assessment:** Navigation works but could be more mobile-friendly.

---

## 6. Offline & Sync Behavior in Planner

### 6.1 Using Planner Offline

**Findings:**
- ⚠️ **High:** Event creation not wrapped with offline queue
- ⚠️ **High:** Event updates not wrapped
- ⚠️ **Medium:** No offline indicators in planner views
- ⚠️ **Medium:** No cached view of events

**Code Evidence:**
```typescript
// PlannerDailyV2.tsx line 425: Direct API call
await createPersonalCalendarEvent(user.id, {
  title: quickAddTitle,
  // ...
});

// No executeOrQueue wrapper
// No offline queue integration
```

**Comparison:**
- Calendar events: `calendarOffline.ts` exists but not used in planner
- Todos: `todosServiceOffline.ts` exists
- Nutrition logs: `selfCareServiceOffline.ts` exists
- Planner events: **Not wrapped**

**Severity:** High

---

### 6.2 Creating Items Offline

**Findings:**
- ⚠️ **High:** Quick add fails silently offline
- ⚠️ **High:** No queue feedback
- ⚠️ **Medium:** No "will sync when online" message

**Severity:** High

---

### 6.3 Reconnecting and Syncing

**Findings:**
- ✅ **Good:** `OfflineIndicator` shows global sync status
- ⚠️ **Medium:** Planner-specific actions not shown in sync feedback
- ⚠️ **Low:** No way to see queued planner events

**Severity:** Medium

---

### 6.4 Consistency with Phase 4B Behavior

**Findings:**
- ⚠️ **High:** Planner events don't follow Phase 4B pattern
- ⚠️ **High:** Should use `executeOrQueue` like other create actions
- ⚠️ **Medium:** Should register handler in `offlineActions.ts`

**Severity:** High

---

### Summary: Offline & Sync

**Critical Issues:** None  
**High Issues:** 4 (no offline queue, silent failures, inconsistency)  
**Medium Issues:** 2 (no indicators, sync feedback)  
**Low Issues:** 1 (queue visibility)

**Overall Assessment:** Planner actions don't work offline. Inconsistent with Phase 4B.

---

## 7. Visual Density & Calmness Audit

### 7.1 Daily View

**File:** `src/components/planner/PlannerDailyV2.tsx`

**Findings:**
- ✅ **Good:** Time grid is clean
- ✅ **Good:** Events are clearly separated
- ⚠️ **Medium:** Header has many buttons (back, prev, next, week view)
- ⚠️ **Low:** All-day section may be crowded if many events

**Severity:** Low

---

### 7.2 Weekly View

**File:** `src/components/planner/PlannerWeekly.tsx`

**Findings:**
- ⚠️ **Medium:** 7 columns may feel cramped on mobile
- ⚠️ **Medium:** Many events may overlap
- ⚠️ **Low:** Header is clean

**Severity:** Medium

---

### 7.3 Monthly View

**File:** `src/components/planner/PlannerMonthly.tsx`

**Findings:**
- ✅ **Good:** Grid is clean
- ⚠️ **Medium:** Many events per day may overflow
- ⚠️ **Low:** Container blocks may obscure events

**Severity:** Medium

---

### 7.4 Header Overcrowding

**PlannerShell Header:**
- **File:** `src/components/planner/PlannerShell.tsx` (line 235-299)
- Favourite tabs (scrollable)
- Home button
- Settings button
- ✅ **Good:** Tabs scroll on mobile
- ✅ **Good:** Buttons meet touch target size
- ⚠️ **Low:** Many tabs may require scrolling

**Severity:** Low

---

### Summary: Visual Density & Calmness

**Critical Issues:** None  
**High Issues:** None  
**Medium Issues:** 3 (weekly cramped, monthly overflow, header buttons)  
**Low Issues:** 3 (all-day crowding, container overlap, tab scrolling)

**Overall Assessment:** Views are generally calm, but weekly/monthly may feel busy on mobile.

---

## 8. App Mental Model Audit

### 8.1 Overall Feel

**Findings:**
- ✅ **Good:** Planner feels like a planning tool (appropriate)
- ⚠️ **Medium:** Drag/resize interactions feel desktop-first
- ⚠️ **Medium:** Weekly/Monthly views may feel "work-like" on mobile
- ✅ **Good:** Daily view feels casual and usable

**Questions:**
- "Would I casually open this on my phone?"
  - **Daily view:** Yes (feels casual)
  - **Weekly/Monthly:** Maybe (feels more "work-like")
- "Does it feel like 'work'?"
  - **Daily view:** No (feels like a daily companion)
  - **Weekly/Monthly:** Somewhat (feels like planning tool)

**Severity:** Medium

---

### 8.2 Consistency with App Patterns

**Findings:**
- ✅ **Good:** Uses same navigation patterns (PlannerShell)
- ✅ **Good:** Uses same permission system
- ⚠️ **Medium:** Drag/resize differs from rest of app (mouse-only)
- ⚠️ **Low:** Offline behavior differs (not queued)

**Severity:** Low

---

### Summary: App Mental Model

**Critical Issues:** None  
**High Issues:** None  
**Medium Issues:** 2 (desktop interactions, work-like feel)  
**Low Issues:** 1 (offline inconsistency)

**Overall Assessment:** Daily view feels mobile-friendly. Weekly/Monthly feel desktop-first.

---

## Priority Recommendations

### High Priority (Address Soon)

1. **Add Touch Support for Drag & Drop** (High)
   - Add `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers
   - Files: `src/components/planner/PlannerDailyV2.tsx`, `src/components/planner/PlannerWeekly.tsx`

2. **Add Touch Support for Resize** (High)
   - Add touch handlers for resize handles
   - Consider alternative resize UI for mobile (e.g., time picker)
   - Files: `src/components/planner/PlannerDailyV2.tsx`, `src/components/planner/PlannerWeekly.tsx`

3. **Wrap Event Creation with Offline Queue** (High)
   - Use `executeOrQueue` for `createPersonalCalendarEvent`
   - Register handler in `offlineActions.ts`
   - Files: `src/components/planner/PlannerDailyV2.tsx`, `src/lib/offlineActions.ts`

4. **Wrap Event Updates with Offline Queue** (High)
   - Use `executeOrQueue` for `updatePersonalCalendarEvent`
   - Register handler in `offlineActions.ts`
   - Files: `src/components/planner/PlannerDailyV2.tsx`, `src/lib/offlineActions.ts`

5. **Replace Permission Alerts with Toasts** (Medium)
   - Replace `alert()` with `showToast()` (Phase 5A pattern)
   - Files: `src/components/planner/PlannerDailyV2.tsx` (line 279, 379)

### Medium Priority (Address When Convenient)

6. **Add "Go to Today" Buttons** (Medium)
   - Add button in daily/weekly/monthly headers
   - Files: `src/components/planner/PlannerDailyV2.tsx`, `src/components/planner/PlannerWeekly.tsx`, `src/components/planner/PlannerMonthly.tsx`

7. **Improve Navigation Button Size on Mobile** (Medium)
   - Increase padding on mobile (p-2 instead of p-1)
   - Files: `src/components/planner/PlannerDailyV2.tsx` (line 507-516)

8. **Add Error Feedback for Event Creation** (Medium)
   - Show toast on failure
   - Files: `src/components/planner/PlannerDailyV2.tsx` (line 436-438)

9. **Improve Weekly View Mobile Layout** (Medium)
   - Consider stacking days on very small screens
   - Or increase minimum column width
   - Files: `src/components/planner/PlannerWeekly.tsx`

### Low Priority (Nice to Have)

10. **Add Swipe Gestures for Day Navigation** (Low)
    - Swipe left/right to change days
    - Files: `src/components/planner/PlannerDailyV2.tsx`

11. **Add "Scroll to Current Time" Button** (Low)
    - Button to jump to current time in daily view
    - Files: `src/components/planner/PlannerDailyV2.tsx`

12. **Improve Monthly View Event Overflow** (Low)
    - Show "+N more" indicator
    - Files: `src/components/planner/PlannerMonthly.tsx`

---

## Final Verdict

**Do Nothing / Minor Fixes / Needs Attention:** **Minor Mobile Adjustments Recommended**

The Planner is functional but retains desktop-first interaction patterns. Critical issues:
- Drag & resize are mouse-only (mobile users cannot reschedule events)
- Event creation/updates not wrapped with offline queue
- Permission errors use browser alerts

**Recommendation:** Apply targeted mobile fixes:
1. Add touch handlers for drag/resize
2. Wrap event actions with offline queue
3. Replace alerts with toasts
4. Add "Go to Today" buttons

No architectural changes needed. No redesign needed. System is sound, just needs mobile interaction support and offline consistency.

---

## Risk Assessment

**Daily Use Risk:** Medium (mobile users cannot drag/resize, offline actions fail)  
**Trust Risk:** Low (permissions enforced, but errors use alerts)  
**Data Loss Risk:** Low (offline actions fail, but don't corrupt)  
**Performance Risk:** Low  
**Maintenance Risk:** Low

**Overall:** Planner works on mobile for viewing and basic editing, but advanced interactions (drag/resize) require desktop. Offline support is missing.



