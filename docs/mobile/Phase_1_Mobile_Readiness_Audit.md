# Phase 1 — Mobile Readiness Audit (Shared Minds)

**Date:** 2025-01-05  
**Auditor:** Senior Mobile-First Product Engineer  
**Scope:** Complete codebase audit for mobile device readiness (phones first, tablets second)  
**Framework:** Vite + React + TypeScript + Tailwind CSS

---

## 1. Executive Summary

### High-Level Assessment: **PARTIALLY MOBILE-READY**

The Shared Minds app has **some mobile considerations** (mobile menu drawers, responsive breakpoints) but is fundamentally **desktop-first** in its architecture. While certain components hide on mobile (`hidden md:flex`, `lg:hidden`), the underlying layout assumptions, navigation patterns, and interaction models are optimized for desktop use.

### Biggest Risk Areas if Deployed to Mobile Today:

1. **Fixed sidebars and multi-panel layouts** will break on small screens (PlannerShell, GuardrailsLayout)
2. **Hover-dependent interactions** (tooltips, hover states) are inaccessible on touch devices
3. **Modal/dialog sizing** uses fixed `max-w-*` classes that may overflow on mobile
4. **Touch target sizes** are inconsistent—many buttons/icons are too small for reliable thumb taps
5. **Viewport height assumptions** (`h-screen`, `100vh`) ignore mobile browser chrome (address bar, toolbars)
6. **Horizontal scrolling** exists in several components (PlannerMonthly, PlannerWeekly) without proper mobile handling
7. **Form input ergonomics** lack keyboard-aware scrolling and focus management

### One-Sentence Summary:

**The app must undergo a systematic mobile-first refactor of layouts, navigation, touch targets, and form interactions before it can be used reliably on phones.**

---

## 2. Layout & Responsiveness Audit

### 2.1 Breakpoints

**Current State:**
- Tailwind default breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- Custom breakpoints: `3xl: 1920px`, `4xl: 2560px`, `5xl: 3200px` (desktop-only)
- Most responsive logic uses `md:` or `lg:` as the mobile/desktop boundary

**Issues:**
- **Severity: Medium**
- `md: 768px` is tablet territory, not phone. Many "mobile" styles only activate below 768px, leaving phones (320px–767px) with desktop layouts.
- Example: `Layout.tsx` line 244: `hidden md:flex` means navigation is hidden until 768px, but phones are 320–767px.

**Affected Components:**
- `src/components/Layout.tsx` (lines 244, 383-644)
- `src/components/planner/PlannerShell.tsx` (lines 148, 186, 302, 340, 624-676)
- `src/components/guardrails/GuardrailsLayout.tsx` (lines 116, 130)

### 2.2 Fixed-Width Assumptions

**Critical Issues:**

1. **PlannerShell Sidebars:**
   - **File:** `src/components/planner/PlannerShell.tsx`
   - **Lines:** 148, 302
   - **Problem:** Fixed-width sidebars (`w-16`, `w-12`) on desktop. On mobile (`< lg`), these are hidden, but the main content area still assumes they exist in layout calculations.
   - **Severity: Critical**
   - **Mobile Impact:** Content may be squeezed or overflow on phones.

2. **Modal Max-Widths:**
   - **Files:** Multiple modal components
   - **Examples:**
     - `CreateProjectModal.tsx`: `max-w-2xl` (672px) — too wide for phones
     - `ConfirmDialog.tsx`: No max-width constraint, but centered modals may overflow
     - `ShareToSpaceModal.tsx`: `max-w-md` (448px) — acceptable, but padding may cause overflow
   - **Severity: High**
   - **Mobile Impact:** Modals extend beyond viewport, close buttons unreachable, content cut off.

3. **Main Content Containers:**
   - **File:** `src/components/Layout.tsx` line 676
   - **Problem:** `max-w-6xl mx-auto` (1152px max width) — fine for desktop, but combined with `px-4 sm:px-6 lg:px-8`, may leave insufficient space on phones.
   - **Severity: Medium**

