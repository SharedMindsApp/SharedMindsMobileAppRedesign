# Guardrails Calendar Sync UI Architecture Report

**Date:** 2025-01-XX  
**Purpose:** Product + UX architecture review for integrating granular calendar sync controls into Guardrails  
**Status:** Design Analysis (No Implementation)

---

## Executive Summary

This report analyzes the Guardrails UI structure and proposes a **contextual, inheritance-aware** integration strategy for calendar sync controls. The recommended approach:

1. **Extend existing UI surfaces** rather than creating a new standalone module
2. **Contextual placement** at each hierarchy level (project → track → subtrack → event)
3. **Inheritance visualization** to show what will actually sync
4. **Progressive disclosure** to reduce cognitive load
5. **Safety-first patterns** to prevent accidental household exposure

**Key Recommendation:** Do NOT create a new "Calendar Permissions" module. Instead, integrate sync controls into existing Guardrails settings and context menus, following the mental model that calendar sync is a property of the entity, not a separate permission system.

---

## 1. UI Placement Strategy

### 1.1 Project-Level Calendar Sync

**Recommended Location:** Project Settings Panel (New Tab)

**Current State:**
- `ProjectHeaderTabs.tsx` shows project header with tabs: Roadmap, Nodes, Task Flow, Reality Check
- "Share Project" button exists in header (for permissions)
- No dedicated project settings page currently exists

**Proposed Solution:**
Add a "Settings" tab to `ProjectHeaderTabs` that opens a project settings panel/drawer.

**Why This Location:**
- ✅ **Mental Model:** Project settings belong with the project, not in a global module
- ✅ **Discoverability:** Users expect settings in the project header (common pattern)
- ✅ **Context:** Settings are project-specific, so they should live in project context
- ✅ **Consistency:** Matches "Share Project" button pattern (project-level action)

**Alternative Considered:**
- ❌ **Global Settings Module:** Breaks mental model (settings are project-specific)
- ❌ **Dashboard Settings:** Too far from project context
- ❌ **Inline in Project Header:** Too much UI clutter

**Implementation:**
```
ProjectHeaderTabs
  └── Tabs: [Roadmap, Nodes, Task Flow, Reality Check, Settings]
       └── Settings Tab → ProjectSettingsDrawer
            └── Tabs: [General, Calendar Sync, Permissions, ...]
                 └── Calendar Sync Tab
                      └── Project-level sync controls
```

**UI Structure:**
```tsx
<ProjectSettingsDrawer>
  <Tabs>
    <Tab name="General">...</Tab>
    <Tab name="Calendar Sync">
      <CalendarSyncPanel level="project" />
    </Tab>
    <Tab name="Permissions">...</Tab>
  </Tabs>
</ProjectSettingsDrawer>
```

### 1.2 Track-Level Calendar Sync

**Recommended Location:** Track Context Menu → "Calendar Sync Settings"

**Current State:**
- `TrackTree.tsx` shows tracks in roadmap view
- Track context menu exists with: Rename, Change Color, Add Child Track, Delete
- Track settings are accessed via context menu (three-dot menu)

**Proposed Solution:**
Add "Calendar Sync Settings" option to track context menu that opens a modal/drawer.

**Why This Location:**
- ✅ **Mental Model:** Track settings belong with the track (contextual)
- ✅ **Discoverability:** Users already use track context menu for track actions
- ✅ **Consistency:** Matches existing pattern (Rename, Change Color in same menu)
- ✅ **Proximity:** Settings are where the track is, not buried in project settings

