# Guardrails Mobile-First UX Audit & Redesign Recommendations

**Date:** December 2025  
**Scope:** Roadmaps, Task Flow, Side Projects, Offshoot Ideas  
**Focus:** Mobile-first UX, clarity, professional information design  
**Out of Scope:** Mind Maps, backend changes, feature expansion

---

## Executive Summary

### Current State Assessment

The Guardrails system is functionally complete and architecturally sound, but feels **desktop-first** on mobile. Current implementations prioritize feature parity over mobile-native experience, resulting in:

1. **Cognitive Overload** - Dense information hierarchies compressed into small screens
2. **Interaction Friction** - Desktop patterns (Gantt charts, horizontal Kanban) force excessive scrolling and zooming
3. **Fragmented Navigation** - Multiple disconnected views without clear mobile flow
4. **Purpose Ambiguity** - Unclear distinction between planning (desktop) and execution (mobile) contexts

### Core Problems on Mobile

**Roadmaps (Gantt View):**
- Horizontal timeline requires excessive panning on mobile
- Track hierarchy nested sidebar (300px) consumes too much screen space
- Zoom controls and date navigation feel cramped
- Timeline bars are hard to tap accurately

**Task Flow (Kanban):**
- Four-column horizontal layout doesn't fit mobile viewport
- Drag-and-drop between columns is awkward on touch
- Task cards show too much information at once
- No clear "what's next" focus

**Side Projects & Offshoot Ideas:**
- Grid layouts (3-column) compress cards into unreadable tiles
- Capture flow requires navigation depth (not thumb-friendly)
- Promotion paths (Idea → Side Project → Roadmap) unclear
- Risk of becoming dumping grounds without review structure

### Primary Opportunities

1. **Mobile = Execution, Desktop = Planning** - Separate mental models for each platform
2. **Vertical-First Information Design** - Stack instead of spread
3. **Progressive Disclosure** - Show essentials, reveal details on demand
4. **Status-Driven Navigation** - Filter by urgency, progress, blockers first
5. **Thumb-Zone Actions** - Critical actions always reachable

---

## Section-by-Section Audit

### 1. Roadmaps (Gantt Timeline)

#### Current Implementation Issues

**Desktop-First Patterns:**
- Horizontal infinite scroll timeline (`InfiniteRoadmapView.tsx`)
- Sidebar with collapsible track tree (300px fixed width)
- Timeline bars with drag-to-resize dates
- Zoom levels (day/week/month/quarter) with zoom controls
- Today indicator requires horizontal scrolling to find

**Mobile Problems:**
1. **Viewport Mismatch** - Gantt charts require horizontal space; mobile is vertical
2. **Sidebar Intrusion** - Track sidebar takes 30-40% of mobile width when open
3. **Tap Precision** - Timeline bars are thin (<20px), hard to tap accurately
4. **Date Context Loss** - Scrolling horizontally loses track of "today"
5. **Track Hierarchy Overhead** - Nested tracks add cognitive burden on small screens

#### Mobile UX Assessment

**What Works:**
- Track color coding provides visual distinction
- Item status colors are clear (green=completed, blue=in-progress, red=blocked)
- Collapsible tracks help reduce clutter

**What Doesn't Work:**
- Gantt chart paradigm itself is incompatible with mobile viewport
- Horizontal navigation feels unnatural on mobile
- Track sidebar adds complexity without mobile value
- Drag-to-resize dates is impossible on touch

#### Keep / Modify / Replace

**Replace: Gantt Chart View**
- ❌ True Gantt timeline on mobile
- ✅ Vertical timeline (stacked phases/milestones)
- ✅ Date-sorted list with visual timeline indicators
- ✅ Expandable phase sections

**Modify: Track Navigation**
- ❌ Sidebar with nested tree
- ✅ Tab-based track switcher (horizontal scroll)
- ✅ Collapsible track filter (top of screen)
- ✅ "All Tracks" unified view

**Modify: Item Interaction**
- ❌ Click timeline bar to edit
- ✅ Tap item card to open detail sheet
- ✅ Swipe actions (complete, block, archive)
- ✅ Long-press for quick status change

**Keep: Visual Hierarchy**
- ✅ Status color coding
- ✅ Track color accents
- ✅ Today indicator (vertical, not horizontal)