### 2.3 Overflow Issues

**Horizontal Scrolling:**

1. **PlannerMonthly:**
   - **File:** `src/components/planner/PlannerMonthly.tsx` line 497
   - **Problem:** `overflow-x-auto` on calendar grid without mobile-specific constraints
   - **Severity: Medium**
   - **Mobile Impact:** Horizontal scroll appears, but may conflict with native swipe gestures.

2. **PlannerWeekly:**
   - **File:** `src/components/planner/PlannerWeekly.tsx` line 700
   - **Problem:** `overflow-x-auto` on weekly view
   - **Severity: Medium**

3. **Favourites Bar (PlannerShell):**
   - **File:** `src/components/planner/PlannerShell.tsx` line 225
   - **Problem:** `overflow-x-auto flex-1 min-w-0 scrollbar-hide` — horizontal scroll on mobile
   - **Severity: Low** (intentional, but needs touch-friendly scroll indicators)

**Vertical Overflow:**
- Multiple components use `overflow-y-auto` with `max-h-[90vh]` or `max-h-[80vh]`
- **Problem:** `vh` units don't account for mobile browser chrome (address bar, toolbars)
- **Severity: High**
- **Mobile Impact:** Content cut off at bottom, scrollbars appear unexpectedly

### 2.4 Height Assumptions (vh Misuse)

**Critical Issues:**

1. **Full-Screen Layouts:**
   - **File:** `src/components/guardrails/GuardrailsLayout.tsx` line 112
   - **Problem:** `h-screen` — assumes 100vh, but mobile browsers show/hide address bar dynamically
   - **Severity: Critical**
   - **Mobile Impact:** Layout breaks when address bar appears/disappears, content jumps

2. **Sticky Sidebars:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 149
   - **Problem:** `sticky top-0 h-screen` — same issue
   - **Severity: Critical**

3. **Modal Heights:**
   - Multiple modals use `max-h-[90vh]` or `max-h-[80vh]`
   - **Severity: High**
   - **Files:**
     - `CreateProjectModal.tsx` line 177
     - `GoalDetailModal.tsx` line 137
     - `AdminAIProvidersPage.tsx` line 1559

**Recommendation:** Use `dvh` (dynamic viewport height) or `calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))` for mobile.

### 2.5 Components Assuming Desktop Screen Width

**Critical Components:**

1. **PlannerShell:**
   - **File:** `src/components/planner/PlannerShell.tsx`
   - **Assumptions:**
     - Left sidebar (16px) + Main content + Right sidebar (16px) + Sidecar (320px) = ~1352px minimum
     - Sidecar only shows on `lg+` (1024px), but layout still assumes space exists
   - **Severity: Critical**
   - **Mobile Impact:** On phones, sidebars hidden but main content doesn't expand to fill space properly

2. **GuardrailsLayout:**
   - **File:** `src/components/guardrails/GuardrailsLayout.tsx`
   - **Assumptions:** Sidebar (64px collapsed, 256px expanded) + main content
   - **Severity: High**
   - **Mobile Impact:** Sidebar becomes drawer (good), but main content may have leftover constraints

3. **InfiniteCanvas:**
   - **File:** `src/components/fridge-canvas/InfiniteCanvas.tsx` line 270
   - **Problem:** Fixed canvas size `4000px x 4000px` — may cause performance issues on mobile
   - **Severity: Medium**

---

## 3. Navigation & Information Architecture (Mobile)

### 3.1 Current Navigation Model

**Desktop Pattern:**
- Top navigation bar with horizontal tabs (`Layout.tsx`)
- Left/right sidebars for Planner (`PlannerShell.tsx`)
- Left sidebar for Guardrails (`GuardrailsLayout.tsx`)
- Dropdown menus ("More", "Spaces", "Settings")

