# Planner Favourites Bar

## Overview

The Personal Planner top header has been transformed from showing all planner tabs to displaying a user-customizable "Favourites Bar" with up to 10 selected tabs.

## Key Changes

### 1. Top Header = Favourites Bar

The horizontal row of tabs at the top of the planner book now shows only **favourited tabs**:
- Maximum: 10 tabs
- Default favourites: Index, Daily, Weekly, Monthly
- User-customizable via Planner Settings
- Scrollable if needed (though capped at 10)

### 2. Three-Layer Navigation System

Users can now access planner sections through three methods:

**Fast Access - Favourites Bar (Top Header)**
- Shows up to 10 user-selected tabs
- Quick access to most-used sections
- Fully customizable

**Structural Navigation - Edge Tabs**
- Complete planner structure
- Left edge: Time-based tabs (Index, Daily, Weekly, Monthly, Quarterly)
- Right edge: Life area tabs (Personal, Work, Education, etc.)
- Always shows all enabled tabs

**Overview Navigation - Planner Index**
- Full section list with cards
- Overview of all planner sections
- Entry point for exploration

### 3. Planner Settings - Favourites Tab

New "Favourites" tab in Planner Settings provides:

**Features:**
- Live counter (X / 10 favourites used)
- Two sections:
  - Favourited Tabs: Shows current favourites with reordering controls
  - Available Tabs: Shows non-favourited tabs that can be added
- Drag to reorder favourites (up/down buttons)
- Star icon to toggle favourite status
- Clear visual distinction (blue highlight for favourited tabs)

**Rules Enforced:**
- Maximum 10 favourites
- Minimum 1 favourite (cannot remove last one)
- Clear UI feedback when limits are reached
- No error states - disabled actions with tooltips

**UI Feedback:**
- Warning banner when 10 favourites reached
- Disabled star buttons with tooltips explaining why
- Disabled remove button on last favourite with tooltip

### 4. Data Model

**Type Changes:**
```typescript
export interface PlannerSettings {
  stylePreset: PlannerStylePreset;
  tabConfig: PlannerTabConfig[];
  favouriteTabs: string[]; // Array of paths, max 10
  comfort: PlannerComfortSettings;
}
```

**Default Favourites:**
```typescript
favouriteTabs: [
  '/planner',        // Index
  '/planner/daily',  // Daily
  '/planner/weekly', // Weekly
  '/planner/monthly' // Monthly
]
```

**Storage:**
- Stored in `user_ui_preferences.custom_overrides.planner_settings`
- Persists per user
- Applies instantly

### 5. Backwards Compatibility

Users with existing settings without `favouriteTabs`:
- Automatically receive default favourites (Index, Daily, Weekly, Monthly)
- No migration required
- Graceful fallback in both PlannerShell and PlannerSettings

## User Experience

### For New Users
- Start with sensible defaults (4 core tabs)
- Can add more favourites as they explore
- Maximum cognitive load reduction while maintaining power

### For Existing Users
- Seamless transition with default favourites
- Can customize immediately via Settings
- No disruption to workflow

### Visual Clarity
- Top header is cleaner and less cluttered
- Settings button remains visible and accessible
- Edge tabs show complete structure
- No functionality removed, only reorganized

## Technical Implementation

### Files Modified

1. **src/lib/plannerTypes.ts**
   - Added `favouriteTabs: string[]` to `PlannerSettings`
   - Updated `DEFAULT_PLANNER_SETTINGS` with default favourites

2. **src/components/planner/PlannerShell.tsx**
   - Added favourites filtering logic
   - Top header now renders `favouriteTabs` instead of `allTabs`
   - Backwards compatibility fallback
   - Edge tabs remain unchanged

3. **src/components/planner/PlannerSettings.tsx**
   - Added "Favourites" tab to settings navigation
   - Renamed "Tab Layout" to "Edge Tabs" for clarity
   - Implemented `toggleFavourite()` with max 10 enforcement
   - Implemented `moveFavourite()` for reordering
   - Added UI for managing favourites with live counter
   - Backwards compatibility fallback

### Key Functions

**toggleFavourite(path: string)**
- Adds or removes a tab from favourites
- Enforces minimum 1 favourite
- Enforces maximum 10 favourites
- Updates state immediately

**moveFavourite(path: string, direction: 'up' | 'down')**
- Reorders favourites in the list
- Swaps adjacent items
- Disabled at boundaries (first/last)

## Success Criteria

All success criteria met:

✅ Top header shows favourite planner tabs only
✅ Maximum of 10 tabs enforced
✅ Planner Settings allows selecting favourites
✅ Planner Settings allows reordering favourites
✅ Settings UI remains visible and uncluttered
✅ Edge tabs remain unchanged (show all enabled tabs)
✅ Planner Index remains unchanged (shows all sections)
✅ Build passes with no regressions
✅ Backwards compatibility maintained

## Design Philosophy

> "The top of the planner should show what I use most — not everything that exists."

This change:
- Reduces cognitive load without removing power
- Allows personalization without complexity
- Maintains access to all features through multiple paths
- Follows user-controlled (not algorithmic) customization principles

## What Was NOT Done

❌ No auto-hiding based on usage patterns
❌ No "recent tabs" feature
❌ No AI suggestions
❌ No removal of planner sections
❌ No changes to non-planner navigation
❌ No new data tables or models

This is purely a presentation layer change that reorganizes existing functionality for better UX.