### 2. Task Flow (Kanban Board)

#### Current Implementation Issues

**Desktop-First Patterns:**
- Four-column horizontal layout (`TaskFlowBoard.tsx`)
- Drag-and-drop between columns
- Sortable cards within columns
- Multi-column warnings (e.g., "Multiple in-progress tasks")

**Mobile Problems:**
1. **Column Overflow** - Four columns don't fit mobile width (<768px)
2. **Horizontal Scroll** - Forcing horizontal scrolling feels wrong
3. **Drag Precision** - Touch drag-and-drop between columns is error-prone
4. **Card Density** - Task cards show too much metadata at once
5. **Context Loss** - Scrolling horizontally loses view of other statuses

#### Mobile UX Assessment

**What Works:**
- Status-based organization is clear mental model
- Card-based item representation is familiar
- Drag-and-drop is conceptually simple

**What Doesn't Work:**
- Horizontal Kanban layout fights mobile viewport
- Multiple columns compete for attention
- Drag-and-drop is fragile on touch devices
- Warnings about multiple in-progress tasks feel like desktop constraints

#### Keep / Modify / Replace

**Replace: Kanban Columns**
- ❌ Horizontal four-column board
- ✅ Single-column vertical list with status filters
- ✅ Status tabs at top (Not Started / In Progress / Blocked / Done)
- ✅ Pull-to-refresh on each status view

**Modify: Task Card Design**
- ❌ Dense card with description, dates, tracks, metadata
- ✅ Compact card: Title + Status + Quick Actions
- ✅ Expandable details (tap to expand)
- ✅ Swipe actions: left=complete, right=block

**Modify: Status Changes**
- ❌ Drag-and-drop between columns
- ✅ Tap status indicator to cycle: Not Started → In Progress → Blocked → Done
- ✅ Swipe left to complete (with undo)
- ✅ Swipe right to block
- ✅ Long-press for status menu

**Keep: Status-First Organization**
- ✅ Clear status buckets
- ✅ Status colors (gray/blue/red/green)
- ✅ Filtering by status

**Add: Mobile-Native Patterns**
- ✅ "Focus Mode" - Show only In Progress + Blocked
- ✅ "Next Up" section - Today's tasks sorted by priority
- ✅ Bottom sheet for task details
- ✅ Quick-add from empty state

### 3. Side Projects

#### Current Implementation Issues

**Desktop-First Patterns:**
- Grid layout (3-column on desktop, 1-column on mobile) (`SideProjectsList.tsx`)
- Large card tiles with stats, description, action buttons
- Modal for creation/editing
- Sortable grid with filters

**Mobile Problems:**
1. **Grid Overhead** - 3-column grid becomes 1-column list (no intermediate breakpoint)
2. **Card Complexity** - Each card shows too much information (stats, description, actions)
3. **Promotion Flow** - Converting side project to master project requires navigation depth
4. **Capture Friction** - Creating new side project opens modal (not bottom sheet)
5. **Purpose Ambiguity** - Unclear when to use Side Project vs Offshoot Idea

#### Mobile UX Assessment

**What Works:**
- Card-based representation is clear
- Empty state is helpful
- Color coding provides visual distinction

**What Doesn't Work:**
- Grid layout is unnecessary on mobile
- Cards are too information-dense
- Actions are hard to discover (hidden in menu)
- No clear mobile flow for creating/promoting

#### Keep / Modify / Replace

**Modify: Layout**
- ❌ Grid (3-column → 1-column) with awkward breakpoint
- ✅ List view (always vertical)
- ✅ Card height optimized for mobile scanning
- ✅ Collapsible sections by category (if needed)

**Modify: Card Design**
- ❌ Large card with description, stats, multiple action buttons
- ✅ Compact card: Title + Item Count + Color Indicator
- ✅ Swipe right to reveal actions: Edit / Promote / Archive / Delete
- ✅ Tap card to open detail view (bottom sheet)

**Modify: Capture Flow**
- ❌ Modal dialog
- ✅ Bottom sheet for creation
- ✅ Quick-add with minimal fields (title only, expand for description)
- ✅ Promotion from bottom sheet (not separate flow)

**Add: Mobile-Native Patterns**
- ✅ Floating action button (FAB) for quick creation
- ✅ Empty state with inline creation
- ✅ Swipe-to-archive (with undo)
- ✅ Visual distinction from master projects (smaller, muted colors)