**Mobile Pattern (Current):**
- Hamburger menu (`Layout.tsx` line 221-225) — **Good**
- Mobile drawer (`Layout.tsx` line 384-644) — **Good**
- Bottom navigation in PlannerShell (`PlannerShell.tsx` line 624-676) — **Good**
- Mobile menu buttons in GuardrailsLayout (`GuardrailsLayout.tsx` line 114-119) — **Good**

**Issues:**

1. **Navigation Depth:**
   - **Problem:** Multiple levels of navigation (top nav → sidebar → sub-pages) require many taps to reach content
   - **Severity: Medium**
   - **Example:** To reach `/planner/work/daily` on mobile:
     - Tap hamburger → Tap "Planner" → Tap "Time" (bottom nav) → Tap "Daily"
     - 4 taps vs. 1 click on desktop

2. **Favourites Bar:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 224-243
   - **Problem:** Horizontal scrollable favourites bar at top — works but not thumb-friendly
   - **Severity: Low**

3. **Bottom Navigation (PlannerShell):**
   - **File:** `src/components/planner/PlannerShell.tsx` line 624-676
   - **Problem:** Two separate bottom bars:
     - Favourites tabs (scrollable horizontal)
     - Menu toggle buttons ("Time", "Areas")
   - **Severity: Medium**
   - **Mobile Impact:** Takes up significant vertical space, may overlap content

### 3.2 Sidebars, Tabs, Panels

**Desktop Sidebars → Mobile Drawers:**

1. **Layout.tsx Mobile Drawer:**
   - **Lines:** 384-644
   - **Status:** ✅ Implemented
   - **Issues:**
     - Fixed width `w-80` (320px) — may be too wide for small phones
     - No swipe-to-close gesture
     - Backdrop closes drawer (good)

2. **PlannerShell Mobile Drawers:**
   - **Lines:** 679-757
   - **Status:** ✅ Implemented (left and right drawers)
   - **Issues:**
     - Fixed width `w-72` (288px)
     - No swipe-to-close
     - Overlaps bottom navigation

3. **GuardrailsLayout Mobile Menu:**
   - **Lines:** 114-130
   - **Status:** ✅ Implemented
   - **Issues:**
     - Sidebar becomes fixed drawer — good
     - But main content area may not expand properly

**Tabs:**
- Vertical tabs in PlannerShell sidebars (`writingMode: 'vertical-rl'`) — **Desktop-only, hidden on mobile** ✅
- Horizontal tabs in favourites bar — **Works on mobile but needs touch optimization**

**Panels:**
- Sidecar panel in PlannerShell (lines 367-620) — **Hidden on mobile (`hidden lg:block`)** ✅
- But main content doesn't know sidecar is hidden, may have leftover constraints

### 3.3 One-Hand Reachability

**Analysis:**
- **Top-left actions:** Hamburger menu, settings — **Reachable with thumb** ✅
- **Top-right actions:** Settings dropdown — **Reachable but awkward** ⚠️
- **Bottom actions:** FAB (Floating Action Button) in PlannerShell (line 760) — **Good** ✅
- **Bottom navigation:** PlannerShell bottom nav — **Good** ✅

**Issues:**
- **FAB position:** `bottom-20 sm:bottom-24 lg:bottom-8` — may conflict with bottom nav on mobile
- **Close buttons in modals:** Top-right — **Hard to reach one-handed** ⚠️
- **Action buttons in forms:** Usually bottom-right — **Hard to reach one-handed** ⚠️

### 3.4 Important Actions Buried or Overloaded

**Buried Actions:**
1. **Settings:** Hidden in dropdown menu (top-right) — **3 taps to reach** ⚠️
2. **Theme switching:** Inside Settings dropdown → **4+ taps** ⚠️
3. **Logout:** Inside Settings dropdown → **4+ taps** ⚠️

