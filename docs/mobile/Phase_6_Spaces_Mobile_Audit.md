# Phase 6: Spaces Mobile UX Audit

**Date:** 2025-01-XX  
**Context:** Post Phase 5A (Trust & Error Unification)  
**Focus:** Personal Spaces & Shared Spaces mobile usability  
**Goal:** Identify mobile friction, trust issues, and desktop-first assumptions

---

## Executive Summary

**Verdict:** **Minor Mobile Adjustments Recommended**

Spaces are functional on mobile but retain desktop-first interaction patterns. Core issues:
- **High:** Widget controls hidden behind hover (invisible on touch)
- **High:** Resize handles are mouse-only
- **Medium:** Navigation header hidden on mobile
- **Medium:** Permission errors lack user feedback
- **Low:** Some visual density issues

**Recommendation:** Apply targeted mobile fixes. No architectural changes needed.

---

## 1. Entry & Orientation Audit

### 1.1 Personal Space Entry

**Entry Point:** `/spaces/personal`  
**File:** `src/components/PersonalSpacePage.tsx`

**Findings:**
- ✅ **Good:** Clear header: "Personal Space" + "Your private dashboard"
- ✅ **Good:** Mode toggle visible (Canvas/Mobile)
- ⚠️ **Medium:** Navigation buttons hidden on mobile (`hidden md:flex` at line 94)
- ⚠️ **Medium:** No back button on mobile (relies on browser back)

**Mobile Experience:**
- User lands on canvas immediately
- Header shows space name and mode toggle
- Navigation to other sections requires browser back or app navigation

**Severity:** Medium

---

### 1.2 Shared Space Entry

**Entry Point:** `/spaces/shared` → `/spaces/:spaceId`  
**Files:** 
- `src/components/SharedSpacesListPage.tsx`
- `src/components/SpaceViewPage.tsx`

**Findings:**
- ✅ **Good:** List page clearly labeled "Shared Spaces"
- ✅ **Good:** SpaceViewPage shows "Back" button (line 91-97)
- ✅ **Good:** Header shows space name + "Shared Space" subtitle
- ⚠️ **Medium:** Back button hidden on mobile (`hidden md:flex` at line 102)
- ⚠️ **Medium:** Auto-redirect if only one space (line 23-25) - could be disorienting

**Mobile Experience:**
- If user has 1 shared space, auto-redirects (no list shown)
- If multiple spaces, list is clear
- Once in space, back button exists but hidden on mobile

**Severity:** Medium

---

### 1.3 Space Context Clarity

**Findings:**
- ✅ **Good:** Permission badge shows role (owner/editor/viewer) - line 835-852 in `FridgeCanvas.tsx`
- ✅ **Good:** Badge text is clear: "Household owner • Full edit access" vs "Viewer mode"
- ⚠️ **Medium:** Badge is fixed top-right - may be cut off on small screens
- ⚠️ **Low:** No visual distinction between Personal and Shared space in canvas itself (only in header)

**Questions Answered:**
- ✅ "Whose space am I in?" - Header shows name
- ✅ "Can I edit?" - Permission badge shows role
- ⚠️ "Is this Personal or Shared?" - Only clear in header, not in canvas

**Severity:** Medium

---

### Summary: Entry & Orientation

**Critical Issues:** None  
**High Issues:** None  
**Medium Issues:** 3 (hidden navigation, hidden back button, context clarity)  
**Low Issues:** 1 (visual distinction)

**Overall Assessment:** Context is generally clear, but mobile navigation is hidden.

---

## 2. Mobile Layout & Density Audit

### 2.1 Canvas Layout

**File:** `src/components/fridge-canvas/FridgeCanvas.tsx`  
**Component:** `InfiniteCanvas`

**Findings:**
- ✅ **Good:** Infinite canvas works on mobile (touch pan/zoom supported)
- ✅ **Good:** Two-finger pinch zoom implemented (line 123-173 in `InfiniteCanvas.tsx`)
- ⚠️ **Medium:** Canvas is 4000x4000px - could be overwhelming on small screens
- ⚠️ **Low:** No "home" or "reset view" button for mobile users who get lost

**Visual Density:**
- Canvas background is subtle (good)
- Widgets can be any size (icon/mini/large/xlarge)
- No enforced minimum spacing on mobile

**Severity:** Medium

---

### 2.2 Widget Density

**File:** `src/components/fridge-canvas/CanvasWidget.tsx`