**Clarify: Purpose**
- ✅ Better empty state copy: "Side projects are exploratory ideas that deserve space but not center stage"
- ✅ Visual indicator (e.g., smaller cards, purple accent) to show "not primary"
- ✅ Clear promotion path: Side Project → Master Project (one tap)

### 4. Offshoot Ideas

#### Current Implementation Issues

**Desktop-First Patterns:**
- Grid layout identical to Side Projects (`OffshootIdeasList.tsx`)
- Filter by source type (Mind Mesh / Roadmap / Side Ideas)
- Sort by recent or name
- Convert to Roadmap or Side Project actions
- Drift risk warnings (high/medium/low)

**Mobile Problems:**
1. **Grid Overload** - Same 3-column → 1-column issue as Side Projects
2. **Filter Complexity** - Multiple filter/sort dropdowns add navigation depth
3. **Capture Gap** - No quick capture from within other views
4. **Review Burden** - Large lists become overwhelming without structure
5. **Purpose Confusion** - Unclear difference from Side Projects on mobile

#### Mobile UX Assessment

**What Works:**
- Drift risk warnings are helpful
- Conversion actions are clear
- Source type filtering helps organization

**What Doesn't Work:**
- Grid layout wastes space
- Filters require multiple taps
- No mobile-first capture flow
- Large lists feel like dumping grounds
- Unclear lifecycle (capture → review → promote → archive)

#### Keep / Modify / Replace

**Modify: Layout**
- ❌ Grid with filters/sorts at top
- ✅ List view with sticky status bar (drift risk indicator)
- ✅ Collapsible sections by source type (Mind Mesh / Roadmap / Side Ideas)
- ✅ Pull-to-refresh for latest ideas

**Modify: Capture Flow**
- ❌ Navigate to Offshoot Ideas page → Create
- ✅ Quick capture from any Guardrails view (long-press or swipe gesture)
- ✅ Inline capture in Roadmap/Task Flow (mark as offshoot)
- ✅ Floating quick-add button (always accessible)

**Modify: Card Design**
- ❌ Large card with description, source type, actions
- ✅ Compact card: Title + Source Badge + Age
- ✅ Swipe left to promote to Roadmap
- ✅ Swipe right to convert to Side Project
- ✅ Long-press for menu: Edit / Archive / Convert

**Modify: Review Flow**
- ❌ Large unfiltered list
- ✅ Default: "Recent (Last 7 Days)"
- ✅ Filter chips: Today / This Week / Older / All
- ✅ Group by source type (tabs)
- ✅ Empty states guide next action

**Add: Mobile-Native Patterns**
- ✅ Inline promotion: "Convert to Roadmap Task" button in card
- ✅ Batch actions: Long-press multiple cards for batch promote/archive
- ✅ Drift risk banner: Sticky at top if risk is high
- ✅ Review reminder: "You have 5 new offshoot ideas this week" notification

**Clarify: Purpose & Lifecycle**
- ✅ Better empty state: "Offshoot ideas are spontaneous thoughts captured during work"
- ✅ Visual lifecycle: Idea → Review → Promote → Archive
- ✅ Quick stats: "5 ideas today, 12 this week, 1 requires review"

---

## System-Level Audit

### User Journey: Idea → Side Project → Roadmap → Task Flow

#### Current Flow (Desktop-Optimized)

1. **Capture Idea** → Navigate to Offshoot Ideas → Create → Fill form → Save
2. **Review Idea** → Navigate to Offshoot Ideas → Find idea → Review details
3. **Promote to Side Project** → Click "Convert to Side Project" → Fill form → Save
4. **Promote to Roadmap** → Navigate to Roadmap → Create item → Link to Side Project
5. **Execute in Task Flow** → Navigate to Task Flow → Find task → Update status

**Problems:**
- 5 separate navigation steps
- Context switching between views
- Forms interrupt flow
- No clear "next action" guidance

#### Proposed Mobile Flow (Action-Optimized)

1. **Capture Idea** → Long-press anywhere in Guardrails → Quick capture → Save (1 tap)
2. **Review Idea** → Swipe from edge or tap FAB → See recent ideas → Swipe to promote
3. **Promote to Side Project** → Swipe right on idea → Confirm → Done (1 swipe)
4. **Promote to Roadmap** → Swipe left on idea → Select phase → Done (1 swipe)
5. **Execute in Task Flow** → Tap status → Cycle: Not Started → In Progress → Done (1 tap)