**Overloaded Navigation:**
- PlannerShell has **two separate navigation systems:**
  - Favourites bar (top, horizontal scroll)
  - Bottom nav (Time/Areas menus)
- **Mobile Impact:** Confusing, takes up too much space

---

## 4. Interaction & Touch Ergonomics

### 4.1 Touch Target Sizes

**Minimum Requirements:**
- iOS: 44x44px
- Android: 48x48px

**Audit Results:**

**✅ Acceptable:**
- Hamburger menu button (`Layout.tsx` line 221): `p-2` + `Menu size={24}` = ~40px — **Borderline, but acceptable**
- Mobile drawer buttons (`Layout.tsx` line 406-640): `px-4 py-3` = **Good** ✅
- FAB (`PlannerShell.tsx` line 763): `w-14 h-14 sm:w-16 sm:h-16` = **Good** ✅

**❌ Too Small:**
1. **Icon-only buttons:**
   - Settings icon (`Layout.tsx` line 301): `p-2` + `Settings size={20}` = ~36px — **Too small**
   - Close buttons in modals: `p-1` or `p-2` + `X size={20}` = ~28-36px — **Too small**
   - Sidebar collapse buttons: `p-2` = ~36px — **Too small**

2. **Favourites bar tabs:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 227-241
   - **Size:** `px-3 py-1` or `px-4 py-1.5` = **Height ~24-28px — Too small**

3. **Widget controls:**
   - **File:** `src/components/fridge-canvas/CanvasWidget.tsx` line 314-353
   - **Size:** Icons `size={14}` in `p-2` buttons = ~28px — **Too small**

4. **Quick action buttons:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 247-260
   - **Size:** `p-2` + icons `w-4 h-4 sm:w-5 sm:h-5` = ~28-36px — **Too small**

**Severity: High** — Many interactive elements are below 44px minimum.

### 4.2 Button Spacing

**Current State:**
- Most buttons have adequate spacing (`gap-2`, `gap-3`, `gap-4`)
- **Exception:** Favourites bar tabs (`gap-1 sm:gap-2`) — **Too tight** ⚠️

**Severity: Low** — Generally acceptable, but favourites bar needs more spacing.

### 4.3 Icon-Only Interactions

**Issues:**

1. **Hover tooltips on collapsed sidebars:**
   - **File:** `src/components/guardrails/GuardrailsLayout.tsx` lines 170, 198, 250, etc.
   - **Problem:** Tooltips use `group-hover:opacity-100` — **Inaccessible on touch devices**
   - **Severity: Critical**
   - **Mobile Impact:** Users can't see what collapsed icons do

2. **Icon buttons without labels:**
   - Settings, close buttons, collapse buttons — **No accessible labels on mobile**
   - **Severity: High**

3. **Favourites bar tabs:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 227-241
   - **Problem:** Text labels but very small — **Hard to read on mobile**

### 4.4 Accidental Tap Risks

**High-Risk Areas:**

1. **Dense button groups:**
   - Favourites bar with many tabs — **Risk of accidental taps**
   - **Severity: Medium**

2. **Overlapping elements:**
   - FAB (`PlannerShell.tsx` line 760) may overlap bottom nav
   - **Severity: Low**

3. **Close buttons near content:**
   - Modal close buttons (top-right) near scrollable content — **Risk of accidental close**
   - **Severity: Low**

### 4.5 Drag, Swipe, or Hover Assumptions

**Drag Interactions:**
- **File:** `src/components/fridge-canvas/InfiniteCanvas.tsx`
- **Problem:** Canvas pan/zoom uses mouse events — **Needs touch event handlers** ✅ (Has `onTouchStart` line 260, but needs verification)
- **Severity: Medium**

**Hover Assumptions:**

1. **Tooltips:**
   - **Files:** Multiple (GuardrailsLayout, collapsed sidebars)
   - **Problem:** `hover:` states only — **Don't work on touch**
   - **Severity: Critical**