**Alternative Considered:**
- ❌ **Project Settings → Track List:** Too many clicks, loses track context
- ❌ **Track Header Inline:** Too much UI clutter in roadmap view
- ❌ **Separate Track Settings Page:** Breaks mental model (tracks aren't top-level entities)

**Implementation:**
```
TrackTree (Track Context Menu)
  └── MoreHorizontal button
       └── Context Menu
            ├── Rename
            ├── Change Color
            ├── Add Child Track
            ├── Calendar Sync Settings ← NEW
            └── Delete
```

**UI Structure:**
```tsx
<TrackContextMenu>
  <MenuItem onClick={openRename}>Rename</MenuItem>
  <MenuItem onClick={openColorPicker}>Change Color</MenuItem>
  <MenuItem onClick={openCalendarSync}>Calendar Sync Settings</MenuItem>
  <MenuItem onClick={onDelete}>Delete</MenuItem>
</TrackContextMenu>

<TrackCalendarSyncModal>
  <CalendarSyncPanel level="track" trackId={trackId} />
</TrackCalendarSyncModal>
```

### 1.3 Subtrack-Level Calendar Sync

**Recommended Location:** Subtrack Context Menu → "Calendar Sync Settings"

**Current State:**
- Subtracks appear in `TrackSelector.tsx` as pills when a track is selected
- Subtracks are shown in `TrackTree.tsx` as child nodes
- No explicit subtrack context menu currently exists

**Proposed Solution:**
Add subtrack context menu (similar to track menu) with "Calendar Sync Settings" option.

**Why This Location:**
- ✅ **Mental Model:** Subtrack settings belong with the subtrack
- ✅ **Consistency:** Matches track-level pattern
- ✅ **Discoverability:** Users expect subtracks to behave like tracks
- ✅ **Hierarchy Clarity:** Shows subtrack is a first-class entity with its own settings

**Alternative Considered:**
- ❌ **Track Settings → Subtrack List:** Loses subtrack context, too nested
- ❌ **Project Settings → All Subtracks:** Too far from subtrack context
- ❌ **No Subtrack Settings:** Breaks hierarchy (tracks have settings, subtracks should too)

**Implementation:**
```
TrackTree (Subtrack Node)
  └── MoreHorizontal button (on subtrack)
       └── Context Menu
            ├── Rename
            ├── Change Color
            ├── Calendar Sync Settings ← NEW
            └── Delete
```

**UI Structure:**
```tsx
<SubtrackContextMenu>
  <MenuItem onClick={openRename}>Rename</MenuItem>
  <MenuItem onClick={openColorPicker}>Change Color</MenuItem>
  <MenuItem onClick={openCalendarSync}>Calendar Sync Settings</MenuItem>
  <MenuItem onClick={onDelete}>Delete</MenuItem>
</SubtrackContextMenu>

<SubtrackCalendarSyncModal>
  <CalendarSyncPanel level="subtrack" subtrackId={subtrackId} />
</SubtrackCalendarSyncModal>
```

### 1.4 Event-Level Calendar Sync

**Recommended Location:** Roadmap Item Drawer → "Calendar" Section

**Current State:**
- `ItemDrawer.tsx` shows roadmap item edit drawer
- Drawer has sections for: Title, Description, Dates, Status, Track, etc.
- Item context menu exists (likely in roadmap item cards)

**Proposed Solution:**
Add a "Calendar" section to the item drawer (below dates, above track selection).

**Why This Location:**
- ✅ **Mental Model:** Calendar sync is a property of the event (like dates, status)
- ✅ **Context:** User is already editing the event, so calendar settings belong here
- ✅ **Discoverability:** Calendar section is visible when editing event
- ✅ **Consistency:** Matches pattern of other event properties (dates, status, track)

**Alternative Considered:**
- ❌ **Item Context Menu:** Too hidden, calendar sync is important enough to be visible
- ❌ **Separate Calendar Settings Modal:** Breaks mental model (calendar is event property)
- ❌ **Project Settings → Event List:** Too far from event context

**Implementation:**
```
ItemDrawer
  └── Sections
       ├── Title
       ├── Description
       ├── Dates
       ├── Calendar ← NEW SECTION
       │    └── Sync to Calendar toggle
       │    └── Target calendar selection
       │    └── Inheritance indicator
       ├── Status
       └── Track
```

**UI Structure:**
```tsx
<ItemDrawer>
  <Section title="Dates">...</Section>
  <Section title="Calendar">
    <CalendarSyncControls level="event" eventId={eventId} />
  </Section>
  <Section title="Status">...</Section>
</ItemDrawer>
```

**Note:** For tasks and Mind Mesh events, add similar calendar sections to their respective edit UIs.

---

## 2. Should We Create a New "Calendar Permissions" Module?

### Recommendation: **NO**

**Reasoning:**

#### 2.1 Mental Model Alignment

**Calendar sync is a property of the entity, not a separate permission system.**

- ✅ **Current Pattern:** Guardrails entities (projects, tracks, items) have properties (name, color, dates, status)
- ✅ **Calendar Sync = Property:** Like "color" or "status", calendar sync is a property of the entity
- ❌ **Separate Module = Wrong Model:** Treating sync as a permission breaks the mental model

**Analogy:**
- ❌ **Wrong:** "Calendar Permissions" module (like a separate "Color Permissions" module)
- ✅ **Right:** Calendar sync settings in entity settings (like color picker in track menu)

#### 2.2 Existing Permission Patterns

**Guardrails already has a permissions system (SharingDrawer).**

- ✅ **SharingDrawer:** Universal permissions system for any entity
- ✅ **Calendar Sync ≠ Permissions:** Sync is about data flow, not access control
- ✅ **Different Concerns:** Permissions = "Who can see/edit", Sync = "Where does data go"

**Conclusion:** Calendar sync should NOT use the permissions system. It's a different concern.

#### 2.3 Cognitive Load

**Separate module increases cognitive load.**

- ❌ **Extra Navigation:** Users must navigate to a separate module
- ❌ **Context Loss:** Settings are separated from the entities they control
- ❌ **Mental Overhead:** Users must remember "where do I go to change calendar sync?"

**Contextual Integration:**
- ✅ **Lower Cognitive Load:** Settings are where the entity is
- ✅ **Context Preserved:** User is already thinking about the entity
- ✅ **Discoverable:** Settings appear where users expect them

#### 2.4 Discoverability

**Contextual placement is more discoverable.**

- ❌ **Separate Module:** Users must know it exists and where to find it
- ✅ **Contextual:** Settings appear when users interact with entities
- ✅ **Progressive Disclosure:** Advanced settings (track/subtrack/event) appear when needed

**Example:**
- User editing a roadmap item → sees "Calendar" section → discovers sync settings
- User in separate "Calendar Permissions" module → must remember which events to configure

### Alternative: Hybrid Approach (Not Recommended)

**If we must have a centralized view:**

Create a "Calendar Sync Overview" page that shows all sync settings in one place, but make it a **read-only summary view** that links back to entity settings for editing.

**Why Not Recommended:**
- Adds complexity without clear benefit
- Users can already see sync status via explainability patterns (see Section 5)
- Centralized editing breaks the "settings are entity properties" mental model

---

## 3. Inheritance & Override UX

### 3.1 Inheritance Visualization

**Goal:** Users must understand what will actually sync without reading documentation.

#### Pattern 1: Inheritance Badge

**Location:** Calendar sync toggle/controls

**Visual:**
```
┌─────────────────────────────────────┐
│ Sync to Calendar                    │
│ ☐ Enabled                           │
│                                     │
│ ℹ️ Inheriting from: Project         │
│    Project "Wedding Planning"       │
│    → Personal Calendar              │
└─────────────────────────────────────┘
```

**Implementation:**
- Show inheritance source as a badge/indicator below the toggle
- Click badge to see full inheritance chain
- Use color coding: Blue = inheriting, Green = explicit override

#### Pattern 2: Inheritance Chain Tooltip

**Location:** Info icon next to sync toggle

**Visual:**
```
Sync to Calendar [ℹ️]
                  │
                  └─ Tooltip:
                     ┌─────────────────────────────┐
                     │ Inheritance Chain:           │
                     │                              │
                     │ Event: Not set              │
                     │ ↓                            │
                     │ Subtrack: Not set            │
                     │ ↓                            │
                     │ Track: Enabled → Personal    │
                     │ ↓                            │
                     │ Project: Not set             │
                     │ ↓                            │
                     │ Global: Enabled → Personal   │
                     │                              │
                     │ Effective: Enabled → Personal│
                     └─────────────────────────────┘
```

**Implementation:**
- Hover/click info icon to see full inheritance chain
- Show effective setting at bottom
- Highlight the level that's actually being used

#### Pattern 3: Inheritance Indicator in Entity List

**Location:** Roadmap item cards, track list, etc.

**Visual:**
```
┌─────────────────────────────────────┐
│ 📅 Wedding Venue Tour               │
│ Dec 15, 2024                        │
│                                     │
│ 🗓️ Synced (via Track)              │
└─────────────────────────────────────┘
```

**Implementation:**
- Show calendar icon with sync status
- Tooltip shows inheritance source
- Color coding: Green = synced, Gray = not synced, Yellow = pending

### 3.2 Breaking Inheritance

**Goal:** Make it easy to override inheritance, but show the consequence.

#### Pattern 1: "Override" Button

**Location:** Below inheritance badge

**Visual:**
```
┌─────────────────────────────────────┐
│ Sync to Calendar                    │
│ ☐ Enabled                           │
│                                     │
│ ℹ️ Inheriting from: Project        │
│    [Override] button                │
└─────────────────────────────────────┘

Clicking "Override" → Shows:
┌─────────────────────────────────────┐
│ Sync to Calendar                    │
│ ☑ Enabled                           │
│                                     │
│ ✓ Explicitly set for this track     │
│   (no longer inherits from project) │
└─────────────────────────────────────┘
```

**Implementation:**
- "Override" button appears when inheriting
- Clicking it creates explicit setting
- Shows confirmation: "This will override project settings for this track"

#### Pattern 2: Toggle with Inheritance Warning

**Location:** Sync toggle itself

**Visual:**
```
┌─────────────────────────────────────┐
│ Sync to Calendar                    │
│ ☐ Enabled (inheriting from Project) │
│                                     │
│ [Toggle to override]                │
│                                     │
│ ⚠️ Overriding will affect all       │
│    items in this track              │
└─────────────────────────────────────┘
```

**Implementation:**
- Toggle shows inheritance state
- Clicking toggle shows confirmation modal
- Modal explains what will change

### 3.3 Understanding What Will Sync

**Goal:** Users must see a preview of what will actually sync.

#### Pattern 1: Sync Preview Modal

**Location:** "Preview Sync" button in calendar sync panel

**Visual:**
```
┌─────────────────────────────────────┐
│ Calendar Sync Preview               │
│                                     │
│ Project: Wedding Planning           │
│ Track: Venue Selection             │
│                                     │
│ Will sync to: Personal Calendar    │
│                                     │
│ Events that will sync:             │
│ • Venue Tour (Dec 15)              │
│ • Catering Tasting (Dec 20)         │
│ • Final Venue Decision (Dec 25)    │
│                                     │
│ Events that won't sync:            │
│ • Budget Planning (no date)        │
│ • Vendor Research (no date)         │
│                                     │
│ [Close]                             │
└─────────────────────────────────────┘
```

**Implementation:**
- "Preview Sync" button in project/track/subtrack sync panels
- Shows list of events that will/won't sync
- Respects inheritance and entity type filters

#### Pattern 2: Inline Sync Count

**Location:** Calendar sync toggle

**Visual:**
```
┌─────────────────────────────────────┐
│ Sync to Calendar                    │
│ ☑ Enabled                           │
│                                     │
│ Will sync 12 events to:            │
│ Personal Calendar                   │
│                                     │
│ [Preview] [Change Target]          │
└─────────────────────────────────────┘
```

**Implementation:**
- Show count of events that will sync
- Click "Preview" to see list
- Click "Change Target" to change calendar

---

## 4. Target Calendar Selection UX

### 4.1 Where Target Selection Lives

**Location:** In each calendar sync panel (project/track/subtrack/event)

**Visual:**
```
┌─────────────────────────────────────┐
│ Calendar Sync Settings              │
│                                     │
│ Sync to Calendar                    │
│ ☑ Enabled                           │
│                                     │
│ Target Calendar:                   │
│ ○ Personal Calendar                 │
│ ● Shared Calendar                   │
│   └─ Select space: [Dropdown]       │
│ ○ Both Calendars                   │
│                                     │
│ [Save]                              │
└─────────────────────────────────────┘
```

**Implementation:**
- Radio buttons for calendar selection
- Space dropdown appears when "Shared" or "Both" selected
- Space dropdown shows user's accessible spaces

### 4.2 Preventing Accidental Household Exposure

**Safety Pattern 1: Confirmation Modal for Shared Calendar**

**Visual:**
```
┌─────────────────────────────────────┐
│ Confirm Shared Calendar Sync        │
│                                     │
│ ⚠️ You're about to sync this        │
│    project to a shared calendar.   │
│                                     │
│ This means:                         │
│ • All events will be visible to     │
│   household members                 │
│ • Changes will appear in shared     │
│   calendar                          │
│ • You can revoke this later         │
│                                     │
│ Target: "Family Calendar"           │
│                                     │
│ [Cancel] [Confirm Sync]            │
└─────────────────────────────────────┘
```

**Implementation:**
- Show confirmation modal when user selects "Shared" or "Both"
- Explain what shared calendar means
- Show target space name
- Require explicit confirmation

**Safety Pattern 2: Warning Badge for Shared Sync**

**Visual:**
```
┌─────────────────────────────────────┐
│ Sync to Calendar                    │
│ ☑ Enabled                           │
│                                     │
│ Target: Shared Calendar             │
│ 🟡 Visible to household members     │
│                                     │
│ [Change Target]                     │
└─────────────────────────────────────┘
```

**Implementation:**
- Show warning badge when shared calendar selected
- Badge is always visible (not just on change)
- Click badge to see who has access

**Safety Pattern 3: Preview Who Can See**

**Location:** "Who can see this?" link in shared calendar selection

**Visual:**
```
┌─────────────────────────────────────┐
│ Target Calendar:                    │
│ ● Shared Calendar                   │
│   └─ Space: "Family Calendar"       │
│   └─ [Who can see this?]            │
│                                     │
│ Clicking "Who can see this?" →      │
│ ┌─────────────────────────────────┐ │
│ │ Household Members:              │ │
│ │ • You (Owner)                   │ │
│ │ • Sarah (Member)                │ │
│ │ • John (Member)                 │ │
│ │                                 │ │
│ │ All members can view events     │ │
│ │ in this calendar.               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Implementation:**
- "Who can see this?" link opens modal
- Shows list of household members
- Explains permissions (view/edit)

**Safety Pattern 4: Default to Personal**

**Implementation:**
- Default target is always "Personal Calendar"
- Shared calendar requires explicit selection
- "Both" requires explicit selection
- No auto-sync to shared calendars

---

## 5. Explainability & Trust

### 5.1 "Why is this event appearing in my calendar?"

**Goal:** Users must understand why events appear in their calendar.

#### Pattern 1: Calendar Event Badge in Guardrails

**Location:** Roadmap item cards, track items, etc.

**Visual:**
```
┌─────────────────────────────────────┐
│ 📅 Wedding Venue Tour               │
│ Dec 15, 2024                        │
│                                     │
│ 🗓️ Synced to Personal Calendar     │
│    (via Track: Venue Selection)    │
└─────────────────────────────────────┘
```

**Implementation:**
- Calendar icon badge on synced events
- Tooltip shows sync source
- Click badge to see sync settings

#### Pattern 2: Calendar Event Tooltip

**Location:** Calendar icon in Guardrails

**Visual:**
```
🗓️ [Hover]
    └─ Tooltip:
       ┌─────────────────────────────┐
       │ Synced to Calendar           │
       │                              │
       │ Source: Track "Venue"       │
       │ Target: Personal Calendar   │
       │                              │
       │ [View in Calendar]          │
       │ [Change Sync Settings]       │
       └─────────────────────────────┘
```

**Implementation:**
- Hover calendar icon to see sync details
- Links to calendar and sync settings

#### Pattern 3: Calendar Event Detail in Calendar View

**Location:** Calendar event details (in Personal/Shared calendar)

**Visual:**
```
┌─────────────────────────────────────┐
│ Wedding Venue Tour                   │
│ Dec 15, 2024, 10:00 AM              │
│                                     │
│ 📍 Source: Guardrails               │
│    Project: Wedding Planning        │
│    Track: Venue Selection           │
│                                     │
│ [Open in Guardrails]                │
└─────────────────────────────────────┘
```

**Implementation:**
- Show source attribution in calendar event details
- Link back to Guardrails entity
- Show project/track/subtrack path

#### Pattern 4: Sync Status Indicator

**Location:** Roadmap view, track list, etc.

**Visual:**
```
┌─────────────────────────────────────┐
│ Track: Venue Selection             │
│                                     │
│ 🗓️ 5 events synced                 │
│    → Personal Calendar              │
│                                     │
│ [View Sync Settings]                │
└─────────────────────────────────────┘
```

**Implementation:**
- Show sync status at track/subtrack level
- Count of synced events
- Target calendar
- Link to sync settings

### 5.2 Where Explainability Appears

**Guardrails Side:**
1. **Roadmap Item Cards:** Calendar badge with tooltip
2. **Track List:** Sync status indicator
3. **Subtrack List:** Sync status indicator
4. **Project Header:** Sync status summary (optional)

**Calendar Side:**
1. **Event Details:** Source attribution
2. **Event List:** Source badge
3. **Calendar View:** Source indicator

---

## 6. Safety & Guardrails (UX-Level)

### 6.1 Dangerous UX Patterns to Avoid

#### ❌ Pattern 1: Auto-Sync to Shared Calendar

**Why Dangerous:**
- Users may not realize events are visible to household
- Accidental exposure of personal/work events

**Mitigation:**
- Always default to Personal Calendar
- Require explicit confirmation for Shared Calendar
- Show warning badge when Shared selected

#### ❌ Pattern 2: Bulk Enable Without Preview

**Why Dangerous:**
- Users may sync more events than intended
- No way to see what will sync before enabling

**Mitigation:**
- Always show "Preview Sync" before enabling
- Show count of events that will sync
- Require confirmation for bulk operations

#### ❌ Pattern 3: Hidden Inheritance

**Why Dangerous:**
- Users may not understand why events sync
- Changes at parent level affect children unexpectedly

**Mitigation:**
- Always show inheritance indicator
- Show inheritance chain in tooltip
- Warn when parent changes affect children

#### ❌ Pattern 4: No Way to Revoke

**Why Dangerous:**
- Users may want to stop syncing but can't find the setting
- Events remain in calendar after user wants to stop

**Mitigation:**
- Make sync toggle easily accessible
- Show "Unsync" option in calendar event details
- Provide bulk unsync in project settings

### 6.2 Confirmation & Previews Required

#### When Confirmation is Required:

1. **Enabling Shared Calendar Sync:**
   - Show confirmation modal
   - Explain who can see events
   - Require explicit "Confirm" click

2. **Bulk Sync Operations:**
   - Show preview of what will sync
   - Show count of events
   - Require confirmation

3. **Breaking Inheritance:**
   - Warn that this creates explicit override
   - Explain what will change
   - Require confirmation

4. **Disabling Sync (Unsync):**
   - Warn that events will be removed from calendar
   - Show count of events that will be removed
   - Require confirmation

#### When Preview is Required:

1. **Before Enabling Sync:**
   - Show preview of events that will sync
   - Show target calendar
   - Show entity type filters

2. **Changing Target Calendar:**
   - Show preview of events that will move
   - Show new target calendar
   - Show who can see (if shared)

3. **Changing Inheritance:**
   - Show preview of how inheritance chain changes
   - Show effective setting
   - Show events affected

### 6.3 Destructive Actions Need Warnings

#### Unsync Warning:

**Visual:**
```
┌─────────────────────────────────────┐
│ Unsync from Calendar?               │
│                                     │
│ ⚠️ This will remove 12 events      │
│    from your calendar.              │
│                                     │
│ Events will be removed from:        │
│ • Personal Calendar                 │
│                                     │
│ Events will remain in Guardrails.   │
│ You can re-enable sync later.      │
│                                     │
│ [Cancel] [Unsync Events]            │
└─────────────────────────────────────┘
```

**Implementation:**
- Show count of events that will be removed
- Explain that events remain in Guardrails
- Offer option to re-enable later

#### Change Target Calendar Warning:

**Visual:**
```
┌─────────────────────────────────────┐
│ Change Target Calendar?             │
│                                     │
│ ⚠️ This will move 12 events from   │
│    Personal Calendar to:            │
│    "Family Calendar" (Shared)       │
│                                     │
│ Events will be:                     │
│ • Removed from Personal Calendar   │
│ • Added to Family Calendar          │
│ • Visible to household members      │
│                                     │
│ [Cancel] [Move Events]              │
└─────────────────────────────────────┘
```

**Implementation:**
- Show count of events that will move
- Show source and target calendars
- Explain visibility implications

---

## 7. Output Format

### 7.1 Recommended UI Integration Strategy

**Summary:**
- ✅ **Extend existing UI surfaces** (project settings, context menus, item drawer)
- ✅ **Contextual placement** at each hierarchy level
- ✅ **No new global module** (calendar sync is entity property, not separate system)
- ✅ **Progressive disclosure** (advanced settings appear when needed)

**Placement Map:**
- **Project:** Project Settings Tab → Calendar Sync Panel
- **Track:** Track Context Menu → Calendar Sync Modal
- **Subtrack:** Subtrack Context Menu → Calendar Sync Modal
- **Event:** Item Drawer → Calendar Section

### 7.2 Inheritance UX Proposal

**Summary:**
- ✅ **Inheritance badges** show what's being inherited
- ✅ **Inheritance chain tooltips** show full resolution path
- ✅ **"Override" button** to break inheritance
- ✅ **Sync preview** shows what will actually sync

**Key Patterns:**
1. Badge below sync toggle showing inheritance source
2. Info icon with tooltip showing full inheritance chain
3. "Override" button to create explicit setting
4. Preview modal showing events that will sync

### 7.3 Target Calendar UX Proposal

**Summary:**
- ✅ **Radio buttons** for calendar selection (Personal/Shared/Both)
- ✅ **Space dropdown** when Shared/Both selected
- ✅ **Confirmation modal** for Shared Calendar selection
- ✅ **Warning badge** when Shared selected
- ✅ **"Who can see this?"** link to show household members

**Safety Patterns:**
1. Default to Personal Calendar
2. Confirmation modal for Shared Calendar
3. Warning badge always visible when Shared selected
4. Preview of who can see events

### 7.4 Explainability UX Proposal

**Summary:**
- ✅ **Calendar badge** on synced events in Guardrails
- ✅ **Tooltip** showing sync source
- ✅ **Source attribution** in calendar event details
- ✅ **Sync status indicators** at track/subtrack level

**Key Patterns:**
1. Calendar icon badge on synced events
2. Tooltip showing inheritance source
3. Source attribution in calendar event details
4. Sync status summary at track/subtrack level

### 7.5 Risks & Mitigations

**Risk 1: Accidental Household Exposure**
- **Mitigation:** Confirmation modal, warning badge, default to Personal

**Risk 2: Hidden Inheritance**
- **Mitigation:** Inheritance badges, tooltips, preview modals

**Risk 3: Cognitive Overload**
- **Mitigation:** Progressive disclosure, contextual placement, clear hierarchy

**Risk 4: Discoverability**
- **Mitigation:** Contextual placement, visual indicators, tooltips

### 7.6 Clear Next Steps for Implementation

**Phase 1: Foundation (Complete)**
- ✅ Database schema
- ✅ Resolver function
- ✅ CRUD services

**Phase 2: Project-Level UI**
1. Add "Settings" tab to `ProjectHeaderTabs`
2. Create `ProjectSettingsDrawer` component
3. Create `CalendarSyncPanel` component (project level)
4. Implement inheritance visualization
5. Implement target calendar selection
6. Add confirmation modals

**Phase 3: Track-Level UI**
1. Add "Calendar Sync Settings" to track context menu
2. Create `TrackCalendarSyncModal` component
3. Implement track-level inheritance visualization
4. Add track-level sync preview

**Phase 4: Subtrack-Level UI**
1. Add subtrack context menu (if not exists)
2. Add "Calendar Sync Settings" to subtrack context menu
3. Create `SubtrackCalendarSyncModal` component
4. Implement subtrack-level inheritance visualization

**Phase 5: Event-Level UI**
1. Add "Calendar" section to `ItemDrawer`
2. Create `EventCalendarSyncControls` component
3. Add calendar badges to roadmap item cards
4. Implement event-level explainability

**Phase 6: Explainability**
1. Add calendar badges to Guardrails entities
2. Add source attribution to calendar events
3. Add sync status indicators
4. Add tooltips and preview modals

**Phase 7: Safety & Polish**
1. Add confirmation modals for all dangerous actions
2. Add warning badges for shared calendar
3. Add preview modals before enabling sync
4. Add "Who can see this?" functionality

---

## Conclusion

This report recommends a **contextual, inheritance-aware integration** of calendar sync controls into existing Guardrails UI surfaces. The approach:

- ✅ **Preserves mental models** (calendar sync is entity property)
- ✅ **Maintains discoverability** (settings where entities are)
- ✅ **Reduces cognitive load** (progressive disclosure, contextual placement)
- ✅ **Ensures safety** (confirmations, warnings, previews)
- ✅ **Builds trust** (explainability, inheritance visualization)

**Key Decision:** Do NOT create a new "Calendar Permissions" module. Instead, integrate sync controls into existing Guardrails settings and context menus.

**Next Step:** Begin Phase 2 implementation (Project-Level UI).

---

**End of Report**