**Improvements:**
- 1-2 actions per step (instead of 5+)
- Gesture-based (swipe/tap instead of click/navigate)
- Context-preserving (bottom sheets instead of navigation)
- Progressive disclosure (show only next action)

### Planning vs Execution Separation

#### Current State: Mixed

- Roadmaps = Planning (Gantt view) + Execution (item status)
- Task Flow = Execution (Kanban) + Planning (card details)
- Side Projects = Planning (exploration) + Execution (item management)
- Offshoot Ideas = Capture (ideas) + Planning (promotion)

**Mobile Confusion:**
- Users don't know if they should plan or execute
- Desktop planning tools feel heavy on mobile
- Execution tools are buried in planning views

#### Proposed Separation

**Mobile = Execution Context:**
- **Roadmaps Mobile** → Read-only timeline → Focus: "What's due?" → Tap to view → Swipe to Task Flow
- **Task Flow Mobile** → Status-first → Focus: "What's next?" → Quick status changes
- **Side Projects Mobile** → Quick access → Focus: "Review & Promote"
- **Offshoot Ideas Mobile** → Quick capture → Focus: "Capture & Review"

**Desktop = Planning Context:**
- **Roadmaps Desktop** → Full Gantt → Focus: Timeline planning, dependencies, phases
- **Task Flow Desktop** → Full Kanban → Focus: Workflow design, column customization
- **Side Projects Desktop** → Full grid → Focus: Exploration, organization
- **Offshoot Ideas Desktop** → Full grid → Focus: Review, analysis, drift monitoring

### Mobile Navigation Structure

#### Current Navigation Issues

- Horizontal sidebar menu (hidden on mobile, opens as overlay)
- Deep hierarchy (Dashboard → Roadmap → Track → Item)
- No clear mobile entry point
- Tab-based navigation within views (not consistent)

#### Proposed Mobile Navigation

**Bottom Tab Bar (Primary Navigation):**
- Home (Dashboard)
- Roadmap (Quick View)
- Tasks (Task Flow)
- Ideas (Side Projects + Offshoot Ideas)

**Top Action Bar (Context-Specific):**
- Current view name
- Filter/Status chips
- Search (optional)
- Quick-add button (FAB or top-right)

**Swipe Gestures:**
- Swipe from left edge → Side menu (full navigation)
- Swipe from right edge → Quick capture (offshoot idea)
- Swipe up on card → Expand details
- Swipe down → Refresh

---

## Mobile Design Recommendations

### Roadmaps Mobile Redesign

#### Vertical Timeline Pattern

**Structure:**
```
[Today Indicator (sticky)]
[Track Filter: All Tracks | Track 1 | Track 2 ...]
[Sort: By Date | By Track | By Status]

[Phase Section: Q1 2025]
  ├─ Milestone: MVP Launch (Mar 1) [Completed]
  │  └─ Task: Final Testing (Feb 20-28) [In Progress]
  └─ Task: Beta Release (Feb 15-25) [Blocked]

[Phase Section: Q2 2025]
  ├─ Task: Feature X (Apr 1-15) [Not Started]
  └─ Task: Feature Y (Apr 16-30) [Not Started]
```

**Interaction:**
- Tap phase header → Expand/collapse
- Tap item card → Bottom sheet with details
- Swipe left on item → Mark complete
- Swipe right on item → Block
- Long-press item → Status menu

**Visual Design:**
- Vertical timeline line (left edge)
- Today indicator (red line, sticky)
- Phase sections (collapsible, gray background)
- Item cards (compact, status color border)
- Track color accent (left border)

#### Replace Gantt Chart

**Why:**
- Gantt charts require horizontal space (desktop)
- Mobile is vertical-first
- Vertical timeline is native to mobile scrolling

**How:**
- Stack items by date (vertical list)
- Show phases as collapsible sections
- Use timeline indicators (dots, lines) instead of bars
- Show date range in card (not visual bar)

#### Track Navigation

**Replace Sidebar:**
- ❌ 300px sidebar with nested tree
- ✅ Horizontal scrollable tabs at top
- ✅ "All Tracks" tab first
- ✅ Active track highlighted (colored border)