2. **Button hover states:**
   - Most buttons use `hover:bg-*` — **Fine, but no active/pressed state for touch**
   - **Severity: Low**

**Swipe Gestures:**
- **Not implemented** — Drawers don't support swipe-to-close
- **Severity: Medium**

---

## 5. Forms, Inputs & Keyboard Behaviour

### 5.1 Input Sizing

**Current State:**
- Most inputs use `px-4 py-3` or `px-3 py-2` — **Adequate**
- **File examples:**
  - `Signup.tsx` line 92: `px-4 py-3` ✅
  - `Login.tsx` line 97: `px-4 py-3` ✅
  - `GoalTrackerCore.tsx` line 316: `px-3 py-2` — **Borderline small**

**Issues:**
- **Textarea rows:** Some use `rows={2}` or `rows={3}` — **May be too small on mobile**
- **Severity: Low**

### 5.2 Label Visibility

**Current State:**
- Most forms have visible labels (`<label>` elements) — **Good** ✅
- **Examples:**
  - `Signup.tsx` lines 84-96: Proper labels ✅
  - `Login.tsx` lines 89-118: Proper labels ✅

**Issues:**
- **Placeholder-only inputs:** Some inputs rely on placeholders without labels — **Need audit**
- **Severity: Low**

### 5.3 Keyboard Covering Fields

**Critical Issue:**
- **No `scrollIntoView` on input focus** — **Fields will be covered by keyboard**
- **Severity: Critical**
- **Mobile Impact:** User can't see what they're typing

**Example Problem Areas:**
- Long forms (Signup, CreateProjectModal, RecipeFormModal)
- Modals with forms (many components)

**Recommendation:** Add focus handlers that scroll inputs into view with `behavior: 'smooth', block: 'center'`.

### 5.4 Focus Management

**Current State:**
- Inputs have `focus:ring-2 focus:ring-blue-500` — **Visual feedback exists** ✅
- **But:** No programmatic focus management in modals/forms

**Issues:**
1. **Modal focus trap:** Modals don't trap focus — **Keyboard users can tab outside**
2. **Auto-focus:** Forms don't auto-focus first input — **Extra tap required**
3. **Focus after submit:** No focus management after form submission

**Severity: Medium**

### 5.5 Validation Feedback Clarity

**Current State:**
- Error messages shown below inputs or in alert boxes — **Generally clear**
- **Examples:**
  - `Login.tsx` lines 120-125: Error banner ✅
  - `Signup.tsx`: Error handling present ✅

**Issues:**
- **Inline validation:** Some forms may not show errors until submit — **Needs audit**
- **Severity: Low**

### 5.6 Daily Use Pain Points

**Forms Used Frequently:**
1. **Meal tracking** (if exists) — **Needs quick input, large touch targets**
2. **Habit logging** — **Needs one-tap actions**
3. **Goal updates** — **Needs simple forms**

**Current State:**
- Forms are standard web forms — **Not optimized for quick mobile entry**
- **Severity: Medium**

---

## 6. Scrolling & Gesture Conflicts

### 6.1 Nested Scroll Containers

**Critical Issues:**

1. **PlannerShell:**
   - **File:** `src/components/planner/PlannerShell.tsx`
   - **Structure:**
     - Outer: `min-h-screen` container
     - Middle: Sticky header (line 215)
     - Inner: Content area with `overflow-y-auto` (implicit)
     - **Problem:** Multiple scroll contexts — **Confusing on mobile**
   - **Severity: High**

2. **Modals with scrollable content:**
   - **Files:** Multiple (`CreateProjectModal.tsx`, `GoalDetailModal.tsx`)
   - **Structure:** Modal container → Scrollable content area
   - **Problem:** Nested scroll may conflict with page scroll
   - **Severity: Medium**

3. **Sidebar scroll:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 149
   - **Problem:** `overflow-y-auto` on sticky sidebar — **May conflict with main scroll on mobile**

### 6.2 Fixed Headers/Footers