**Findings:**
- ✅ **Good:** Widgets have size modes (icon/mini/large/xlarge)
- ⚠️ **Medium:** Icon mode is 80x80px - may be too small for reliable tapping
- ⚠️ **Medium:** No minimum spacing enforced between widgets
- ⚠️ **Low:** Widgets can overlap (z-index based) - could be confusing on mobile

**Touch Target Concerns:**
- Icon widgets: 80x80px (meets 44px minimum, but small)
- Controls: Only visible on hover (see Interaction Model)
- Resize handle: 32x32px (meets minimum, but mouse-only)

**Severity:** Medium

---

### 2.3 Header & Navigation Density

**Files:**
- `src/components/PersonalSpacePage.tsx` (line 85-197)
- `src/components/SpaceViewPage.tsx` (line 86-205)
- `src/components/fridge-canvas/CanvasHeader.tsx`

**Findings:**
- ⚠️ **High:** Navigation buttons hidden on mobile (`hidden md:flex`)
- ⚠️ **Medium:** Header is 64px tall (h-16) - reasonable
- ⚠️ **Medium:** Mode toggle buttons are small (px-4 py-2) - acceptable
- ⚠️ **Low:** CanvasHeader is fixed top - may overlap content on very small screens

**Mobile Header:**
- Shows: Space name, mode toggle
- Hides: Dashboard, Spaces menu, Guardrails, Messages, Settings
- No hamburger menu or mobile navigation drawer

**Severity:** High (for hidden navigation)

---

### Summary: Mobile Layout & Density

**Critical Issues:** None  
**High Issues:** 1 (hidden navigation)  
**Medium Issues:** 4 (canvas size, widget density, header overlap)  
**Low Issues:** 2 (overlapping widgets, no reset view)

**Overall Assessment:** Layout is functional but navigation is hidden on mobile.

---

## 3. Interaction Model Audit (Touch vs Mouse)

### 3.1 Widget Drag & Drop

**File:** `src/components/fridge-canvas/CanvasWidget.tsx` (line 90-122)

**Findings:**
- ⚠️ **High:** Drag uses `onMouseDown` only - no touch event handlers
- ⚠️ **High:** Touch events not handled for widget dragging
- ✅ **Good:** Canvas panning has touch support (InfiniteCanvas line 123-173)
- ⚠️ **Medium:** Drag detection checks for interactive elements (good), but touch not considered

**Code Evidence:**
```typescript
// Line 90-122: Only mouse events
const handleMouseDown = useCallback(
  (e: React.MouseEvent) => {
    // ... drag logic
  },
  [layout.position_x, layout.position_y, layout.widget_id, onDragStart]
);
// No handleTouchStart equivalent
```

**Severity:** High

---

### 3.2 Widget Resize

**File:** `src/components/fridge-canvas/CanvasWidget.tsx` (line 207-218, 356-371)