**Track Filter:**
- Sticky at top (below header)
- Horizontal scroll (thumb-friendly)
- Track color indicator (small dot)
- Item count badge (optional)

#### Item Detail Sheet

**Bottom Sheet (Mobile):**
- Header: Item title + Status badge
- Content: Description, dates, track, assignments (scrollable)
- Footer: Actions (Edit, Delete, Share)
- Swipe down to dismiss

**Avoid Modal:**
- Modals feel heavy on mobile
- Bottom sheets preserve context
- Swipe-to-dismiss is native

### Task Flow Mobile Redesign

#### Single-Column Status-First Pattern

**Structure:**
```
[Status Tabs: Not Started | In Progress | Blocked | Done]
[Filter: All Tracks | Track 1 | Track 2 ...]

[Status: In Progress]
  ├─ Task Card: Build Login UI
  │  ├─ Track: Frontend
  │  ├─ Due: Today
  │  └─ [Swipe Actions]
  └─ Task Card: Write API Docs
     ├─ Track: Backend
     ├─ Due: Tomorrow
     └─ [Swipe Actions]
```

**Interaction:**
- Tap status tab → Show only that status
- Tap task card → Bottom sheet with details
- Swipe left on task → Mark complete (with undo)
- Swipe right on task → Block
- Tap status badge → Cycle status: Not Started → In Progress → Blocked → Done
- Long-press task → Quick actions menu

**Visual Design:**
- Status tabs (sticky at top, full-width)
- Task cards (compact, status color accent)
- Swipe indicators (subtle arrows)
- Pull-to-refresh (per status view)

#### Replace Kanban Columns

**Why:**
- Four columns don't fit mobile width
- Horizontal scrolling feels wrong
- Single-column is native to mobile

**How:**
- Status tabs (horizontal scroll, thumb-friendly)
- One status shown at a time
- Quick switch between statuses
- Visual status indicators (colored borders)

#### Focus Mode

**Default View:**
- Show only "In Progress" + "Blocked"
- Hide "Not Started" and "Done" by default
- Toggle to show all statuses
- Prioritize actionable items

**Next Up Section:**
- Sticky section at top (if enabled)
- Today's tasks (sorted by due date)
- Tomorrow's tasks (collapsible)
- Overdue tasks (red accent)

### Side Projects Mobile Redesign

#### Vertical List Pattern

**Structure:**
```
[FAB: + New Side Project]

[Side Project Card: Design System]
  ├─ Title: Design System
  ├─ Items: 12 tasks
  ├─ Color: Purple
  └─ [Swipe Actions: Edit | Promote | Archive | Delete]

[Side Project Card: Research Project]
  └─ ...
```

**Interaction:**
- Tap card → Bottom sheet with project details + items
- Swipe right → Reveal actions (Edit, Promote, Archive, Delete)
- Swipe left → Quick archive (with undo)
- Long-press card → Quick actions menu
- Tap FAB → Bottom sheet for creation

**Visual Design:**
- List view (always vertical)
- Compact cards (title + item count + color indicator)
- Swipe-to-reveal actions (iOS-style)
- Color accent (left border or small dot)

#### Simplify Card Design

**Remove:**
- Long descriptions (show in detail view)
- Multiple action buttons (use swipe actions)
- Complex stats (keep only item count)

**Keep:**
- Title (prominent)
- Item count (secondary)
- Color indicator (visual distinction)
- Tap-to-expand (details in bottom sheet)

### Offshoot Ideas Mobile Redesign

#### Quick Capture + Review Pattern

**Structure:**
```
[Drift Risk Banner: HIGH RISK (if applicable)]
[Quick Add Button (sticky bottom)]

[Filter Chips: Today | This Week | Older | All]
[Source Tabs: All | Mind Mesh | Roadmap | Side Ideas]

[Idea Card: "Add dark mode"]
  ├─ Title: Add dark mode
  ├─ Source: Roadmap
  ├─ Age: 2 hours ago
  └─ [Swipe Actions: Promote | Convert | Archive]

[Idea Card: "Refactor auth"]
  └─ ...
```