**Issues:**

1. **Sticky header in PlannerShell:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 215
   - **Problem:** `sticky top-0` — **May overlap content on mobile, especially with safe areas**
   - **Severity: Medium**

2. **Bottom navigation:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 624
   - **Problem:** `fixed bottom-0` — **May overlap content, needs safe area padding**
   - **Severity: High**

3. **FAB:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 760
   - **Problem:** `fixed bottom-20` — **May conflict with bottom nav**

### 6.3 Scroll Locking Issues

**Current State:**
- No explicit scroll locking detected
- **But:** Modals with backdrops may need body scroll lock

**Severity: Low** — Needs testing, but likely not a blocker.

### 6.4 Momentum Scrolling on iOS

**Current State:**
- No `-webkit-overflow-scrolling: touch` detected in CSS
- **Severity: Medium**
- **Mobile Impact:** Scrolling may feel janky on iOS

**Recommendation:** Add `scrollbar-hide` utility (exists) and ensure `-webkit-overflow-scrolling: touch` on scrollable containers.

### 6.5 Pull-to-Refresh Conflicts

**Current State:**
- No explicit pull-to-refresh handling
- **Severity: Low**
- **Mobile Impact:** Native pull-to-refresh may interfere with app scroll

**Recommendation:** Add `overscroll-behavior-y: contain` to prevent pull-to-refresh.

---

## 7. Visual Density & Cognitive Load (Mobile)

### 7.1 Information Density per Screen

**High-Density Screens:**

1. **PlannerShell header:**
   - **File:** `src/components/planner/PlannerShell.tsx` line 215-263
   - **Content:** Favourites tabs + action buttons + title
   - **Mobile Impact:** Cramped on small screens
   - **Severity: Medium**

2. **GuardrailsDashboard:**
   - **File:** `src/components/guardrails/dashboard/GuardrailsDashboard.tsx`
   - **Content:** Projects, analytics, activity feed — **Lots of information**
   - **Mobile Impact:** Overwhelming on phones
   - **Severity: High**

3. **PlannerMonthly:**
   - **File:** `src/components/planner/PlannerMonthly.tsx`
   - **Content:** Full month calendar grid — **Dense**
   - **Mobile Impact:** Hard to read, small touch targets
   - **Severity: High**

### 7.2 Visual Hierarchy on Small Displays

**Issues:**

1. **Typography scaling:**
   - Base font sizes appear adequate (16px+)
   - **But:** Headings may be too large on mobile (e.g., `text-3xl` = 30px)
   - **Severity: Low**

2. **Color contrast:**
   - Generally good (white text on colored backgrounds)
   - **But:** Some low-contrast text (gray-500, gray-600) may be hard to read on mobile
   - **Severity: Low**

3. **Spacing:**
   - Padding/margins use responsive classes (`px-4 sm:px-6 lg:px-8`)
   - **Generally adequate**, but some components may feel cramped

### 7.3 Cramped or Overwhelming Screens

**Cramped Screens:**
1. **PlannerShell favourites bar** — Too many tabs, small text
2. **Bottom navigation** — Two rows of buttons take up space
3. **Modal forms** — Long forms in small modals

**Overwhelming Screens:**
1. **GuardrailsDashboard** — Too much information at once
2. **PlannerMonthly** — Full calendar is overwhelming on phone
3. **Settings pages** — Long lists of options

### 7.4 Progressive Disclosure Needs

**Screens Needing Simplification:**

1. **GuardrailsDashboard:**
   - **Recommendation:** Collapse sections by default, show summaries
   - **Priority: High**

2. **PlannerMonthly:**
   - **Recommendation:** Show week view by default, allow month expansion
   - **Priority: High**

3. **Settings:**
   - **Recommendation:** Group related settings, use accordions
   - **Priority: Medium**

---

## 8. Performance Red Flags (Mobile)

### 8.1 Heavy Components

**Identified:**