**Findings:**
- ⚠️ **High:** Resize handle uses `onMouseDown` only
- ⚠️ **High:** No touch support for resize
- ⚠️ **Medium:** Resize handle is 32x32px (meets minimum, but hard to target)
- ⚠️ **Low:** Handle only visible when not dragging (good UX, but mobile can't drag)

**Code Evidence:**
```typescript
// Line 207-218: Mouse-only resize
const handleResizeStart = useCallback(
  (e: React.MouseEvent) => {
    setIsResizing(true);
    // ...
  },
  []
);

// Line 359: onMouseDown only
<div
  className="resize-handle absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize group"
  onMouseDown={handleResizeStart}
  title="Drag to resize"
>
```

**Severity:** High

---

### 3.3 Widget Controls (Hover States)

**File:** `src/components/fridge-canvas/CanvasWidget.tsx` (line 312-354)

**Findings:**
- ⚠️ **Critical:** Controls only visible when `isHovered` (line 312)
- ⚠️ **Critical:** `isHovered` set via `onMouseEnter`/`onMouseLeave` (line 298-299)
- ⚠️ **Critical:** No touch equivalent - controls are invisible on mobile
- ⚠️ **High:** Controls include: minimize, size toggle, delete - all inaccessible on mobile

**Code Evidence:**
```typescript
// Line 312: Controls hidden unless hovered
{isHovered && layout.size_mode !== 'icon' && (
  <div className={getControlsClasses()}>
    <button onClick={() => onLayoutChange({ size_mode: 'icon' })}>
      <Minimize size={14} />
    </button>
    // ... more controls
  </div>
)}

// Line 298-299: Hover only, no touch
onMouseEnter={() => setIsHovered(true)}
onMouseLeave={() => setIsHovered(false)}
```

**Impact:**
- Mobile users cannot:
  - Change widget size
  - Delete widgets
  - Access widget controls

**Severity:** Critical

---

### 3.4 Canvas Pan & Zoom

**File:** `src/components/fridge-canvas/InfiniteCanvas.tsx` (line 123-173)

**Findings:**
- ✅ **Good:** Touch panning implemented (one-finger drag)
- ✅ **Good:** Touch zoom implemented (two-finger pinch)
- ✅ **Good:** Widget detection prevents accidental panning
- ⚠️ **Low:** No visual zoom controls on mobile (desktop has +/- buttons)

**Touch Support:**
- One finger: Pan canvas (if not touching widget)
- Two finger: Pinch zoom
- Widget detection: Prevents pan when touching widget

**Severity:** Low

---

### 3.5 Icon Mode Interaction

**File:** `src/components/fridge-canvas/CanvasWidget.tsx` (line 374-395)

**Findings:**
- ⚠️ **Medium:** Icon mode has "enlarge" button, but only visible on hover
- ⚠️ **Medium:** Button appears on `isHovered` - invisible on mobile
- ⚠️ **Low:** Icon widgets are 80x80px - small but tappable

**Code Evidence:**
```typescript
// Line 378: Enlarge button only on hover
{isHovered && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      cycleViewMode();
    }}
    // ...
  >
    <Maximize2 size={16} />
  </button>
)}
```

**Severity:** Medium

---

### Summary: Interaction Model

**Critical Issues:** 1 (widget controls hidden on hover)  
**High Issues:** 2 (drag & drop mouse-only, resize mouse-only)  
**Medium Issues:** 1 (icon mode enlarge button)  
**Low Issues:** 1 (zoom controls)

**Overall Assessment:** Core interactions are mouse-only. Mobile users cannot edit widgets.

---

## 4. Navigation & Escape Routes Audit

### 4.1 Entering a Space

**Findings:**
- ✅ **Good:** Clear entry points (`/spaces/personal`, `/spaces/shared`)
- ✅ **Good:** List page for shared spaces
- ⚠️ **Medium:** Auto-redirect if only one shared space (could be disorienting)

**Severity:** Low

---

### 4.2 Moving Within a Space

**Findings:**
- ✅ **Good:** Canvas pan/zoom works
- ⚠️ **Medium:** No breadcrumbs or position indicator
- ⚠️ **Low:** No "home" button to reset view

**Severity:** Low

---

### 4.3 Leaving a Space

**Findings:**
- ✅ **Good:** Back button exists in SpaceViewPage (line 91-97)
- ⚠️ **High:** Back button hidden on mobile (`hidden md:flex` at line 102)
- ⚠️ **Medium:** PersonalSpacePage has no back button
- ⚠️ **Medium:** Relies on browser back button or app navigation

**Code Evidence:**
```typescript
// SpaceViewPage.tsx line 102: Navigation hidden on mobile
<div className="hidden md:flex items-center gap-2">
  <button onClick={() => navigate('/spaces/shared')}>
    <ArrowLeft size={14} />
    Back
  </button>
  // ...
</div>
```

**Severity:** High

---

### 4.4 Navigation Depth

**Findings:**
- ✅ **Good:** Flat structure (no nested spaces)
- ⚠️ **Medium:** Mode toggle switches to completely different UI (`MobileModeContainer`)
- ⚠️ **Low:** No clear indication of navigation depth

**Severity:** Low

---

### Summary: Navigation & Escape Routes

**Critical Issues:** None  
**High Issues:** 1 (back button hidden)  
**Medium Issues:** 2 (no back in personal, mode switch)  
**Low Issues:** 2 (no home button, no depth indicator)

**Overall Assessment:** Navigation works but back buttons are hidden on mobile.

---

## 5. Shared Space Trust & Safety Audit

### 5.1 Permission Indicators

**File:** `src/components/fridge-canvas/FridgeCanvas.tsx` (line 835-852)

**Findings:**
- ✅ **Good:** Permission badge clearly shows role
- ✅ **Good:** Badge text is user-friendly
- ⚠️ **Medium:** Badge is fixed top-right - may be cut off on small screens
- ⚠️ **Low:** Badge uses small text (text-xs) - may be hard to read

**Code Evidence:**
```typescript
// Line 835-852: Permission badge
{canEdit ? (
  <div className="flex items-center gap-2 bg-emerald-50 ... text-xs ...">
    <ShieldCheck size={14} />
    <span>
      {role === "owner"
        ? "Household owner • Full edit access"
        : "Editor • Can edit widgets"}
    </span>
  </div>
) : (
  <div className="flex items-center gap-2 bg-sky-50 ... text-xs ...">
    <Eye size={14} />
    <span>Viewer mode • You can move things, but only adults can edit</span>
  </div>
)}
```

**Severity:** Medium

---

### 5.2 Edit Permission Enforcement

**File:** `src/components/fridge-canvas/FridgeCanvas.tsx` (line 239-241, 345, 362)

**Findings:**
- ✅ **Good:** `canEdit` check prevents widget creation (line 239)
- ✅ **Good:** `canEdit` check prevents content updates (line 345)
- ✅ **Good:** `canEdit` check prevents widget deletion (line 362)
- ⚠️ **High:** Permission errors only logged to console (line 240)
- ⚠️ **High:** No user-facing error message when edit is blocked

**Code Evidence:**
```typescript
// Line 239-241: Silent failure
if (!canEdit) {
  console.warn("⛔ User does NOT have edit permissions.");
  setError("You do not have permission to add widgets.");
  // Error is set but may not be visible immediately
}

// Line 345: Silent return
if (!canEdit) return;
// No feedback to user
```

**Severity:** High

---

### 5.3 Accidental Edits

**Findings:**
- ✅ **Good:** Widget controls hidden unless hovered (prevents accidental clicks)
- ⚠️ **Medium:** But controls are also hidden on mobile (can't edit at all)
- ⚠️ **Low:** No confirmation for destructive actions (delete widget)
- ⚠️ **Low:** Delete button is small and in hover-only controls

**Severity:** Low (controls are hidden, so accidental edits unlikely)

---

### 5.4 Shared Impact Clarity

**Findings:**
- ✅ **Good:** Permission badge shows "Shared Space" in header
- ⚠️ **Medium:** No indication that edits affect others
- ⚠️ **Low:** No "last edited by" indicators on widgets

**Severity:** Low

---

### Summary: Shared Space Trust & Safety

**Critical Issues:** None  
**High Issues:** 1 (silent permission failures)  
**Medium Issues:** 2 (badge visibility, edit impact clarity)  
**Low Issues:** 2 (destructive actions, last edited indicators)

**Overall Assessment:** Permissions are enforced but errors are silent.

---

## 6. Offline & Sync Behaviour in Spaces

### 6.1 Offline Entry

**Findings:**
- ⚠️ **Medium:** No offline handling for Spaces
- ⚠️ **Medium:** Canvas loads widgets from API - fails silently offline
- ⚠️ **Medium:** No cached/offline view of spaces

**Severity:** Medium

---

### 6.2 Offline Actions

**Findings:**
- ⚠️ **High:** Widget creation not wrapped with offline queue
- ⚠️ **High:** Widget updates not wrapped with offline queue
- ⚠️ **High:** Widget deletion not wrapped (but destructive, so may be intentional)
- ⚠️ **Medium:** No feedback when actions fail offline

**Code Evidence:**
```typescript
// FridgeCanvas.tsx line 227-256: Direct API call, no offline wrapper
const handleAddWidget = async (type: WidgetType) => {
  // ...
  const newWidget = await createWidget(householdId, type, content);
  // No executeOrQueue wrapper
};
```

**Severity:** High

---

### 6.3 Sync Feedback

**Findings:**
- ⚠️ **Medium:** No sync feedback for Spaces actions
- ⚠️ **Medium:** OfflineIndicator doesn't show Spaces-specific actions
- ⚠️ **Low:** No way to see queued Spaces actions

**Severity:** Medium

---

### Summary: Offline & Sync

**Critical Issues:** None  
**High Issues:** 2 (widget creation/updates not queued)  
**Medium Issues:** 3 (offline entry, sync feedback, action visibility)  
**Low Issues:** None

**Overall Assessment:** Spaces actions don't work offline and provide no feedback.

---

## 7. App Mental Model Audit

### 7.1 Overall Feel

**Findings:**
- ⚠️ **Medium:** Canvas feels like desktop tool (Miro/Figma-like)
- ⚠️ **Medium:** Mode toggle suggests two different apps (Canvas vs Mobile)
- ⚠️ **Low:** Infinite canvas is powerful but may feel overwhelming on mobile
- ✅ **Good:** Mobile mode exists as alternative

**Questions:**
- "Does this feel like something I'd casually open on my phone?"
  - **Answer:** Canvas mode feels like "sit down and focus" tool
  - Mobile mode is more casual, but is separate system

**Severity:** Medium

---

### 7.2 Consistency with App Patterns

**Findings:**
- ✅ **Good:** Uses same navigation patterns as rest of app
- ✅ **Good:** Uses same permission system
- ⚠️ **Medium:** Canvas interactions differ from rest of app (drag/drop, infinite space)
- ⚠️ **Low:** Widget toolbox feels desktop-first (floating, expandable)

**Severity:** Low

---

### Summary: App Mental Model

**Critical Issues:** None  
**High Issues:** None  
**Medium Issues:** 2 (desktop tool feel, mode separation)  
**Low Issues:** 2 (canvas complexity, toolbox pattern)

**Overall Assessment:** Spaces feel functional but desktop-first. Mobile mode provides alternative but feels separate.

---

## Priority Recommendations

### High Priority (Address Soon)

1. **Widget Controls Touch Access** (Critical)
   - Make controls visible on mobile (not hover-only)
   - Add touch handlers for widget interactions
   - Files: `src/components/fridge-canvas/CanvasWidget.tsx`

2. **Widget Drag & Drop Touch Support** (High)
   - Add `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers
   - Files: `src/components/fridge-canvas/CanvasWidget.tsx`

3. **Widget Resize Touch Support** (High)
   - Add touch handlers for resize handle
   - Consider alternative resize UI for mobile (e.g., corner drag)
   - Files: `src/components/fridge-canvas/CanvasWidget.tsx`

4. **Permission Error Feedback** (High)
   - Show toast/error message when edit is blocked
   - Replace `console.warn` with user-facing feedback
   - Files: `src/components/fridge-canvas/FridgeCanvas.tsx`

5. **Mobile Navigation** (High)
   - Add mobile navigation drawer or hamburger menu
   - Show back button on mobile
   - Files: `src/components/PersonalSpacePage.tsx`, `src/components/SpaceViewPage.tsx`

### Medium Priority (Address When Convenient)

6. **Offline Queue for Widget Actions** (Medium)
   - Wrap widget create/update with `executeOrQueue`
   - Register handlers in `offlineActions.ts`
   - Files: `src/components/fridge-canvas/FridgeCanvas.tsx`, `src/lib/offlineActions.ts`

7. **Permission Badge Mobile Visibility** (Medium)
   - Ensure badge is visible on small screens
   - Consider moving to header or making sticky
   - Files: `src/components/fridge-canvas/FridgeCanvas.tsx`

8. **Canvas Reset/Home Button** (Medium)
   - Add button to reset pan/zoom to default
   - Helpful for mobile users who get lost
   - Files: `src/components/fridge-canvas/InfiniteCanvas.tsx`

### Low Priority (Nice to Have)

9. **Icon Mode Enlarge Button** (Low)
   - Make visible on mobile (not hover-only)
   - Files: `src/components/fridge-canvas/CanvasWidget.tsx`

10. **Visual Distinction Personal vs Shared** (Low)
   - Add subtle visual indicator in canvas
   - Files: `src/components/fridge-canvas/FridgeCanvas.tsx`

---

## Final Verdict

**Do Nothing / Minor Fixes / Needs Attention:** **Minor Mobile Adjustments Recommended**

Spaces are functional but retain desktop-first interaction patterns. Critical issues:
- Widget controls invisible on mobile (hover-only)
- Drag/resize are mouse-only
- Permission errors are silent
- Navigation hidden on mobile

**Recommendation:** Apply targeted mobile fixes:
1. Make widget controls accessible on touch
2. Add touch handlers for drag/resize
3. Show permission errors to users
4. Add mobile navigation

No architectural changes needed. No redesign needed. System is sound, just needs mobile interaction support.

---

## Risk Assessment

**Daily Use Risk:** Medium (mobile users cannot edit widgets)  
**Trust Risk:** Low (permissions enforced, but errors silent)  
**Data Loss Risk:** Very Low  
**Performance Risk:** Low  
**Maintenance Risk:** Low

**Overall:** Spaces work on mobile for viewing, but editing requires desktop. Mobile mode provides alternative but feels separate.