**Interaction:**
- Tap FAB → Quick capture (minimal fields)
- Swipe left → Promote to Roadmap
- Swipe right → Convert to Side Project
- Long-press → Menu: Edit, Archive, Convert
- Tap card → Bottom sheet with details

**Visual Design:**
- List view (compact cards)
- Source badges (color-coded)
- Age indicator ("2h ago", "3d ago")
- Drift risk banner (sticky, if high)

#### Capture Flow

**From Anywhere:**
- Long-press in Roadmap/Task Flow → Quick capture offshoot idea
- Swipe from right edge → Quick capture panel
- FAB in Offshoot Ideas view → Full capture form

**Minimal Capture:**
- Title only (required)
- Optional description (expandable)
- Auto-tag source (where captured from)
- Save → Returns to previous view

---

## Visual & Structural Patterns

### Vertical Timeline (Roadmaps)

**Pattern Description:**
Stack items vertically by date, with timeline indicators on the left edge.

**Structure:**
```
[Timeline] [Content]
    │        ├─ Phase Header
    │        │  └─ Milestone Card
    │        │     └─ Task Card
    │        └─ Phase Header
    │           └─ Task Card
    │
[TODAY] ────────── (red line)
    │
    └─ Phase Header
       └─ Task Card
```

**Benefits:**
- Native to vertical scrolling
- Clear date progression
- Easy to scan
- Today indicator is always visible

**Implementation:**
- Vertical line (2px, gray, left edge)
- Today indicator (red line, sticky)
- Phase sections (gray background, collapsible)
- Item cards (compact, date + title)

### Step Chain (Task Flow)

**Pattern Description:**
Linear sequence of tasks with status progression.

**Structure:**
```
[Status: In Progress]
    ↓
[Task 1: Start]
    ↓
[Task 2: Middle]
    ↓
[Task 3: End]
```

**Benefits:**
- Clear sequence
- Status-first organization
- Easy to scan
- Natural progression

**Implementation:**
- Single-column list
- Status tabs (top navigation)
- Task cards (compact, swipe actions)
- Dependency indicators (optional, subtle)

### Collapsible Tree (Side Projects)

**Pattern Description:**
Nested items within expandable project cards.

**Structure:**
```
[Project Card: Design System] ▶
  ├─ 12 items
  └─ [Expand to see items]

[Project Card: Research] ▼
  ├─ Task: Literature Review
  ├─ Task: Prototype
  └─ Idea: New Approach
```

**Benefits:**
- Progressive disclosure
- Reduces cognitive load
- Easy to scan
- Tap to expand

**Implementation:**
- Collapsible cards (tap header)
- Item count (shown when collapsed)
- Nested items (indented, when expanded)
- Color accent (project color)

### Status-Driven Layout (Task Flow)

**Pattern Description:**
Organize by status first, then by other dimensions (date, track).

**Structure:**
```
[Status Tabs]
[In Progress]
  ├─ Task (Due: Today)
  ├─ Task (Due: Tomorrow)
  └─ Task (Due: Next Week)

[Blocked]
  └─ Task (Blocked: Waiting on design)
```

**Benefits:**
- Status-first mental model
- Clear "what's next" focus
- Easy to filter
- Action-oriented

**Implementation:**
- Status tabs (top navigation)
- Status sections (grouped by status)
- Date sorting (within status)
- Visual status indicators (colors, icons)

---

## Phased Improvement Plan

### Phase 1: Quick Mobile UX Wins (2-3 weeks)

**Goal:** Fix immediate mobile pain points without structural changes.

**Roadmaps:**
1. ✅ Hide sidebar on mobile (<768px), show track filter tabs instead
2. ✅ Disable drag-to-resize on mobile, show toast: "Resize works best on desktop"
3. ✅ Add vertical scrolling hint if horizontal panning detected
4. ✅ Make timeline bars taller for mobile tap targets (min 44px height)
5. ✅ Add "Jump to Today" button (sticky, top-right)

**Task Flow:**
1. ✅ Stack columns vertically on mobile (Not Started → In Progress → Blocked → Done)
2. ✅ Replace drag-and-drop with tap-to-move: Tap status badge → Select new status
3. ✅ Disable horizontal scroll, show toast: "Kanban works best on desktop"
4. ✅ Simplify task cards on mobile: Title + Status only (tap to expand)
5. ✅ Add "Focus Mode" toggle: Show only In Progress + Blocked