1. **InfiniteCanvas:**
   - **File:** `src/components/fridge-canvas/InfiniteCanvas.tsx`
   - **Problem:** 4000x4000px canvas — **Heavy to render on mobile**
   - **Severity: High**

2. **PlannerMonthly:**
   - **File:** `src/components/planner/PlannerMonthly.tsx`
   - **Problem:** Renders full month grid — **Many DOM nodes**
   - **Severity: Medium**

3. **GuardrailsDashboard:**
   - **File:** `src/components/guardrails/dashboard/GuardrailsDashboard.tsx`
   - **Problem:** Multiple data fetches, complex layouts
   - **Severity: Medium**

### 8.2 Large Lists Without Virtualization

**Identified:**

1. **Conversation lists** (if long)
2. **Project lists** in GuardrailsDashboard
3. **Activity feeds**
4. **Goal/habit trackers**

**Current State:** No virtualization detected (no `react-window`, `react-virtual`, etc.)

**Severity: Medium** — May cause performance issues with 50+ items.

### 8.3 Expensive Re-renders

**Potential Issues:**
- Complex state management (multiple contexts)
- No obvious memoization detected
- **Severity: Low** — Needs profiling to confirm

### 8.4 Bundle Size Risks

**Current State:**
- Vite build with code splitting (`manualChunks` in `vite.config.ts`)
- **But:** Large dependencies (React, Supabase, DnD Kit, etc.)

**Severity: Low** — Build optimization exists, but needs mobile-specific testing.

---

## 9. Accessibility & Mobile Usability

### 9.1 Font Sizes

**Current State:**
- Base font: Default (16px) — **Adequate** ✅
- Inputs: `text-base` (16px) — **Prevents iOS zoom** ✅
- Headings: `text-xl`, `text-2xl`, `text-3xl` — **May be too large on mobile**

**Issues:**
- **Small text:** Some components use `text-xs` (12px) or `text-[10px]` — **Too small**
  - Example: `PlannerShell.tsx` line 173: `text-[10px]` — **Too small**
- **Severity: Medium**

### 9.2 Contrast

**Current State:**
- Generally good contrast (white on colored backgrounds)
- **But:** Some gray text (gray-500, gray-600) may fail WCAG AA on certain backgrounds
- **Severity: Low** — Needs audit with contrast checker

### 9.3 Tap Accessibility

**Issues:**
1. **Small touch targets** (see Section 4.1) — **Many below 44px**
2. **Icon-only buttons** without labels — **Screen reader issues**
3. **Hover tooltips** — **Inaccessible on touch**

**Severity: High**

### 9.4 Screen Reader Risks

**Issues:**
1. **Icon-only buttons:** No `aria-label` on many icons
2. **Collapsed sidebar tooltips:** Rely on hover — **Not accessible**
3. **Form labels:** Generally present, but some may be missing `htmlFor`

**Severity: Medium**

### 9.5 Daily Real-World Usage Blockers

**Blockers:**
1. **Touch targets too small** — **Frustrating to use**
2. **Keyboard covers inputs** — **Can't see what you're typing**
3. **Hover tooltips inaccessible** — **Can't discover features**
4. **Complex navigation** — **Too many taps to reach content**

**Severity: Critical** — These will prevent daily use.

---

## 10. Mobile Readiness Verdict

### 10.1 Clear Verdict

**NOT MOBILE-READY**

The app has **foundational mobile infrastructure** (responsive breakpoints, mobile menus) but is **fundamentally desktop-first**. Critical mobile UX patterns are missing or broken:

- ❌ Touch targets too small
- ❌ Keyboard covers inputs
- ❌ Hover-dependent interactions
- ❌ Fixed layouts break on small screens
- ❌ Viewport height assumptions fail on mobile browsers
- ❌ Navigation too complex for quick mobile use

**Estimated effort to make mobile-ready:** 3-4 weeks of focused mobile-first refactoring.