**Side Projects:**
1. ✅ Change grid to list on mobile (<768px)
2. ✅ Simplify card design: Title + Item count only
3. ✅ Add swipe actions: Swipe right → Reveal actions menu
4. ✅ Convert creation modal to bottom sheet on mobile

**Offshoot Ideas:**
1. ✅ Change grid to list on mobile (<768px)
2. ✅ Simplify card design: Title + Source + Age only
3. ✅ Add quick capture FAB (bottom-right, always visible)
4. ✅ Add swipe actions: Swipe left → Promote, Swipe right → Convert

**System:**
1. ✅ Add mobile navigation: Bottom tab bar (Home, Roadmap, Tasks, Ideas)
2. ✅ Convert all modals to bottom sheets on mobile
3. ✅ Add swipe gestures: Swipe from edge → Quick capture
4. ✅ Add pull-to-refresh on all list views

### Phase 2: Structural Redesigns (4-6 weeks)

**Goal:** Implement mobile-native patterns (vertical timeline, status-first, etc.).

**Roadmaps:**
1. ✅ Replace Gantt chart with vertical timeline on mobile
2. ✅ Implement phase sections (collapsible)
3. ✅ Add track filter tabs (horizontal scroll, top)
4. ✅ Add "Jump to Today" functionality
5. ✅ Implement bottom sheet for item details

**Task Flow:**
1. ✅ Replace Kanban columns with status tabs
2. ✅ Implement single-column status-first view
3. ✅ Add swipe actions (left=complete, right=block)
4. ✅ Add "Next Up" section (today's tasks)
5. ✅ Implement focus mode (In Progress + Blocked only)

**Side Projects:**
1. ✅ Redesign card layout (compact, mobile-optimized)
2. ✅ Implement swipe-to-reveal actions
3. ✅ Add quick-add bottom sheet
4. ✅ Add promotion flow (one-tap)

**Offshoot Ideas:**
1. ✅ Implement quick capture from anywhere (long-press gesture)
2. ✅ Add filter chips (Today, This Week, Older)
3. ✅ Add source type tabs (All, Mind Mesh, Roadmap, Side Ideas)
4. ✅ Implement drift risk banner (sticky, if high)

**System:**
1. ✅ Implement bottom tab navigation
2. ✅ Add swipe gestures (capture, navigate)
3. ✅ Add empty states with inline actions
4. ✅ Implement progressive disclosure patterns

### Phase 3: Desktop/Mobile Divergence (2-3 weeks)

**Goal:** Separate mobile (execution) and desktop (planning) experiences.

**Mobile-First Features:**
1. ✅ Roadmaps mobile: Read-only timeline → "What's due?"
2. ✅ Task Flow mobile: Status-first → "What's next?"
3. ✅ Side Projects mobile: Quick access → "Review & Promote"
4. ✅ Offshoot Ideas mobile: Quick capture → "Capture & Review"

**Desktop-First Features:**
1. ✅ Roadmaps desktop: Full Gantt → Timeline planning
2. ✅ Task Flow desktop: Full Kanban → Workflow design
3. ✅ Side Projects desktop: Full grid → Exploration
4. ✅ Offshoot Ideas desktop: Full grid → Analysis

**Shared Features:**
- Data model (same across platforms)
- Permissions (same rules)
- Sync (real-time, if implemented)
- Navigation (platform-appropriate)

---

## Explicit "Do Not Change" List

### What Should NOT Be Redesigned Yet

1. **Mind Maps** - Explicitly out of scope (remains desktop-first)
2. **Data Models** - No backend changes, no schema changes
3. **Permissions System** - Keep existing permission flags and logic
4. **AI Chat Integration** - Keep existing AI assistant features
5. **People & Assignments** - Keep existing people management UI
6. **Focus Mode & Analytics** - Keep existing focus tracking features
7. **Regulation Rules** - Keep existing regulation system UI

### What Should Stay Desktop-Only

1. **Gantt Chart Timeline** - True horizontal Gantt remains desktop-only
2. **Kanban Board** - Full multi-column Kanban remains desktop-only
3. **Track Tree Sidebar** - Nested tree navigation remains desktop-only
4. **Mind Mesh Canvas** - Visual graph canvas remains desktop-only
5. **Complex Drag-and-Drop** - Multi-item selection, drag-to-reorder remains desktop-only
6. **Batch Operations** - Bulk edits, multi-select remain desktop-only

### What Should NOT Be Forced Into Mobile

1. **Full Gantt Functionality** - Don't try to make Gantt work on mobile
2. **Horizontal Kanban** - Don't force horizontal scrolling
3. **Complex Filtering** - Don't add desktop-style filter panels
4. **Sidebar Navigation** - Don't force sidebar on mobile
5. **Desktop Modals** - Don't use desktop-style modals on mobile
6. **Feature Parity** - Don't try to match every desktop feature on mobile

---

## Success Criteria

### After Phase 1 Implementation

✅ **Mobile feels functional** - Users can accomplish core tasks without frustration  
✅ **No horizontal scrolling** - All content fits mobile viewport  
✅ **Touch targets are accurate** - All interactive elements are 44px+  
✅ **Navigation is clear** - Users understand where they are and how to navigate  
✅ **Actions are discoverable** - Critical actions are visible or easily accessible  

### After Phase 2 Implementation

✅ **Mobile feels native** - UI patterns match mobile app conventions  
✅ **Execution is prioritized** - Mobile focuses on "what's next" not "what's planned"  
✅ **Gestures are intuitive** - Swipe actions feel natural  
✅ **Information is scannable** - Users can quickly understand status and priorities  
✅ **Progressive disclosure works** - Details available on demand, not cluttering  

### After Phase 3 Implementation

✅ **Mobile and desktop are distinct** - Each platform has appropriate UX  
✅ **Mobile feels like execution tool** - Clear focus on action, not planning  
✅ **Desktop feels like planning tool** - Rich visual tools for complex planning  
✅ **Transitions are smooth** - Moving between platforms feels natural  
✅ **Users prefer mobile for execution** - Mobile becomes go-to for daily work  

---

## Design Principles for Mobile Guardrails

### 1. Vertical-First

- Stack information vertically (native to mobile scrolling)
- Use horizontal space sparingly (tabs, chips, not columns)
- Avoid horizontal panning (use vertical lists instead)

### 2. Status-Driven

- Organize by status first (In Progress, Blocked, Done)
- Then by urgency (Today, Tomorrow, Next Week)
- Then by other dimensions (Track, Phase, etc.)

### 3. Progressive Disclosure

- Show essentials first (Title, Status, Due Date)
- Hide details by default (Description, Metadata)
- Reveal on demand (Tap to expand, bottom sheet)

### 4. Thumb-Zone Actions

- Critical actions in bottom half of screen (thumb-reachable)
- Swipe actions (native to mobile)
- FAB for quick-add (bottom-right)

### 5. Gesture-Based

- Swipe left = Complete
- Swipe right = Block/Archive
- Long-press = Quick menu
- Pull-to-refresh = Reload

### 6. Context-Preserving

- Bottom sheets (not modals)
- Swipe-to-dismiss (not close buttons)
- Return to previous view (not deep navigation)

### 7. Calm & Professional

- Avoid "productivity app clichés" (no gamification, no badges)
- Use calm colors (not bright, not energetic)
- Professional language (not playful, not cute)
- Respect that this is a thinking tool, not a toy

---

## Next Steps

1. **Review & Approve** - Stakeholder review of recommendations
2. **Prioritize Phases** - Confirm Phase 1, 2, 3 scope and timeline
3. **Create Mockups** - Visual designs for key mobile patterns (if needed)
4. **Prototype Key Flows** - Test vertical timeline, status-first Task Flow
5. **Implement Phase 1** - Quick wins (2-3 weeks)
6. **Test & Iterate** - User testing after Phase 1
7. **Implement Phase 2** - Structural redesigns (4-6 weeks)
8. **Test & Iterate** - User testing after Phase 2
9. **Implement Phase 3** - Desktop/mobile divergence (2-3 weeks)
10. **Launch & Monitor** - Deploy and gather feedback

---

**Document Status:** Complete  
**Last Updated:** December 2025  
**Related Documents:**
- `GUARDRAILS_UNIFIED_ARCHITECTURE.md` - System architecture
- `Phase_10_Planner_Mobile_UX_Audit.md` - Planner mobile audit
- `Bottom_Sheet_UX_Audit.md` - Bottom sheet usage patterns