### 10.2 Prioritized List of Top 5 Blockers

**1. Touch Target Sizes (CRITICAL)**
- **Impact:** Users can't reliably tap buttons/icons
- **Files:** Multiple (see Section 4.1)
- **Fix:** Increase all interactive elements to ≥44px (iOS) / ≥48px (Android)
- **Effort:** 2-3 days

**2. Keyboard Covering Inputs (CRITICAL)**
- **Impact:** Users can't see what they're typing
- **Files:** All forms, modals
- **Fix:** Add `scrollIntoView` on input focus, use `dvh` for modals
- **Effort:** 1-2 days

**3. Hover-Dependent Tooltips (CRITICAL)**
- **Impact:** Users can't discover what collapsed icons do
- **Files:** `GuardrailsLayout.tsx`, collapsed sidebars
- **Fix:** Replace hover tooltips with tap-to-reveal or always-visible labels
- **Effort:** 1 day

**4. Viewport Height Assumptions (HIGH)**
- **Impact:** Layout breaks when mobile browser chrome appears/disappears
- **Files:** `GuardrailsLayout.tsx`, `PlannerShell.tsx`, modals
- **Fix:** Replace `h-screen` / `100vh` with `dvh` or safe area calculations
- **Effort:** 1-2 days

**5. Fixed-Width Modals (HIGH)**
- **Impact:** Modals overflow viewport, close buttons unreachable
- **Files:** Multiple modal components
- **Fix:** Use `max-w-full` with proper padding, ensure modals fit viewport
- **Effort:** 1 day

### 10.3 What Phase 2 MUST Address

**Phase 2 Requirements (Before PWA Work):**

1. **Touch Target Audit & Fix:**
   - Audit all interactive elements
   - Ensure ≥44px minimum
   - Add proper spacing

2. **Form Input Ergonomics:**
   - Add `scrollIntoView` on focus
   - Use `dvh` for modal heights
   - Add `inputmode` attributes

3. **Hover → Touch Conversion:**
   - Replace all hover tooltips with tap-to-reveal or labels
   - Add `active:` states for touch feedback
   - Remove hover-only interactions

4. **Viewport Height Fixes:**
   - Replace `h-screen` with `dvh` or safe area calculations
   - Fix modal heights
   - Test with mobile browser chrome

5. **Modal/Dialog Mobile Optimization:**
   - Ensure modals fit viewport
   - Add swipe-to-close (optional)
   - Move close buttons to accessible positions

6. **Navigation Simplification:**
   - Reduce navigation depth
   - Consolidate bottom navigation
   - Add breadcrumbs or back buttons

7. **Safe Area Support:**
   - Add `viewport-fit=cover` to meta tag
   - Use `env(safe-area-inset-*)` for padding
   - Test on notched devices

**Estimated Phase 2 Effort:** 2-3 weeks

**After Phase 2:** App will be **mobile-usable** but may still need PWA-specific optimizations (service worker, install prompts, etc.).

---

## Appendix: Quick Reference

### Files Requiring Immediate Attention

**Critical:**
- `src/components/Layout.tsx`
- `src/components/planner/PlannerShell.tsx`
- `src/components/guardrails/GuardrailsLayout.tsx`
- All modal components

**High Priority:**
- `src/components/fridge-canvas/InfiniteCanvas.tsx`
- `src/components/planner/PlannerMonthly.tsx`
- `src/components/planner/PlannerWeekly.tsx`
- All form components

### Common Patterns to Fix

1. **Replace `h-screen` → `dvh` or safe area calculations**
2. **Replace `hover:` tooltips → tap-to-reveal or labels**
3. **Increase touch targets to ≥44px**
4. **Add `scrollIntoView` to input focus handlers**
5. **Replace fixed `max-w-*` in modals → `max-w-full` with padding**

---

**Document Status:** Complete  
**Next Steps:** Phase 2 — Mobile-First Refactoring

